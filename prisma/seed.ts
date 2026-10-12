import {
  PrismaClient,
  UserRole,
  SubscriptionPlan,
  TenantStatus,
  TableStatus,
  VoucherType,
  SessionStatus,
  OrderStatus,
  OrderItemStatus,
  OrderType,
  PaymentStatus,
  PaymentMethod,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seeding for Tasty Station x HiAI-MenuGo...');

  const defaultPasswordHash = bcrypt.hashSync('123456', 10);

  // ==========================================
  // 1. TENANT & BRANDING (Tasty Station / HiAI-MenuGo)
  // ==========================================
  const brandingData = {
    logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=400&fit=crop',
    primaryColor: '#00A389', // Tasty Station Turquoise
    secondaryColor: '#FF7A59', // Coral Orange
    accentColor: '#A855F7', // Lavender Purple
    bankCode: 'VCB',
    bankAccountNo: '1028391829',
    bankAccountName: 'IBRAHIM KADRI',
    wifiSsid: 'TastyStation_5G_Guest',
    wifiPassword: 'tastystation2026',
    footerText: 'Cảm ơn Quý khách & Hẹn gặp lại tại Tasty Station!',
  };

  const tenant = await prisma.tenant.upsert({
    where: { code: 'TASTY_STATION' },
    update: {
      name: 'Tasty Station (HiAI-MenuGo)',
      ownerEmail: 'admin@tastystation.com',
      ownerPhone: '0901234567',
    },
    create: {
      code: 'TASTY_STATION',
      name: 'Tasty Station (HiAI-MenuGo)',
      slug: 'tasty-station',
      ownerEmail: 'admin@tastystation.com',
      ownerPhone: '0901234567',
      status: TenantStatus.ACTIVE,
      plan: SubscriptionPlan.ENTERPRISE,
      planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      maxBranches: 10,
      maxUsers: 50,
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

  // ==========================================
  // 2. FLAGSHIP STORE BRANCH
  // ==========================================
  const branch = await prisma.branch.upsert({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: 'TS-01',
      },
    },
    update: {
      name: 'Tasty Station - Chi Nhánh Thủ Đức',
      address: '123 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP. HCM',
      phone: '02838967890',
      latitude: 10.8505,
      longitude: 106.7719,
      radiusMeters: 200.0,
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      code: 'TS-01',
      name: 'Tasty Station - Chi Nhánh Thủ Đức',
      address: '123 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP. HCM',
      phone: '02838967890',
      latitude: 10.8505,
      longitude: 106.7719,
      radiusMeters: 200.0,
      isActive: true,
    },
  });

  console.log(`✅ Branch seeded: ${branch.name}`);

  // ==========================================
  // 3. STAFF USERS (3 tài khoản duy nhất: sa, thd, pvd)
  // ==========================================
  const usersData = [
    {
      email: 'sa@email.com',
      name: 'Super Admin',
      role: UserRole.PLATFORM_ADMIN,
      branchId: null,
    },
    {
      email: 'thd@gmail.com',
      name: 'Trần Đạt',
      role: UserRole.ADMIN,
      branchId: branch.id,
    },
    {
      email: 'pvd@gmail.com',
      name: 'Phạm Đoàn',
      role: UserRole.CASHIER,
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
  console.log(`✅ Seeded ${usersData.length} staff users (Password: '123' / '123456')`);

  // ==========================================
  // 4. AREAS & TABLES (Mirroring Screenshot 2 Floor Plan)
  // ==========================================
  const areasData = [
    { name: 'Main Dining', displayOrder: 1 },
    { name: 'Terrace', displayOrder: 2 },
    { name: 'Outdoor', displayOrder: 3 },
  ];

  const areaMap = new Map<string, any>();
  for (const a of areasData) {
    const area = await prisma.area.upsert({
      where: {
        tenantId_branchId_name: {
          tenantId: tenant.id,
          branchId: branch.id,
          name: a.name,
        },
      },
      update: { displayOrder: a.displayOrder },
      create: {
        tenantId: tenant.id,
        branchId: branch.id,
        name: a.name,
        displayOrder: a.displayOrder,
      },
    });
    areaMap.set(a.name, area);
  }

  const mainDining = areaMap.get('Main Dining');
  const terrace = areaMap.get('Terrace');
  const outdoor = areaMap.get('Outdoor');

  // Main Dining Tables 1-12 matching Screenshot 2
  const mainDiningTables = [
    { code: 'Table #1', name: 'Table #1 (Main Dining)', capacity: 6, status: TableStatus.EMPTY },
    { code: 'Table #2', name: 'Table #2 (Main Dining)', capacity: 2, status: TableStatus.OCCUPIED },
    { code: 'Table #3', name: 'Table #3 (Main Dining)', capacity: 2, status: TableStatus.RESERVED },
    { code: 'Table #4', name: 'Table #4 (Main Dining)', capacity: 3, status: TableStatus.OCCUPIED },
    { code: 'Table #5', name: 'Table #5 (Main Dining)', capacity: 2, status: TableStatus.EMPTY },
    { code: 'Table #6', name: 'Table #6 (Main Dining)', capacity: 7, status: TableStatus.EMPTY },
    { code: 'Table #7', name: 'Table #7 (Main Dining)', capacity: 10, status: TableStatus.EMPTY },
    { code: 'Table #8', name: 'Table #8 (Main Dining)', capacity: 2, status: TableStatus.OCCUPIED },
    { code: 'Table #9', name: 'Table #9 (Main Dining)', capacity: 4, status: TableStatus.OCCUPIED },
    { code: 'Table #10', name: 'Table #10 (Main Dining)', capacity: 2, status: TableStatus.OCCUPIED },
    { code: 'Table #11', name: 'Table #11 (Main Dining)', capacity: 2, status: TableStatus.RESERVED },
    { code: 'Table #12', name: 'Table #12 (Main Dining)', capacity: 8, status: TableStatus.EMPTY },
  ];

  const tableMap = new Map<string, any>();
  for (const t of mainDiningTables) {
    const record = await prisma.table.upsert({
      where: {
        branchId_code: {
          branchId: branch.id,
          code: t.code,
        },
      },
      update: {
        name: t.name,
        capacity: t.capacity,
        areaId: mainDining.id,
        status: t.status,
      },
      create: {
        tenantId: tenant.id,
        branchId: branch.id,
        areaId: mainDining.id,
        code: t.code,
        name: t.name,
        capacity: t.capacity,
        status: t.status,
      },
    });
    tableMap.set(t.code, record);
  }

  // Terrace & Outdoor Tables
  const otherTables = [
    { code: 'Terrace #1', name: 'Bàn T-01 (Terrace)', capacity: 4, areaId: terrace.id, status: TableStatus.EMPTY },
    { code: 'Terrace #2', name: 'Bàn T-02 (Terrace)', capacity: 4, areaId: terrace.id, status: TableStatus.EMPTY },
    { code: 'Outdoor #1', name: 'Bàn O-01 (Outdoor)', capacity: 6, areaId: outdoor.id, status: TableStatus.EMPTY },
    { code: 'Outdoor #2', name: 'Bàn O-02 (Outdoor)', capacity: 8, areaId: outdoor.id, status: TableStatus.EMPTY },
  ];

  for (const t of otherTables) {
    const record = await prisma.table.upsert({
      where: {
        branchId_code: {
          branchId: branch.id,
          code: t.code,
        },
      },
      update: {
        name: t.name,
        capacity: t.capacity,
        areaId: t.areaId,
        status: t.status,
      },
      create: {
        tenantId: tenant.id,
        branchId: branch.id,
        areaId: t.areaId,
        code: t.code,
        name: t.name,
        capacity: t.capacity,
        status: t.status,
      },
    });
    tableMap.set(t.code, record);
  }
  console.log(`✅ Seeded 16 Tables across 3 Areas (Main Dining, Terrace, Outdoor)`);

  // ==========================================
  // 5. MENU CATEGORIES (From FE INITIAL_CATEGORIES)
  // ==========================================
  const categoriesData = [
    { slug: 'all-dishes', name: 'All Dishes', icon: '🍲', isDrink: false, displayOrder: 1 },
    { slug: 'breakfast', name: 'Breakfast', icon: '🍳', isDrink: false, displayOrder: 2 },
    { slug: 'beef-dishes', name: 'Beef Dishes', icon: '🥩', isDrink: false, displayOrder: 3 },
    { slug: 'biryani', name: 'Biryani', icon: '🍛', isDrink: false, displayOrder: 4 },
    { slug: 'chicken-dishes', name: 'Chicken Dishes', icon: '🍗', isDrink: false, displayOrder: 5 },
    { slug: 'desserts', name: 'Desserts', icon: '🍰', isDrink: false, displayOrder: 6 },
    { slug: 'dinner', name: 'Dinner', icon: '🍽️', isDrink: false, displayOrder: 7 },
    { slug: 'drinks', name: 'Drinks', icon: '🍹', isDrink: true, displayOrder: 8 },
    { slug: 'fast-foods', name: 'Fast Foods', icon: '🌭', isDrink: false, displayOrder: 9 },
    { slug: 'lunch', name: 'Lunch', icon: '🍱', isDrink: false, displayOrder: 10 },
    { slug: 'platters', name: 'Platters', icon: '🥘', isDrink: false, displayOrder: 11 },
    { slug: 'salads', name: 'Salads', icon: '🥗', isDrink: false, displayOrder: 12 },
    { slug: 'side-dishes', name: 'Side Dishes', icon: '🍟', isDrink: false, displayOrder: 13 },
    { slug: 'soups', name: 'Soups', icon: '🥣', isDrink: false, displayOrder: 14 },
    { slug: 'pasta', name: 'Pasta', icon: '🍝', isDrink: false, displayOrder: 15 },
    { slug: 'rice', name: 'Rice', icon: '🍚', isDrink: false, displayOrder: 16 },
  ];

  const catMap = new Map<string, any>();
  for (const c of categoriesData) {
    const cat = await prisma.menuCategory.upsert({
      where: {
        tenantId_slug: {
          tenantId: tenant.id,
          slug: c.slug,
        },
      },
      update: {
        name: c.name,
        icon: c.icon,
        isDrink: c.isDrink,
        displayOrder: c.displayOrder,
      },
      create: {
        tenantId: tenant.id,
        slug: c.slug,
        name: c.name,
        icon: c.icon,
        isDrink: c.isDrink,
        displayOrder: c.displayOrder,
      },
    });
    catMap.set(c.slug, cat);
  }
  console.log(`✅ Seeded ${categoriesData.length} Menu Categories with Icons`);

  // ==========================================
  // 6. MENU ITEMS (From FE INITIAL_DISHES & Screenshots)
  // ==========================================
  const menuItemsData = [
    // Special / Lunch / Dinner Dishes (Screenshot 1)
    {
      code: 'LUNCH-01',
      catSlug: 'lunch',
      name: 'Grilled Salmon Steak',
      description: 'Cá hồi Na Uy áp chảo sốt bơ chanh tỏi hảo hạng, ăn kèm măng tây tươi giòn.',
      basePrice: 15.0,
      costPrice: 5.5,
      imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=350&auto=format&fit=crop&q=80',
    },
    {
      code: 'SALAD-01',
      catSlug: 'salads',
      name: 'Tofu Poke Bowl',
      description: 'Poke bowl đậu hũ hữu cơ ướp dầu mè, bơ sáp, edamame và cơm gạo lứt.',
      basePrice: 7.0,
      costPrice: 2.2,
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=350&auto=format&fit=crop&q=80',
    },
    {
      code: 'PASTA-01',
      catSlug: 'pasta',
      name: 'Pasta with Roast Beef',
      description: 'Mì Ý sốt kem nấm truffle ăn kèm thăn bò nướng mềm mọng nước chuẩn Ý.',
      basePrice: 10.0,
      costPrice: 3.8,
      imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3d5d62817ee?w=350&auto=format&fit=crop&q=80',
    },
    {
      code: 'BEEF-01',
      catSlug: 'beef-dishes',
      name: 'Beef Steak',
      description: 'Thăn ngoại bò Black Angus 250g nướng than hoa, sốt tiêu đen thượng hạng.',
      basePrice: 30.0,
      costPrice: 12.0,
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=350&auto=format&fit=crop&q=80',
    },
    {
      code: 'RICE-01',
      catSlug: 'rice',
      name: 'Shrimp Rice Bowl',
      description: 'Cơm tôm sú rim tỏi ớt sa tế đậm đà ăn kèm rau củ luộc và trứng lòng đào.',
      basePrice: 6.0,
      costPrice: 2.1,
      imageUrl: 'https://images.unsplash.com/photo-1553240799-36bbf332a5c3?w=350&auto=format&fit=crop&q=80',
    },
    {
      code: 'DES-02',
      catSlug: 'desserts',
      name: 'Apple Stuffed Pancake',
      description: 'Bánh pancake xốp mềm nhân táo quế caramen, ăn kèm kem vani Pháp.',
      basePrice: 35.0,
      costPrice: 9.0,
      imageUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=350&auto=format&fit=crop&q=80',
    },
    {
      code: 'CHK-01',
      catSlug: 'chicken-dishes',
      name: 'Chicken Quinoa & Herbs',
      description: 'Ức gà nướng thảo mộc Địa Trung Hải, ăn kèm hạt quinoa và sốt sữa chua Hy Lạp.',
      basePrice: 12.0,
      costPrice: 4.0,
      imageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=350&auto=format&fit=crop&q=80',
    },
    {
      code: 'SALAD-02',
      catSlug: 'salads',
      name: 'Vegetable Shrimp',
      description: 'Salad tôm sú tươi kèm xà lách Romaine, cà chua bi và sốt chanh leo.',
      basePrice: 10.0,
      costPrice: 3.5,
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=350&auto=format&fit=crop&q=80',
    },
    {
      code: 'SALAD-03',
      catSlug: 'salads',
      name: 'Avocado Green Salad',
      description: 'Salad bơ sáp Đà Lạt, hạt óc chó và giấm Balsamic hữu cơ.',
      basePrice: 8.5,
      costPrice: 2.8,
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=350&auto=format&fit=crop&q=80',
    },
    {
      code: 'SOUP-01',
      catSlug: 'soups',
      name: 'Spicy Tom Yum Soup',
      description: 'Súp Tom Yum hải sản chua cay chuẩn vị Thái Lan, cốt dừa béo thơm.',
      basePrice: 11.0,
      costPrice: 3.6,
      imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=350&auto=format&fit=crop&q=80',
    },
    {
      code: 'CHK-02',
      catSlug: 'chicken-dishes',
      name: 'Crispy Chicken Wings',
      description: 'Cánh gà chiên giòn rụm sốt cay ngọt Hàn Quốc, rắc mè rang thơm lừng.',
      basePrice: 9.5,
      costPrice: 3.2,
      imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=350&auto=format&fit=crop&q=80',
    },
    {
      code: 'RICE-02',
      catSlug: 'rice',
      name: 'Seafood Bibimbap',
      description: 'Cơm trộn niêu đất hải sản sốt Gochujang thơm lừng nóng hổi.',
      basePrice: 13.0,
      costPrice: 4.5,
      imageUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=350&auto=format&fit=crop&q=80',
    },

    // Desserts Catalog (Screenshot 3)
    {
      code: 'DES-01',
      catSlug: 'desserts',
      name: 'Cheese Syrniki Pancakes',
      description: 'Bánh phô mai truyền thống Đông Âu áp chảo thơm nức, ăn kèm mứt dâu rừng.',
      basePrice: 8.0,
      costPrice: 2.5,
      imageUrl: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=350&auto=format&fit=crop&q=80',
    },
    {
      code: 'DES-03',
      catSlug: 'desserts',
      name: 'Terracotta Bowl',
      description: 'Tô gốm sữa chua Hy Lạp kèm hạt chia, hạnh nhân lát và mật ong rừng.',
      basePrice: 12.0,
      costPrice: 3.8,
      imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=350&auto=format&fit=crop&q=80',
    },
    {
      code: 'DES-04',
      catSlug: 'desserts',
      name: 'Croissant Dessert',
      description: 'Bánh sừng bò nướng kẹp kem hạnh nhân và quả mọng tươi phủ đường tuyết.',
      basePrice: 15.0,
      costPrice: 4.8,
      imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=350&auto=format&fit=crop&q=80',
    },
    {
      code: 'DES-05',
      catSlug: 'desserts',
      name: 'Granola Banana & Berry',
      description: 'Yến mạch nướng giòn rụm kèm chuối tiêu, việt quất và dâu tây sấy lạnh.',
      basePrice: 10.0,
      costPrice: 3.0,
      imageUrl: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=350&auto=format&fit=crop&q=80',
    },
    {
      code: 'DES-06',
      catSlug: 'desserts',
      name: 'Vanilla Cherry Cupcake',
      description: 'Bánh cupcake vani ngọt ngào phủ kem bơ tươi và cherry mọng nước.',
      basePrice: 8.0,
      costPrice: 2.4,
      imageUrl: 'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=350&auto=format&fit=crop&q=80',
    },
    {
      code: 'DES-07',
      catSlug: 'desserts',
      name: 'Belgian Waffles',
      description: 'Bánh quế Bỉ nướng giòn rụm ăn kèm siro lá phong và bơ mặn.',
      basePrice: 20.0,
      costPrice: 6.0,
      imageUrl: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=350&auto=format&fit=crop&q=80',
    },
    {
      code: 'DES-08',
      catSlug: 'desserts',
      name: 'Granola with Yoghurt',
      description: 'Sữa chua không đường ăn kèm ngũ cốc Granola nhà làm và hạt óc chó.',
      basePrice: 15.0,
      costPrice: 4.5,
      imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=350&auto=format&fit=crop&q=80',
    },
    {
      code: 'DES-09',
      catSlug: 'desserts',
      name: 'Muesli Bowl',
      description: 'Muesli ngâm sữa hạnh nhân qua đêm ăn kèm hoa quả nhiệt đới.',
      basePrice: 10.0,
      costPrice: 3.1,
      imageUrl: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=350&auto=format&fit=crop&q=80',
    },
    {
      code: 'DES-10',
      catSlug: 'desserts',
      name: 'Waffles with Ice-cream',
      description: 'Bánh waffle nóng giòn ăn kèm 2 viên kem gelato socola và dâu tây.',
      basePrice: 10.0,
      costPrice: 3.2,
      imageUrl: 'https://images.unsplash.com/photo-1504113888839-1c8eb50233d3?w=350&auto=format&fit=crop&q=80',
    },
  ];

  const itemMap = new Map<string, any>();
  for (const it of menuItemsData) {
    const category = catMap.get(it.catSlug) || catMap.get('lunch');
    const item = await prisma.menuItem.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: it.code,
        },
      },
      update: {
        categoryId: category.id,
        name: it.name,
        description: it.description,
        basePrice: it.basePrice,
        costPrice: it.costPrice,
        imageUrl: it.imageUrl,
        isSoldOut: false,
      },
      create: {
        tenantId: tenant.id,
        categoryId: category.id,
        code: it.code,
        name: it.name,
        description: it.description,
        basePrice: it.basePrice,
        costPrice: it.costPrice,
        imageUrl: it.imageUrl,
        isSoldOut: false,
      },
    });
    itemMap.set(it.code, item);
  }
  console.log(`✅ Seeded ${menuItemsData.length} Menu Items matching FE catalog`);

  // ==========================================
  // 7. MEMBERSHIP TIERS & CUSTOMERS (From FE Customers Directory)
  // ==========================================
  const tiersData = [
    { name: 'Bronze', minPoints: 0, discountRate: 0, color: '#FF7A59' },
    { name: 'Silver', minPoints: 100, discountRate: 5, color: '#94A3B8' },
    { name: 'Gold', minPoints: 300, discountRate: 10, color: '#F59E0B' },
    { name: 'Diamond', minPoints: 800, discountRate: 15, color: '#00A389' },
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

  const customersData = [
    {
      name: 'Uthman ibn Hunaif',
      phone: '0678890000',
      email: 'uthman.hunaif@gmail.com',
      tierName: 'Diamond',
      loyaltyPoints: 1240,
      totalSpent: 1240.5,
    },
    {
      name: "Bashir ibn Sa'ad",
      phone: '0912345678',
      email: 'bashir.saad@outlook.com',
      tierName: 'Gold',
      loyaltyPoints: 780,
      totalSpent: 780.0,
    },
    {
      name: 'Ali Raza',
      phone: '0342556555',
      email: 'ali.raza@techcorp.vn',
      tierName: 'Gold',
      loyaltyPoints: 620,
      totalSpent: 620.0,
    },
    {
      name: 'Khunais ibn Hudhafa',
      phone: '0905112233',
      email: 'khunais.h@gmail.com',
      tierName: 'Silver',
      loyaltyPoints: 340,
      totalSpent: 340.0,
    },
    {
      name: "Mus'ab ibn Umayr",
      phone: '0800563554',
      email: 'musab.umayr@yahoo.com',
      tierName: 'Silver',
      loyaltyPoints: 295,
      totalSpent: 295.0,
    },
    {
      name: 'Shuja ibn Wahb',
      phone: '0779881202',
      email: 'shuja.wahb@domain.com',
      tierName: 'Bronze',
      loyaltyPoints: 110,
      totalSpent: 110.0,
    },
    {
      name: 'Sarah Nguyen',
      phone: '0938123456',
      email: 'sarah.nguyen@email.com',
      tierName: 'Diamond',
      loyaltyPoints: 1560,
      totalSpent: 1560.0,
    },
    {
      name: 'Michael Tran',
      phone: '0909876543',
      email: 'michael.tran@fnb.vn',
      tierName: 'Gold',
      loyaltyPoints: 890,
      totalSpent: 890.0,
    },
  ];

  const customerMap = new Map<string, any>();
  for (const c of customersData) {
    const tier = tierMap.get(c.tierName);
    const customer = await prisma.customer.upsert({
      where: {
        tenantId_phone: {
          tenantId: tenant.id,
          phone: c.phone,
        },
      },
      update: {
        name: c.name,
        email: c.email,
        tierId: tier?.id,
        loyaltyPoints: c.loyaltyPoints,
        totalSpent: c.totalSpent,
      },
      create: {
        tenantId: tenant.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        tierId: tier?.id,
        loyaltyPoints: c.loyaltyPoints,
        totalSpent: c.totalSpent,
      },
    });
    customerMap.set(c.name, customer);
  }
  console.log(`✅ Seeded ${customersData.length} Customers across VIP Tiers`);

  // ==========================================
  // 8. LIVE SESSIONS & ORDERS
  // ==========================================
  // Đã xóa mock data đơn hàng theo yêu cầu để hàng đợi đơn thật bắt đầu từ 0

  // ==========================================
  // 9. PROMOTIONAL VOUCHERS
  // ==========================================
  const vouchersData = [
    {
      code: 'TASTY2026',
      description: 'Giảm 20% tối đa $10 cho đơn hàng từ $25',
      type: VoucherType.PERCENT,
      value: 20,
      maxDiscount: 10,
      minOrderVal: 25,
      usageLimit: 500,
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
    {
      code: 'WELCOME5',
      description: 'Giảm ngay $5 cho khách hàng mới',
      type: VoucherType.FIXED,
      value: 5,
      maxDiscount: null,
      minOrderVal: 15,
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
  console.log(`✅ Seeded Promotional Vouchers (TASTY2026, WELCOME5)`);

  console.log('🎉 Seed completed successfully into database!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
