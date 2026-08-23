const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { PrismaClient, MembershipLevel, UserStatus } = require("@prisma/client");

const prisma = new PrismaClient();

const DEMO_USER_ID = "usr_demo_001";
const DEMO_BRAND_ID = "br_demo_001";
const DEMO_MOBILE = "13800000000";
const DEMO_PASSWORD = "123456";
const DEMO_BRAND_NAME = "默认演示品牌";
const LEGACY_DEMO_BRAND_NAME = "武汉仟吉";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("缺少 DATABASE_URL，无法执行 standard runtime seed。");
  }

  await ensureRegistrationInviteCodes();
  const demoUser = await ensureDemoUser();
  await ensureDemoBrand(demoUser.id);

  console.log(
    `standard runtime 初始化完成：演示账号 ${DEMO_MOBILE} 已可登录，默认品牌为 ${DEMO_BRAND_NAME}。`,
  );
}

async function ensureDemoUser() {
  const existing = await prisma.user.findUnique({
    where: { id: DEMO_USER_ID },
    select: {
      id: true,
      mobile: true,
      email: true,
      nickname: true,
      membership: true,
      status: true,
      passwordHash: true,
      pointsBalance: true,
    },
  });

  if (!existing) {
    return prisma.user.create({
      data: {
        id: DEMO_USER_ID,
        mobile: DEMO_MOBILE,
        email: "demo@ai-omni.local",
        nickname: "演示账号",
        passwordHash: DEMO_PASSWORD,
        membership: MembershipLevel.PRO,
        status: UserStatus.ACTIVE,
        pointsBalance: 14420,
      },
    });
  }

  const patch = {};
  if (!normalizeText(existing.mobile)) {
    patch.mobile = DEMO_MOBILE;
  }
  if (!normalizeText(existing.email)) {
    patch.email = "demo@ai-omni.local";
  }
  if (!normalizeText(existing.nickname)) {
    patch.nickname = "演示账号";
  }
  if (!normalizeText(existing.passwordHash)) {
    patch.passwordHash = DEMO_PASSWORD;
  }
  if (existing.status !== UserStatus.ACTIVE) {
    patch.status = UserStatus.ACTIVE;
  }
  if (existing.membership !== MembershipLevel.PRO) {
    patch.membership = MembershipLevel.PRO;
  }
  if (!Number.isFinite(existing.pointsBalance) || Number(existing.pointsBalance) <= 0) {
    patch.pointsBalance = 14420;
  }

  if (Object.keys(patch).length) {
    await prisma.user.update({
      where: { id: DEMO_USER_ID },
      data: patch,
    });
  }

  return prisma.user.findUniqueOrThrow({ where: { id: DEMO_USER_ID } });
}

async function ensureDemoBrand(ownerUserId) {
  const existing = await prisma.brand.findUnique({
    where: { id: DEMO_BRAND_ID },
    select: {
      id: true,
      ownerUserId: true,
      brandName: true,
      industry: true,
      storeCount: true,
      foundedYear: true,
      brandDescription: true,
      enterpriseIntro: true,
    },
  });

  const defaults = {
    ownerUserId,
    brandName: DEMO_BRAND_NAME,
    industry: "烘焙零售",
    storeCount: 12,
    foundedYear: 2024,
    brandDescription: "通用演示品牌，用于首次安装后的登录、品牌建档和主链路体验。",
    enterpriseIntro: "默认演示品牌，用于承接 Docker 标准运行态的首次初始化与主工作台联调。",
  };

  if (!existing) {
    return prisma.brand.create({
      data: {
        id: DEMO_BRAND_ID,
        ...defaults,
      },
    });
  }

  const patch = {};
  if (!normalizeText(existing.ownerUserId)) {
    patch.ownerUserId = ownerUserId;
  }
  if (shouldNormalizeLegacyDemoBrand(existing.brandName)) {
    patch.brandName = defaults.brandName;
  }
  if (!normalizeText(existing.industry)) {
    patch.industry = defaults.industry;
  }
  if (!Number.isFinite(existing.storeCount) || Number(existing.storeCount) <= 0) {
    patch.storeCount = defaults.storeCount;
  }
  if (!Number.isFinite(existing.foundedYear) || Number(existing.foundedYear) <= 0) {
    patch.foundedYear = defaults.foundedYear;
  }
  if (!normalizeText(existing.brandDescription)) {
    patch.brandDescription = defaults.brandDescription;
  }
  if (!normalizeText(existing.enterpriseIntro)) {
    patch.enterpriseIntro = defaults.enterpriseIntro;
  }

  if (Object.keys(patch).length) {
    await prisma.brand.update({
      where: { id: DEMO_BRAND_ID },
      data: patch,
    });
  }
}

async function ensureRegistrationInviteCodes() {
  const inviteCodes = loadRegistrationInviteCodes();
  if (!inviteCodes.length) {
    return;
  }

  await Promise.all(
    inviteCodes.map((code) =>
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

function shouldNormalizeLegacyDemoBrand(value) {
  const normalized = normalizeText(value);
  return !normalized || normalized === normalizeText(LEGACY_DEMO_BRAND_NAME);
}

function normalizeText(value) {
  return String(value || "").trim();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });