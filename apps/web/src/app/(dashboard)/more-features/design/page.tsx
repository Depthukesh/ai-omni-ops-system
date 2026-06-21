"use client";

import { DesignWorkspaceShell } from "./workspace-shell";

const defaultSection = {
  key: "design" as const,
  label: "设计",
  icon: "🎨",
  description: "设计页独立承接图片、HTML、PPT、视频四类设计工作流，统一通过创建弹窗进入生成链路。",
};

export default function DesignPage() {
  return <DesignWorkspaceShell section={defaultSection} />;
}
