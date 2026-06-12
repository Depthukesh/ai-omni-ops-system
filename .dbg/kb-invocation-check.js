const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const bindings = await prisma.knowledgeBinding.findMany({
    where: {
      OR: [
        { targetId: "wechat-article-composer" },
        { targetKey: "wechat-article-composer" },
        { targetName: "公众号创作文章" },
        { targetName: "公众号创作文章" }
      ]
    },
    orderBy: { updatedAt: "desc" }
  });
  let runs = [];
  try {
    runs = await prisma.$queryRawUnsafe(`SELECT "id", "sceneLabel", "sourceModule", "skillSlug", "status", "knowledgeBaseIdsJson", "matchedKnowledgeBaseIdsJson", "createdAt" FROM "KnowledgeInvocationRun" ORDER BY "createdAt" DESC LIMIT 20`);
  } catch (error) {
    runs = [{ error: error instanceof Error ? error.message : String(error) }];
  }
  console.log(JSON.stringify({ bindings, runs }, null, 2));
  await prisma.$disconnect();
})().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
