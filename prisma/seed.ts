import {
  PrismaClient,
  UserRole,
  SubscriptionPlan,
  TenantStatus,
  TableStatus,
  VoucherType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for HiAI-MenuGo...');

  const defaultPasswordHash = bcrypt.hashSync('123456', 10);

  // 1. Create or upsert Tenant & Branding (Idempotent)
  const brandingData = {
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
  };

  const tenant = await prisma.tenant.upsert({
    where: { code: 'MENUGO_DEMO' },
    update: {
      name: 'Nhà Hàng Mẫu HiAI-MenuGo',
      ownerEmail: 'admin@menu-go.vn',
      ownerPhone: '0901234567',
    },
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
    },
  });

  await prisma.tenantBranding.upsert({
    where: { tenantId: tenant.id },
    update: brandingData,
    create: {
      tenantId: tenant.id,
      ...brandingData,
    },
  });

  console.log(`✅ Tenant & Branding seeded: ${tenant.name} (${tenant.id})`);

  // AN TOÀN PROD: không bao giờ wipe dữ liệu vận hành.
  // Chỉ bỏ qua nạp catalog khi tenant đã có order session nào (DB đang vận hành),
  // hoặc khi chạy seed với ALLOW_SEED_WIPE=true một cách tường minh.
  const operationalSessions = await prisma.orderSession.count({ where: { tenantId: tenant.id } });
  const allowWipe = process.env.ALLOW_SEED_WIPE === 'true';
  const skipCatalog = operationalSessions > 0 && !allowWipe;

  if (skipCatalog) {
    console.log(
      `⚠️  Tenant ${tenant.code} đã có ${operationalSessions} phiên vận hành — BỎ QUA nạp catalog để bảo toàn dữ liệu thật.`
    );
  } else if (allowWipe) {
    // Chỉ wipe sạch khi ALLOW_SEED_WIPE=true được chỉ định rõ
    console.log('🧹 ALLOW_SEED_WIPE=true: dọn dẹp catalog cũ trước khi nạp...');
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
  }

  // 2. Create Default Branch (Upsert)
  const branch = await prisma.branch.upsert({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: 'BR-01',
      },
    },
    update: {
      name: 'Chi Nhánh Quận 1 (Flagship Store)',
      address: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. HCM',
      phone: '02838123456',
      latitude: 10.7769,
      longitude: 106.7009,
      radiusMeters: 150.0,
      isActive: true,
    },
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

  // 3. Create Users (Upsert)
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
      update: { role: u.role, branchId: u.branchId, name: u.name },
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

  if (skipCatalog) {
    console.log('✅ Seed an toàn hoàn tất (giữ nguyên catalog & dữ liệu vận hành).');
    return;
  }

  // 4. Create Areas and Tables (Upsert theo unique [tenantId, branchId, name] và [branchId, code])
  const groundFloor = await prisma.area.upsert({
    where: {
      tenantId_branchId_name: {
        tenantId: tenant.id,
        branchId: branch.id,
        name: 'Tầng Trệt (Máy Lạnh)',
      },
    },
    update: { displayOrder: 1 },
    create: {
      tenantId: tenant.id,
      branchId: branch.id,
      name: 'Tầng Trệt (Máy Lạnh)',
      displayOrder: 1,
    },
  });

  const groundTables = [
    { code: 'Bàn 01', name: 'Bàn 01 - Cửa Sổ', capacity: 2, status: TableStatus.EMPTY },
    { code: 'Bàn 02', name: 'Bàn 02 - Trung Tâm', capacity: 4, status: TableStatus.OCCUPIED },
    { code: 'Bàn 03', name: 'Bàn 03 - Góc Ấm', capacity: 4, status: TableStatus.EMPTY },
    { code: 'Bàn 04', name: 'Bàn 04 - Nhóm', capacity: 6, status: TableStatus.EMPTY },
  ];

  for (const t of groundTables) {
    await prisma.table.upsert({
      where: {
        branchId_code: {
          branchId: branch.id,
          code: t.code,
        },
      },
      update: {
        name: t.name,
        capacity: t.capacity,
        areaId: groundFloor.id,
        status: t.status,
      },
      create: {
        tenantId: tenant.id,
        branchId: branch.id,
        areaId: groundFloor.id,
        code: t.code,
        name: t.name,
        capacity: t.capacity,
        status: t.status,
      },
    });
  }

  const gardenArea = await prisma.area.upsert({
    where: {
      tenantId_branchId_name: {
        tenantId: tenant.id,
        branchId: branch.id,
        name: 'Khu Sân Vườn Ngoài Trời',
      },
    },
    update: { displayOrder: 2 },
    create: {
      tenantId: tenant.id,
      branchId: branch.id,
      name: 'Khu Sân Vườn Ngoài Trời',
      displayOrder: 2,
    },
  });

  const gardenTables = [
    { code: 'Bàn 05', name: 'Bàn 05 - Hiên Trà', capacity: 4, status: TableStatus.EMPTY },
    { code: 'Bàn 06', name: 'Bàn 06 - Hồ Cá', capacity: 4, status: TableStatus.EMPTY },
    { code: 'VIP-01', name: 'Phòng VIP Hoàng Gia', capacity: 10, status: TableStatus.RESERVED },
  ];

  for (const t of gardenTables) {
    await prisma.table.upsert({
      where: {
        branchId_code: {
          branchId: branch.id,
          code: t.code,
        },
      },
      update: {
        name: t.name,
        capacity: t.capacity,
        areaId: gardenArea.id,
        status: t.status,
      },
      create: {
        tenantId: tenant.id,
        branchId: branch.id,
        areaId: gardenArea.id,
        code: t.code,
        name: t.name,
        capacity: t.capacity,
        status: t.status,
      },
    });
  }
  console.log(`✅ Areas and Tables seeded (upserted) for branch ${branch.name}`);

  // 5. Modifier Groups & Options (Idempotent Upsert)
  const modifierGroupsData = [
    {
      name: 'Kích cỡ (Size)',
      minSelect: 1,
      maxSelect: 1,
      isRequired: true,
      options: [
        { name: 'Size M (Tiêu chuẩn)', extraPrice: 0, isDefault: true, displayOrder: 1 },
        { name: 'Size L (+10.000đ)', extraPrice: 10000, isDefault: false, displayOrder: 2 },
      ],
    },
    {
      name: 'Độ ngọt (Đường)',
      minSelect: 1,
      maxSelect: 1,
      isRequired: true,
      options: [
        { name: '100% Đường', extraPrice: 0, isDefault: true, displayOrder: 1 },
        { name: '70% Đường', extraPrice: 0, isDefault: false, displayOrder: 2 },
        { name: '50% Đường (Ít ngọt)', extraPrice: 0, isDefault: false, displayOrder: 3 },
        { name: 'Không đường', extraPrice: 0, isDefault: false, displayOrder: 4 },
      ],
    },
    {
      name: 'Lượng đá',
      minSelect: 1,
      maxSelect: 1,
      isRequired: true,
      options: [
        { name: '100% Đá', extraPrice: 0, isDefault: true, displayOrder: 1 },
        { name: '70% Đá', extraPrice: 0, isDefault: false, displayOrder: 2 },
        { name: '50% Đá (Ít đá)', extraPrice: 0, isDefault: false, displayOrder: 3 },
        { name: 'Không đá', extraPrice: 0, isDefault: false, displayOrder: 4 },
      ],
    },
    {
      name: 'Topping thêm',
      minSelect: 0,
      maxSelect: 5,
      isRequired: false,
      options: [
        { name: 'Trân Châu Trắng Giòn', extraPrice: 10000, isDefault: false, displayOrder: 1 },
        { name: 'Kem Cheese Macchiato', extraPrice: 12000, isDefault: false, displayOrder: 2 },
        { name: 'Thạch Dừa Giòn', extraPrice: 8000, isDefault: false, displayOrder: 3 },
        { name: 'Đào Miếng Thơm Ngọt', extraPrice: 10000, isDefault: false, displayOrder: 4 },
      ],
    },
  ];

  const modGroupMap = new Map<string, any>();
  for (const g of modifierGroupsData) {
    const group = await prisma.modifierGroup.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: g.name,
        },
      },
      update: {
        minSelect: g.minSelect,
        maxSelect: g.maxSelect,
        isRequired: g.isRequired,
      },
      create: {
        tenantId: tenant.id,
        name: g.name,
        minSelect: g.minSelect,
        maxSelect: g.maxSelect,
        isRequired: g.isRequired,
      },
    });
    modGroupMap.set(g.name, group);

    for (const opt of g.options) {
      await prisma.modifierOption.upsert({
        where: {
          modifierGroupId_name: {
            modifierGroupId: group.id,
            name: opt.name,
          },
        },
        update: {
          extraPrice: opt.extraPrice,
          isDefault: opt.isDefault,
          displayOrder: opt.displayOrder,
        },
        create: {
          tenantId: tenant.id,
          modifierGroupId: group.id,
          name: opt.name,
          extraPrice: opt.extraPrice,
          isDefault: opt.isDefault,
          displayOrder: opt.displayOrder,
        },
      });
    }
  }

  const sizeGroup = modGroupMap.get('Kích cỡ (Size)');
  const sugarGroup = modGroupMap.get('Độ ngọt (Đường)');
  const iceGroup = modGroupMap.get('Lượng đá');
  const toppingGroup = modGroupMap.get('Topping thêm');
  console.log(`✅ Modifier groups and options seeded (upserted)`);

  // 6. Menu Categories & Items (Idempotent Upsert)
  const catTea = await prisma.menuCategory.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'tra-trai-cay' } },
    update: { name: 'Trà Trái Cây & Milk Tea', isDrink: true, displayOrder: 1 },
    create: {
      tenantId: tenant.id,
      name: 'Trà Trái Cây & Milk Tea',
      slug: 'tra-trai-cay',
      isDrink: true,
      displayOrder: 1,
    },
  });

  const catCoffee = await prisma.menuCategory.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'ca-phe' } },
    update: { name: 'Cà Phê Truyền Thống & Hiện Đại', isDrink: true, displayOrder: 2 },
    create: {
      tenantId: tenant.id,
      name: 'Cà Phê Truyền Thống & Hiện Đại',
      slug: 'ca-phe',
      isDrink: true,
      displayOrder: 2,
    },
  });

  const catFood = await prisma.menuCategory.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'do-an-nhe' } },
    update: { name: 'Đồ Ăn Nhẹ & Bánh Ngọt', isDrink: false, displayOrder: 3 },
    create: {
      tenantId: tenant.id,
      name: 'Đồ Ăn Nhẹ & Bánh Ngọt',
      slug: 'do-an-nhe',
      isDrink: false,
      displayOrder: 3,
    },
  });

  const menuItemsData = [
    {
      code: 'TEA-01',
      categoryId: catTea.id,
      name: 'Trà Đào Cam Sả',
      description: 'Hương vị đào tươi giòn ngọt kết hợp cam vàng mọng nước và sả thanh mát chuẩn vị.',
      basePrice: 45000,
      costPrice: 12000,
      imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&h=500&fit=crop',
      modGroupIds: [sizeGroup.id, sugarGroup.id, iceGroup.id, toppingGroup.id],
    },
    {
      code: 'CF-01',
      categoryId: catCoffee.id,
      name: 'Cà Phê Muối Đặc Biệt',
      description: 'Cà phê Robusta Đắk Lắk đậm đà hòa quyện cùng lớp kem muối béo ngậy mằn mặn.',
      basePrice: 35000,
      costPrice: 8000,
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&h=500&fit=crop',
      modGroupIds: [sizeGroup.id, sugarGroup.id, iceGroup.id],
    },
    {
      code: 'CF-02',
      categoryId: catCoffee.id,
      name: 'Bạc Xỉu Sài Gòn',
      description: 'Vị ngọt dịu của sữa đặc thơm béo, nhẹ nhàng đưa hương vị cà phê phin nguyên bản.',
      basePrice: 32000,
      costPrice: 7500,
      imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&h=500&fit=crop',
      modGroupIds: [sizeGroup.id, sugarGroup.id, iceGroup.id],
    },
    {
      code: 'FD-01',
      categoryId: catFood.id,
      name: 'Khoai Tây Chiên Phô Mai',
      description: 'Khoai tây cắt ziczac chiên vàng ruộm lắc bột phô mai béo thơm ngất ngây.',
      basePrice: 39000,
      costPrice: 11000,
      imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&h=500&fit=crop',
      modGroupIds: [],
    },
    {
      code: 'FD-02',
      categoryId: catFood.id,
      name: 'Bánh Croissant Bơ Pháp',
      description: 'Bánh sừng bò ngàn lớp thơm lừng bơ Pháp cao cấp, vỏ ngoài giòn xốp bên trong mềm ẩm.',
      basePrice: 42000,
      costPrice: 15000,
      imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&h=500&fit=crop',
      modGroupIds: [],
    },
  ];

  const seededItems = new Map<string, any>();
  for (const it of menuItemsData) {
    const item = await prisma.menuItem.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: it.code,
        },
      },
      update: {
        categoryId: it.categoryId,
        name: it.name,
        description: it.description,
        basePrice: it.basePrice,
        costPrice: it.costPrice,
        imageUrl: it.imageUrl,
      },
      create: {
        tenantId: tenant.id,
        categoryId: it.categoryId,
        code: it.code,
        name: it.name,
        description: it.description,
        basePrice: it.basePrice,
        costPrice: it.costPrice,
        imageUrl: it.imageUrl,
      },
    });
    seededItems.set(it.code, item);

    for (let i = 0; i < it.modGroupIds.length; i++) {
      const groupId = it.modGroupIds[i];
      await prisma.itemModifierGroup.upsert({
        where: {
          menuItemId_modifierGroupId: {
            menuItemId: item.id,
            modifierGroupId: groupId,
          },
        },
        update: { displayOrder: i + 1 },
        create: {
          menuItemId: item.id,
          modifierGroupId: groupId,
          displayOrder: i + 1,
        },
      });
    }
  }

  const item1 = seededItems.get('TEA-01');
  const item2 = seededItems.get('CF-01');
  const item3 = seededItems.get('CF-02');
  console.log(`✅ Menu items seeded (upserted) with category & modifier relations`);

  // 7. Ingredients & BOM Recipes (Idempotent Upsert)
  const ingredientsData = [
    {
      code: 'ING-CF-01',
      name: 'Hạt Cà Phê Robusta Nguyên Chất',
      unit: 'g',
      currentStock: 25000,
      minStock: 5000,
      costPerUnit: 250,
    },
    {
      code: 'ING-MILK-01',
      name: 'Sữa Đặc Ngôi Sao',
      unit: 'ml',
      currentStock: 15000,
      minStock: 3000,
      costPerUnit: 80,
    },
    {
      code: 'ING-TEA-01',
      name: 'Trà Đen Earl Grey Thượng Hạng',
      unit: 'g',
      currentStock: 10000,
      minStock: 2000,
      costPerUnit: 400,
    },
    {
      code: 'ING-PEACH-01',
      name: 'Đào Ngâm Rhodes',
      unit: 'miếng',
      currentStock: 500,
      minStock: 100,
      costPerUnit: 2500,
    },
  ];

  const ingMap = new Map<string, any>();
  for (const ing of ingredientsData) {
    const record = await prisma.ingredient.upsert({
      where: {
        branchId_code: {
          branchId: branch.id,
          code: ing.code,
        },
      },
      update: {
        name: ing.name,
        unit: ing.unit,
        currentStock: ing.currentStock,
        minStock: ing.minStock,
        costPerUnit: ing.costPerUnit,
      },
      create: {
        tenantId: tenant.id,
        branchId: branch.id,
        code: ing.code,
        name: ing.name,
        unit: ing.unit,
        currentStock: ing.currentStock,
        minStock: ing.minStock,
        costPerUnit: ing.costPerUnit,
      },
    });
    ingMap.set(ing.code, record);
  }

  const ingCoffee = ingMap.get('ING-CF-01');
  const ingCondensedMilk = ingMap.get('ING-MILK-01');
  const ingTeaLeaves = ingMap.get('ING-TEA-01');
  const ingPeach = ingMap.get('ING-PEACH-01');

  // Link BOM Recipes (Upsert)
  const recipeList = [
    { menuItemId: item1.id, ingredientId: ingTeaLeaves.id, quantity: 15 },
    { menuItemId: item1.id, ingredientId: ingPeach.id, quantity: 2 },
    { menuItemId: item2.id, ingredientId: ingCoffee.id, quantity: 25 },
    { menuItemId: item2.id, ingredientId: ingCondensedMilk.id, quantity: 30 },
    { menuItemId: item3.id, ingredientId: ingCoffee.id, quantity: 15 },
    { menuItemId: item3.id, ingredientId: ingCondensedMilk.id, quantity: 45 },
  ];

  for (const r of recipeList) {
    await prisma.recipe.upsert({
      where: {
        menuItemId_ingredientId: {
          menuItemId: r.menuItemId,
          ingredientId: r.ingredientId,
        },
      },
      update: { quantity: r.quantity },
      create: r,
    });
  }
  console.log(`✅ Ingredients & BOM recipes seeded (upserted)`);

  // 8. Membership Tiers & Sample Customer (Idempotent Upsert)
  const tiersData = [
    { name: 'Đồng', minPoints: 0, discountRate: 0, color: '#94a3b8' },
    { name: 'Bạc', minPoints: 100, discountRate: 5, color: '#38bdf8' },
    { name: 'Vàng', minPoints: 300, discountRate: 10, color: '#f59e0b' },
    { name: 'Kim Cương', minPoints: 800, discountRate: 15, color: '#a855f7' },
  ];

  const tierMap = new Map<string, any>();
  for (const t of tiersData) {
    const tier = await prisma.membershipTier.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: t.name,
        },
      },
      update: {
        minPoints: t.minPoints,
        discountRate: t.discountRate,
        color: t.color,
      },
      create: {
        tenantId: tenant.id,
        name: t.name,
        minPoints: t.minPoints,
        discountRate: t.discountRate,
        color: t.color,
      },
    });
    tierMap.set(t.name, tier);
  }

  const goldTier = tierMap.get('Vàng');

  const customer = await prisma.customer.upsert({
    where: {
      tenantId_phone: {
        tenantId: tenant.id,
        phone: '0987654321',
      },
    },
    update: {
      tierId: goldTier.id,
      name: 'Nguyễn Văn Anh',
      email: 'vananh@gmail.com',
      loyaltyPoints: 340,
      totalSpent: 4850000,
    },
    create: {
      tenantId: tenant.id,
      tierId: goldTier.id,
      name: 'Nguyễn Văn Anh',
      phone: '0987654321',
      email: 'vananh@gmail.com',
      loyaltyPoints: 340,
      totalSpent: 4850000,
    },
  });
  console.log(`✅ Membership tiers & customer ${customer.name} seeded (upserted)`);

  // 9. Sample Vouchers (Idempotent Upsert)
  const vouchersData = [
    {
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
      code: 'GIAM30K',
      description: 'Giảm trực tiếp 30.000đ cho hóa đơn từ 150.000đ',
      type: VoucherType.FIXED,
      value: 30000,
      maxDiscount: null,
      minOrderVal: 150000,
      usageLimit: 200,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  ];

  for (const v of vouchersData) {
    await prisma.voucher.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: v.code,
        },
      },
      update: {
        description: v.description,
        type: v.type,
        value: v.value,
        maxDiscount: v.maxDiscount,
        minOrderVal: v.minOrderVal,
        usageLimit: v.usageLimit,
        startDate: v.startDate,
        endDate: v.endDate,
        isActive: v.isActive,
      },
      create: {
        tenantId: tenant.id,
        code: v.code,
        description: v.description,
        type: v.type,
        value: v.value,
        maxDiscount: v.maxDiscount,
        minOrderVal: v.minOrderVal,
        usageLimit: v.usageLimit,
        startDate: v.startDate,
        endDate: v.endDate,
        isActive: v.isActive,
      },
    });
  }
  console.log(`✅ Promotional vouchers seeded (upserted)`);

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
