"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getMyMixedcutAiConfigPreview,
  syncMyMixedcutAiConfig,
  type MixedcutAiConfigPreview,
  type MixedcutAiConfigSyncSource,
} from "../../../../services/personal-center";

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "请求失败，请稍后重试。";
}

function groupSourcesByCapability(sources: MixedcutAiConfigSyncSource[]) {
  return {
    llm: sources.filter((item) => item.capability === "llm"),
    vision: sources.filter((item) => item.capability === "vision"),
    image: sources.filter((item) => item.capability === "image"),
  };
}

function capabilityLabel(capability: MixedcutAiConfigSyncSource["capability"]) {
  if (capability === "llm") {
    return "LLM";
  }
  if (capability === "vision") {
    return "视觉";
  }
  return "生图";
}

export function VideoRemixSettingsPanel() {
  const [preview, setPreview] = useState<MixedcutAiConfigPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let disposed = false;

    async function loadPreview() {
      setLoading(true);
      setErrorMessage("");
      try {
        const result = await getMyMixedcutAiConfigPreview();
        if (!disposed) {
          setPreview(result);
        }
      } catch (error) {
        if (!disposed) {
          setPreview(null);
          setErrorMessage(normalizeErrorMessage(error));
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    }

    void loadPreview();
    return () => {
      disposed = true;
    };
  }, []);

  const groupedSources = useMemo(
    () => groupSourcesByCapability(preview?.sources || []),
    [preview],
  );

  async function handleSync() {
    setSyncing(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const result = await syncMyMixedcutAiConfig();
      setPreview(result);
      setSuccessMessage(`已写入 ${result.configFilePath}`);
    } catch (error) {
      setErrorMessage(normalizeErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section className="panel personal-center-panel">
      <div className="panel-header">
        <div>
          <h2>视频混剪设置</h2>
          <p className="panel-subtext">这里专门负责 mixedcut 模型同步与配置下发；内容获客里的“视频混剪”入口现在直接进入混剪主界面，不再停留在设置面板。</p>
        </div>
        <span>{preview?.configFileExists ? "ai_config.json 已存在" : "待生成 ai_config.json"}</span>
      </div>

      <div className="personal-actions" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <Link href="/personal-center/third-party-platforms" className="secondary-button">
          返回第三方接口配置
        </Link>
        <Link href="/xiaohongshu" className="secondary-button">
          返回内容获客
        </Link>
        <button type="button" className="primary-button" onClick={() => void handleSync()} disabled={syncing || loading}>
          {syncing ? "同步中..." : "同步到视频混剪"}
        </button>
      </div>

      <div className="personal-inline-hint" style={{ marginBottom: 16 }}>
        <strong>当前同步范围</strong>
        这一步只同步 `LLM + 视觉 + 生图` 三类配置到 mixedcut 的 `config/ai_config.json`。同步源是当前品牌在 `个人中心 / 第三方接口配置` 里已经维护好的第三方模型配置，不再额外维护一套视频混剪专用模型列表。
      </div>

      {errorMessage ? (
        <div className="report-inline-tip report-inline-tip--error" style={{ marginBottom: 16 }}>
          {errorMessage}
        </div>
      ) : null}
      {successMessage ? (
        <div className="report-inline-tip report-inline-tip--success" style={{ marginBottom: 16 }}>
          {successMessage}
        </div>
      ) : null}

      <div className="personal-grid" style={{ marginBottom: 16 }}>
        <div className="report-editor-pane">
          <span>mixedcut 安装根目录</span>
          <strong style={{ wordBreak: "break-all" }}>{preview?.installRoot || "读取中..."}</strong>
          <p>当前按同机目录方案处理，后端会把模型配置写入这个安装根目录下的 `config/ai_config.json`。</p>
        </div>
        <div className="report-editor-pane">
          <span>目标配置文件</span>
          <strong style={{ wordBreak: "break-all" }}>{preview?.configFilePath || "读取中..."}</strong>
          <p>如果 mixedcut 还没跑过，`config` 目录和 `ai_config.json` 会在同步时自动创建。</p>
        </div>
        <div className="report-editor-pane">
          <span>LLM 同步状态</span>
          <strong>{groupedSources.llm.length ? `${groupedSources.llm.length} 条映射` : "未发现可同步模型"}</strong>
          <p>会同步 DeepSeek / Kimi / GLM / Doubao，或 OpenAI 兼容聚合网关到 mixedcut 的 `llm` 配置。</p>
        </div>
        <div className="report-editor-pane">
          <span>视觉/生图状态</span>
          <strong>{groupedSources.vision.length + groupedSources.image.length ? `${groupedSources.vision.length + groupedSources.image.length} 条映射` : "未发现可同步模型"}</strong>
          <p>视觉优先映射 GLM 视觉或兼容网关；生图优先映射豆包、GLM CogView、通用 OpenAI 兼容图像网关。</p>
        </div>
      </div>

      <div className="xhs-material-card-grid" style={{ marginBottom: 20 }}>
        {(["llm", "vision", "image"] as const).map((capability) => (
          <article key={capability} className="entity-card personal-card">
            <strong>{capabilityLabel(capability)}</strong>
            {groupedSources[capability].length ? (
              <div className="admin-provider-chip-row" style={{ marginTop: 12 }}>
                {groupedSources[capability].map((item) => (
                  <span key={`${item.providerId}-${item.appliedField}`} className="admin-provider-chip">
                    {item.providerName} 映射到 {item.appliedField}
                  </span>
                ))}
              </div>
            ) : (
              <p className="panel-subtext" style={{ marginTop: 12 }}>当前品牌还没有可同步的 {capabilityLabel(capability)} 配置。</p>
            )}
          </article>
        ))}
      </div>

      {preview?.warnings?.length ? (
        <section style={{ marginBottom: 20 }}>
          <div className="panel-header" style={{ padding: 0, marginBottom: 16 }}>
            <div>
              <strong>同步提醒</strong>
              <p className="panel-subtext">这些提醒不会阻止同步，但说明当前品牌配置还不完整，或者有多个供应商竞争同一个 mixedcut 字段。</p>
            </div>
          </div>
          <div className="personal-list">
            {preview.warnings.map((item) => (
              <div key={item} className="personal-inline-hint">{item}</div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="panel-header" style={{ padding: 0, marginBottom: 16 }}>
          <div>
            <strong>当前生成的 mixedcut 配置</strong>
            <p className="panel-subtext">这里展示的是将要写入 mixedcut 的 `ai_config.json` 预览。你在个人中心改第三方接口后，重新同步即可覆盖。</p>
          </div>
        </div>
        <pre
          className="empty-canvas-box"
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: 520,
            overflow: "auto",
            padding: 16,
          }}
        >
          {loading ? "正在加载视频混剪模型同步预览..." : JSON.stringify(preview?.config || {}, null, 2)}
        </pre>
      </section>
    </section>
  );
}
