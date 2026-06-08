import { PrismaClient, TrackingLinkType, InteractionType, AttributionModel } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Trackfluence demo data...');

  // ─── Creators ────────────────────────────────────────────────
  const creators = await Promise.all([
    prisma.creator.upsert({
      where: { email: 'emma@example.com' },
      update: {},
      create: {
        name: 'Emma Chen',
        email: 'emma@example.com',
        platform: 'instagram',
        handle: '@emmachen',
        metadata: { followers: 520000, niche: 'beauty' },
      },
    }),
    prisma.creator.upsert({
      where: { email: 'marcus@example.com' },
      update: {},
      create: {
        name: 'Marcus Rivera',
        email: 'marcus@example.com',
        platform: 'youtube',
        handle: '@marcusrivera',
        metadata: { followers: 1200000, niche: 'fitness' },
      },
    }),
    prisma.creator.upsert({
      where: { email: 'aisha@example.com' },
      update: {},
      create: {
        name: 'Aisha Patel',
        email: 'aisha@example.com',
        platform: 'tiktok',
        handle: '@aishapatel',
        metadata: { followers: 890000, niche: 'lifestyle' },
      },
    }),
    prisma.creator.upsert({
      where: { email: 'jake@example.com' },
      update: {},
      create: {
        name: 'Jake Morrison',
        email: 'jake@example.com',
        platform: 'youtube',
        handle: '@jakemorrison',
        metadata: { followers: 340000, niche: 'tech' },
      },
    }),
  ]);

  console.log(`✅ Created ${creators.length} creators`);

  // ─── Campaigns ───────────────────────────────────────────────
  const campaigns = await Promise.all([
    prisma.campaign.upsert({
      where: { id: 'campaign-summer-2026' },
      update: {},
      create: {
        id: 'campaign-summer-2026',
        name: 'Summer Sale 2026',
        description: 'Q3 creator-led summer sale push',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-08-31'),
        budget: 120000,
        status: 'active',
      },
    }),
    prisma.campaign.upsert({
      where: { id: 'campaign-launch-q2' },
      update: {},
      create: {
        id: 'campaign-launch-q2',
        name: 'Product Launch Q2',
        description: 'New skincare line launch with top creators',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-06-30'),
        budget: 85000,
        status: 'active',
      },
    }),
  ]);

  console.log(`✅ Created ${campaigns.length} campaigns`);

  // ─── Tracking Links ──────────────────────────────────────────
  const links = await Promise.all([
    prisma.trackingLink.upsert({
      where: { shortCode: 'emma-s26' },
      update: {},
      create: {
        shortCode: 'emma-s26',
        creatorId: creators[0].id,
        campaignId: 'campaign-summer-2026',
        destinationUrl: 'https://shop.example.com/summer',
        type: TrackingLinkType.STANDARD,
        utmSource: 'instagram',
        utmMedium: 'social',
        utmCampaign: 'summer-2026',
        clickCount: 4821,
      },
    }),
    prisma.trackingLink.upsert({
      where: { shortCode: 'marc-fit' },
      update: {},
      create: {
        shortCode: 'marc-fit',
        creatorId: creators[1].id,
        campaignId: 'campaign-summer-2026',
        destinationUrl: 'https://shop.example.com/fitness',
        type: TrackingLinkType.STANDARD,
        utmSource: 'youtube',
        utmMedium: 'video',
        utmCampaign: 'summer-2026',
        clickCount: 11203,
      },
    }),
    prisma.trackingLink.upsert({
      where: { shortCode: 'aisha-q2' },
      update: {},
      create: {
        shortCode: 'aisha-q2',
        creatorId: creators[2].id,
        campaignId: 'campaign-launch-q2',
        destinationUrl: 'https://shop.example.com/skincare',
        type: TrackingLinkType.STANDARD,
        utmSource: 'tiktok',
        utmMedium: 'social',
        utmCampaign: 'launch-q2',
        clickCount: 7634,
      },
    }),
    prisma.trackingLink.upsert({
      where: { promoCode: 'JAKE20' },
      update: {},
      create: {
        shortCode: 'jake-prm',
        creatorId: creators[3].id,
        campaignId: 'campaign-launch-q2',
        destinationUrl: 'https://shop.example.com/tech',
        type: TrackingLinkType.PROMO_CODE,
        utmSource: 'youtube',
        utmMedium: 'video',
        utmCampaign: 'launch-q2',
        promoCode: 'JAKE20',
        clickCount: 2988,
      },
    }),
  ]);

  console.log(`✅ Created ${links.length} tracking links`);

  // ─── Customers ───────────────────────────────────────────────
  const customerData = [
    { email: 'sarah.k@demo.com', firstName: 'Sarah', lastName: 'Kim', creatorIdx: 0, revenue: 289.97, orders: 3 },
    { email: 'tom.w@demo.com', firstName: 'Tom', lastName: 'Wilson', creatorIdx: 1, revenue: 142.50, orders: 2 },
    { email: 'lily.c@demo.com', firstName: 'Lily', lastName: 'Chen', creatorIdx: 2, revenue: 548.00, orders: 4 },
    { email: 'mike.r@demo.com', firstName: 'Mike', lastName: 'Ross', creatorIdx: 1, revenue: 94.99, orders: 1 },
    { email: 'zoe.h@demo.com', firstName: 'Zoe', lastName: 'Hall', creatorIdx: 0, revenue: 379.95, orders: 3 },
    { email: 'alex.m@demo.com', firstName: 'Alex', lastName: 'Martin', creatorIdx: 3, revenue: 210.00, orders: 2 },
    { email: 'priya.s@demo.com', firstName: 'Priya', lastName: 'Singh', creatorIdx: 2, revenue: 689.90, orders: 5 },
    { email: 'dan.b@demo.com', firstName: 'Dan', lastName: 'Brown', creatorIdx: 1, revenue: 159.99, orders: 1 },
    { email: 'nina.o@demo.com', firstName: 'Nina', lastName: 'Ortiz', creatorIdx: 0, revenue: 425.50, orders: 4 },
    { email: 'ryan.t@demo.com', firstName: 'Ryan', lastName: 'Turner', creatorIdx: 3, revenue: 299.00, orders: 2 },
  ];

  const customers = await Promise.all(
    customerData.map((d) =>
      prisma.customer.upsert({
        where: { email: d.email },
        update: {},
        create: {
          email: d.email,
          firstName: d.firstName,
          lastName: d.lastName,
          creatorAcquired: true,
          acquisitionCreatorId: creators[d.creatorIdx].id,
          totalRevenue: d.revenue,
          orderCount: d.orders,
          ltv: d.revenue * 1.6,
          identities: {
            create: [{ identityType: 'EMAIL', identityValue: d.email }],
          },
        },
      }),
    ),
  );

  console.log(`✅ Created ${customers.length} customers`);

  // ─── Orders ──────────────────────────────────────────────────
  const orderDates = [
    new Date('2026-04-10'), new Date('2026-04-22'), new Date('2026-05-03'),
    new Date('2026-05-15'), new Date('2026-05-28'), new Date('2026-06-05'),
  ];

  const orders = await Promise.all(
    customers.flatMap((customer, ci) =>
      Array.from({ length: Math.min(customerData[ci].orders, 2) }, (_, i) =>
        prisma.order.upsert({
          where: { externalId: `shopify-${customer.id}-${i}` },
          update: {},
          create: {
            externalId: `shopify-${customer.id}-${i}`,
            customerId: customer.id,
            totalAmount: customerData[ci].revenue / customerData[ci].orders,
            currency: 'USD',
            status: 'COMPLETED',
            source: 'shopify',
            orderDate: orderDates[(ci + i) % orderDates.length],
          },
        }),
      ),
    ),
  );

  console.log(`✅ Created ${orders.length} orders`);

  // ─── Touchpoints ─────────────────────────────────────────────
  const touchpoints = await Promise.all(
    customers.map((customer, ci) =>
      prisma.touchPoint.create({
        data: {
          customerId: customer.id,
          creatorId: creators[customerData[ci].creatorIdx].id,
          trackingLinkId: links[customerData[ci].creatorIdx].id,
          channel: creators[customerData[ci].creatorIdx].platform ?? 'social',
          interactionType: InteractionType.CLICK,
          timestamp: new Date(Date.now() - (ci + 1) * 86400000 * 3),
        },
      }),
    ),
  );

  console.log(`✅ Created ${touchpoints.length} touchpoints`);

  // ─── Attributions ────────────────────────────────────────────
  await Promise.all(
    orders.map((order, oi) => {
      const ci = oi % customers.length;
      return prisma.attribution.create({
        data: {
          orderId: order.id,
          customerId: order.customerId,
          creatorId: creators[customerData[ci].creatorIdx].id,
          touchpointId: touchpoints[ci].id,
          model: AttributionModel.FIRST_TOUCH,
          attributedRevenue: Number(order.totalAmount),
          attributionWeight: 1.0,
        },
      });
    }),
  );

  console.log(`✅ Created ${orders.length} attributions`);

  // ─── Audiences ───────────────────────────────────────────────
  const highLtvAudience = await prisma.audience.upsert({
    where: { id: 'audience-high-ltv' },
    update: {},
    create: {
      id: 'audience-high-ltv',
      name: 'High-LTV Creator Customers',
      description: 'Creator-acquired customers with LTV > $300',
      rules: [
        { field: 'creatorAcquired', operator: 'eq', value: true },
        { field: 'totalRevenue', operator: 'gt', value: 300 },
      ],
      customerCount: 0,
    },
  });

  const retentionAudience = await prisma.audience.upsert({
    where: { id: 'audience-retention' },
    update: {},
    create: {
      id: 'audience-retention',
      name: 'Multi-Purchase Customers',
      description: 'Customers with 3+ orders',
      rules: [{ field: 'orderCount', operator: 'gte', value: 3 }],
      customerCount: 0,
    },
  });

  console.log('✅ Created 2 audience segments');

  // ─── FTC Compliance Checks ───────────────────────────────────
  await Promise.all([
    prisma.fTCComplianceCheck.create({
      data: {
        creatorId: creators[0].id,
        contentUrl: 'https://instagram.com/p/abc123',
        contentType: 'POST',
        hasDisclosure: true,
        disclosureType: 'hashtag',
        isCompliant: true,
        issues: [],
      },
    }),
    prisma.fTCComplianceCheck.create({
      data: {
        creatorId: creators[1].id,
        contentUrl: 'https://youtube.com/watch?v=xyz789',
        contentType: 'VIDEO',
        hasDisclosure: false,
        isCompliant: false,
        issues: ['Missing FTC disclosure for sponsored content'],
      },
    }),
    prisma.fTCComplianceCheck.create({
      data: {
        creatorId: creators[2].id,
        contentUrl: 'https://tiktok.com/@aisha/video/1234',
        contentType: 'VIDEO',
        hasDisclosure: true,
        disclosureType: 'hashtag',
        isCompliant: true,
        issues: [],
      },
    }),
  ]);

  console.log('✅ Created FTC compliance checks');

  console.log('\n🎉 Seed complete. Trackfluence demo data is ready.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
