import { Request, Response } from 'express';
import ApiResponse from '../utils/response';
import { emitToBranch, SOCKET_EVENTS } from '../socket';

export interface MenuItemBackend {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
  isPopular?: boolean;
  isSoldOut: boolean;
  branchId: string;
}

export let menuItems: MenuItemBackend[] = [
  { id: 'item-1', name: 'Trà Đào Cam Sả', category: 'Trà trái cây', price: 45000, imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500', isPopular: true, isSoldOut: false, branchId: 'default-branch' },
  { id: 'item-2', name: 'Cà Phê Muối', category: 'Cà phê', price: 35000, imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500', isPopular: true, isSoldOut: false, branchId: 'default-branch' },
  { id: 'item-3', name: 'Matcha Latte Đá', category: 'Trà sữa & Matcha', price: 45000, imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500', isSoldOut: false, branchId: 'default-branch' },
  { id: 'item-4', name: 'Bạc Xỉu Sữa Tươi', category: 'Cà phê', price: 35000, imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500', isSoldOut: false, branchId: 'default-branch' },
  { id: 'item-5', name: 'Bánh Croissant Bơ Tỏi', category: 'Bánh ngọt', price: 20000, imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500', isSoldOut: true, branchId: 'default-branch' },
  { id: 'item-6', name: 'Trà Sữa Trân Châu Hoàng Gia', category: 'Trà sữa & Matcha', price: 48000, imageUrl: 'https://images.unsplash.com/photo-1558857563-b37df2d2b512?w=500', isSoldOut: true, branchId: 'default-branch' },
];

export function renameCategoryInMemory(oldName: string, newName: string) {
  menuItems.forEach((it) => {
    if (it.category === oldName) {
      it.category = newName;
    }
  });
}

import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { resolveTableScope } from '../utils/tableScope';
import { getTenantContext } from '../middlewares/tenantIsolation';

export class MenuController {
  /**
   * GET /api/menu/items — dual-mode:
   * - Staff (auth): scope theo tenantContext hoặc token của user.
   * - QR khách (public): scope theo tableId (lookup bàn) hoặc branchId / tenantId.
   * Không bao giờ lỗi chặn khi người dùng đã đăng nhập hoặc có định danh khả dụng.
   */
  static async getItems(req: Request, res: Response) {
    try {
      let tenantId: string | undefined = req.tenantContext?.tenantId;
      let branchId: string | undefined = req.tenantContext?.branchId;

      // 1. Thử lấy từ req.user (nếu đã qua auth / optionalAuth)
      if (!tenantId && req.user?.tenantId) {
        tenantId = req.user.tenantId;
        branchId = req.user.branchId || branchId;
      }

      // 2. Thử decode Bearer token từ header nếu có
      if (!tenantId && req.headers.authorization) {
        try {
          const header = req.headers.authorization;
          const token = header.startsWith('Bearer ') ? header.slice(7) : '';
          if (token) {
            const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_hiai_menugo_2026';
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            if (decoded?.tenantId) {
              tenantId = decoded.tenantId;
              branchId = decoded.branchId || branchId;
            }
          }
        } catch {
          // ignore
        }
      }

      // 3. Thử derive từ tableId (khách quét QR bàn)
      if (!tenantId) {
        const tableId = (req.query.tableId as string) || (req.query.table as string);
        if (tableId) {
          const scope = await resolveTableScope(tableId);
          if (scope) {
            tenantId = scope.tenantId;
            branchId = scope.branchId;
          }
        }
      }

      // 4. Thử derive từ query / headers (tenantId hoặc branchId)
      if (!tenantId) {
        const qTenant = (req.query.tenantId as string) || undefined;
        const qBranch =
          (req.query.branchId as string) || (req.headers['x-branch-id'] as string) || undefined;
        if (qTenant) {
          tenantId = qTenant;
          branchId = qBranch;
        } else if (qBranch && qBranch !== 'default-branch' && qBranch !== 'ALL') {
          const branch = await prisma.branch.findUnique({
            where: { id: qBranch },
          });
          if (branch) {
            tenantId = branch.tenantId;
            branchId = branch.id;
          }
        }
      }

      // 5. Fallback: lấy tenant ACTIVE đầu tiên trong DB
      if (!tenantId) {
        const firstTenant = await prisma.tenant.findFirst({
          where: { status: 'ACTIVE' },
          select: { id: true },
        });
        if (firstTenant) {
          tenantId = firstTenant.id;
        }
      }

      // Nếu hoàn toàn không có tenant nào trong DB, trả về mock menuItems
      if (!tenantId) {
        return ApiResponse.success(res, menuItems, 'Lấy danh sách thực đơn thành công');
      }

      const dbItems = await prisma.menuItem.findMany({
        where: { isActive: true, tenantId },
        include: {
          category: { select: { id: true, name: true, isDrink: true } },
          modifierGroups: {
            include: {
              modifierGroup: {
                include: {
                  options: {
                    where: { isSoldOut: false },
                    orderBy: { displayOrder: 'asc' },
                  },
                },
              },
            },
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      });

      if (dbItems.length > 0) {
        const formatted = dbItems.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description || '',
          category: item.category ? {
            id: item.category.id,
            name: item.category.name,
            isDrink: item.category.isDrink,
          } : { id: 'all', name: 'Món chính', isDrink: false },
          categoryId: item.categoryId,
          basePrice: item.basePrice,
          price: item.basePrice,
          imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500',
          isSoldOut: item.isSoldOut,
          isPopular: true,
          branchId: branchId || 'default-branch',
          modifierGroups: item.modifierGroups.map((mg) => ({
            modifierGroup: {
              id: mg.modifierGroup.id,
              name: mg.modifierGroup.name,
              minSelect: mg.modifierGroup.minSelect,
              maxSelect: mg.modifierGroup.maxSelect,
              isRequired: mg.modifierGroup.isRequired,
              options: mg.modifierGroup.options.map((opt) => ({
                id: opt.id,
                name: opt.name,
                extraPrice: opt.extraPrice,
                isDefault: opt.isDefault,
                isSoldOut: opt.isSoldOut,
              })),
            },
          })),
        }));
        return ApiResponse.success(res, formatted, 'Lấy danh sách thực đơn thành công');
      }

      const items = menuItems.filter((i) => i.branchId === (branchId || 'default-branch'));
      return ApiResponse.success(res, items, 'Lấy danh sách thực đơn thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'FETCH_MENU_ERROR', err.message, 500);
    }
  }

  static async toggleSoldOut(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { isSoldOut } = req.body;
      const { tenantId, branchId } = getTenantContext(req);

      try {
        // Scope theo tenant: chỉ update món thuộc quán mình (chặn IDOR đoán item id)
        const owned = await prisma.menuItem.findFirst({ where: { id, tenantId }, select: { id: true } });
        if (!owned) {
          return ApiResponse.error(res, 'ITEM_NOT_FOUND', 'Không tìm thấy món ăn', 404);
        }
        await prisma.menuItem.update({
          where: { id: owned.id },
          data: { isSoldOut: Boolean(isSoldOut) },
        });
      } catch (e: any) {
        if (e?.errorCode === 'ITEM_NOT_FOUND') throw e;
        // best effort
      }

      const item = menuItems.find((i) => i.id === id && i.branchId === branchId);
      if (item) {
        item.isSoldOut = Boolean(isSoldOut);
      }

      emitToBranch(branchId, SOCKET_EVENTS.SOLD_OUT_UPDATED, {
        itemId: id,
        isSoldOut: Boolean(isSoldOut),
        branchId,
      });

      return ApiResponse.success(res, { id, isSoldOut: Boolean(isSoldOut) }, `Đã cập nhật trạng thái món`);
    } catch (err: any) {
      return ApiResponse.error(res, 'UPDATE_SOLDOUT_ERROR', err.message, 500);
    }
  }

  static async createItem(req: Request, res: Response) {
    try {
      const { name, category: categoryName, price, imageUrl, description, isPopular } = req.body;
      if (!name || price === undefined) {
        return ApiResponse.error(res, 'VALIDATION_ERROR', 'Tên món và giá là bắt buộc', 400);
      }
      const { tenantId, branchId } = getTenantContext(req);

      let createdDbItem: any = null;
      try {
        let category = await prisma.menuCategory.findFirst({
          where: { tenantId, name: categoryName || 'Món mới' }
        });
        if (!category) {
          const rawSlug = String(categoryName || 'mon-moi').toLowerCase().replace(/[^a-z0-9]+/g, '-');
          category = await prisma.menuCategory.create({
            data: {
              tenantId,
              name: categoryName || 'Món mới',
              slug: `${rawSlug}-${Date.now().toString().slice(-4)}`,
            }
          });
        }
        const count = await prisma.menuItem.count({ where: { tenantId } });
        createdDbItem = await prisma.menuItem.create({
          data: {
            tenantId,
            categoryId: category.id,
            code: `ITM-${Date.now().toString().slice(-4)}`,
            name: name.trim(),
            description: description?.trim() || null,
            basePrice: Number(price),
            imageUrl: imageUrl?.trim() || null,
            isSoldOut: false,
            isActive: true,
            displayOrder: count + 1,
          },
          include: { category: true }
        });
      } catch (dbErr) {
        console.warn('Prisma createMenuItem fallback to memory:', dbErr);
      }

      const item: MenuItemBackend = {
        id: createdDbItem ? createdDbItem.id : `item-${Date.now()}`,
        name: name.trim(),
        category: categoryName || 'Món mới',
        price: Number(price),
        imageUrl: imageUrl?.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=350&auto=format&fit=crop&q=80',
        isPopular: Boolean(isPopular),
        isSoldOut: false,
        branchId,
      };
      menuItems.push(item);

      return ApiResponse.success(res, item, 'Thêm món ăn thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'CREATE_MENU_ERROR', err.message, 500);
    }
  }

  static async deleteItem(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tenantId, branchId } = getTenantContext(req);

      let deleted: any = null;
      try {
        // Scope theo tenant: chỉ xóa món thuộc quán mình
        const owned = await prisma.menuItem.findFirst({ where: { id, tenantId }, select: { id: true } });
        if (!owned) {
          return ApiResponse.error(res, 'ITEM_NOT_FOUND', 'Không tìm thấy món ăn', 404);
        }
        deleted = await prisma.menuItem.delete({
          where: { id: owned.id },
        });
      } catch (e: any) {
        if (e?.errorCode === 'ITEM_NOT_FOUND') throw e;
        // best effort nếu chưa migrate xong
      }

      menuItems = menuItems.filter((i) => i.id !== id && i.branchId === branchId);

      emitToBranch(branchId, SOCKET_EVENTS.MENU_ITEM_DELETED, { itemId: id, branchId });

      return ApiResponse.success(res, { deletedId: id }, 'Xóa món thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'DELETE_MENU_ERROR', err.message, 500);
    }
  }

  static async updateItem(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, category: categoryName, price, imageUrl, description, isPopular, isSoldOut } = req.body;
      const { tenantId, branchId } = getTenantContext(req);

      let updatedDbItem: any = null;
      try {
        const owned = await prisma.menuItem.findFirst({
          where: { id, tenantId },
          include: { category: true },
        });

        if (owned) {
          let categoryId = owned.categoryId;
          if (categoryName && categoryName !== owned.category?.name) {
            let cat = await prisma.menuCategory.findFirst({
              where: { tenantId, name: categoryName },
            });
            if (!cat) {
              const rawSlug = String(categoryName).toLowerCase().replace(/[^a-z0-9]+/g, '-');
              cat = await prisma.menuCategory.create({
                data: {
                  tenantId,
                  name: categoryName,
                  slug: `${rawSlug}-${Date.now().toString().slice(-4)}`,
                },
              });
            }
            categoryId = cat.id;
          }

          updatedDbItem = await prisma.menuItem.update({
            where: { id: owned.id },
            data: {
              ...(name ? { name: name.trim() } : {}),
              ...(price !== undefined ? { basePrice: Number(price) } : {}),
              ...(imageUrl !== undefined ? { imageUrl: imageUrl?.trim() || null } : {}),
              ...(description !== undefined ? { description: description?.trim() || null } : {}),
              ...(categoryId ? { categoryId } : {}),
              ...(isSoldOut !== undefined ? { isSoldOut: Boolean(isSoldOut) } : {}),
            },
            include: { category: true },
          });
        }
      } catch (dbErr) {
        console.warn('Prisma updateMenuItem fallback:', dbErr);
      }

      // Cập nhật in-memory fallback
      let item = menuItems.find((i) => i.id === id);
      if (item) {
        if (name) item.name = name.trim();
        if (categoryName) item.category = categoryName;
        if (price !== undefined) item.price = Number(price);
        if (imageUrl !== undefined) item.imageUrl = imageUrl.trim();
        if (isPopular !== undefined) item.isPopular = Boolean(isPopular);
        if (isSoldOut !== undefined) item.isSoldOut = Boolean(isSoldOut);
      } else if (updatedDbItem) {
        item = {
          id: updatedDbItem.id,
          name: updatedDbItem.name,
          category: updatedDbItem.category?.name || categoryName || 'Món mới',
          price: Number(updatedDbItem.basePrice),
          imageUrl: updatedDbItem.imageUrl || '',
          isPopular: Boolean(isPopular),
          isSoldOut: Boolean(updatedDbItem.isSoldOut),
          branchId,
        };
      }

      const result = item || {
        id,
        name: name || '',
        category: categoryName || '',
        price: Number(price) || 0,
        imageUrl: imageUrl || '',
        isPopular: Boolean(isPopular),
        isSoldOut: Boolean(isSoldOut),
        branchId,
      };

      return ApiResponse.success(res, result, 'Cập nhật món ăn thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'UPDATE_MENU_ERROR', err.message, 500);
    }
  }
}