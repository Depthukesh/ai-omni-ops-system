"use client";

import { OperationsPromptWorkspaceShell } from "./workspace-shell";

const defaultSection = {
  key: "operations-prompt-center" as const,
  label: "运营提示词中心",
  icon: "🧠",
  description: "独立承接后台统一管理的运营提示词模板，支持三维分类、可编辑 Prompt、异步生成和作品中心。",
};

export default function OperationsPromptCenterPage() {
  return <OperationsPromptWorkspaceShell section={defaultSection} />;
}
