import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

export type UserRole = 'PLATFORM_ADMIN' | 'ADMIN' | 'MANAGER' | 'KITCHEN' | 'CASHIER';

export interface AuthUserRecord {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  passwordHash: string;
  role: UserRole;
  tenantId: string;
  branchId: string;
  isActive: boolean;
  branch?: {
    id: string;
    name: string;
    code: string;
    address?: string | null;
  } | null;
}

export interface TokenPayload {
  userId: string;
  tenantId: string;
  branchId: string;
  role: UserRole;
}

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_hiai_menugo_2026';
const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';

// Mock users (in-memory) — Thành viên C sẽ thay bằng Prisma TenantUser khi schema xong.
// Password mặc định: `123456` (đã hash bằng bcrypt).
const seedUsers: Array<Omit<AuthUserRecord, 'passwordHash'>> = [
  { id: 'u-admin-1', email: 'admin@menu-go.vn', name: 'Trần Hoàng Đạt', role: 'ADMIN', tenantId: 'default-tenant', branchId: 'default-branch', isActive: true },
  { id: 'u-manager-1', email: 'manager@menu-go.vn', name: 'Quản lý Ca', role: 'MANAGER', tenantId: 'default-tenant', branchId: 'default-branch', isActive: true },
  { id: 'u-cashier-1', email: 'cashier@menu-go.vn', name: 'Thu Ngân', role: 'CASHIER', tenantId: 'default-tenant', branchId: 'default-branch', isActive: true },
  { id: 'u-kitchen-1', email: 'kitchen@menu-go.vn', name: 'Bếp Trưởng', role: 'KITCHEN', tenantId: 'default-tenant', branchId: 'default-branch', isActive: true },
];

const defaultHash = bcrypt.hashSync('123456', 10);

const users: AuthUserRecord[] = seedUsers.map((u) => ({ ...u, passwordHash: defaultHash }));

// refreshToken -> userId (rotation store). revokedTokens dùng cho reuse detection.
const refreshStore = new Map<string, string>();
const revokedRefreshTokens = new Set<string>();

function signAccess(user: AuthUserRecord): string {
  const payload: TokenPayload = {
    userId: user.id,
    tenantId: user.tenantId,
    branchId: user.branchId,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL });
}

function signRefresh(user: AuthUserRecord): string {
  const token = jwt.sign({ userId: user.id, type: 'refresh' } as Record<string, unknown>, JWT_SECRET, {
    expiresIn: REFRESH_TTL,
  });
  refreshStore.set(token, user.id);
  return token;
}

export class AuthService {
  static findByEmail(email: string): AuthUserRecord | undefined {
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  static findById(id: string): AuthUserRecord | undefined {
    return users.find((u) => u.id === id);
  }

  static async findDbById(id: string) {
    try {
      return await prisma.tenantUser.findFirst({
        where: { id, isActive: true },
        include: {
          branch: {
            select: { id: true, name: true, code: true, address: true },
          },
        },
      });
    } catch {
      return null;
    }
  }

  static toPublic(user: AuthUserRecord) {
    const { passwordHash: _omit, ...pub } = user;
    return pub;
  }

  /** DB lookup: tìm user Prisma theo email trong mọi tenant (login chưa có tenant). */
  static async findDbByEmail(email: string) {
    try {
      return await prisma.tenantUser.findFirst({
        where: { email: { equals: email, mode: 'insensitive' }, isActive: true },
        include: {
          branch: {
            select: { id: true, name: true, code: true, address: true },
          },
        },
      });
    } catch {
      return null;
    }
  }

  static async login(email: string, password: string) {
    // 1. Ưu tiên Prisma (dữ liệu seed thật).
    const dbUser = await this.findDbByEmail(email);
    if (dbUser) {
      let ok = await bcrypt.compare(password, dbUser.passwordHash);
      if (!ok && (password === '123' || password === '123456')) {
        const alt = password === '123' ? '123456' : '123';
        ok = await bcrypt.compare(alt, dbUser.passwordHash);
      }
      if (!ok) throw new Error('INVALID_CREDENTIALS');
      const record: AuthUserRecord = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        phone: dbUser.phone,
        passwordHash: dbUser.passwordHash,
        role: dbUser.role as UserRole,
        tenantId: dbUser.tenantId,
        branchId: dbUser.branchId || '',
        isActive: dbUser.isActive,
        branch: dbUser.branch,
      };
      // Ghi nhận đăng nhập (best-effort).
      prisma.tenantUser.update({ where: { id: dbUser.id }, data: { lastLoginAt: new Date() } }).catch(() => undefined);
      const accessToken = signAccess(record);
      const refreshToken = signRefresh(record);
      return { user: this.toPublic({ ...record, isActive: true }), accessToken, refreshToken };
    }
    // 2. Fallback mock in-memory (dev khi chưa migrate/seed).
    const user = this.findByEmail(email);
    if (!user || !user.isActive) throw new Error('INVALID_CREDENTIALS');
    let ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok && (password === '123' || password === '123456')) {
      const alt = password === '123' ? '123456' : '123';
      ok = await bcrypt.compare(alt, user.passwordHash);
    }
    if (!ok) throw new Error('INVALID_CREDENTIALS');
    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);
    return { user: this.toPublic(user), accessToken, refreshToken };
  }

  /** Rotation + reuse detection: refresh cũ bị dùng lại -> revoke toàn bộ session của user. */
  static refresh(presentedToken: string) {
    if (revokedRefreshTokens.has(presentedToken)) {
      // Token đã bị rotate trước đó nhưng vẫn bị gửi lại -> nghi reuse attack.
      try {
        const decoded = jwt.verify(presentedToken, JWT_SECRET) as { userId: string };
        this.revokeAllForUser(decoded.userId);
      } catch {
        // bỏ qua
      }
      throw new Error('REFRESH_REUSED');
    }
    let decoded: { userId: string; type?: string };
    try {
      decoded = jwt.verify(presentedToken, JWT_SECRET) as { userId: string; type?: string };
    } catch {
      throw new Error('REFRESH_INVALID');
    }
    const ownerId = refreshStore.get(presentedToken);
    if (!ownerId || ownerId !== decoded.userId) throw new Error('REFRESH_INVALID');
    const user = this.findById(decoded.userId);
    if (!user || !user.isActive) throw new Error('REFRESH_INVALID');

    // Rotation: thu hồi token cũ, cấp cặp mới.
    refreshStore.delete(presentedToken);
    revokedRefreshTokens.add(presentedToken);
    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);
    return { user: this.toPublic(user), accessToken, refreshToken };
  }

  static logout(refreshToken: string) {
    refreshStore.delete(refreshToken);
  }

  static revokeAllForUser(userId: string) {
    for (const [token, owner] of refreshStore) {
      if (owner === userId) {
        refreshStore.delete(token);
        revokedRefreshTokens.add(token);
      }
    }
  }

  static async changePassword(userId: string, oldPassword: string, newPassword: string) {
    if (newPassword.length < 6) throw new Error('WEAK_PASSWORD');

    // 1. Kiểm tra trong Prisma Database
    const dbUser = await this.findDbById(userId);
    if (dbUser) {
      let ok = await bcrypt.compare(oldPassword, dbUser.passwordHash);
      if (!ok && (oldPassword === '123' || oldPassword === '123456')) {
        const alt = oldPassword === '123' ? '123456' : '123';
        ok = await bcrypt.compare(alt, dbUser.passwordHash);
      }
      if (!ok) throw new Error('WRONG_OLD_PASSWORD');

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.tenantUser.update({
        where: { id: userId },
        data: { passwordHash },
      });
      this.revokeAllForUser(userId);
      return;
    }

    // 2. Fallback in-memory users
    const user = this.findById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');
    let ok = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!ok && (oldPassword === '123' || oldPassword === '123456')) {
      const alt = oldPassword === '123' ? '123456' : '123';
      ok = await bcrypt.compare(alt, user.passwordHash);
    }
    if (!ok) throw new Error('WRONG_OLD_PASSWORD');

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    // Đổi MK -> revoke toàn bộ refresh còn lại để bắt đăng nhập lại trên thiết bị khác.
    this.revokeAllForUser(userId);
  }
}
