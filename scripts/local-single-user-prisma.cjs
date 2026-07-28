const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { buildLocalSingleUserEnv, projectRoot } = require("./local-single-user-runtime.cjs");
const { generateLocalSchema, targetSchemaPath } = require("./generate-local-prisma-schema.cjs");

function resolvePrismaCli() {
  const candidates = [
    path.join(projectRoot, "node_modules", "prisma", "build", "index.js"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return require.resolve("prisma/build/index.js", { paths: [projectRoot] });
}

function runPrisma(args, env) {
  const prismaCli = resolvePrismaCli();
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: projectRoot,
    env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function main() {
  const action = String(process.argv[2] || "db-init").trim().toLowerCase();
  generateLocalSchema();
  const { env, paths } = buildLocalSingleUserEnv();

  if (action === "generate") {
    runPrisma(["generate", "--schema", targetSchemaPath], env);
    return;
  }

  if (action === "db-push") {
    runPrisma(["generate", "--schema", targetSchemaPath], env);
    runPrisma(["db", "push", "--schema", targetSchemaPath, "--skip-generate", "--accept-data-loss"], env);
    console.log(`本地 SQLite 已同步：${paths.dbPath}`);
    return;
  }

  if (action === "validate") {
    runPrisma(["validate", "--schema", targetSchemaPath], env);
    return;
  }

  if (action === "db-init") {
    runPrisma(["generate", "--schema", targetSchemaPath], env);
    runPrisma(["db", "push", "--schema", targetSchemaPath, "--skip-generate", "--accept-data-loss"], env);
    console.log(`local-single-user 数据库初始化完成：${paths.dbPath}`);
    return;
  }

  console.error(`不支持的 local-single-user Prisma 动作：${action}`);
  process.exit(1);
}

main();
