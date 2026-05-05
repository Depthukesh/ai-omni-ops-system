import { Injectable, NotFoundException } from "@nestjs/common";
import { database, type ApiProviderRecord } from "../../common/mock-data";

export type CreateApiProviderPayload = {
  name: string;
  providerType: ApiProviderRecord["providerType"];
  baseUrl: string;
  modelWhitelist?: string[];
  maskedApiKey?: string;
};

export type UpdateApiProviderPayload = {
  status?: ApiProviderRecord["status"];
  baseUrl?: string;
  modelWhitelist?: string[];
  maskedApiKey?: string;
};

@Injectable()
export class ApiProvidersService {
  listProviders() {
    return [...database.apiProviders].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  createProvider(payload: CreateApiProviderPayload) {
    const now = new Date().toISOString();
    const record: ApiProviderRecord = {
      id: `provider_${Date.now()}`,
      name: payload.name,
      providerType: payload.providerType,
      status: "DRAFT",
      baseUrl: payload.baseUrl,
      modelWhitelist: payload.modelWhitelist || [],
      maskedApiKey: payload.maskedApiKey || "未配置",
      successRate: 0,
      requestCount24h: 0,
      totalCostYuan: 0,
      lastCalledAt: now,
      updatedAt: now,
    };

    database.apiProviders.unshift(record);
    return record;
  }

  updateProvider(id: string, payload: UpdateApiProviderPayload) {
    const provider = database.apiProviders.find((item) => item.id === id);
    if (!provider) {
      throw new NotFoundException("API Provider 不存在");
    }

    if (payload.status) {
      provider.status = payload.status;
    }
    if (payload.baseUrl !== undefined) {
      provider.baseUrl = payload.baseUrl;
    }
    if (payload.modelWhitelist !== undefined) {
      provider.modelWhitelist = payload.modelWhitelist;
    }
    if (payload.maskedApiKey !== undefined) {
      provider.maskedApiKey = payload.maskedApiKey;
    }
    provider.updatedAt = new Date().toISOString();

    return provider;
  }

  archiveProvider(id: string) {
    const provider = database.apiProviders.find((item) => item.id === id);
    if (!provider) {
      throw new NotFoundException("API Provider 不存在");
    }

    provider.status = "DISABLED";
    provider.updatedAt = new Date().toISOString();
    return provider;
  }

  deleteProvider(id: string) {
    const index = database.apiProviders.findIndex((item) => item.id === id);
    if (index < 0) {
      throw new NotFoundException("API Provider 不存在");
    }

    const [removed] = database.apiProviders.splice(index, 1);
    return removed;
  }
}
