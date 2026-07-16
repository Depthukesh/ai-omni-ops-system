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
const SERVER_BODY_LIMIT = String(process.env.SERVER_BODY_LIMIT || "100mb").trim() || "100mb";

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
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  app.use(expressBodyParser.json({ limit: SERVER_BODY_LIMIT }));
  app.use(expressBodyParser.urlencoded({ extended: true, limit: SERVER_BODY_LIMIT }));
  app.setGlobalPrefix("api");
  app.enableCors({
    exposedHeaders: ["Content-Disposition", "Content-Length", "Content-Type"],
  });

  const host = appConfigService.getServerHost();
  const port = appConfigService.getServerPort();
  await app.listen(port, host);
  console.log(`AI全域运营系统后端已启动: http://${host}:${port}/api/health (body limit: ${SERVER_BODY_LIMIT})`);
}

void bootstrap();
