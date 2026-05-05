import Link from "next/link";

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
