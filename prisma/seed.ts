import { PrismaClient, UserRole, SubscriptionPlan, TenantStatus, TableStatus, OrderType, OrderStatus, OrderItemStatus, PaymentMethod, PaymentStatus, VoucherType, InventoryAdjustmentType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for HiAI-MenuGo...');

  const defaultPasswordHash = bcrypt.hashSync('123456', 10);

  // 1. Create or upsert Tenant
  const tenant = await prisma.tenant.upsert({
    where: { code: 'MENUGO_DEMO' },
    update: {},
    create: {
      code: 'MENUGO_DEMO',
      name: 'Nhà Hàng Mẫu HiAI-MenuGo',
      slug: 'hiai-menugo-demo',
      ownerEmail: 'admin@menu-go.vn',
      ownerPhone: '0901234567',
      status: TenantStatus.ACTIVE,
      plan: SubscriptionPlan.PRO,
      planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      maxBranches: 5,
      maxUsers: 25,
      branding: {
        create: {
          logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop',
          bannerUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=400&fit=crop',
          primaryColor: '#f59e0b',
          secondaryColor: '#d97706',
          accentColor: '#fbbf24',
          bankCode: 'MB',
          bankAccountNo: '0901234567',
          bankAccountName: 'CONG TY CO PHAN HIAI MENUGO',
          wifiSsid: 'HiAI-MenuGo_Guest_5G',
          wifiPassword: 'menugovietnam',
          footerText: 'Cảm ơn quý khách và hẹn gặp lại!',
        },
      },
    },
  });

  console.log(`✅ Tenant seeded: ${tenant.name} (${tenant.id})`);

  // Clean up any existing child data for idempotent re-runs
  await prisma.voucherUsage.deleteMany({ where: { voucher: { tenantId: tenant.id } } });
  await prisma.voucher.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.paymentTransaction.deleteMany({ where: { session: { tenantId: tenant.id } } });
  await prisma.orderItemModifier.deleteMany({ where: { orderItem: { order: { tenantId: tenant.id } } } });
  await prisma.orderItem.deleteMany({ where: { order: { tenantId: tenant.id } } });
  await prisma.order.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.orderSession.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.zReport.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.recipe.deleteMany({ where: { menuItem: { tenantId: tenant.id } } });
  await prisma.inventoryLog.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.ingredient.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.itemModifierGroup.deleteMany({ where: { menuItem: { tenantId: tenant.id } } });
  await prisma.menuItem.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.modifierOption.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.modifierGroup.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.menuCategory.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.table.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.area.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.customer.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.membershipTier.deleteMany({ where: { tenantId: tenant.id } });

  // 2. Create Default Branch
  const branch = await prisma.branch.upsert({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: 'BR-01',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'BR-01',
      name: 'Chi Nhánh Quận 1 (Flagship Store)',
      address: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. HCM',
      phone: '02838123456',
      latitude: 10.7769,
      longitude: 106.7009,
      radiusMeters: 150.0,
      isActive: true,
    },
  });

  console.log(`✅ Branch seeded: ${branch.name} (${branch.id})`);

  // 3. Create Users
  const usersData = [
    {
      email: 'superadmin@platform.vn',
      name: 'Super Admin Nền Tảng',
      role: UserRole.PLATFORM_ADMIN,
      branchId: null,
    },
    {
      email: 'admin@menu-go.vn',
      name: 'Trần Hoàng Đạt (Chủ quán)',
      role: UserRole.ADMIN,
      branchId: branch.id,
    },
    {
      email: 'manager@menu-go.vn',
      name: 'Lê Thanh Hải (Quản lý)',
      role: UserRole.MANAGER,
      branchId: branch.id,
    },
    {
      email: 'cashier@menu-go.vn',
      name: 'Nguyễn Thị Mai (Thu ngân)',
      role: UserRole.CASHIER,
      branchId: branch.id,
    },
    {
      email: 'kitchen@menu-go.vn',
      name: 'Phạm Văn Bếp (Bếp trưởng)',
      role: UserRole.KITCHEN,
      branchId: branch.id,
    },
  ];

  for (const u of usersData) {
    await prisma.tenantUser.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: u.email,
        },
      },
      update: { role: u.role, branchId: u.branchId },
      create: {
        tenantId: tenant.id,
        branchId: u.branchId,
        email: u.email,
        name: u.name,
        passwordHash: defaultPasswordHash,
        role: u.role,
        isActive: true,
      },
    });
  }
  console.log(`✅ Seeded ${usersData.length} users with password '123456'`);

  // 4. Create Areas and Tables
  const groundFloor = await prisma.area.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      name: 'Tầng Trệt (Máy Lạnh)',
      displayOrder: 1,
      tables: {
        create: [
          { tenantId: tenant.id, branchId: branch.id, code: 'Bàn 01', name: 'Bàn 01 - Cửa Sổ', capacity: 2, status: TableStatus.EMPTY },
          { tenantId: tenant.id, branchId: branch.id, code: 'Bàn 02', name: 'Bàn 02 - Trung Tâm', capacity: 4, status: TableStatus.OCCUPIED },
          { tenantId: tenant.id, branchId: branch.id, code: 'Bàn 03', name: 'Bàn 03 - Góc Ấm', capacity: 4, status: TableStatus.EMPTY },
          { tenantId: tenant.id, branchId: branch.id, code: 'Bàn 04', name: 'Bàn 04 - Nhóm', capacity: 6, status: TableStatus.EMPTY },
        ],
      },
    },
  });

  const gardenArea = await prisma.area.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      name: 'Khu Sân Vườn Ngoài Trời',
      displayOrder: 2,
      tables: {
        create: [
          { tenantId: tenant.id, branchId: branch.id, code: 'Bàn 05', name: 'Bàn 05 - Hiên Trà', capacity: 4, status: TableStatus.EMPTY },
          { tenantId: tenant.id, branchId: branch.id, code: 'Bàn 06', name: 'Bàn 06 - Hồ Cá', capacity: 4, status: TableStatus.EMPTY },
          { tenantId: tenant.id, branchId: branch.id, code: 'VIP-01', name: 'Phòng VIP Hoàng Gia', capacity: 10, status: TableStatus.RESERVED },
        ],
      },
    },
  });
  console.log(`✅ Areas and Tables seeded for branch ${branch.name}`);

  // 5. Modifier Groups & Options
  const sizeGroup = await prisma.modifierGroup.create({
    data: {
      tenantId: tenant.id,
      name: 'Kích cỡ (Size)',
      minSelect: 1,
      maxSelect: 1,
      isRequired: true,
      options: {
        create: [
          { tenantId: tenant.id, name: 'Size M (Tiêu chuẩn)', extraPrice: 0, isDefault: true, displayOrder: 1 },
          { tenantId: tenant.id, name: 'Size L (+10.000đ)', extraPrice: 10000, isDefault: false, displayOrder: 2 },
        ],
      },
    },
    include: { options: true },
  });

  const sugarGroup = await prisma.modifierGroup.create({
    data: {
      tenantId: tenant.id,
      name: 'Độ ngọt (Đường)',
      minSelect: 1,
      maxSelect: 1,
      isRequired: true,
      options: {
        create: [
          { tenantId: tenant.id, name: '100% Đường', extraPrice: 0, isDefault: true, displayOrder: 1 },
          { tenantId: tenant.id, name: '70% Đường', extraPrice: 0, isDefault: false, displayOrder: 2 },
          { tenantId: tenant.id, name: '50% Đường (Ít ngọt)', extraPrice: 0, isDefault: false, displayOrder: 3 },
          { tenantId: tenant.id, name: 'Không đường', extraPrice: 0, isDefault: false, displayOrder: 4 },
        ],
      },
    },
    include: { options: true },
  });

  const iceGroup = await prisma.modifierGroup.create({
    data: {
      tenantId: tenant.id,
      name: 'Lượng đá',
      minSelect: 1,
      maxSelect: 1,
      isRequired: true,
      options: {
        create: [
          { tenantId: tenant.id, name: '100% Đá', extraPrice: 0, isDefault: true, displayOrder: 1 },
          { tenantId: tenant.id, name: '70% Đá', extraPrice: 0, isDefault: false, displayOrder: 2 },
          { tenantId: tenant.id, name: '50% Đá (Ít đá)', extraPrice: 0, isDefault: false, displayOrder: 3 },
          { tenantId: tenant.id, name: 'Không đá', extraPrice: 0, isDefault: false, displayOrder: 4 },
        ],
      },
    },
    include: { options: true },
  });

  const toppingGroup = await prisma.modifierGroup.create({
    data: {
      tenantId: tenant.id,
      name: 'Topping thêm',
      minSelect: 0,
      maxSelect: 5,
      isRequired: false,
      options: {
        create: [
          { tenantId: tenant.id, name: 'Trân Châu Trắng Giòn', extraPrice: 10000, displayOrder: 1 },
          { tenantId: tenant.id, name: 'Kem Cheese Macchiato', extraPrice: 12000, displayOrder: 2 },
          { tenantId: tenant.id, name: 'Thạch Dừa Giòn', extraPrice: 8000, displayOrder: 3 },
          { tenantId: tenant.id, name: 'Đào Miếng Thơm Ngọt', extraPrice: 10000, displayOrder: 4 },
        ],
      },
    },
    include: { options: true },
  });
  console.log(`✅ Modifier groups and options created`);

  // 6. Menu Categories & Items
  const catTea = await prisma.menuCategory.create({
    data: {
      tenantId: tenant.id,
      name: 'Trà Trái Cây & Milk Tea',
      slug: 'tra-trai-cay',
      isDrink: true,
      displayOrder: 1,
    },
  });

  const catCoffee = await prisma.menuCategory.create({
    data: {
      tenantId: tenant.id,
      name: 'Cà Phê Truyền Thống & Hiện Đại',
      slug: 'ca-phe',
      isDrink: true,
      displayOrder: 2,
    },
  });

  const catFood = await prisma.menuCategory.create({
    data: {
      tenantId: tenant.id,
      name: 'Đồ Ăn Nhẹ & Bánh Ngọt',
      slug: 'do-an-nhe',
      isDrink: false,
      displayOrder: 3,
    },
  });

  // Seed Menu Items
  const item1 = await prisma.menuItem.create({
    data: {
      tenantId: tenant.id,
      categoryId: catTea.id,
      code: 'TEA-01',
      name: 'Trà Đào Cam Sả',
      description: 'Hương vị đào tươi giòn ngọt kết hợp cam vàng mọng nước và sả thanh mát chuẩn vị.',
      basePrice: 45000,
      costPrice: 12000,
      imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&h=500&fit=crop',
      modifierGroups: {
        create: [
          { modifierGroupId: sizeGroup.id, displayOrder: 1 },
          { modifierGroupId: sugarGroup.id, displayOrder: 2 },
          { modifierGroupId: iceGroup.id, displayOrder: 3 },
          { modifierGroupId: toppingGroup.id, displayOrder: 4 },
        ],
      },
    },
  });

  const item2 = await prisma.menuItem.create({
    data: {
      tenantId: tenant.id,
      categoryId: catCoffee.id,
      code: 'CF-01',
      name: 'Cà Phê Muối Đặc Biệt',
      description: 'Cà phê Robusta Đắk Lắk đậm đà hòa quyện cùng lớp kem muối béo ngậy mằn mặn.',
      basePrice: 35000,
      costPrice: 8000,
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&h=500&fit=crop',
      modifierGroups: {
        create: [
          { modifierGroupId: sizeGroup.id, displayOrder: 1 },
          { modifierGroupId: sugarGroup.id, displayOrder: 2 },
          { modifierGroupId: iceGroup.id, displayOrder: 3 },
        ],
      },
    },
  });

  const item3 = await prisma.menuItem.create({
    data: {
      tenantId: tenant.id,
      categoryId: catCoffee.id,
      code: 'CF-02',
      name: 'Bạc Xỉu Sài Gòn',
      description: 'Vị ngọt dịu của sữa đặc thơm béo, nhẹ nhàng đưa hương vị cà phê phin nguyên bản.',
      basePrice: 32000,
      costPrice: 7500,
      imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&h=500&fit=crop',
      modifierGroups: {
        create: [
          { modifierGroupId: sizeGroup.id, displayOrder: 1 },
          { modifierGroupId: sugarGroup.id, displayOrder: 2 },
          { modifierGroupId: iceGroup.id, displayOrder: 3 },
        ],
      },
    },
  });

  const item4 = await prisma.menuItem.create({
    data: {
      tenantId: tenant.id,
      categoryId: catFood.id,
      code: 'FD-01',
      name: 'Khoai Tây Chiên Phô Mai',
      description: 'Khoai tây cắt ziczac chiên vàng ruộm lắc bột phô mai béo thơm ngất ngây.',
      basePrice: 39000,
      costPrice: 11000,
      imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&h=500&fit=crop',
    },
  });

  const item5 = await prisma.menuItem.create({
    data: {
      tenantId: tenant.id,
      categoryId: catFood.id,
      code: 'FD-02',
      name: 'Bánh Croissant Bơ Pháp',
      description: 'Bánh sừng bò ngàn lớp thơm lừng bơ Pháp cao cấp, vỏ ngoài giòn xốp bên trong mềm ẩm.',
      basePrice: 42000,
      costPrice: 15000,
      imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&h=500&fit=crop',
    },
  });
  console.log(`✅ Menu items seeded with category relations`);

  // 7. Ingredients & BOM (Recipes)
  const ingCoffee = await prisma.ingredient.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      code: 'ING-CF-01',
      name: 'Hạt Cà Phê Robusta Nguyên Chất',
      unit: 'g',
      currentStock: 25000, // 25kg
      minStock: 5000,
      costPerUnit: 250, // 250đ/g
    },
  });

  const ingCondensedMilk = await prisma.ingredient.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      code: 'ING-MILK-01',
      name: 'Sữa Đặc Ngôi Sao',
      unit: 'ml',
      currentStock: 15000,
      minStock: 3000,
      costPerUnit: 80,
    },
  });

  const ingTeaLeaves = await prisma.ingredient.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      code: 'ING-TEA-01',
      name: 'Trà Đen Earl Grey Thượng Hạng',
      unit: 'g',
      currentStock: 10000,
      minStock: 2000,
      costPerUnit: 400,
    },
  });

  const ingPeach = await prisma.ingredient.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      code: 'ING-PEACH-01',
      name: 'Đào Ngâm Rhodes',
      unit: 'miếng',
      currentStock: 500,
      minStock: 100,
      costPerUnit: 2500,
    },
  });

  // Link BOM Recipes
  await prisma.recipe.createMany({
    data: [
      { menuItemId: item1.id, ingredientId: ingTeaLeaves.id, quantity: 15 },
      { menuItemId: item1.id, ingredientId: ingPeach.id, quantity: 2 },
      { menuItemId: item2.id, ingredientId: ingCoffee.id, quantity: 25 },
      { menuItemId: item2.id, ingredientId: ingCondensedMilk.id, quantity: 30 },
      { menuItemId: item3.id, ingredientId: ingCoffee.id, quantity: 15 },
      { menuItemId: item3.id, ingredientId: ingCondensedMilk.id, quantity: 45 },
    ],
  });
  console.log(`✅ Ingredients & BOM recipes linked`);

  // 8. Membership Tiers & Sample Customer
  const bronzeTier = await prisma.membershipTier.create({
    data: { tenantId: tenant.id, name: 'Đồng', minPoints: 0, discountRate: 0, color: '#94a3b8' },
  });
  const silverTier = await prisma.membershipTier.create({
    data: { tenantId: tenant.id, name: 'Bạc', minPoints: 100, discountRate: 5, color: '#38bdf8' },
  });
  const goldTier = await prisma.membershipTier.create({
    data: { tenantId: tenant.id, name: 'Vàng', minPoints: 300, discountRate: 10, color: '#f59e0b' },
  });
  const diamondTier = await prisma.membershipTier.create({
    data: { tenantId: tenant.id, name: 'Kim Cương', minPoints: 800, discountRate: 15, color: '#a855f7' },
  });

  const customer = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      tierId: goldTier.id,
      name: 'Nguyễn Văn Anh',
      phone: '0987654321',
      email: 'vananh@gmail.com',
      loyaltyPoints: 340,
      totalSpent: 4850000,
    },
  });
  console.log(`✅ Membership tiers & sample customer ${customer.name} seeded`);

  // 9. Sample Vouchers
  await prisma.voucher.createMany({
    data: [
      {
        tenantId: tenant.id,
        code: 'CHAO2026',
        description: 'Giảm 20% tối đa 50.000đ cho đơn hàng từ 100.000đ',
        type: VoucherType.PERCENT,
        value: 20,
        maxDiscount: 50000,
        minOrderVal: 100000,
        usageLimit: 500,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
      {
        tenantId: tenant.id,
        code: 'GIAM30K',
        description: 'Giảm trực tiếp 30.000đ cho hóa đơn từ 150.000đ',
        type: VoucherType.FIXED,
        value: 30000,
        minOrderVal: 150000,
        usageLimit: 200,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
    ],
  });
  console.log(`✅ Promotional vouchers seeded`);

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
