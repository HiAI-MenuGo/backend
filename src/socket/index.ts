import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { SOCKET_EVENTS, SocketEventType } from './events';

export interface SocketUser {
  userId?: string;
  tenantId: string;
  branchId?: string;
  role?: string;
  tableId?: string;
}

declare module 'socket.io' {
  interface Socket {
    user?: SocketUser;
  }
}

let io: Server | null = null;

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Hỗ trợ cả mobile (Expo Metro/App) và web Next.js
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Middleware xác thực JWT và định tuyến Multi-tenant Rooms
  io.use((socket: Socket, next) => {
    try {
      const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      const tenantId = (socket.handshake.query?.tenantId as string) || (socket.handshake.auth?.tenantId as string);
      const branchId = (socket.handshake.query?.branchId as string) || (socket.handshake.auth?.branchId as string);
      const tableId = (socket.handshake.query?.tableId as string) || (socket.handshake.auth?.tableId as string);

      let token = authHeader;
      if (typeof token === 'string' && token.startsWith('Bearer ')) {
        token = token.slice(7);
      }

      const jwtSecret = process.env.JWT_SECRET || 'super_secret_jwt_key_hiai_menugo_2026';

      if (token) {
        try {
          const decoded = jwt.verify(token, jwtSecret) as any;
          socket.user = {
            userId: decoded.userId || decoded.id,
            tenantId: decoded.tenantId || tenantId || 'default-tenant',
            branchId: decoded.branchId || branchId,
            role: decoded.role,
            tableId,
          };
          socket.data.authenticated = true;
          return next();
        } catch (jwtErr) {
          console.warn(`[Socket.IO] JWT verification failed, checking dev mode fallback...`);
        }
      }

      // Fallback dev mode / QR Menu khách vãng lai (GUEST chưa xác thực)
      socket.user = {
        tenantId: tenantId || 'default-tenant',
        branchId: branchId || 'default-branch',
        tableId: tableId,
        role: 'GUEST',
      };
      socket.data.authenticated = false;
      return next();
    } catch (err: any) {
      console.error('[Socket.IO] Auth Middleware Error:', err.message);
      return next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.user;
    console.log(`⚡ [Socket.IO] Client connected: ${socket.id} (tenant: ${user?.tenantId}, branch: ${user?.branchId})`);

    const isGuest = !socket.data?.authenticated && user?.role === 'GUEST';
    // GUEST (QR khách, không JWT): chỉ join room bàn của mình.
    // Chặn join tenant:/branch: room để không nghe lén order/payment của cả chi nhánh.
    if (isGuest) {
      if (user?.tableId) {
        socket.join(`table:${user.tableId}`);
      }
    } else {
      // Tự động gia nhập Room theo Tenant và Chi nhánh
      if (user?.tenantId) {
        socket.join(`tenant:${user.tenantId}`);
      }
      if (user?.branchId) {
        socket.join(`branch:${user.branchId}`);
      }
      if (user?.tableId) {
        socket.join(`table:${user.tableId}`);
      }
    }

    // Cho phép client gửi ping để kiểm tra kết nối
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Lắng nghe yêu cầu gọi phục vụ / gọi thanh toán từ bàn QR
    socket.on('call_staff:request', (payload) => {
      console.log(`🛎️ [Socket.IO] Call staff request received from ${socket.id}:`, payload);
      if (user?.tenantId) io?.to(`tenant:${user.tenantId}`).emit('call_staff:request', payload);
      if (user?.branchId) io?.to(`branch:${user.branchId}`).emit('call_staff:request', payload);
      io?.emit('call_staff:request', payload);
    });

    // Lắng nghe đánh giá của khách hàng từ bàn QR
    socket.on('review:new', (payload) => {
      console.log(`⭐ [Socket.IO] Customer review received from ${socket.id}:`, payload);
      if (user?.tenantId) io?.to(`tenant:${user.tenantId}`).emit('review:new', payload);
      if (user?.branchId) io?.to(`branch:${user.branchId}`).emit('review:new', payload);
      io?.emit('review:new', payload);
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 [Socket.IO] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  console.log('✅ [Socket.IO] Server initialized successfully');
  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('[Socket.IO] Server has not been initialized yet!');
  }
  return io;
}

// Helpers phát tín hiệu chuẩn đa chi nhánh
export function emitToTenant<T>(tenantId: string, event: SocketEventType, data: T) {
  if (!io) return;
  io.to(`tenant:${tenantId}`).emit(event, data);
}

export function emitToBranch<T>(branchId: string, event: SocketEventType, data: T) {
  if (!io) return;
  io.to(`branch:${branchId}`).emit(event, data);
}

export function emitToTable<T>(tableId: string, event: SocketEventType, data: T) {
  if (!io) return;
  io.to(`table:${tableId}`).emit(event, data);
}

export * from './events';
