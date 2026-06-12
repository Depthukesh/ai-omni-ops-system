import "../styles/globals.css";
import type { ReactNode } from "react";
import Script from "next/script";

export const metadata = {
  title: "AI全域运营系统",
  description: "品牌增长策略、小红书运营与多技能工作台",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <Script
          id="theme-mode-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var storageKey = "ai-omni-theme-mode";
                var fallbackTheme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
                var savedTheme = "";
                try {
                  savedTheme = window.localStorage.getItem(storageKey) || "";
                } catch (_) {}
                var theme = savedTheme === "light" || savedTheme === "dark" ? savedTheme : fallbackTheme;
                document.documentElement.setAttribute("data-theme", theme);
                document.documentElement.style.colorScheme = theme;
              })();
            `,
          }}
        />
        <Script
          id="chunk-load-recovery"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var recoveryKey = "ai-omni-chunk-load-recovery-count";
                var recoveryParam = "__chunk_recover";
                function readRecoveryCount() {
                  try {
                    return Number(window.sessionStorage.getItem(recoveryKey) || "0");
                  } catch (_) {
                    return 0;
                  }
                }
                function extractReason(candidate) {
                  if (!candidate) {
                    return "";
                  }
                  if (typeof candidate === "string") {
                    return candidate;
                  }
                  if (candidate.message) {
                    return String(candidate.message);
                  }
                  if (candidate.stack) {
                    return String(candidate.stack);
                  }
                  if (candidate.target && (candidate.target.src || candidate.target.href)) {
                    return String(candidate.target.src || candidate.target.href);
                  }
                  if (candidate.filename) {
                    return String(candidate.filename);
                  }
                  return String(candidate);
                }
                function shouldRecover(candidate) {
                  return /ChunkLoadError|Loading chunk [0-9]+ failed|Failed to fetch dynamically imported module|\/_next\/static\/chunks\//i.test(
                    extractReason(candidate),
                  );
                }
                function buildRecoveryUrl() {
                  var nextUrl = new URL(window.location.href);
                  nextUrl.searchParams.set(recoveryParam, String(Date.now()));
                  return nextUrl.toString();
                }
                function clearRecoveryMarker() {
                  try {
                    window.sessionStorage.removeItem(recoveryKey);
                    var nextUrl = new URL(window.location.href);
                    if (nextUrl.searchParams.has(recoveryParam)) {
                      nextUrl.searchParams.delete(recoveryParam);
                      window.history.replaceState(window.history.state, "", nextUrl.toString());
                    }
                  } catch (_) {}
                }
                function recoverOnce(reason) {
                  if (!shouldRecover(reason)) {
                    return;
                  }
                  try {
                    var nextCount = readRecoveryCount() + 1;
                    if (nextCount > 2) {
                      window.sessionStorage.removeItem(recoveryKey);
                      return;
                    }
                    window.sessionStorage.setItem(recoveryKey, String(nextCount));
                    window.location.replace(buildRecoveryUrl());
                    return;
                  } catch (_) {}
                  window.location.replace(buildRecoveryUrl());
                }
                window.addEventListener("error", function (event) {
                  recoverOnce(event);
                }, true);
                window.addEventListener("unhandledrejection", function (event) {
                  var reason = event && event.reason;
                  recoverOnce(reason);
                });
                window.addEventListener("pageshow", function () {
                  clearRecoveryMarker();
                });
                window.addEventListener("load", function () {
                  clearRecoveryMarker();
                });
                if (window.performance && typeof window.performance.getEntriesByType === "function") {
                  var navigationEntries = window.performance.getEntriesByType("navigation");
                  if (navigationEntries && navigationEntries[0] && navigationEntries[0].type === "reload") {
                    try {
                      if (readRecoveryCount() > 0) {
                        window.sessionStorage.removeItem(recoveryKey);
                      }
                    } catch (_) {}
                  }
                }
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
