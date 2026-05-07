import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
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
  private readonly promptFileCandidates: Record<string, string[]> = {
    prompt_xhs_original_copy: [
      "../../../提示词/original_copy/original_copy/SKILL.md",
      "../提示词/original_copy/original_copy/SKILL.md",
    ],
    prompt_xhs_original_note: [
      "../../../提示词/original_image/SKILL.md",
      "../提示词/original_image/SKILL.md",
    ],
    prompt_xhs_rewrite_copy: [
      "../../../提示词/rewrite_copy/SKILL.md",
      "../提示词/rewrite_copy/SKILL.md",
    ],
    prompt_xhs_rewrite_image: [
      "../../../提示词/rewrite_image/SKILL.md",
      "../提示词/rewrite_image/SKILL.md",
    ],
    prompt_xhs_video_note: [
      "../../../提示词/short-video-api-studio/short-video-api-studio/SKILL.md",
      "../提示词/short-video-api-studio/short-video-api-studio/SKILL.md",
    ],
  };

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
    database.promptTemplates.forEach((item) => {
      this.syncPromptContentFromFile(item);
    });
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
      const nextContent = this.normalizePromptContent(payload.content);
      this.writePromptContentToFile(prompt, nextContent);
      prompt.content = nextContent;
    }
    prompt.updatedAt = new Date().toISOString();

    return prompt;
  }

  private syncPromptContentFromFile(prompt: PromptTemplateRecord) {
    const filePath = this.resolvePromptFilePath(prompt.id);
    if (!filePath) {
      return;
    }
    try {
      const fileContent = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
      if (fileContent) {
        prompt.content = fileContent;
      }
    } catch {
      // Ignore unreadable prompt files and keep in-memory content.
    }
  }

  private writePromptContentToFile(prompt: PromptTemplateRecord, content: string) {
    const filePath = this.resolvePromptFilePath(prompt.id);
    if (!filePath) {
      return;
    }
    try {
      writeFileSync(filePath, content, "utf8");
    } catch (error) {
      throw new InternalServerErrorException(
        `提示词文件写入失败：${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  private resolvePromptFilePath(promptId: string) {
    const candidates = this.promptFileCandidates[promptId];
    if (!candidates?.length) {
      return undefined;
    }
    for (const candidate of candidates) {
      const filePath = resolve(process.cwd(), candidate);
      if (existsSync(filePath)) {
        return filePath;
      }
    }
    return undefined;
  }

  private normalizePromptContent(content: unknown) {
    if (typeof content === "string") {
      return content;
    }
    if (content === null || content === undefined) {
      return "";
    }
    return JSON.stringify(content, null, 2);
  }
}
