import { unstable_noStore as noStore } from "next/cache";
import type { CSSProperties } from "react";
import { MobileHandoffClient } from "./mobile-handoff-client";

type MobilePublishPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

type MobileSessionPayload = {
  taskId: string;
  token: string;
  status: "QUEUED" | "SUCCESS" | "FAILED";
  title: string;
  content: string;
  imageUrls: string[];
  coverImageUrl?: string;
  hashtags: string[];
  accountName?: string;
  sourceLabel: string;
  createdAt: string;
  expiresAt: string;
  apiBaseUrl: string;
  openAppUrl: string;
  note?: string;
  accessHint?: string;
};

export default async function MobilePublishPage({ params }: MobilePublishPageProps) {
  noStore();
  const { token } = await params;

  try {
    const session = await loadSession(token);
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <div style={styles.badge}>手机扫码接力</div>
          <h1 style={styles.title}>小红书草稿接力页</h1>
          <p style={styles.description}>
            这一步不会自动公开发布，只用于把当前笔记素材快速接力到手机，方便你在小红书 App 里保存到草稿箱。
          </p>
          <div style={styles.metaRow}>
            <span style={styles.metaTag}>{session.status === "SUCCESS" ? "已完成" : session.status === "FAILED" ? "失败" : "待接力"}</span>
            {session.accountName ? <span style={styles.metaTag}>账号：{session.accountName}</span> : null}
            <span style={styles.metaTag}>来源：{session.sourceLabel}</span>
            <span style={styles.metaTag}>手机接力 v2</span>
          </div>
          {session.accessHint ? <p style={styles.hint}>{session.accessHint}</p> : null}
        </section>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>操作步骤</h2>
          <ol style={styles.list}>
            <li>优先点击下方“一键保存到草稿箱”，尝试把标题、正文和配图一起交给系统分享。</li>
            <li>如果系统分享面板里出现小红书，请直接选择它。</li>
            <li>如果当前浏览器不支持文件分享，页面会退化为复制文案并拉起小红书。</li>
            <li>进入 App 后确认图片、标题和正文无误，再保存到草稿箱。</li>
          </ol>
        </section>

        <MobileHandoffClient session={session} apiBaseUrl={session.apiBaseUrl || resolveApiBaseUrl()} />

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>标题</h2>
          <div style={styles.copyBlock}>{session.title}</div>
          <h2 style={styles.sectionTitle}>正文</h2>
          <pre style={styles.contentBlock}>{session.content}</pre>
          {session.hashtags.length ? (
            <>
              <h2 style={styles.sectionTitle}>标签</h2>
              <div style={styles.tagWrap}>
                {session.hashtags.map((item) => (
                  <span key={item} style={styles.tag}>
                    #{item.replace(/^#/, "")}
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </section>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>配图素材</h2>
          <p style={styles.description}>按顺序长按图片即可保存到手机相册。第一张通常是封面；如果当前页面长按不好保存，可先点“查看原图”再长按。</p>
          <div style={styles.imageGrid}>
            {session.imageUrls.map((item, index) => (
              <figure key={`${item}-${index}`} style={styles.figure}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item} alt={`配图 ${index + 1}`} style={styles.image} />
                <figcaption style={styles.caption}>图片 {index + 1}</figcaption>
                <div style={styles.figureActionRow}>
                  <a href={item} target="_blank" rel="noreferrer" style={styles.figureActionLink}>
                    查看原图
                  </a>
                </div>
              </figure>
            ))}
          </div>
        </section>
      </main>
    );
  } catch (error) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <div style={styles.badge}>会话不可用</div>
          <h1 style={styles.title}>手机接力页打开失败</h1>
          <p style={styles.description}>{error instanceof Error ? error.message : "当前接力会话不存在、已过期或暂时不可访问。"}</p>
        </section>
      </main>
    );
  }
}

async function loadSession(token: string): Promise<MobileSessionPayload> {
  const response = await fetch(`${resolveApiBaseUrl()}/publishing/xiaohongshu/mobile-sessions/${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("手机接力会话不存在或已失效，请回到电脑端重新生成二维码。");
  }
  const payload = (await response.json()) as {
    session?: MobileSessionPayload;
  };
  if (!payload.session) {
    throw new Error("手机接力会话数据为空。");
  }
  return payload.session;
}

function resolveApiBaseUrl() {
  return process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:3011/api";
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f6f8ff 0%, #eef2ff 100%)",
    padding: "20px 14px 36px",
    fontFamily: "\"PingFang SC\", \"Microsoft YaHei\", sans-serif",
  },
  card: {
    maxWidth: "820px",
    margin: "0 auto 16px",
    padding: "20px",
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #e3e8f8",
    borderRadius: "24px",
    boxShadow: "0 18px 48px rgba(43, 61, 116, 0.10)",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "7px 12px",
    borderRadius: "999px",
    background: "#eef2ff",
    color: "#5b6dff",
    fontSize: "12px",
    fontWeight: 700,
  },
  title: {
    margin: "14px 0 10px",
    fontSize: "30px",
    lineHeight: 1.2,
    color: "#17233f",
  },
  description: {
    margin: 0,
    color: "#66738f",
    fontSize: "14px",
    lineHeight: 1.8,
  },
  hint: {
    marginTop: "12px",
    color: "#bf6a00",
    fontSize: "13px",
    lineHeight: 1.8,
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "14px",
  },
  metaTag: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: "999px",
    background: "#f5f7fe",
    color: "#51607d",
    fontSize: "12px",
    fontWeight: 700,
  },
  sectionTitle: {
    margin: "0 0 12px",
    fontSize: "18px",
    lineHeight: 1.4,
    color: "#17233f",
  },
  list: {
    margin: "0 0 16px",
    paddingLeft: "18px",
    color: "#42506d",
    lineHeight: 1.9,
    fontSize: "14px",
  },
  primaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "46px",
    padding: "0 18px",
    borderRadius: "14px",
    background: "#5b6dff",
    color: "#fff",
    fontWeight: 700,
    textDecoration: "none",
  },
  copyBlock: {
    padding: "16px 18px",
    borderRadius: "18px",
    border: "1px solid #dfe5f2",
    background: "#fbfcff",
    color: "#24314a",
    fontSize: "16px",
    lineHeight: 1.8,
    whiteSpace: "pre-wrap",
  },
  contentBlock: {
    margin: 0,
    padding: "16px 18px",
    borderRadius: "18px",
    border: "1px solid #dfe5f2",
    background: "#fbfcff",
    color: "#24314a",
    fontSize: "14px",
    lineHeight: 1.9,
    whiteSpace: "pre-wrap",
    overflowX: "auto",
    fontFamily: "inherit",
  },
  tagWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  tag: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "#f3f5ff",
    color: "#5166ff",
    fontSize: "13px",
    fontWeight: 700,
  },
  imageGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
  },
  figure: {
    margin: 0,
  },
  image: {
    width: "100%",
    aspectRatio: "0.82",
    objectFit: "cover",
    borderRadius: "18px",
    border: "1px solid #dfe5f2",
    background: "#fff",
    boxShadow: "0 12px 28px rgba(35,49,82,0.08)",
  },
  caption: {
    marginTop: "8px",
    color: "#6a7894",
    fontSize: "12px",
    textAlign: "center",
  },
  figureActionRow: {
    display: "flex",
    justifyContent: "center",
    marginTop: "8px",
  },
  figureActionLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "34px",
    padding: "0 14px",
    borderRadius: "999px",
    border: "1px solid #d9e2f8",
    background: "#fff",
    color: "#5b6dff",
    fontSize: "12px",
    fontWeight: 700,
    textDecoration: "none",
  },
};
