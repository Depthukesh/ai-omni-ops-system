import fs from "node:fs/promises";
import path from "node:path";
import Script from "next/script";

export const metadata = {
  title: "品牌/门店全域增长智能体 | 17ai.site",
  description:
    "围绕品牌与门店增长场景，展示全域增长智能体如何通过数据跟踪、商业洞察、策略规划、公域获客、GEO、私域门店增长与员工达人矩阵，帮助企业构建自动化增长飞轮。",
};

const tailwindConfigScript = `
  tailwind.config = {
    darkMode: "class",
    theme: {
      extend: {
        colors: {
          zinc: {
            950: "#09090b",
            900: "#18181b",
            800: "#27272a",
            700: "#3f3f46",
            400: "#a1a1aa"
          },
          accent: "#38bdf8",
          amber: {
            400: "#fbbf24",
            500: "#f59e0b"
          },
          emerald: {
            400: "#34d399",
            500: "#10b981"
          }
        },
        fontFamily: {
          sans: ['"Geist"', "-apple-system", "BlinkMacSystemFont", '"PingFang SC"', '"Microsoft YaHei"', "sans-serif"],
          mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"]
        },
        letterSpacing: {
          tighter: "-0.04em",
          tight: "-0.02em",
          wide: "0.08em"
        }
      }
    }
  };
`;

const revealScript = `
  (() => {
    const initReveal = () => {
      const elements = document.querySelectorAll(".reveal");
      if (!elements.length) {
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
      );
      elements.forEach((element) => observer.observe(element));
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initReveal, { once: true });
    } else {
      initReveal();
    }
  })();
`;

export default async function HomePage() {
  const landing = await readLandingPageSource();

  return (
    <>
      <Script id="marketing-tailwind-config" strategy="beforeInteractive">
        {tailwindConfigScript}
      </Script>
      <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      <style dangerouslySetInnerHTML={{ __html: landing.styles }} />
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: landing.bodyHtml }} />
      <Script id="marketing-reveal-script" strategy="afterInteractive">
        {revealScript}
      </Script>
    </>
  );
}

async function readLandingPageSource() {
  const filePath = path.resolve(process.cwd(), "src", "app", "landing-page-template.html");
  const html = await fs.readFile(filePath, "utf8");
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/i);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  if (!styleMatch || !bodyMatch) {
    throw new Error("无法读取官网首页模板内容");
  }

  return {
    styles: styleMatch[1],
    bodyHtml: bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, ""),
  };
}
