const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("缺少 DATABASE_URL，无法执行注册邀请码 seed。");
  }

  const inviteCodes = loadRegistrationInviteCodes();
  if (!inviteCodes.length) {
    console.warn("未找到注册邀请码文件，跳过注册邀请码 seed。");
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

  console.log(`注册邀请码已同步完成，共 ${inviteCodes.length} 条。`);
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
