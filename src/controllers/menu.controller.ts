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

import prisma from '../utils/prisma';

export class MenuController {
  static async getItems(req: Request, res: Response) {
    try {
      const branchId = (req.query.branchId as string) || 'default-branch';
      const dbItems = await prisma.menuItem.findMany({
        where: { isActive: true },
        include: {
          category: { select: { name: true } },
        },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      });

      if (dbItems.length > 0) {
        const formatted = dbItems.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category?.name || 'Món chính',
          price: item.basePrice,
          imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500',
          isSoldOut: item.isSoldOut,
          isPopular: true,
          branchId,
        }));
        return ApiResponse.success(res, formatted, 'Lấy danh sách thực đơn thành công');
      }

      const items = menuItems.filter((i) => i.branchId === branchId);
      return ApiResponse.success(res, items, 'Lấy danh sách thực đơn thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'FETCH_MENU_ERROR', err.message, 500);
    }
  }

  static async toggleSoldOut(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { isSoldOut } = req.body;
      const branchId = (req.query.branchId as string) || (req.body.branchId as string) || 'default-branch';

      try {
        await prisma.menuItem.update({
          where: { id },
          data: { isSoldOut: Boolean(isSoldOut) },
        });
      } catch (e) {
        // best effort
      }

      const item = menuItems.find((i) => i.id === id && i.branchId === branchId);
      if (item) {
        item.isSoldOut = Boolean(isSoldOut);
      }

      // Bắn socket thông báo sang KDS và Web QR Menu khách hàng
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
      const branchId = (req.body.branchId as string) || 'default-branch';

      let createdDbItem: any = null;
      try {
        const tenant = await prisma.tenant.findFirst();
        if (tenant) {
          let category = await prisma.menuCategory.findFirst({
            where: { tenantId: tenant.id, name: categoryName || 'Món mới' }
          });
          if (!category) {
            const rawSlug = String(categoryName || 'mon-moi').toLowerCase().replace(/[^a-z0-9]+/g, '-');
            category = await prisma.menuCategory.create({
              data: {
                tenantId: tenant.id,
                name: categoryName || 'Món mới',
                slug: `${rawSlug}-${Date.now().toString().slice(-4)}`,
              }
            });
          }
          const count = await prisma.menuItem.count({ where: { tenantId: tenant.id } });
          createdDbItem = await prisma.menuItem.create({
            data: {
              tenantId: tenant.id,
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
        }
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
      const branchId = (req.query.branchId as string) || 'default-branch';

      let deleted: any = null;
      try {
        deleted = await prisma.menuItem.delete({
          where: { id },
        });
      } catch (e) {
        // best effort nếu chưa migrate xong
      }

      menuItems = menuItems.filter((i) => i.id !== id && i.branchId === branchId);

      // Bắn socket thông báo món đã xóa
      try {
        emitToBranch(branchId, SOCKET_EVENTS.MENU_ITEM_DELETED, { itemId: id, branchId });
      } catch {}

      return ApiResponse.success(res, { deletedId: id }, 'Xóa món thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'DELETE_MENU_ERROR', err.message, 500);
    }
  }
}