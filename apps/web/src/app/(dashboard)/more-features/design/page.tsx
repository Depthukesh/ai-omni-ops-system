"use client";

import { DesignWorkspaceShell } from "./workspace-shell";

const defaultSection = {
  key: "design" as const,
  label: "设计",
  icon: "🎨",
  description: "设计工作台采用横向二级模块结构，支持图片设计、HTML 设计、PPT 设计、视频设计，并通过统一弹窗完成创建与作品展示。",
};

export default function DesignPage() {
  return <DesignWorkspaceShell section={defaultSection} />;
}
