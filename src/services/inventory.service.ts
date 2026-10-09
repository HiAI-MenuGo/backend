import { emitToBranch, SOCKET_EVENTS } from '../socket';

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  category: string;
  branchId: string;
  updatedAt: string;
}

let ingredients: Ingredient[] = [
  { id: 'ing-1', name: 'Hạt Cà Phê Robusta', quantity: 18.5, unit: 'kg', lowStockThreshold: 5.0, category: 'Cà phê', branchId: 'default-branch', updatedAt: new Date().toISOString() },
  { id: 'ing-2', name: 'Sữa Đặc Ngôi Sao', quantity: 12, unit: 'lon', lowStockThreshold: 15, category: 'Sữa & Bơ', branchId: 'default-branch', updatedAt: new Date().toISOString() },
  { id: 'ing-3', name: 'Trà Xanh Oolong', quantity: 3.2, unit: 'kg', lowStockThreshold: 4.0, category: 'Trà khô', branchId: 'default-branch', updatedAt: new Date().toISOString() },
  { id: 'ing-4', name: 'Sữa Tươi Thanh Trùng Barista', quantity: 24, unit: 'hộp 1L', lowStockThreshold: 10, category: 'Sữa & Bơ', branchId: 'default-branch', updatedAt: new Date().toISOString() },
  { id: 'ing-5', name: 'Đường Mía Tự Nhiên', quantity: 45, unit: 'kg', lowStockThreshold: 10, category: 'Gia vị & Đường', branchId: 'default-branch', updatedAt: new Date().toISOString() },
  { id: 'ing-6', name: 'Trân Châu Trắng 3Q', quantity: 2.5, unit: 'kg', lowStockThreshold: 5.0, category: 'Topping', branchId: 'default-branch', updatedAt: new Date().toISOString() },
];

export class InventoryService {
  static getIngredients(branchId: string = 'default-branch'): Ingredient[] {
    return ingredients.filter((i) => i.branchId === branchId);
  }

  static adjustStock(
    id: string,
    adjustment: number,
    type: 'ADD' | 'REMOVE' | 'SET',
    reason: string,
    branchId: string = 'default-branch'
  ): Ingredient {
    const item = ingredients.find((i) => i.id === id && i.branchId === branchId);
    if (!item) {
      throw new Error('INGREDIENT_NOT_FOUND');
    }

    if (type === 'ADD') {
      item.quantity += adjustment;
    } else if (type === 'REMOVE') {
      item.quantity = Math.max(0, item.quantity - adjustment);
    } else if (type === 'SET') {
      item.quantity = Math.max(0, adjustment);
    }

    item.updatedAt = new Date().toISOString();

    // Cảnh báo nếu tồn kho xuống dưới ngưỡng an toàn
    if (item.quantity <= item.lowStockThreshold) {
      emitToBranch(branchId, SOCKET_EVENTS.INVENTORY_WARNING, {
        ingredientId: item.id,
        name: item.name,
        currentStock: item.quantity,
        threshold: item.lowStockThreshold,
        unit: item.unit,
        branchId,
      });
    }

    emitToBranch(branchId, SOCKET_EVENTS.INVENTORY_UPDATED, {
      ingredientId: item.id,
      quantity: item.quantity,
      branchId,
    });

    return item;
  }

  static addIngredient(
    data: { name: string; quantity: number; unit: string; lowStockThreshold: number; category?: string },
    branchId: string = 'default-branch'
  ): Ingredient {
    const newItem: Ingredient = {
      id: `ing-${Date.now()}`,
      name: data.name,
      quantity: Number(data.quantity) || 0,
      unit: data.unit || 'kg',
      lowStockThreshold: Number(data.lowStockThreshold) || 5,
      category: data.category || 'Khác',
      branchId,
      updatedAt: new Date().toISOString(),
    };
    ingredients.unshift(newItem);
    emitToBranch(branchId, SOCKET_EVENTS.INVENTORY_UPDATED, {
      ingredientId: newItem.id,
      quantity: newItem.quantity,
      branchId,
    });
    return newItem;
  }

  static deleteIngredient(id: string, branchId: string = 'default-branch'): boolean {
    const idx = ingredients.findIndex((i) => i.id === id && i.branchId === branchId);
    if (idx === -1) return false;
    ingredients.splice(idx, 1);
    return true;
  }
}
