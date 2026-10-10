import { prisma } from '../utils/prisma';
import { emitToBranch, SOCKET_EVENTS } from '../socket';

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  category: string;
  branchId: string;
  branchName?: string;
  branchCode?: string;
  updatedAt: string;
}

function toDTO(row: {
  id: string;
  name: string;
  currentStock: number;
  unit: string;
  minStock: number;
  branchId: string;
  branch?: { id: string; name: string; code: string } | null;
  updatedAt: Date;
}): Ingredient {
  return {
    id: row.id,
    name: row.name,
    quantity: row.currentStock,
    unit: row.unit,
    lowStockThreshold: row.minStock,
    category: '',
    branchId: row.branchId,
    branchName: row.branch?.name,
    branchCode: row.branch?.code,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class InventoryService {
  static async getIngredients(tenantId: string, branchId: string): Promise<Ingredient[]> {
    const where: any = { tenantId };
    if (branchId && branchId !== 'ALL') {
      where.branchId = branchId;
    }
    const rows = await prisma.ingredient.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        branch: {
          select: { id: true, name: true, code: true },
        },
      },
    });
    return rows.map(toDTO);
  }

  static async adjustStock(
    tenantId: string,
    branchId: string,
    userId: string | undefined,
    id: string,
    adjustment: number,
    type: 'ADD' | 'REMOVE' | 'SET',
    reason: string
  ): Promise<Ingredient> {
    const where: any = { id, tenantId };
    if (branchId && branchId !== 'ALL') {
      where.branchId = branchId;
    }
    const item = await prisma.ingredient.findFirst({
      where,
      include: { branch: { select: { id: true, name: true, code: true } } },
    });
    if (!item) {
      throw new Error('INGREDIENT_NOT_FOUND');
    }

    let nextQty = item.currentStock;
    if (type === 'ADD') nextQty += adjustment;
    else if (type === 'REMOVE') nextQty = Math.max(0, item.currentStock - adjustment);
    else nextQty = Math.max(0, adjustment);

    const updated = await prisma.ingredient.update({
      where: { id: item.id },
      data: { currentStock: nextQty },
      include: { branch: { select: { id: true, name: true, code: true } } },
    });

    // Ghi log biến động kho (best-effort, không chặn luồng chính)
    prisma.inventoryLog
      .create({
        data: {
          tenantId,
          branchId: item.branchId,
          ingredientId: item.id,
          type: type === 'ADD' ? 'RESTOCK' : type === 'REMOVE' ? 'USAGE' : 'RETURN',
          changeQty: nextQty - item.currentStock,
          remainingQty: nextQty,
          reason,
          performedBy: userId || null,
        },
      })
      .catch(() => undefined);

    if (nextQty <= updated.minStock) {
      emitToBranch(item.branchId, SOCKET_EVENTS.INVENTORY_WARNING, {
        ingredientId: updated.id,
        name: updated.name,
        currentStock: nextQty,
        threshold: updated.minStock,
        unit: updated.unit,
        branchId: item.branchId,
      });
    }

    emitToBranch(item.branchId, SOCKET_EVENTS.INVENTORY_UPDATED, {
      ingredientId: updated.id,
      quantity: nextQty,
      branchId: item.branchId,
    });

    return toDTO(updated);
  }

  static async addIngredient(
    tenantId: string,
    branchId: string,
    data: { name: string; quantity: number; unit: string; lowStockThreshold: number; category?: string }
  ): Promise<Ingredient> {
    let targetBranchId = branchId;
    if (!targetBranchId || targetBranchId === 'ALL') {
      const firstBranch = await prisma.branch.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
      });
      if (!firstBranch) throw new Error('NO_BRANCH_AVAILABLE');
      targetBranchId = firstBranch.id;
    }

    const code = `${data.name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .slice(0, 12)}-${Date.now().toString().slice(-4)}`;
    const created = await prisma.ingredient.create({
      data: {
        tenantId,
        branchId: targetBranchId,
        code,
        name: data.name,
        unit: data.unit || 'kg',
        currentStock: Number(data.quantity) || 0,
        minStock: Number(data.lowStockThreshold) || 5,
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    });
    emitToBranch(targetBranchId, SOCKET_EVENTS.INVENTORY_UPDATED, {
      ingredientId: created.id,
      quantity: created.currentStock,
      branchId: targetBranchId,
    });
    return toDTO(created);
  }

  static async deleteIngredient(tenantId: string, branchId: string, id: string): Promise<boolean> {
    const where: any = { id, tenantId };
    if (branchId && branchId !== 'ALL') {
      where.branchId = branchId;
    }
    const owned = await prisma.ingredient.findFirst({
      where,
      select: { id: true },
    });
    if (!owned) return false;
    await prisma.ingredient.delete({ where: { id: owned.id } });
    return true;
  }
}
