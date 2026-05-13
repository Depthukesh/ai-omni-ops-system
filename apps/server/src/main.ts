import "reflect-metadata";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AppConfigService } from "./config/app-config.service";

const expressBodyParser: {
  json: (options: { limit: string }) => unknown;
  urlencoded: (options: { extended: boolean; limit: string }) => unknown;
} = require("express");

process.on("unhandledRejection", (reason) => {
  console.error("[bootstrap] unhandledRejection", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[bootstrap] uncaughtException", error);
});

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
  const appConfigService = new AppConfigService();
  const app = await NestFactory.create(AppModule);
  app.use(expressBodyParser.json({ limit: "30mb" }));
  app.use(expressBodyParser.urlencoded({ extended: true, limit: "30mb" }));
  app.setGlobalPrefix("api");
  app.enableCors({
    exposedHeaders: ["Content-Disposition", "Content-Length", "Content-Type"],
  });

  const host = appConfigService.getServerHost();
  const port = appConfigService.getServerPort();
  await app.listen(port, host);
  console.log(`AI全域运营系统后端已启动: http://${host}:${port}/api/health`);
}

void bootstrap();
