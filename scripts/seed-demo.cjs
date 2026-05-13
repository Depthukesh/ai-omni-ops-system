const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const {
  PrismaClient,
  PlatformType,
  AssetCategory,
  MembershipLevel,
  UserStatus,
  TaskStatus,
  MediaType,
} = require("@prisma/client");

const prisma = new PrismaClient();
const DEMO_USER_ID = "usr_demo_001";
const DEMO_BRAND_ID = "br_demo_001";
const REGISTRATION_INVITE_CODES = loadRegistrationInviteCodes();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("缺少 DATABASE_URL，无法执行 demo seed。");
  }

  await seedRegistrationInviteCodes();

  await prisma.user.deleteMany({
    where: {
      mobile: "13800000000",
      NOT: { id: DEMO_USER_ID },
    },
  });

  await prisma.brand.deleteMany({
    where: {
      brandName: "武汉仟吉",
      NOT: { id: DEMO_BRAND_ID },
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {
      mobile: "13800000000",
      email: "demo@ai-omni.local",
      nickname: "演示账号",
      membership: MembershipLevel.PRO,
      status: UserStatus.ACTIVE,
      pointsBalance: 14420,
    },
    create: {
      id: DEMO_USER_ID,
      mobile: "13800000000",
      email: "demo@ai-omni.local",
      nickname: "演示账号",
      passwordHash: "123456",
      membership: MembershipLevel.PRO,
      status: UserStatus.ACTIVE,
      pointsBalance: 14420,
    },
  });

  const brand = await prisma.brand.upsert({
    where: { id: DEMO_BRAND_ID },
    update: {
      ownerUserId: demoUser.id,
      brandName: "武汉仟吉",
      industry: "烘焙零售",
      storeCount: 180,
      foundedYear: 2000,
      brandDescription: "区域烘焙品牌，线下门店基础较强，线上全域增长空间明显。",
      enterpriseIntro: "当前聚焦品牌建档、采集、增长分析与半年营销规划。",
    },
    create: {
      id: DEMO_BRAND_ID,
      ownerUserId: demoUser.id,
      brandName: "武汉仟吉",
      industry: "烘焙零售",
      storeCount: 180,
      foundedYear: 2000,
      brandDescription: "区域烘焙品牌，线下门店基础较强，线上全域增长空间明显。",
      enterpriseIntro: "当前聚焦品牌建档、采集、增长分析与半年营销规划。",
    },
  });

  await prisma.$transaction([
    prisma.product.deleteMany({ where: { brandId: brand.id } }),
    prisma.brandSurvey.deleteMany({
      where: {
        brandId: brand.id,
        surveyType: "BRAND_ARCHIVE",
      },
    }),
    prisma.platformAccount.deleteMany({ where: { brandId: brand.id } }),
    prisma.competitorAccount.deleteMany({ where: { brandId: brand.id } }),
    prisma.industryReport.deleteMany({ where: { brandId: brand.id } }),
    prisma.businessAsset.deleteMany({
      where: {
        brandId: brand.id,
        category: AssetCategory.BUSINESS_DATA,
      },
    }),
    prisma.membershipOrder.deleteMany({ where: { userId: demoUser.id } }),
    prisma.pointLedger.deleteMany({ where: { userId: demoUser.id } }),
    prisma.mediaAsset.deleteMany({ where: { brandId: brand.id } }),
    prisma.task.deleteMany({ where: { brandId: brand.id } }),
  ]);

  await prisma.product.createMany({
    data: [
      {
        brandId: brand.id,
        productName: "爆浆提拉米苏蛋糕",
        productType: "节日蛋糕",
        price: 198,
        usageScenario: "生日庆祝与节日礼赠",
      },
      {
        brandId: brand.id,
        productName: "现烤牛角包",
        productType: "门店畅销",
        price: 12,
        usageScenario: "早餐与下午茶",
      },
    ],
  });

  await prisma.brandSurvey.create({
    data: {
      brandId: brand.id,
      surveyType: "BRAND_ARCHIVE",
      summary: "6 项品牌建档调研",
      surveyJson: [
        {
          key: "businessProcess",
          label: "业务流程",
          value: "当前以线下门店为主，线上私域承接与公域导流链路尚未完全打通。",
        },
        {
          key: "customerProfile",
          label: "客户画像",
          value: "核心为城市家庭消费者、年轻白领、节庆礼赠人群，复购需求存在但精细化运营不足。",
        },
        {
          key: "channelStatus",
          label: "线上营销渠道",
          value: "公众号与门店活动较稳定，小红书等种草渠道内容供给不足。",
        },
        {
          key: "painPoints",
          label: "商家痛点",
          value: "线上流量获取成本上升，会员沉淀与二次转化效率偏低。",
        },
        {
          key: "shortTermNeeds",
          label: "短期需求",
          value: "尽快形成可复制的内容种草、会员拉新、门店转化三位一体增长方案。",
        },
        {
          key: "longTermNeeds",
          label: "长期需求",
          value: "沉淀全域品牌资产、数据资产与自动化运营能力，降低人工依赖。",
        },
      ],
    },
  });

  await prisma.platformAccount.createMany({
    data: [
      {
        brandId: brand.id,
        platform: PlatformType.XIAOHONGSHU,
        accountName: "武汉仟吉烘焙",
        accountLink: "https://www.xiaohongshu.com/user/profile/demo",
        username: "武汉仟吉烘焙",
      },
      {
        brandId: brand.id,
        platform: PlatformType.WECHAT_OA,
        accountName: "武汉仟吉",
        accountLink: "qianji-official",
        username: "武汉仟吉",
      },
    ],
  });

  await prisma.competitorAccount.create({
    data: {
      brandId: brand.id,
      platform: PlatformType.XIAOHONGSHU,
      accountName: "区域烘焙竞品A",
      accountLink: "https://www.xiaohongshu.com/user/profile/comp-a",
      username: "区域烘焙竞品A",
    },
  });

  await prisma.industryReport.create({
    data: {
      brandId: brand.id,
      title: "烘焙品类市场分析",
      summary: "包含品类规模、价格分布、场景需求与用户偏好。",
      sourceName: "蝉妈妈 AI 市场调研",
      fileUrl: "https://oss.example.com/industry/bakery-report.pdf",
    },
  });

  await prisma.businessAsset.create({
    data: {
      brandId: brand.id,
      category: AssetCategory.BUSINESS_DATA,
      title: "有赞商城季度经营明细",
      description: "用于分析订单结构、复购率、客单价与渠道转化差异。",
      fileUrl: "https://oss.example.com/business/youzan-q1.xlsx",
      metadataJson: {
        sourceName: "有赞导出报表",
      },
    },
  });

  const growthTask = await prisma.task.create({
    data: {
      userId: demoUser.id,
      brandId: brand.id,
      taskType: "BRAND_GROWTH_REPORT",
      taskTitle: "生成品牌增长报告",
      taskStatus: TaskStatus.SUCCESS,
      modelName: "gpt-5.5",
      pointsCost: 320,
      startedAt: new Date("2026-05-01T09:20:00.000Z"),
      finishedAt: new Date("2026-05-01T09:25:00.000Z"),
    },
  });

  await prisma.task.create({
    data: {
      userId: demoUser.id,
      brandId: brand.id,
      taskType: "XHS_MARKETING_PLAN",
      taskTitle: "生成小红书营销策划方案",
      taskStatus: TaskStatus.RUNNING,
      modelName: "gpt-5.5",
      pointsCost: 260,
      startedAt: new Date("2026-05-02T02:00:00.000Z"),
    },
  });

  await prisma.mediaAsset.createMany({
    data: [
      {
        userId: demoUser.id,
        brandId: brand.id,
        taskId: growthTask.id,
        title: "品牌增长可视化报告",
        mediaType: MediaType.HTML,
        storageKey: "reports/br_demo_001/growth-report.html",
        sourceUrl: "https://oss.example.com/reports/br_demo_001/growth-report.html",
        mimeType: "text/html",
      },
      {
        userId: demoUser.id,
        brandId: brand.id,
        title: "爆浆提拉米苏封面图",
        mediaType: MediaType.IMAGE,
        storageKey: "works/br_demo_001/post-cover-001.png",
        sourceUrl: "https://oss.example.com/works/br_demo_001/post-cover-001.png",
        mimeType: "image/png",
      },
    ],
  });

  await prisma.pointLedger.createMany({
    data: [
      {
        userId: demoUser.id,
        changeType: "SYSTEM_GRANT",
        pointsDelta: 10000,
        balanceAfter: 10000,
        description: "新用户演示点数发放",
        createdAt: new Date("2026-04-30T10:00:00.000Z"),
      },
      {
        userId: demoUser.id,
        changeType: "TASK_CONSUME",
        pointsDelta: -320,
        balanceAfter: 9680,
        description: "生成品牌增长报告",
        relatedTaskId: growthTask.id,
        createdAt: new Date("2026-05-01T09:25:00.000Z"),
      },
      {
        userId: demoUser.id,
        changeType: "POINTS_RECHARGE",
        pointsDelta: 5000,
        balanceAfter: 14680,
        description: "点数充值到账",
        createdAt: new Date("2026-05-02T01:40:00.000Z"),
      },
      {
        userId: demoUser.id,
        changeType: "TASK_CONSUME",
        pointsDelta: -260,
        balanceAfter: 14420,
        description: "生成小红书营销策划方案",
        createdAt: new Date("2026-05-02T02:03:00.000Z"),
      },
    ],
  });

  await prisma.membershipOrder.createMany({
    data: [
      {
        userId: demoUser.id,
        orderNo: "MO202605010001",
        orderType: "MEMBERSHIP_PURCHASE",
        orderStatus: "PAID",
        membership: MembershipLevel.PRO,
        amountYuan: 699,
        paidAt: new Date("2026-05-01T08:50:00.000Z"),
        createdAt: new Date("2026-05-01T08:45:00.000Z"),
        updatedAt: new Date("2026-05-01T08:50:00.000Z"),
      },
      {
        userId: demoUser.id,
        orderNo: "PO202605020001",
        orderType: "POINTS_RECHARGE",
        orderStatus: "PAID",
        pointsAmount: 5000,
        amountYuan: 50,
        paidAt: new Date("2026-05-02T01:40:00.000Z"),
        createdAt: new Date("2026-05-02T01:35:00.000Z"),
        updatedAt: new Date("2026-05-02T01:40:00.000Z"),
      },
    ],
  });

  console.log(
    JSON.stringify(
      {
        seeded: true,
        userId: demoUser.id,
        brandId: brand.id,
        taskSeeded: 2,
        mediaSeeded: 2,
      },
      null,
      2,
    ),
  );
}

async function seedRegistrationInviteCodes() {
  if (!REGISTRATION_INVITE_CODES.length) {
    console.warn("未找到注册邀请码文件，跳过邀请码 seed。");
    return;
  }

  await Promise.all(
    REGISTRATION_INVITE_CODES.map((code) =>
      prisma.registrationInviteCode.upsert({
        where: { code },
        update: {},
        create: { code },
      }),
    ),
  );
}

function loadRegistrationInviteCodes() {
  const candidates = [
    resolve(process.cwd(), "prisma/seed-data/registration-invite-codes.txt"),
    resolve(process.cwd(), ".runtime/registration-invite-codes.txt"),
  ];

  const target = candidates.find((candidate) => existsSync(candidate));
  if (!target) {
    return [];
  }

  return Array.from(
    new Set(
      readFileSync(target, "utf8")
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
