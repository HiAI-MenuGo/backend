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

let menuItems: MenuItemBackend[] = [
  { id: 'item-1', name: 'Trà Đào Cam Sả', category: 'Trà trái cây', price: 45000, imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500', isPopular: true, isSoldOut: false, branchId: 'default-branch' },
  { id: 'item-2', name: 'Cà Phê Muối', category: 'Cà phê', price: 35000, imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500', isPopular: true, isSoldOut: false, branchId: 'default-branch' },
  { id: 'item-3', name: 'Matcha Latte Đá', category: 'Trà sữa & Matcha', price: 45000, imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500', isSoldOut: false, branchId: 'default-branch' },
  { id: 'item-4', name: 'Bạc Xỉu Sữa Tươi', category: 'Cà phê', price: 35000, imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500', isSoldOut: false, branchId: 'default-branch' },
  { id: 'item-5', name: 'Bánh Croissant Bơ Tỏi', category: 'Bánh ngọt', price: 20000, imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500', isSoldOut: true, branchId: 'default-branch' },
  { id: 'item-6', name: 'Trà Sữa Trân Châu Hoàng Gia', category: 'Trà sữa & Matcha', price: 48000, imageUrl: 'https://images.unsplash.com/photo-1558857563-b37df2d2b512?w=500', isSoldOut: true, branchId: 'default-branch' },
];

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
}
