"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { logout as logoutSession, readAuthSession } from "../../../../services/auth";
import {
  getOpenClawInstallationWorkspace,
  revokeOpenClawInstallToken,
  rotateOpenClawInstallToken,
  type OpenClawInstallWorkspace,
} from "../../../../services/openclaw";
import { buildPersonalCenterLoginPath, formatDateTime, formatCollaboratorRoleLabel, isAuthFailure } from "../route-helpers";

type SnippetTabKey = "openclaw" | "workbuddy" | "cursor" | "claudeDesktop" | "mcpEndpoint";

const snippetTabs: Array<{ key: SnippetTabKey; label: string }> = [
  { key: "openclaw", label: "OpenClaw" },
  { key: "workbuddy", label: "WorkBuddy" },
  { key: "cursor", label: "Cursor" },
  { key: "claudeDesktop", label: "Claude Desktop" },
  { key: "mcpEndpoint", label: "MCP 地址" },
];

const TOKEN_PLACEHOLDER = "请先生成安装令牌";

function EyeOpenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.7a3 3 0 0 0 4.2 4.2" />
      <path d="M9.9 5.1A12.5 12.5 0 0 1 12 5c6.5 0 10 7 10 7a17.8 17.8 0 0 1-4 4.9" />
      <path d="M6.7 6.7C3.7 8.6 2 12 2 12a18.8 18.8 0 0 0 5 5.7" />
    </svg>
  );
}

function buildVisibleSnippet(snippet: string, rawToken: string, isTokenVisible: boolean) {
  if (!rawToken) {
    return snippet;
  }
  const fullHeader = `Bearer ${rawToken}`;
  const placeholderHeader = `Bearer ${TOKEN_PLACEHOLDER}`;
  if (isTokenVisible) {
    return snippet.replaceAll(placeholderHeader, fullHeader);
  }
  return snippet.replaceAll(fullHeader, placeholderHeader);
}

export default function PersonalCenterOpenClawPage() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<OpenClawInstallWorkspace | null>(null);
  const [rawToken, setRawToken] = useState("");
  const [isTokenVisible, setIsTokenVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState<SnippetTabKey>("openclaw");
  const [isLoading, setIsLoading] = useState(true);
  const [isRotating, setIsRotating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const session = readAuthSession();
    if (!session?.accessToken && !session?.refreshToken) {
      router.replace(buildPersonalCenterLoginPath("/personal-center/openclaw"));
      return;
    }
    void loadWorkspace();
  }, [router]);

  const activeSnippet = useMemo(() => {
    if (!workspace) {
      return "";
    }
    return buildVisibleSnippet(workspace.snippetTemplates[selectedTab], rawToken, isTokenVisible);
  }, [isTokenVisible, rawToken, selectedTab, workspace]);

  const displayedToken = useMemo(() => {
    if (isTokenVisible && rawToken) {
      return rawToken;
    }
    return workspace?.activeToken?.tokenPreview || "未生成";
  }, [isTokenVisible, rawToken, workspace]);

  const tokenToggleLabel = isTokenVisible ? "隐藏完整令牌" : "查看完整令牌";
  const activeSkillSnippet = workspace?.skillInstall?.snippet || "";

  function handleToggleTokenVisibility() {
    if (!rawToken) {
      setNotice("");
      setErrorMessage("当前页面没有完整令牌可显示。请先点击“重置正式安装令牌”后，再使用眼睛查看完整令牌。");
      return;
    }
    setErrorMessage("");
    setNotice(isTokenVisible ? "已隐藏完整令牌。" : "已显示完整令牌，请注意保密。");
    setIsTokenVisible((current) => !current);
  }

  async function loadWorkspace() {
    setIsLoading(true);
    setErrorMessage("");
    setNotice("");
    try {
      const result = await getOpenClawInstallationWorkspace();
      setWorkspace(result);
      setRawToken("");
      setIsTokenVisible(false);
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "OpenClaw 安装中心加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRotateToken() {
    setIsRotating(true);
    setNotice("");
    setErrorMessage("");
    try {
      const result = await rotateOpenClawInstallToken({
        tokenName: "OpenClaw 正式安装令牌",
        expiresInDays: 30,
      });
      setWorkspace(result.workspace);
      setRawToken(result.token);
      setIsTokenVisible(false);
      setSelectedTab("openclaw");
      setNotice("新的正式安装令牌已生成。点击眼睛后可查看完整令牌，离开本页后将不再展示完整令牌。");
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "生成安装令牌失败");
    } finally {
      setIsRotating(false);
    }
  }

  async function handleRevokeToken() {
    if (!workspace?.activeToken?.id) {
      return;
    }
    setIsRevoking(true);
    setNotice("");
    setErrorMessage("");
    try {
      const result = await revokeOpenClawInstallToken(workspace.activeToken.id);
      setWorkspace(result.workspace);
      setRawToken("");
      setIsTokenVisible(false);
      setNotice("当前正式安装令牌已停用。");
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "停用安装令牌失败");
    } finally {
      setIsRevoking(false);
    }
  }

  async function handleCopy(content: string, key: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedKey(key);
      setNotice("已复制到剪贴板。");
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? "" : current));
      }, 1600);
    } catch {
      setErrorMessage("复制失败，请手动复制。");
    }
  }

  async function handleSessionExpired() {
    await logoutSession();
    router.replace(buildPersonalCenterLoginPath("/personal-center/openclaw"));
  }

  return (
    <section className="panel personal-center-panel">
      <div className="panel-header">
        <div>
          <h2>OpenClaw 安装中心</h2>
          <p className="panel-subtext">正式环境使用品牌级安装令牌和网站 MCP HTTP 地址，不再暴露网站登录账号密码。品牌管理员在这里生成令牌后，成员只需要复制配置即可完成安装。</p>
        </div>
        <span>{workspace?.brandName || "当前品牌"}</span>
      </div>

      <div className="personal-actions" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <div className="workspace-status">
          <span className={`archive-pill ${workspace?.canManage ? "status-ready" : "status-paused"}`}>
            {workspace ? formatCollaboratorRoleLabel(workspace.role) : "未识别角色"}
          </span>
          {isLoading ? <span className="status-text">正在加载 OpenClaw 安装配置...</span> : null}
          {!isLoading && notice ? <span className="status-text success-text">{notice}</span> : null}
          {!isLoading && errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
        </div>
        <button type="button" className="secondary-button" onClick={() => void loadWorkspace()} disabled={isLoading || isRotating || isRevoking}>
          刷新
        </button>
        <Link href="/personal-center/third-party-platforms" className="secondary-button">
          返回第三方接口配置
        </Link>
        <button
          type="button"
          className="primary-button"
          onClick={() => void handleRotateToken()}
          disabled={!workspace?.canManage || isLoading || isRotating || isRevoking}
        >
          {isRotating ? "生成中..." : workspace?.activeToken ? "重置正式安装令牌" : "生成正式安装令牌"}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => void handleRevokeToken()}
          disabled={!workspace?.canManage || !workspace?.activeToken || isLoading || isRotating || isRevoking}
        >
          {isRevoking ? "停用中..." : "停用当前令牌"}
        </button>
      </div>

      <div className="openclaw-top-docs" style={{ marginBottom: 16 }}>
        {(workspace?.docs || []).map((item) => (
          <a key={item.url} href={item.url} target="_blank" rel="noreferrer" className="secondary-button">
            {item.label}
          </a>
        ))}
      </div>

      <div className="personal-grid" style={{ marginBottom: 16 }}>
        <div>
          <span>MCP Server 名称</span>
          <strong>{workspace?.mcpServerName || "-"}</strong>
        </div>
        <div>
          <span>MCP HTTP 地址</span>
          <strong style={{ wordBreak: "break-all" }}>{workspace?.mcpUrl || "-"}</strong>
        </div>
        <div>
          <span>当前品牌</span>
          <strong>{workspace?.brandName || "-"}</strong>
        </div>
        <div>
          <span>当前令牌</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <strong>{displayedToken}</strong>
            <button
              type="button"
              className="secondary-button"
              onClick={handleToggleTokenVisibility}
              aria-label={tokenToggleLabel}
              title={rawToken ? tokenToggleLabel : "完整令牌仅在本次生成后可查看"}
              style={{ padding: "6px 10px", minWidth: "auto" }}
            >
              {isTokenVisible ? <EyeOpenIcon /> : <EyeClosedIcon />}
            </button>
          </div>
        </div>
      </div>

      {rawToken ? (
        <div className="empty-canvas-box" style={{ marginBottom: 16 }}>
          完整安装令牌仅展示这一次，请立即复制并保存。默认隐藏，点击眼睛后可在上方和安装片段中查看完整令牌。
        </div>
      ) : null}

      <div className="openclaw-layout">
        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>MCP 安装配置</strong>
              <p className="personal-meta">面向正式环境，直接复制到 OpenClaw / WorkBuddy / Cursor / Claude Desktop 对应的 MCP 配置位置。</p>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void handleCopy(activeSnippet, `snippet:${selectedTab}`)}
              disabled={!activeSnippet}
            >
              {copiedKey === `snippet:${selectedTab}` ? "已复制" : "复制当前配置"}
            </button>
          </div>

          <div className="tab-switcher" style={{ marginBottom: 12 }}>
            {snippetTabs.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`tab-button ${selectedTab === item.key ? "is-active" : ""}`}
                onClick={() => setSelectedTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className="field">
            <span>安装片段</span>
            <textarea value={activeSnippet} rows={20} readOnly spellCheck={false} />
          </label>
        </article>

        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>{workspace?.skillInstall?.title || "品牌运营助手 Skill 安装"}</strong>
              <p className="personal-meta">{workspace?.skillInstall?.summary || "安装 MCP 后，再把总入口 Skill 复制到客户端的 Skill 配置区。"}</p>
            </div>
            <div className="openclaw-skill-install-actions">
              <span className={`archive-pill ${workspace?.skillInstall?.status === "ready" ? "status-ready" : "status-paused"}`}>
                {workspace?.skillInstall?.statusLabel || "Beta"}
              </span>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handleCopy(activeSkillSnippet, "skill-snippet")}
                disabled={!activeSkillSnippet}
              >
                {copiedKey === "skill-snippet" ? "已复制" : "复制 Skill 安装内容"}
              </button>
            </div>
          </div>

          <div className="openclaw-skill-install-meta">
            <div className="openclaw-install-target">
              <span>安装位置</span>
              <strong>{workspace?.skillInstall?.installTarget || "客户端 Skill 配置区"}</strong>
            </div>
          </div>

          <div className="openclaw-skill-steps">
            {(workspace?.skillInstall?.steps || []).map((item, index) => (
              <div key={item} className="openclaw-skill-step">
                <span>{index + 1}</span>
                <strong>{item}</strong>
              </div>
            ))}
          </div>

          <label className="field">
            <span>Skill 安装内容</span>
            <textarea value={activeSkillSnippet} rows={18} readOnly spellCheck={false} />
          </label>

          {(workspace?.skillInstall?.notes || []).length ? (
            <div className="personal-list" style={{ marginTop: 12, gap: 10 }}>
              {(workspace?.skillInstall?.notes || []).map((item) => (
                <div key={item} className="openclaw-checklist-item">
                  {item}
                </div>
              ))}
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
