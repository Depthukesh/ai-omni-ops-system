import { Injectable, NotFoundException } from "@nestjs/common";
import { database, type PromptTemplateRecord, type SkillConfigRecord } from "../../common/mock-data";

export type UpdateSkillConfigPayload = {
  status?: SkillConfigRecord["status"];
  defaultModel?: string;
  pointsCost?: number;
  description?: string;
};

export type UpdatePromptTemplatePayload = {
  status?: PromptTemplateRecord["status"];
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  content?: string;
};

@Injectable()
export class SkillsPromptsService {
  listSkills() {
    return [...database.skillConfigs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  updateSkill(id: string, payload: UpdateSkillConfigPayload) {
    const skill = database.skillConfigs.find((item) => item.id === id);
    if (!skill) {
      throw new NotFoundException("技能配置不存在");
    }

    if (payload.status) {
      skill.status = payload.status;
    }
    if (payload.defaultModel !== undefined) {
      skill.defaultModel = payload.defaultModel;
    }
    if (payload.pointsCost !== undefined) {
      skill.pointsCost = payload.pointsCost;
    }
    if (payload.description !== undefined) {
      skill.description = payload.description;
    }
    skill.updatedAt = new Date().toISOString();

    return skill;
  }

  listPrompts() {
    return [...database.promptTemplates].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  updatePrompt(id: string, payload: UpdatePromptTemplatePayload) {
    const prompt = database.promptTemplates.find((item) => item.id === id);
    if (!prompt) {
      throw new NotFoundException("提示词模板不存在");
    }

    if (payload.status) {
      prompt.status = payload.status;
    }
    if (payload.modelName !== undefined) {
      prompt.modelName = payload.modelName;
    }
    if (payload.temperature !== undefined) {
      prompt.temperature = payload.temperature;
    }
    if (payload.maxTokens !== undefined) {
      prompt.maxTokens = payload.maxTokens;
    }
    if (payload.content !== undefined) {
      prompt.content = payload.content;
    }
    prompt.updatedAt = new Date().toISOString();

    return prompt;
  }
}
