"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createMyMixedcutRemixTask,
  getMyMixedcutMediaAssets,
  getMyMixedcutRemixTaskProgress,
  type MixedcutMediaAssetRecord,
  type MixedcutRemixTaskRecord,
} from "../../../services/personal-center";

export interface DouyinVideoRemixWorkspaceProps {
  brandId: string;
  sectionLabel: string;
  sectionDescription: string;
}

const MIXEDCUT_DURATION_TOLERANCE_SECONDS = 0.35;
const ARCHIVE_WORKSPACE_SCOPE = "douyin";
const ARCHIVE_WORKSPACE_LABEL = "某音/某号作品列表";

function normalizeBaseUrl(value: string) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function normalizeRemixUrl(value: string) {
  const normalized = normalizeBaseUrl(value);
  if (!normalized) {
    return "";
  }
  if (normalized.endsWith("/remix")) {
    return normalized;
  }
  return `${normalized}/remix`;
}

function resolveDefaultMixedcutBaseUrl() {
  const configured = normalizeBaseUrl(process.env.NEXT_PUBLIC_MIXEDCUT_BASE_URL || "");
  if (configured) {
    return configured;
  }
  if (typeof window === "undefined") {
    return "http://127.0.0.1:15000";
  }
  const protocol = window.location.protocol || "http:";
  const hostname = window.location.hostname || "127.0.0.1";
  return `${protocol}//${hostname}:15000`;
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "请求失败，请稍后重试。";
}

function normalizeTaskStatus(value?: string) {
  return String(value || "").trim().toLowerCase();
}

function formatDuration(value?: number) {
  if (!Number.isFinite(value) || !value || value <= 0) {
    return "未识别";
  }
  if (value < 60) {
    return `${value.toFixed(1)} 秒`;
  }
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes} 分 ${seconds} 秒`;
}

function formatDateTime(value?: string) {
  if (!value) {
    return "未记录";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", { hour12: false });
}

function resolveMixedcutAssetPreviewUrl(item: MixedcutMediaAssetRecord) {
  return String(item.assetUrl || item.sourceUrl || "").trim();
}

function resolveMixedcutOutputUrl(baseUrl: string, task?: MixedcutRemixTaskRecord | null) {
  const normalized = String(task?.videoUrl || "").trim();
  if (!normalized) {
    return "";
  }
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  if (!safeBaseUrl) {
    return normalized;
  }
  return `${safeBaseUrl}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
}

export function DouyinVideoRemixWorkspace(props: DouyinVideoRemixWorkspaceProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [mixedcutBaseUrl, setMixedcutBaseUrl] = useState("http://127.0.0.1:15000");
  const [assets, setAssets] = useState<MixedcutMediaAssetRecord[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [taskName, setTaskName] = useState("");
  const [taskStyle, setTaskStyle] = useState<"dynamic" | "calm" | "exciting">("dynamic");
  const [targetDurationSeconds, setTargetDurationSeconds] = useState("30");
  const [currentTask, setCurrentTask] = useState<MixedcutRemixTaskRecord | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [refreshingTask, setRefreshingTask] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setMixedcutBaseUrl(resolveDefaultMixedcutBaseUrl());
  }, []);

  const remixUrl = useMemo(
    () => normalizeRemixUrl(mixedcutBaseUrl),
    [mixedcutBaseUrl],
  );
  const mixedcutOutputUrl = useMemo(
    () => resolveMixedcutOutputUrl(mixedcutBaseUrl, currentTask),
    [currentTask, mixedcutBaseUrl],
  );
  const selectedCount = selectedAssetIds.length;
  const selectedAssets = useMemo(
    () => assets.filter((item) => selectedAssetIds.includes(item.id)),
    [assets, selectedAssetIds],
  );
  const selectedDurationSummary = useMemo(() => {
    let knownCount = 0;
    let totalDurationSec = 0;
    for (const item of selectedAssets) {
      if (!Number.isFinite(item.durationSec) || !item.durationSec || item.durationSec <= 0) {
        continue;
      }
      knownCount += 1;
      totalDurationSec += item.durationSec;
    }
    return {
      knownCount,
      totalDurationSec,
      unknownCount: Math.max(0, selectedAssets.length - knownCount),
      allKnown: selectedAssets.length > 0 && knownCount === selectedAssets.length,
    };
  }, [selectedAssets]);
  const isTaskActive = useMemo(() => {
    const status = normalizeTaskStatus(currentTask?.status);
    return Boolean(currentTask?.taskId) && status !== "completed" && status !== "failed";
  }, [currentTask]);

  const loadAssets = useCallback(async () => {
    setLoadingAssets(true);
    setErrorMessage("");
    try {
      const response = await getMyMixedcutMediaAssets();
      setAssets(response.items || []);
      setSelectedAssetIds((current) => current.filter((item) => (response.items || []).some((asset) => asset.id === item)));
    } catch (error) {
      setErrorMessage(normalizeErrorMessage(error));
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  const refreshTask = useCallback(async (taskId: string, silent = false) => {
    if (!silent) {
      setRefreshingTask(true);
    }
    try {
      const response = await getMyMixedcutRemixTaskProgress(taskId, { workspaceScope: ARCHIVE_WORKSPACE_SCOPE });
      setCurrentTask((current) => ({
        ...current,
        ...response,
        uploadedVideos: current?.uploadedVideos || response.uploadedVideos,
      }));
      if (normalizeTaskStatus(response.status) === "completed") {
        setSuccessMessage(
          response.archiveStatus === "saved"
            ? `mixedcut 任务已完成，成片已同步到${ARCHIVE_WORKSPACE_LABEL}。`
            : "mixedcut 任务已完成，可以直接在上面的混剪页继续查看成片。",
        );
      }
      if (normalizeTaskStatus(response.status) === "failed") {
        setErrorMessage(response.error || "mixedcut 任务失败，请查看任务进度信息。");
      }
    } catch (error) {
      if (!silent) {
        setErrorMessage(normalizeErrorMessage(error));
      }
    } finally {
      if (!silent) {
        setRefreshingTask(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets, props.brandId]);

  useEffect(() => {
    if (!currentTask?.taskId || !isTaskActive) {
      return;
    }
    const timer = window.setInterval(() => {
      void refreshTask(currentTask.taskId, true);
    }, 3000);
    return () => {
      window.clearInterval(timer);
    };
  }, [currentTask?.taskId, isTaskActive, refreshTask]);

  function toggleAssetSelection(assetId: string) {
    setSelectedAssetIds((current) =>
      current.includes(assetId)
        ? current.filter((item) => item !== assetId)
        : [...current, assetId],
    );
  }

  async function handleCreateTask() {
    if (!selectedAssetIds.length) {
      setErrorMessage("请先选择至少一个站内视频素材。");
      return;
    }
    const duration = Number(targetDurationSeconds);
    if (!Number.isFinite(duration) || duration <= 0) {
      setErrorMessage("目标时长必须是大于 0 的数字。");
      return;
    }
    if (
      selectedDurationSummary.allKnown
      && selectedDurationSummary.totalDurationSec > 0
      && duration > selectedDurationSummary.totalDurationSec + MIXEDCUT_DURATION_TOLERANCE_SECONDS
    ) {
      setErrorMessage(
        `当前所选素材总时长约 ${selectedDurationSummary.totalDurationSec.toFixed(1)} 秒，暂时无法支撑 ${duration.toFixed(1)} 秒的混剪目标。请缩短目标时长或补充更多视频素材；mixedcut 对贴边时长比较敏感，建议再额外预留 10%-30% 的时长余量。`,
      );
      return;
    }

    setSubmittingTask(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const result = await createMyMixedcutRemixTask({
        mediaAssetIds: selectedAssetIds,
        name: taskName.trim() || undefined,
        style: taskStyle,
        targetDurationSeconds: duration,
        workspaceScope: ARCHIVE_WORKSPACE_SCOPE,
      });
      setCurrentTask(result);
      setSuccessMessage(`已把 ${selectedAssetIds.length} 条站内视频送到 mixedcut，任务已创建；完成后会自动同步到${ARCHIVE_WORKSPACE_LABEL}。`);
    } catch (error) {
      setErrorMessage(normalizeErrorMessage(error));
    } finally {
      setSubmittingTask(false);
    }
  }

  return (
    <article className="light-data-panel report-editor-panel report-editor-panel--compact" style={{ marginTop: 20 }}>
      <div className="report-editor-head">
        <div>
          <strong>{props.sectionLabel}</strong>
          <p>{props.sectionDescription}</p>
        </div>
        <div className="report-editor-actions">
          <Link href="/personal-center/third-party-platforms/video-remix" className="secondary-button">
            打开视频混剪设置
          </Link>
          {remixUrl ? (
            <a href={remixUrl} target="_blank" rel="noreferrer" className="secondary-button">
              新窗口打开
            </a>
          ) : null}
          <button type="button" className="primary-button" onClick={() => setIframeKey((current) => current + 1)}>
            刷新混剪页
          </button>
        </div>
      </div>

      <div className="personal-inline-hint" style={{ marginTop: 16 }}>
        <strong>当前入口说明</strong>
        内容获客里的 `视频混剪` 现在直接承载 mixedcut 混剪主界面；模型同步、`ai_config.json` 下发和 mixedcut 侧设置已收口到 `个人中心 / 第三方接口配置 / 视频混剪设置`。当前还补了一条最小桥接：可以从站内视频资产里手动选素材，由主站后端上传到 mixedcut 并直接创建混剪任务。
      </div>

      <div className="personal-grid" style={{ marginTop: 16 }}>
        <div className="report-editor-pane">
          <span>当前 mixedcut 入口</span>
          <strong style={{ wordBreak: "break-all" }}>{remixUrl || "未识别"}</strong>
          <p>默认优先读取 `NEXT_PUBLIC_MIXEDCUT_BASE_URL`；未配置时，Docker 本地部署回退到当前主机的 `15000/remix`。</p>
        </div>
        <div className="report-editor-pane">
          <span>设置页位置</span>
          <strong>/personal-center/third-party-platforms/video-remix</strong>
          <p>在那里继续做模型同步、`ai_config.json` 预览和一键下发，不再占用内容获客主工作区。</p>
        </div>
        <div className="report-editor-pane">
          <span>站内素材桥接</span>
          <strong>{loadingAssets ? "读取中..." : `${assets.length} 条可用视频`}</strong>
          <p>当前支持手动选择站内视频资产，主站后端会先上传到 mixedcut，再调用 `/api/remix/generate` 创建任务。</p>
        </div>
        <div className="report-editor-pane">
          <span>当前任务状态</span>
          <strong>{currentTask ? `${currentTask.status || "pending"} / ${currentTask.progress || 0}%` : "暂未创建任务"}</strong>
          <p>任务创建后会自动轮询 mixedcut 进度；完成后可直接打开成片地址，或回到上方 iframe 继续查看。</p>
        </div>
      </div>

      {errorMessage ? (
        <div className="report-inline-tip report-inline-tip--error" style={{ marginTop: 16 }}>
          {errorMessage}
        </div>
      ) : null}
      {successMessage ? (
        <div className="report-inline-tip report-inline-tip--success" style={{ marginTop: 16 }}>
          {successMessage}
        </div>
      ) : null}

      <section className="panel personal-center-panel" style={{ marginTop: 20 }}>
        <div className="panel-header">
          <div>
            <h2>站内视频直送 mixedcut</h2>
            <p className="panel-subtext">这里不做全量素材库同步，而是先做一条可用的手动桥接：勾选站内视频，填写目标时长，直接交给 mixedcut 开始混剪。</p>
          </div>
          <span>{selectedCount ? `已选 ${selectedCount} 条` : "尚未选素材"}</span>
        </div>

        {selectedCount ? (
          <div className="personal-inline-hint" style={{ marginBottom: 16 }}>
            <strong>已选素材时长</strong>
            {selectedDurationSummary.knownCount ? (
              <> 当前已识别总时长约 {formatDuration(selectedDurationSummary.totalDurationSec)}。</>
            ) : (
              <> 当前所选素材还没有可用时长信息。</>
            )}
            {selectedDurationSummary.unknownCount ? (
              <> 其中还有 {selectedDurationSummary.unknownCount} 条素材未识别到时长，主站暂时无法提前判断它们是否足够支撑目标时长。</>
            ) : null}
            <> mixedcut 对贴边等长比较敏感，目标时长尽量比素材总时长少一些，保守建议额外预留 10%-30% 余量。</>
          </div>
        ) : null}

        <div className="personal-actions" style={{ marginBottom: 16, flexWrap: "wrap" }}>
          <button type="button" className="secondary-button" onClick={() => void loadAssets()} disabled={loadingAssets}>
            {loadingAssets ? "刷新素材中..." : "刷新站内素材"}
          </button>
          {currentTask?.taskId ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => void refreshTask(currentTask.taskId)}
              disabled={refreshingTask}
            >
              {refreshingTask ? "刷新任务中..." : "刷新任务进度"}
            </button>
          ) : null}
          <button type="button" className="primary-button" onClick={() => void handleCreateTask()} disabled={submittingTask || loadingAssets}>
            {submittingTask ? "提交中..." : "发送到 mixedcut 开始混剪"}
          </button>
        </div>

        <div className="personal-grid" style={{ marginBottom: 16 }}>
          <label className="report-editor-pane">
            <span>任务名称</span>
            <input
              value={taskName}
              onChange={(event) => setTaskName(event.target.value)}
              placeholder="默认按首条素材标题自动生成"
            />
            <p>可留空，后端会按所选素材自动生成任务名。</p>
          </label>
          <label className="report-editor-pane">
            <span>目标时长（秒）</span>
            <input
              value={targetDurationSeconds}
              onChange={(event) => setTargetDurationSeconds(event.target.value)}
              inputMode="decimal"
              placeholder="30"
            />
            <p>
              mixedcut 当前要求显式提供 `target_duration_seconds`。
              {selectedDurationSummary.allKnown && selectedDurationSummary.totalDurationSec > 0
                ? ` 当前所选素材的已识别总时长约为 ${selectedDurationSummary.totalDurationSec.toFixed(1)} 秒。`
                : ""}
            </p>
          </label>
          <label className="report-editor-pane">
            <span>混剪风格</span>
            <select value={taskStyle} onChange={(event) => setTaskStyle(event.target.value as "dynamic" | "calm" | "exciting")}>
              <option value="dynamic">dynamic</option>
              <option value="calm">calm</option>
              <option value="exciting">exciting</option>
            </select>
            <p>当前先支持普通混剪模式，不带站内 BGM 桥接。</p>
          </label>
          <div className="report-editor-pane">
            <span>作品归档</span>
            <strong>{ARCHIVE_WORKSPACE_LABEL}</strong>
            <p>当前 mixedcut 成片默认回流到同一个某音/某号作品池，后续可直接发抖音或视频号。</p>
          </div>
          <div className="report-editor-pane">
            <span>桥接边界</span>
            <strong>手动选素材 {"->"} 后端上传 {"->"} 创建任务</strong>
            <p>这一步还不是“素材库自动同步”；重点是先把“站内视频直接拿去混剪，并自动归档到某音/某号作品列表”做成真实可用链路。</p>
          </div>
        </div>

        <div className="empty-canvas-box" style={{ padding: 16, maxHeight: 360, overflow: "auto" }}>
          {loadingAssets ? (
            <p className="panel-subtext">正在读取站内视频素材...</p>
          ) : assets.length ? (
            <div className="xhs-material-card-grid">
              {assets.map((item) => {
                const previewUrl = resolveMixedcutAssetPreviewUrl(item);
                const checked = selectedAssetIds.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className="entity-card personal-card"
                    style={{
                      cursor: "pointer",
                      border: checked ? "1px solid var(--primary-color, #2563eb)" : undefined,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAssetSelection(item.id)}
                      />
                      <strong style={{ flex: 1 }}>{item.title || item.id}</strong>
                    </div>
                    <p className="panel-subtext" style={{ marginTop: 12 }}>
                      类型：{item.mediaType} | 时长：{formatDuration(item.durationSec)}
                    </p>
                    <p className="panel-subtext">入库时间：{formatDateTime(item.createdAt)}</p>
                    {previewUrl ? (
                      <a href={previewUrl} target="_blank" rel="noreferrer" className="secondary-button" style={{ marginTop: 12 }}>
                        预览素材
                      </a>
                    ) : (
                      <p className="panel-subtext" style={{ marginTop: 12 }}>当前素材未返回可直接预览地址。</p>
                    )}
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="panel-subtext">当前品牌还没有可用于 mixedcut 的站内视频素材。</p>
          )}
        </div>

        {currentTask ? (
          <div className="personal-grid" style={{ marginTop: 16 }}>
            <div className="report-editor-pane">
              <span>task_id</span>
              <strong style={{ wordBreak: "break-all" }}>{currentTask.taskId}</strong>
              <p>状态：{currentTask.status || "pending"}，进度：{currentTask.progress || 0}%</p>
            </div>
            <div className="report-editor-pane">
              <span>mixedcut 成片</span>
              <strong>{currentTask.editingMode || currentTask.mode || "处理中"}</strong>
              <p>目标时长：{formatDuration(currentTask.targetDurationSeconds)}；实际时长：{formatDuration(currentTask.actualDurationSeconds || currentTask.duration)}</p>
              {mixedcutOutputUrl ? (
                <a href={mixedcutOutputUrl} target="_blank" rel="noreferrer" className="secondary-button" style={{ marginTop: 12 }}>
                  打开成片
                </a>
              ) : null}
            </div>
            <div className="report-editor-pane">
              <span>已上传素材</span>
              <strong>{currentTask.uploadedVideos?.length || 0} 条</strong>
              <p>主站会先把所选素材上传到 mixedcut 的 `uploads/remix_videos`，再发起任务。</p>
            </div>
            <div className="report-editor-pane">
              <span>归档目标</span>
              <strong>{ARCHIVE_WORKSPACE_LABEL}</strong>
              <p>当前任务完成后，会把成片自动回流到同一个某音/某号作品列表。</p>
            </div>
            <div className="report-editor-pane">
              <span>任务说明</span>
              <strong>{isTaskActive ? "自动轮询中" : "已停止轮询"}</strong>
              <p>
                {currentTask.archiveStatus === "saved"
                  ? "成片已同步到某音/某号作品列表，可继续发布。"
                  : currentTask.archiveStatus === "failed"
                    ? (currentTask.archiveMessage || "成片同步到作品列表失败，请稍后重试刷新任务进度。")
                    : (currentTask.error || "完成后可在上方 iframe 或 mixedcut 新窗口里继续查看任务结果。")}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <div
        className="empty-canvas-box"
        style={{
          marginTop: 20,
          padding: 0,
          overflow: "hidden",
          minHeight: 860,
        }}
      >
        {remixUrl ? (
          <iframe
            key={iframeKey}
            title="mixedcut 视频混剪"
            src={remixUrl}
            style={{
              width: "100%",
              height: 860,
              border: 0,
              background: "#fff",
            }}
          />
        ) : (
          <div style={{ padding: 24 }}>
            <strong>暂时还没有可用的 mixedcut 入口</strong>
            <p className="panel-subtext" style={{ marginTop: 12 }}>
              请先确认 mixedcut 容器已经启动，并到 `个人中心 / 第三方接口配置 / 视频混剪设置` 完成模型同步。
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
