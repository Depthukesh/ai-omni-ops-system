import "reflect-metadata";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

const expressBodyParser: {
  json: (options: { limit: string }) => unknown;
  urlencoded: (options: { extended: boolean; limit: string }) => unknown;
} = require("express");

function loadLocalEnvFiles() {
  if (typeof process.loadEnvFile !== "function") {
    return;
  }

  const candidates = [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env.local"),
    resolve(process.cwd(), "../../.env"),
  ];

  for (const filePath of candidates) {
    if (existsSync(filePath)) {
      process.loadEnvFile(filePath);
    }
  }
}

async function bootstrap() {
  loadLocalEnvFiles();
  const app = await NestFactory.create(AppModule);
  app.use(expressBodyParser.json({ limit: "30mb" }));
  app.use(expressBodyParser.urlencoded({ extended: true, limit: "30mb" }));
  app.setGlobalPrefix("api");
  app.enableCors();

  const port = Number(process.env.PORT || 3011);
  await app.listen(port);
  console.log(`AI全域运营系统后端已启动: http://localhost:${port}/api/health`);
}

void bootstrap();
