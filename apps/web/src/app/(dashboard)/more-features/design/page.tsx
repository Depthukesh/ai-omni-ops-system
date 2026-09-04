"use client";

import { DesignWorkspaceShell } from "./workspace-shell";

const defaultSection = {
  key: "design" as const,
  label: "设计",
  icon: "🎨",
  description: "当前仅承接 OpenClaw 图片生成结果回看，作为自由生图模型的站内结果面板。",
};

export default function DesignPage() {
  return <DesignWorkspaceShell section={defaultSection} />;
}
