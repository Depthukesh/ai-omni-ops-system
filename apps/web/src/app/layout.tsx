import "../styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "AI全域运营系统",
  description: "品牌增长策略、小红书运营与多技能工作台",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
