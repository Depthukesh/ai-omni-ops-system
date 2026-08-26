"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { logout as logoutSession, readAuthSession } from "../../../../services/auth";
import {
  downloadOpenClawSkillPackage,
  getOpenClawInstallationWorkspace,
  revealOpenClawInstallToken,
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
const INSTALL_TOKEN_SESSION_PREFIX = "openclaw-install-token";

function buildInstallTokenSessionKey(brandId: string, tokenId: string) {
  return `${INSTALL_TOKEN_SESSION_PREFIX}:${brandId}:${tokenId}`;
}

function readInstallTokenFromSession(brandId?: string, tokenId?: string) {
  if (!brandId || !tokenId || typeof window === "undefined") {
    return "";
  }
  return window.sessionStorage.getItem(buildInstallTokenSessionKey(brandId, tokenId)) || "";
}

function writeInstallTokenToSession(brandId?: string, tokenId?: string, rawToken?: string) {
  if (!brandId || !tokenId || !rawToken || typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(buildInstallTokenSessionKey(brandId, tokenId), rawToken);
}

function removeInstallTokenFromSession(brandId?: string, tokenId?: string) {
  if (!brandId || !tokenId || typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(buildInstallTokenSessionKey(brandId, tokenId));
}

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
  const [isRevealingToken, setIsRevealingToken] = useState(false);
  const [isDownloadingSkill, setIsDownloadingSkill] = useState(false);
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

  async function handleToggleTokenVisibility() {
    if (isTokenVisible) {
      setErrorMessage("");
      setNotice("已隐藏完整令牌。");
      setIsTokenVisible(false);
      return;
    }
    if (!rawToken && !workspace?.activeToken?.id) {
      return;
    }
    if (!rawToken) {
      if (!workspace?.canManage) {
        setErrorMessage("当前账号没有查看完整安装令牌的权限，请联系品牌管理员处理。");
        return;
      }
      setIsRevealingToken(true);
      setErrorMessage("");
      setNotice("");
      try {
        const revealed = await revealOpenClawInstallToken(workspace.activeToken!.id);
        writeInstallTokenToSession(workspace.brandId, revealed.tokenId, revealed.token);
        setRawToken(revealed.token);
      } catch (error) {
        if (isAuthFailure(error)) {
          await handleSessionExpired();
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : "查看完整安装令牌失败");
        return;
      } finally {
        setIsRevealingToken(false);
      }
    }
    if (!rawToken && !workspace?.activeToken?.id) {
      return;
    }
    setErrorMessage("");
    setNotice("已显示完整令牌，请注意保密。");
    setIsTokenVisible(true);
  }

  async function loadWorkspace() {
    setIsLoading(true);
    setErrorMessage("");
    setNotice("");
    try {
      const result = await getOpenClawInstallationWorkspace();
      setWorkspace(result);
      setRawToken(readInstallTokenFromSession(result.brandId, result.activeToken?.id));
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
      const previousTokenId = workspace?.activeToken?.id;
      const previousBrandId = workspace?.brandId;
      const result = await rotateOpenClawInstallToken({
        tokenName: "OpenClaw 正式安装令牌",
        expiresInDays: 30,
      });
      removeInstallTokenFromSession(previousBrandId, previousTokenId);
      writeInstallTokenToSession(result.workspace.brandId, result.record.id, result.token);
      setWorkspace(result.workspace);
      setRawToken(result.token);
      setIsTokenVisible(false);
      setSelectedTab("openclaw");
      setNotice("新的正式安装令牌已生成。点击眼睛按钮可查看完整令牌；当前浏览器会话内可恢复显示，离开会话后不会再次展示完整值。");
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
      removeInstallTokenFromSession(workspace.brandId, workspace.activeToken.id);
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

  async function handleDownloadSkillPackage() {
    const downloadPath = workspace?.skillInstall?.downloadPath;
    if (!downloadPath) {
      setErrorMessage("当前没有可下载的 Skill ZIP。");
      return;
    }
    setIsDownloadingSkill(true);
    setNotice("");
    setErrorMessage("");
    try {
      const { blob, fileName } = await downloadOpenClawSkillPackage(downloadPath);
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName || workspace?.skillInstall?.fileName || "brand-operator-skill.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      setNotice("Skill 压缩包已开始下载，请在客户端通过“上传技能”方式导入。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Skill ZIP 下载失败");
    } finally {
      setIsDownloadingSkill(false);
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
          <p className="panel-subtext">正式环境使用品牌级安装令牌和网站 MCP 接入地址，不再暴露网站登录账号密码。品牌管理员在这里生成令牌后，成员只需复制配置即可完成安装。</p>
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

      <div className="personal-context-banner">
        <div>
          <strong>当前安装流程按“生成令牌 - 复制 MCP 配置 - Git 或 ZIP 二选一安装 Skill”执行</strong>
          <p>
            {workspace?.canManage
              ? "品牌管理员可以在这里重置正式安装令牌，并把统一配置分发给成员。普通成员只需要复制片段，并任选 Git 安装或 ZIP 导入完成接入。"
              : "当前账号可以查看当前品牌的 MCP 配置和 Skill 安装说明；如需重置令牌，请联系品牌管理员。"}
          </p>
        </div>
        <div className="personal-context-actions">
          {workspace?.mcpUrl ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => void handleCopy(workspace.mcpUrl, "mcp-url")}
            >
              {copiedKey === "mcp-url" ? "已复制地址" : "复制 MCP 地址"}
            </button>
          ) : null}
          {workspace?.skillInstall?.downloadPath ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => void handleDownloadSkillPackage()}
              disabled={isDownloadingSkill}
            >
              {isDownloadingSkill ? "下载中..." : "下载 Skill ZIP"}
            </button>
          ) : null}
          {workspace?.skillInstall?.githubTreeUrl ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => void handleCopy(workspace.skillInstall.githubTreeUrl, "skill-github-url")}
            >
              {copiedKey === "skill-github-url" ? "已复制 Git 链接" : "复制 Git Skill 链接"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="openclaw-doc-links" style={{ marginBottom: 16 }}>
        {(workspace?.docs || []).map((item) => (
          <a key={item.url} href={item.url} target="_blank" rel="noreferrer" className="secondary-button">
            {item.label}
          </a>
        ))}
      </div>

      <div className="personal-grid openclaw-meta-grid" style={{ marginBottom: 16 }}>
        <div>
          <span>MCP 服务名称</span>
          <strong>{workspace?.mcpServerName || "-"}</strong>
        </div>
        <div>
          <span>MCP 接入地址</span>
          <strong style={{ wordBreak: "break-all" }}>{workspace?.mcpUrl || "-"}</strong>
        </div>
        <div>
          <span>当前品牌</span>
          <strong>{workspace?.brandName || "-"}</strong>
        </div>
        <div>
          <span>安装令牌</span>
          <div className="openclaw-token-row">
            <strong className="openclaw-token-value">{displayedToken}</strong>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void handleToggleTokenVisibility()}
              aria-label={tokenToggleLabel}
              title={rawToken || workspace?.canManage ? tokenToggleLabel : "当前账号无权查看完整安装令牌"}
              disabled={(!rawToken && !workspace?.activeToken?.id) || isRevealingToken}
              style={{ padding: "6px 10px", minWidth: "auto" }}
            >
              {isTokenVisible ? <EyeOpenIcon /> : <EyeClosedIcon />}
            </button>
            {rawToken ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handleCopy(rawToken, "install-token")}
              >
                {copiedKey === "install-token" ? "已复制令牌" : "复制令牌"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="openclaw-layout">
        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>MCP 安装配置</strong>
              <p className="personal-meta">面向正式环境，直接复制到 OpenClaw、WorkBuddy、Cursor 或 Claude Desktop 对应的 MCP 配置位置。</p>
            </div>
            <div className="personal-context-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handleCopy(activeSnippet, `snippet:${selectedTab}`)}
                disabled={!activeSnippet}
              >
                {copiedKey === `snippet:${selectedTab}` ? "已复制" : "复制当前配置"}
              </button>
              {rawToken ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleToggleTokenVisibility()}
                >
                  {isRevealingToken ? "读取中..." : tokenToggleLabel}
                </button>
              ) : null}
            </div>
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
            <textarea className="openclaw-snippet-textarea" value={activeSnippet} rows={14} readOnly spellCheck={false} />
          </label>
        </article>

        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>{workspace?.skillInstall?.title || "品牌运营助手 Skill 安装"}</strong>
              <p className="personal-meta">{workspace?.skillInstall?.summary || "安装 MCP 后，下载统一的 Skill ZIP 并在客户端按上传技能方式导入。"}</p>
            </div>
            <div className="openclaw-skill-install-actions">
              <span className={`archive-pill ${workspace?.skillInstall?.status === "ready" ? "status-ready" : "status-paused"}`}>
                {workspace?.skillInstall?.statusLabel || "Beta"}
              </span>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handleDownloadSkillPackage()}
                disabled={!workspace?.skillInstall?.downloadPath || isDownloadingSkill}
              >
                {isDownloadingSkill ? "下载中..." : "下载 Skill ZIP"}
              </button>
            </div>
          </div>

          <div className="openclaw-skill-install-meta">
            <div className="openclaw-install-target">
              <span>安装位置</span>
              <strong>{workspace?.skillInstall?.installTarget || "客户端 Skill 配置区"}</strong>
            </div>
            {workspace?.skillInstall?.githubRef ? (
              <div className="openclaw-install-target">
                <span>Git 分支</span>
                <strong>{workspace.skillInstall.githubRef}</strong>
              </div>
            ) : null}
          </div>

          <div className="openclaw-skill-steps">
            {(workspace?.skillInstall?.steps || []).map((item, index) => (
              <div key={item} className="openclaw-skill-step">
                <span>{index + 1}</span>
                <strong>{item}</strong>
              </div>
            ))}
          </div>

          {(workspace?.skillInstall?.notes || []).length ? (
            <div className="personal-list" style={{ marginTop: 12, gap: 10 }}>
              {(workspace?.skillInstall?.notes || []).map((item) => (
                <div key={item} className="openclaw-checklist-item">
                  {item}
                </div>
              ))}
            </div>
          ) : null}

          {workspace?.skillInstall?.githubTreeUrl ? (
            <div className="openclaw-skill-download-hint">
              <span>Git 安装</span>
              <strong style={{ wordBreak: "break-all" }}>{workspace.skillInstall.githubTreeUrl}</strong>
              <p>把下面这句安装指令连同 Git Skill 链接直接发给 OpenClaw，它就可以按仓库里的 Skill 目录自行安装。</p>
              <div className="personal-context-actions" style={{ marginTop: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleCopy(workspace.skillInstall.githubPrompt, "skill-github-prompt")}
                >
                  {copiedKey === "skill-github-prompt" ? "已复制安装指令" : "复制一句安装指令"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleCopy(workspace.skillInstall.githubTreeUrl, "skill-github-url-card")}
                >
                  {copiedKey === "skill-github-url-card" ? "已复制 Git 链接" : "复制 Git Skill 链接"}
                </button>
              </div>
              <label className="field" style={{ marginTop: 12 }}>
                <span>给 OpenClaw 的一句安装指令</span>
                <textarea value={workspace.skillInstall.githubPrompt} rows={5} readOnly spellCheck={false} />
              </label>
            </div>
          ) : null}

          <div className="openclaw-skill-download-hint">
            <span>ZIP 下载</span>
            <strong>{workspace?.skillInstall?.fileName || "brand-operator-skill.zip"}</strong>
            <p>压缩包内包含 `SKILL.md`、`README.md` 和配套 docs，按客户端“上传技能”方式导入即可。</p>
          </div>
        </article>
      </div>
    </section>
  );
}
