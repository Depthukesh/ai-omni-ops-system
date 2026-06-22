"use client";

import { ImagePromptWorkspaceShell } from "./workspace-shell";

const defaultSection = {
  key: "image-prompt-center" as const,
  label: "生图提示词中心",
  icon: "🖼️",
  description: "独立承接后台统一管理的生图模板，支持参考图上传、Prompt 编辑、Right Codes gpt-image-2 异步生成与作品中心。",
};

export default function ImagePromptCenterPage() {
  return <ImagePromptWorkspaceShell section={defaultSection} />;
}
