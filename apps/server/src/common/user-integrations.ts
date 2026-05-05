import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export type FeishuUserAppConfigRecord = {
  userId: string;
  appId: string;
  appSecret: string;
  redirectUri: string;
  scope: string;
  createdAt: string;
  updatedAt: string;
};

export type FeishuUserIntegrationRecord = {
  userId: string;
  provider: "FEISHU";
  providerUserOpenId: string;
  providerUserName: string;
  providerUserAvatar: string;
  accessToken: string;
  refreshToken: string;
  scope: string;
  expiresAt: string;
  refreshExpiresAt: string;
  createdAt: string;
  updatedAt: string;
};

type FeishuIntegrationStorePayload = {
  appConfigs: FeishuUserAppConfigRecord[];
  integrations: FeishuUserIntegrationRecord[];
};

const feishuIntegrationStore = new Map<string, FeishuUserIntegrationRecord>();
const feishuUserAppConfigStore = new Map<string, FeishuUserAppConfigRecord>();

hydrateStoresFromDisk();

export function getFeishuUserAppConfig(userId: string) {
  return feishuUserAppConfigStore.get(userId) ?? null;
}

export function setFeishuUserAppConfig(record: FeishuUserAppConfigRecord) {
  feishuUserAppConfigStore.set(record.userId, record);
  persistStoresToDisk();
  return record;
}

export function deleteFeishuUserAppConfig(userId: string) {
  feishuUserAppConfigStore.delete(userId);
  persistStoresToDisk();
}

export function getFeishuUserIntegration(userId: string) {
  return feishuIntegrationStore.get(userId) ?? null;
}

export function setFeishuUserIntegration(record: FeishuUserIntegrationRecord) {
  feishuIntegrationStore.set(record.userId, record);
  persistStoresToDisk();
  return record;
}

export function deleteFeishuUserIntegration(userId: string) {
  feishuIntegrationStore.delete(userId);
  persistStoresToDisk();
}

function hydrateStoresFromDisk() {
  const filePath = resolveStoreFilePath();
  if (!existsSync(filePath)) {
    return;
  }

  try {
    const raw = readFileSync(filePath, "utf8");
    if (!raw.trim()) {
      return;
    }
    const parsed = JSON.parse(raw) as Partial<FeishuIntegrationStorePayload>;
    for (const item of Array.isArray(parsed.appConfigs) ? parsed.appConfigs : []) {
      if (item?.userId) {
        feishuUserAppConfigStore.set(item.userId, item);
      }
    }
    for (const item of Array.isArray(parsed.integrations) ? parsed.integrations : []) {
      if (item?.userId) {
        feishuIntegrationStore.set(item.userId, item);
      }
    }
  } catch {
    // Ignore broken local cache and continue with empty stores.
  }
}

function persistStoresToDisk() {
  const filePath = resolveStoreFilePath();
  const directoryPath = resolve(filePath, "..");
  mkdirSync(directoryPath, { recursive: true });
  const payload: FeishuIntegrationStorePayload = {
    appConfigs: [...feishuUserAppConfigStore.values()],
    integrations: [...feishuIntegrationStore.values()],
  };
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function resolveStoreFilePath() {
  const candidates = [
    process.cwd(),
    resolve(process.cwd(), ".."),
    resolve(process.cwd(), "..", ".."),
  ];
  for (const candidate of candidates) {
    const prismaPath = join(candidate, "prisma", "schema.prisma");
    if (existsSync(prismaPath)) {
      return join(candidate, ".runtime", "feishu-user-integrations.json");
    }
  }
  return join(process.cwd(), ".runtime", "feishu-user-integrations.json");
}
