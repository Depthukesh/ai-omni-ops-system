import { spawnSync } from "node:child_process";

import { loadOperationsPromptSeeds } from "../apps/server/src/modules/works/operations-prompt-center.helpers";

function escapeSqlString(value: unknown) {
  return String(value ?? "").replace(/'/g, "''");
}

async function main() {
  const seeds = await loadOperationsPromptSeeds(process.cwd());
  const statements = ["BEGIN;"];

  for (const seed of seeds) {
    const tagsJson = escapeSqlString(JSON.stringify(seed.tagsJson));
    statements.push(
      [
        "INSERT INTO public.\"OperationsPromptTemplate\"",
        "(",
        "\"id\", \"slug\", \"title\", \"preview\", \"content\", \"status\",",
        "\"sourceFilePath\", \"sourceCategory\", \"sourceFileName\",",
        "\"businessStage\", \"outputType\", \"scenarioLabel\",",
        "\"tagsJson\", \"sortOrder\", \"createdAt\", \"updatedAt\"",
        ") VALUES (",
        `'${escapeSqlString(seed.id)}',`,
        `'${escapeSqlString(seed.slug)}',`,
        `'${escapeSqlString(seed.title)}',`,
        `'${escapeSqlString(seed.preview)}',`,
        `'${escapeSqlString(seed.content)}',`,
        "'ACTIVE',",
        `'${escapeSqlString(seed.sourceFilePath)}',`,
        `'${escapeSqlString(seed.sourceCategory)}',`,
        `'${escapeSqlString(seed.sourceFileName)}',`,
        `'${escapeSqlString(seed.businessStage)}',`,
        `'${escapeSqlString(seed.outputType)}',`,
        `'${escapeSqlString(seed.scenarioLabel)}',`,
        `'${tagsJson}'::jsonb,`,
        `${Number(seed.sortOrder) || 100},`,
        "NOW(), NOW()",
        ")",
        "ON CONFLICT (\"sourceFilePath\") DO UPDATE SET",
        "\"slug\" = EXCLUDED.\"slug\",",
        "\"title\" = EXCLUDED.\"title\",",
        "\"preview\" = EXCLUDED.\"preview\",",
        "\"content\" = EXCLUDED.\"content\",",
        "\"status\" = EXCLUDED.\"status\",",
        "\"sourceCategory\" = EXCLUDED.\"sourceCategory\",",
        "\"sourceFileName\" = EXCLUDED.\"sourceFileName\",",
        "\"businessStage\" = EXCLUDED.\"businessStage\",",
        "\"outputType\" = EXCLUDED.\"outputType\",",
        "\"scenarioLabel\" = EXCLUDED.\"scenarioLabel\",",
        "\"tagsJson\" = EXCLUDED.\"tagsJson\",",
        "\"sortOrder\" = EXCLUDED.\"sortOrder\",",
        "\"updatedAt\" = NOW();",
      ].join(" "),
    );
  }

  statements.push("COMMIT;");

  const importResult = spawnSync(
    "docker",
    ["exec", "-i", "ai-omni-postgres", "psql", "-U", "postgres", "-d", "ai_omni_ops"],
    {
      input: statements.join("\n"),
      encoding: "utf8",
    },
  );

  process.stdout.write(importResult.stdout ?? "");
  process.stderr.write(importResult.stderr ?? "");

  if (importResult.status !== 0) {
    process.exit(importResult.status ?? 1);
  }

  const countResult = spawnSync(
    "docker",
    [
      "exec",
      "ai-omni-postgres",
      "psql",
      "-U",
      "postgres",
      "-d",
      "ai_omni_ops",
      "-t",
      "-A",
      "-c",
      "SELECT COUNT(*) FROM public.\"OperationsPromptTemplate\";",
    ],
    {
      encoding: "utf8",
    },
  );

  process.stdout.write(countResult.stdout ?? "");
  process.stderr.write(countResult.stderr ?? "");

  if (countResult.status !== 0) {
    process.exit(countResult.status ?? 1);
  }

  console.log(`Imported templates: ${seeds.length}`);
}

void main();
