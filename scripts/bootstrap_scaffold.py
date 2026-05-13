from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


FILES = {
    ROOT / "package.json": """{
  "name": "ai-omni-ops-system",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@10.0.0",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev:web": "npm --workspace apps/web run dev",
    "dev:server": "npm --workspace apps/server run start:dev",
    "build:web": "npm --workspace apps/web run build",
    "build:server": "npm --workspace apps/server run build",
    "lint:web": "npm --workspace apps/web run lint",
    "lint:server": "npm --workspace apps/server run lint"
  }
}
""",
    ROOT / "pnpm-workspace.yaml": """packages:
  - apps/*
  - packages/*
""",
    ROOT / "turbo.json": """{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    }
  }
}
""",
    ROOT / ".gitignore": """node_modules
.pnpm-store
.next
dist
coverage
.env
.env.local
.DS_Store
*.log
prisma/dev.db
""",
    ROOT / ".env.example": """DATABASE_URL=
REDIS_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=
OSS_REGION=
WECHAT_PAY_MCH_ID=
WECHAT_PAY_API_V3_KEY=
WECHAT_PAY_CERT_SERIAL_NO=
OPENAI_API_KEY=
GEMINI_API_KEY=
DOUBAO_API_KEY=
XHS_DATA_API_KEY=
""",
    ROOT / "tsconfig.base.json": """{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["packages/shared/src/*"],
      "@prompt-runtime/*": ["packages/prompt-runtime/src/*"],
      "@ui/*": ["packages/ui/src/*"]
    }
  }
}
""",
    ROOT / "README.md": """# AI全域运营系统

## 项目结构

- `apps/web`: 用户前台与管理后台前端
- `apps/server`: NestJS 风格后端服务
- `packages/shared`: 前后端共享类型与常量
- `packages/prompt-runtime`: 技能与提示词运行时
- `packages/ui`: 可复用 UI 组件预留
- `prisma`: 数据库模型与迁移
- `docs`: 项目补充文档
- `infra`: 部署与基础设施配置预留

## 当前状态

当前仓库已完成第一版 monorepo 项目骨架初始化，后续将按规划文档继续补充：

1. Prisma 正式 schema
2. 前端路由与页面骨架
3. 后端模块、DTO、Service、Controller
4. 任务队列与模型网关
""",
    ROOT / "apps/web/package.json": """{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "15.0.0",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "devDependencies": {
    "typescript": "5.6.3",
    "@types/react": "18.3.3",
    "@types/node": "22.10.1"
  }
}
""",
    ROOT / "apps/web/tsconfig.json": """{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowJs": false,
    "noEmit": true,
    "incremental": true,
    "plugins": [
      { "name": "next" }
    ]
  },
  "include": ["next-env.d.ts", "src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules"]
}
""",
    ROOT / "apps/web/next-env.d.ts": """/// <reference types="next" />
/// <reference types="next/image-types/global" />

// 此文件由 Next.js 使用，请勿手动删除
""",
    ROOT / "apps/web/next.config.ts": """import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
""",
    ROOT / "apps/web/src/app/layout.tsx": """import "../styles/globals.css";
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
""",
    ROOT / "apps/web/src/app/page.tsx": """import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home-shell">
      <section className="hero-card">
        <span className="hero-badge">AI 全域运营系统</span>
        <h1>品牌增长策略 + 小红书工作台 + 任务与技能中台</h1>
        <p>
          当前版本已完成 monorepo 项目骨架初始化，后续将按规划文档继续补齐前端页面、后端模块、Prisma schema、任务系统与模型网关。
        </p>
        <div className="hero-links">
          <Link href="/brand-growth">进入品牌增长策略</Link>
          <Link href="/xiaohongshu">进入小红书模块</Link>
          <Link href="/personal-center">进入个人中心</Link>
          <Link href="/admin">进入管理后台</Link>
        </div>
      </section>
    </main>
  );
}
""",
    ROOT / "apps/web/src/app/(dashboard)/brand-growth/page.tsx": """export default function BrandGrowthPage() {
  return (
    <main className="page-shell">
      <h1>品牌增长策略</h1>
      <p>这里将承载品牌建档、调研、采集数据、品牌增长报告和半年营销规划。</p>
    </main>
  );
}
""",
    ROOT / "apps/web/src/app/(dashboard)/xiaohongshu/page.tsx": """export default function XiaohongshuPage() {
  return (
    <main className="page-shell">
      <h1>小红书模块</h1>
      <p>这里将承载营销策划方案、素材库、营销日历、原创笔记、二创笔记和视频笔记。</p>
    </main>
  );
}
""",
    ROOT / "apps/web/src/app/(dashboard)/personal-center/page.tsx": """export default function PersonalCenterPage() {
  return (
    <main className="page-shell">
      <h1>个人中心</h1>
      <p>这里将承载会员信息、点数流水、我的作品、任务记录和我的素材库。</p>
    </main>
  );
}
""",
    ROOT / "apps/web/src/app/(dashboard)/admin/page.tsx": """export default function AdminPage() {
  return (
    <main className="page-shell">
      <h1>管理后台</h1>
      <p>这里将承载用户管理、订单管理、技能/提示词管理、知识库管理、API 管理和会员积分管理。</p>
    </main>
  );
}
""",
    ROOT / "apps/web/src/app/(auth)/login/page.tsx": """export default function LoginPage() {
  return (
    <main className="page-shell">
      <h1>登录</h1>
      <p>后续将补充手机号登录、密码登录和验证码登录。</p>
    </main>
  );
}
""",
    ROOT / "apps/web/src/app/(auth)/register/page.tsx": """export default function RegisterPage() {
  return (
    <main className="page-shell">
      <h1>注册</h1>
      <p>后续将补充注册表单、验证码逻辑与用户初始化流程。</p>
    </main>
  );
}
""",
    ROOT / "apps/web/src/styles/globals.css": """:root {
  color-scheme: light;
  --bg: #f5f7fb;
  --card: #ffffff;
  --text: #1f2a37;
  --muted: #5b6b82;
  --primary: #5b6dff;
  --border: #dde4f0;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text);
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

.home-shell,
.page-shell {
  min-height: 100vh;
  padding: 48px 24px;
}

.hero-card,
.page-shell {
  max-width: 1120px;
  margin: 0 auto;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 12px 40px rgba(48, 77, 140, 0.08);
}

.hero-badge {
  display: inline-block;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(91, 109, 255, 0.1);
  color: var(--primary);
  font-size: 14px;
  font-weight: 700;
}

.hero-card h1,
.page-shell h1 {
  margin: 16px 0 12px;
  font-size: 36px;
}

.hero-card p,
.page-shell p {
  margin: 0;
  color: var(--muted);
  line-height: 1.8;
  font-size: 16px;
}

.hero-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.hero-links a {
  padding: 12px 18px;
  border-radius: 14px;
  background: var(--primary);
  color: #fff;
  font-weight: 700;
}
""",
    ROOT / "apps/web/src/services/http.ts": """export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
""",
    ROOT / "apps/server/package.json": """{
  "name": "server",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "start:dev": "node --watch src/main.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/main.js",
    "lint": "tsc --noEmit -p tsconfig.json"
  },
  "dependencies": {
    "@nestjs/common": "10.4.8",
    "@nestjs/core": "10.4.8",
    "reflect-metadata": "0.2.2",
    "rxjs": "7.8.1"
  },
  "devDependencies": {
    "typescript": "5.6.3",
    "@types/node": "22.10.1"
  }
}
""",
    ROOT / "apps/server/tsconfig.json": """{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "declaration": false,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
""",
    ROOT / "apps/server/src/main.ts": """import "reflect-metadata";

async function bootstrap() {
  console.log("AI全域运营系统后端骨架已初始化");
}

void bootstrap();
""",
    ROOT / "apps/server/src/app.module.ts": "export class AppModule {}\\n",
    ROOT / "apps/server/src/modules/auth/auth.module.ts": "export class AuthModule {}\\n",
    ROOT / "apps/server/src/modules/auth/auth.service.ts": "export class AuthService {}\\n",
    ROOT / "apps/server/src/modules/auth/auth.controller.ts": "export class AuthController {}\\n",
    ROOT / "apps/server/src/modules/brands/brands.module.ts": "export class BrandsModule {}\\n",
    ROOT / "apps/server/src/modules/tasks/tasks.module.ts": "export class TasksModule {}\\n",
    ROOT / "apps/server/src/modules/media/media.module.ts": "export class MediaModule {}\\n",
    ROOT / "apps/server/src/modules/reports/reports.module.ts": "export class ReportsModule {}\\n",
    ROOT / "apps/server/src/modules/works/works.module.ts": "export class WorksModule {}\\n",
    ROOT / "apps/server/src/modules/collectors/collectors.module.ts": "export class CollectorsModule {}\\n",
    ROOT / "apps/server/src/modules/admin/admin.module.ts": "export class AdminModule {}\\n",
    ROOT / "apps/server/src/prisma/prisma.module.ts": "export class PrismaModule {}\\n",
    ROOT / "apps/server/src/prisma/prisma.service.ts": "export class PrismaService {}\\n",
    ROOT / "apps/server/src/jobs/queues/README.md": """# Queues

后续在这里拆分：

- task queue
- collector queue
- media queue
- report queue
- work queue
- video queue
""",
    ROOT / "packages/shared/package.json": """{
  "name": "@ai-omni/shared",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts"
}
""",
    ROOT / "packages/shared/src/index.ts": """export const APP_NAME = "AI全域运营系统";

export enum PlatformType {
  XIAOHONGSHU = "XIAOHONGSHU",
  DOUYIN = "DOUYIN",
  VIDEO_CHANNEL = "VIDEO_CHANNEL",
  WECHAT_OA = "WECHAT_OA",
}

export enum TaskStatus {
  PENDING = "PENDING",
  QUEUED = "QUEUED",
  RUNNING = "RUNNING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}
""",
    ROOT / "packages/prompt-runtime/package.json": """{
  "name": "@ai-omni/prompt-runtime",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts"
}
""",
    ROOT / "packages/prompt-runtime/src/index.ts": """export type PromptRenderInput = Record<string, string | number | boolean | null | undefined>;

export function renderPrompt(template: string, input: PromptRenderInput): string {
  return Object.entries(input).reduce((result, [key, value]) => {
    return result.replaceAll(`{{${key}}}`, String(value ?? ""));
  }, template);
}
""",
    ROOT / "packages/ui/package.json": """{
  "name": "@ai-omni/ui",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts"
}
""",
    ROOT / "packages/ui/src/index.ts": "export {};\\n",
    ROOT / "packages/config/README.md": "# Config\\n\\n用于沉淀 ESLint、Prettier、TypeScript 等共享配置。\\n",
    ROOT / "prisma/schema.prisma": """generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserStatus {
  ACTIVE
  DISABLED
}

enum TaskStatus {
  PENDING
  QUEUED
  RUNNING
  SUCCESS
  FAILED
  CANCELLED
}

enum PlatformType {
  XIAOHONGSHU
  DOUYIN
  VIDEO_CHANNEL
  WECHAT_OA
}

model User {
  id           String     @id @default(cuid())
  mobile       String     @unique
  email        String?
  nickname     String?
  avatarUrl    String?
  passwordHash String
  status       UserStatus @default(ACTIVE)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  brands       Brand[]
  tasks        Task[]
}

model Brand {
  id          String    @id @default(cuid())
  ownerUserId String
  brandName   String
  industry    String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  owner       User      @relation(fields: [ownerUserId], references: [id], onDelete: Cascade)
  tasks       Task[]
}

model Task {
  id          String     @id @default(cuid())
  userId      String
  brandId     String?
  taskType    String
  taskStatus  TaskStatus @default(PENDING)
  taskTitle   String?
  inputJson   Json?
  outputJson  Json?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  brand       Brand?     @relation(fields: [brandId], references: [id], onDelete: SetNull)
}
""",
}


def main() -> None:
    for path, content in FILES.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    print(ROOT)
    print(f"files={len(FILES)}")


if __name__ == "__main__":
    main()
