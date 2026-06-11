"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const chunkErrorPattern = /ChunkLoadError|Loading chunk [0-9]+ failed|Failed to fetch dynamically imported module|\/_next\/static\/chunks\//i;

function buildRecoveryUrl() {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("__chunk_recover", String(Date.now()));
  return nextUrl.toString();
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    const reason = String(error?.message || error?.stack || error || "");
    if (!chunkErrorPattern.test(reason)) {
      return;
    }
    const timer = window.setTimeout(() => {
      window.location.replace(buildRecoveryUrl());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "32px",
            background: "#f8fafc",
            color: "#0f172a",
          }}
        >
          <section
            style={{
              width: "min(560px, 100%)",
              background: "#ffffff",
              borderRadius: "20px",
              padding: "28px",
              boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
              display: "grid",
              gap: "14px",
            }}
          >
            <strong style={{ fontSize: "20px" }}>页面正在自动恢复</strong>
            <p style={{ margin: 0, lineHeight: 1.7 }}>
              当前页面在发布切版本时加载到了旧的前端资源，系统会优先自动刷新并重新拉取最新静态文件。
            </p>
            <p style={{ margin: 0, lineHeight: 1.7, color: "#475569" }}>
              如果几秒后仍未恢复，可以手动点击下面按钮重新加载。
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => window.location.replace(buildRecoveryUrl())}
                style={{
                  border: "none",
                  borderRadius: "999px",
                  padding: "10px 18px",
                  background: "#2563eb",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                重新加载页面
              </button>
              <button
                type="button"
                onClick={reset}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: "999px",
                  padding: "10px 18px",
                  background: "#fff",
                  color: "#0f172a",
                  cursor: "pointer",
                }}
              >
                再试一次
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
