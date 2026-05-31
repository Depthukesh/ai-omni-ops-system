import "../styles/globals.css";
import type { ReactNode } from "react";
import Script from "next/script";

export const metadata = {
  title: "AI全域运营系统",
  description: "品牌增长策略、小红书运营与多技能工作台",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Script
          id="chunk-load-recovery"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var storageKey = "ai-omni-chunk-load-recovery";
                function shouldRecover(message) {
                  return /ChunkLoadError|Loading chunk [0-9]+ failed|Failed to fetch dynamically imported module/i.test(String(message || ""));
                }
                function recoverOnce(reason) {
                  try {
                    if (!shouldRecover(reason)) {
                      return;
                    }
                    if (window.sessionStorage.getItem(storageKey) === "1") {
                      window.sessionStorage.removeItem(storageKey);
                      return;
                    }
                    window.sessionStorage.setItem(storageKey, "1");
                    window.location.reload();
                  } catch (_) {
                    window.location.reload();
                  }
                }
                window.addEventListener("error", function (event) {
                  recoverOnce(event && event.message);
                });
                window.addEventListener("unhandledrejection", function (event) {
                  var reason = event && event.reason;
                  recoverOnce(reason && (reason.message || reason.stack || reason));
                });
                window.addEventListener("load", function () {
                  try {
                    window.sessionStorage.removeItem(storageKey);
                  } catch (_) {}
                });
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
