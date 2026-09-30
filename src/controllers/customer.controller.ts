import { Request, Response } from 'express';
import ApiResponse from '../utils/response';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  points: number;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  discountPercent: number;
  totalSpent: number;
}

let customers: Customer[] = [
  { id: 'cus-1', name: 'Nguyễn Văn A', phone: '0901234567', points: 145, tier: 'GOLD', discountPercent: 10, totalSpent: 2450000 },
  { id: 'cus-2', name: 'Trần Thị B', phone: '0912345678', points: 40, tier: 'SILVER', discountPercent: 5, totalSpent: 850000 },
  { id: 'cus-3', name: 'Lê Hoàng C', phone: '0988776655', points: 12, tier: 'BRONZE', discountPercent: 0, totalSpent: 120000 },
];

export class CustomerController {
  static getCustomerByPhone(req: Request, res: Response) {
    try {
      const { phone } = req.query;
      if (!phone) {
        return ApiResponse.error(res, 'MISSING_PHONE', 'Vui lòng nhập số điện thoại', 400);
      }

      const customer = customers.find((c) => c.phone === phone);
      if (!customer) {
        return ApiResponse.error(res, 'CUSTOMER_NOT_FOUND', 'Không tìm thấy khách hàng', 404);
      }

      return ApiResponse.success(res, customer, 'Tra cứu thông tin khách hàng thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'FETCH_CUSTOMER_ERROR', err.message, 500);
    }
  }

  static addPoints(req: Request, res: Response) {
    try {
      const { phone, pointsEarned, amountSpent } = req.body;
      let customer = customers.find((c) => c.phone === phone);

      if (!customer) {
        customer = {
          id: `cus-${Date.now()}`,
          name: 'Khách hàng mới',
          phone,
          points: Number(pointsEarned) || 0,
          tier: 'BRONZE',
          discountPercent: 0,
          totalSpent: Number(amountSpent) || 0,
        };
        customers.push(customer);
      } else {
        customer.points += Number(pointsEarned) || 0;
        customer.totalSpent += Number(amountSpent) || 0;

        // Tự động nâng hạng thành viên
        if (customer.totalSpent >= 5000000) {
          customer.tier = 'DIAMOND';
          customer.discountPercent = 15;
        } else if (customer.totalSpent >= 2000000) {
          customer.tier = 'GOLD';
          customer.discountPercent = 10;
        } else if (customer.totalSpent >= 500000) {
          customer.tier = 'SILVER';
          customer.discountPercent = 5;
        }
      }

      return ApiResponse.success(res, customer, 'Cập nhật điểm thưởng thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'ADD_POINTS_ERROR', err.message, 500);
    }
  }
}
