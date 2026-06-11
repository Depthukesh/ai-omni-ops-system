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

type SnippetTabKey = "openclaw" | "cursor" | "claudeDesktop" | "mcpEndpoint";

const snippetTabs: Array<{ key: SnippetTabKey; label: string }> = [
  { key: "openclaw", label: "OpenClaw" },
  { key: "cursor", label: "Cursor" },
  { key: "claudeDesktop", label: "Claude Desktop" },
  { key: "mcpEndpoint", label: "MCP 地址" },
];

export default function PersonalCenterOpenClawPage() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<OpenClawInstallWorkspace | null>(null);
  const [rawToken, setRawToken] = useState("");
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
    return workspace.snippetTemplates[selectedTab];
  }, [selectedTab, workspace]);

  async function loadWorkspace() {
    setIsLoading(true);
    setErrorMessage("");
    setNotice("");
    try {
      const result = await getOpenClawInstallationWorkspace();
      setWorkspace(result);
      setRawToken("");
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
      setSelectedTab("openclaw");
      setNotice("新的正式安装令牌已生成。请立即复制配置，离开本页后将不再展示完整令牌。");
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
          <strong>{rawToken || workspace?.activeToken?.tokenPreview || "未生成"}</strong>
        </div>
      </div>

      {rawToken ? (
        <div className="empty-canvas-box" style={{ marginBottom: 16 }}>
          完整安装令牌仅展示这一次，请立即复制并保存。后续页面只会显示脱敏预览。
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)", gap: 16 }}>
        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>MCP 安装配置</strong>
              <p className="personal-meta">面向正式环境，直接复制到 OpenClaw / Cursor / Claude Desktop 对应的 MCP 配置位置。</p>
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

        <div className="personal-list" style={{ gap: 16 }}>
          <article className="entity-card personal-card">
            <div className="entity-card-head">
              <div>
                <strong>令牌状态</strong>
                <p className="personal-meta">品牌级安装令牌只绑定当前品牌与生成者账号，不等于网站密码。</p>
              </div>
              <span className={`archive-pill ${workspace?.activeToken ? "status-ready" : "status-paused"}`}>
                {workspace?.activeToken ? "已启用" : "未启用"}
              </span>
            </div>
            <div className="personal-grid">
              <div>
                <span>令牌预览</span>
                <strong>{workspace?.activeToken?.tokenPreview || "未生成"}</strong>
              </div>
              <div>
                <span>最近使用</span>
                <strong>{formatDateTime(workspace?.activeToken?.lastUsedAt)}</strong>
              </div>
              <div>
                <span>过期时间</span>
                <strong>{formatDateTime(workspace?.activeToken?.expiresAt)}</strong>
              </div>
              <div>
                <span>更新时间</span>
                <strong>{formatDateTime(workspace?.activeToken?.updatedAt)}</strong>
              </div>
            </div>
          </article>

          <article className="entity-card personal-card">
            <div className="entity-card-head">
              <div>
                <strong>{workspace?.skillGuide.title || "Skill 安装说明"}</strong>
                <p className="personal-meta">{workspace?.skillGuide.summary || "安装 MCP 后，再按品牌运营助手 Skill 说明去编排调用。"}</p>
              </div>
            </div>
            <div className="personal-list">
              {(workspace?.skillGuide.examples || []).map((item) => (
                <div key={item} className="empty-canvas-box" style={{ padding: 12 }}>
                  {item}
                </div>
              ))}
            </div>
          </article>

          <article className="entity-card personal-card">
            <div className="entity-card-head">
              <div>
                <strong>{workspace?.deliveryChecklist.title || "正式交付检查"}</strong>
                <p className="personal-meta">{workspace?.deliveryChecklist.summary || "上线前请至少完成页面、文档、令牌和真实挂载四类检查。"}</p>
              </div>
            </div>
            <div className="personal-list">
              {(workspace?.deliveryChecklist.items || []).map((item) => (
                <div key={item} className="empty-canvas-box" style={{ padding: 12 }}>
                  {item}
                </div>
              ))}
            </div>
          </article>

          <article className="entity-card personal-card">
            <div className="entity-card-head">
              <div>
                <strong>安装文档</strong>
                <p className="personal-meta">给品牌管理员和实施同学直接看的正式说明。</p>
              </div>
            </div>
            <div className="personal-list">
              {(workspace?.docs || []).map((item) => (
                <a key={item.url} href={item.url} target="_blank" rel="noreferrer" className="secondary-button">
                  {item.label}
                </a>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
