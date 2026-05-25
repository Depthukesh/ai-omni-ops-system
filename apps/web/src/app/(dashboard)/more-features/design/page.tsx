"use client";

import { DesignWorkspaceShell } from "./workspace-shell";

const defaultSection = {
  key: "design" as const,
  label: "设计",
  icon: "🎨",
  description: "AI 驱动的品牌视觉内容设计工作台，支持图片生成、视频设计、品牌素材管理和模板市场。",
};

export default function DesignPage() {
  return <DesignWorkspaceShell section={defaultSection} />;
}
