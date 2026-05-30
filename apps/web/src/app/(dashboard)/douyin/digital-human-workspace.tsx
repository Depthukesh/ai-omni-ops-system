"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type DigitalHumanFigureType,
  type DigitalHumanTemplatePageInfo,
  type DigitalHumanTemplateRecord,
  type DigitalHumanTemplateTagGroupRecord,
  type DouyinDigitalHumanVideoWorkRecord,
} from "../../../services/works";
import { WorkspaceSectionHeader } from "../xiaohongshu/note-workspace-shared-panels";
import { type OptionalDateFormatter } from "../xiaohongshu/shared-types";

const PAGE_SIZE = 18;
const DIGITAL_HUMAN_TEMPLATE_FAVORITES_STORAGE_KEY = "douyin-digital-human-template-favorites";
const DIGITAL_HUMAN_TEMPLATE_RECENTS_STORAGE_KEY = "douyin-digital-human-template-recents";
const DIGITAL_HUMAN_SCRIPT_PRESETS = [
  {
    key: "brand-promo",
    label: "品牌宣传",
    content: "开头先抛出一个品牌价值钩子，再用 2 到 3 句讲清核心卖点、适用人群和使用场景，结尾补一句行动引导。",
  },
  {
    key: "activity-promo",
    label: "活动促销",
    content: "第一句直接说活动力度或限时福利，第二句强调人群和购买理由，第三句补充时间节点和下单引导，整体节奏要快。",
  },
  {
    key: "knowledge-share",
    label: "知识分享",
    content: "先点出一个常见误区或痛点，再给出 2 到 3 条实用建议，最后补一句总结和关注引导，语气自然像真人口播。",
  },
  {
    key: "live-warmup",
    label: "直播预热",
    content: "开头直接告诉用户直播时间和主题，中间突出直播专属福利、重点产品或亮点内容，结尾引导用户预约或蹲守直播间。",
  },
] as const;

function getStageLabel(stage?: DouyinDigitalHumanVideoWorkRecord["stage"]) {
  switch (stage) {
    case "SUCCESS":
      return "已完成";
    case "FAILED":
      return "失败";
    case "GENERATING":
      return "生成中";
    default:
      return "排队中";
  }
}

function getStageClass(stage?: DouyinDigitalHumanVideoWorkRecord["stage"]) {
  switch (stage) {
    case "SUCCESS":
      return "status-ready";
    case "FAILED":
      return "status-pending";
    default:
      return "status-in_progress";
  }
}

function getFigureTypeLabel(type?: DigitalHumanFigureType) {
  switch (type) {
    case "whole_body":
      return "全身";
    case "circle_view":
      return "圆形";
    default:
      return "半身";
  }
}

function isRecoverableWork(item: DouyinDigitalHumanVideoWorkRecord) {
  if (item.videoUrl) {
    return false;
  }
  if (item.stage === "FAILED") {
    return false;
  }
  return Boolean(item.providerTaskId || item.thirdPartyStatus || item.taskStatus);
}

export interface DouyinDigitalHumanWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  isSubmitting: boolean;
  canEdit: boolean;
  items: DouyinDigitalHumanVideoWorkRecord[];
  templateTagGroups: DigitalHumanTemplateTagGroupRecord[];
  templates: DigitalHumanTemplateRecord[];
  templatePageInfo?: DigitalHumanTemplatePageInfo;
  activeTagId?: string;
  isTemplateLoading?: boolean;
  onRefresh: () => void | Promise<void>;
  onTemplateTagChange: (tagId: string) => Promise<void>;
  onLoadMoreTemplates?: () => Promise<void>;
  onPreview: (item: DouyinDigitalHumanVideoWorkRecord) => void;
  onCreate: (payload: {
    title?: string;
    personId?: string;
    personName?: string;
    personSource?: "COMMON" | "CUSTOM";
    figureType?: DigitalHumanFigureType;
    figureCoverUrl?: string;
    figurePreviewVideoUrl?: string;
    figureWidth?: number;
    figureHeight?: number;
    audioManId?: string;
    audioName?: string;
    script?: string;
    speechRate?: number;
    pitch?: number;
    volume?: number;
    language?: string;
    backgroundColor?: string;
    subtitleEnabled?: boolean;
    subtitleTextColor?: string;
    subtitleStrokeColor?: string;
    screenWidth?: number;
    screenHeight?: number;
  }) => Promise<boolean>;
  onRecoverVideo: (payload: { workId?: string; providerTaskId?: string }) => Promise<boolean>;
  onDelete: (workId: string) => Promise<boolean>;
  formatDateTime: OptionalDateFormatter;
}

export function DouyinDigitalHumanWorkspace(props: DouyinDigitalHumanWorkspaceProps) {
  const [page, setPage] = useState(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateScopeFilter, setTemplateScopeFilter] = useState<"ALL" | "FAVORITES" | "RECENT">("ALL");
  const [workSearch, setWorkSearch] = useState("");
  const [workStageFilter, setWorkStageFilter] = useState<string>("ALL");
  const [selectedFigureType, setSelectedFigureType] = useState<DigitalHumanFigureType>("sit_body");
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [speechRate, setSpeechRate] = useState("1");
  const [pitch, setPitch] = useState("0");
  const [volume, setVolume] = useState("1");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [subtitleEnabled, setSubtitleEnabled] = useState(true);
  const [subtitleTextColor, setSubtitleTextColor] = useState("#FFFFFF");
  const [subtitleStrokeColor, setSubtitleStrokeColor] = useState("#000000");
  const [screenWidth, setScreenWidth] = useState("1080");
  const [screenHeight, setScreenHeight] = useState("1920");
  const [selectedWorkId, setSelectedWorkId] = useState("");
  const [manualRecoverTaskId, setManualRecoverTaskId] = useState("");
  const [favoriteTemplateIds, setFavoriteTemplateIds] = useState<string[]>([]);
  const [recentTemplateIds, setRecentTemplateIds] = useState<string[]>([]);
  const [scriptActionMessage, setScriptActionMessage] = useState("");

  const filteredTemplates = useMemo(() => {
    const keyword = templateSearch.trim().toLowerCase();
    const favoriteIdSet = new Set(favoriteTemplateIds);
    const recentIdSet = new Set(recentTemplateIds);
    const recentOrderMap = new Map(recentTemplateIds.map((id, index) => [id, index]));
    const favorites = props.templates.filter((item) => favoriteIdSet.has(item.id));
    const recents = props.templates
      .filter((item) => recentIdSet.has(item.id))
      .sort((left, right) => (recentOrderMap.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (recentOrderMap.get(right.id) ?? Number.MAX_SAFE_INTEGER));

    const source =
      templateScopeFilter === "FAVORITES"
        ? favorites
        : templateScopeFilter === "RECENT"
          ? recents
          : props.templates;

    const filtered = keyword
      ? source.filter((item) =>
          [item.name, item.audioName, item.gender, item.tagNames.join(" ")]
            .join(" ")
            .toLowerCase()
            .includes(keyword),
        )
      : source;

    if (templateScopeFilter !== "ALL") {
      return filtered;
    }

    return [...filtered].sort((left, right) => {
      const leftFavorite = favoriteIdSet.has(left.id) ? 1 : 0;
      const rightFavorite = favoriteIdSet.has(right.id) ? 1 : 0;
      if (leftFavorite !== rightFavorite) {
        return rightFavorite - leftFavorite;
      }
      const leftRecent = recentOrderMap.get(left.id);
      const rightRecent = recentOrderMap.get(right.id);
      if (leftRecent !== undefined || rightRecent !== undefined) {
        return (leftRecent ?? Number.MAX_SAFE_INTEGER) - (rightRecent ?? Number.MAX_SAFE_INTEGER);
      }
      return left.name.localeCompare(right.name, "zh-CN");
    });
  }, [favoriteTemplateIds, props.templates, recentTemplateIds, templateScopeFilter, templateSearch]);

  const selectedTemplate = useMemo(
    () => filteredTemplates.find((item) => item.id === selectedTemplateId) || filteredTemplates[0],
    [filteredTemplates, selectedTemplateId],
  );

  const selectedFigure = useMemo(
    () => selectedTemplate?.figures.find((item) => item.type === selectedFigureType) || selectedTemplate?.figures[0],
    [selectedFigureType, selectedTemplate],
  );

  const filteredWorks = useMemo(() => {
    const keyword = workSearch.trim().toLowerCase();
    return props.items.filter((item) => {
      if (workStageFilter === "RECOVERABLE") {
        if (!isRecoverableWork(item)) {
          return false;
        }
      } else if (workStageFilter !== "ALL" && item.stage !== workStageFilter) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return [item.title, item.personName, item.audioName, item.thirdPartyStatusLabel, item.content]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [props.items, workSearch, workStageFilter]);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredWorks.slice(start, start + PAGE_SIZE);
  }, [filteredWorks, page]);

  const pageCount = Math.max(1, Math.ceil(filteredWorks.length / PAGE_SIZE));
  const selectedWork = useMemo(
    () => filteredWorks.find((item) => item.id === selectedWorkId) || filteredWorks[0] || props.items[0],
    [filteredWorks, props.items, selectedWorkId],
  );
  const recentTemplates = useMemo(
    () =>
      recentTemplateIds
        .map((id) => props.templates.find((item) => item.id === id))
        .filter((item): item is DigitalHumanTemplateRecord => Boolean(item))
        .slice(0, 6),
    [props.templates, recentTemplateIds],
  );
  const isSelectedTemplateFavorite = Boolean(selectedTemplate?.id && favoriteTemplateIds.includes(selectedTemplate.id));

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const favoriteText = window.localStorage.getItem(DIGITAL_HUMAN_TEMPLATE_FAVORITES_STORAGE_KEY);
      const recentText = window.localStorage.getItem(DIGITAL_HUMAN_TEMPLATE_RECENTS_STORAGE_KEY);
      const favoriteList = JSON.parse(favoriteText || "[]");
      const recentList = JSON.parse(recentText || "[]");
      setFavoriteTemplateIds(Array.isArray(favoriteList) ? favoriteList.map((item) => String(item || "").trim()).filter(Boolean) : []);
      setRecentTemplateIds(Array.isArray(recentList) ? recentList.map((item) => String(item || "").trim()).filter(Boolean) : []);
    } catch {
      setFavoriteTemplateIds([]);
      setRecentTemplateIds([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(DIGITAL_HUMAN_TEMPLATE_FAVORITES_STORAGE_KEY, JSON.stringify(favoriteTemplateIds));
  }, [favoriteTemplateIds]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(DIGITAL_HUMAN_TEMPLATE_RECENTS_STORAGE_KEY, JSON.stringify(recentTemplateIds));
  }, [recentTemplateIds]);

  useEffect(() => {
    if (!filteredTemplates.length) {
      setSelectedTemplateId("");
      return;
    }
    if (!filteredTemplates.some((item) => item.id === selectedTemplateId)) {
      setSelectedTemplateId(filteredTemplates[0]?.id || "");
    }
  }, [filteredTemplates, selectedTemplateId]);

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }
    if (!selectedTemplate.figures.some((item) => item.type === selectedFigureType)) {
      setSelectedFigureType(selectedTemplate.figures[0]?.type || "sit_body");
    }
    if (!title.trim()) {
      setTitle(`${selectedTemplate.name} 数字人口播`);
    }
    setRecentTemplateIds((current) => {
      const next = [selectedTemplate.id, ...current.filter((item) => item !== selectedTemplate.id)];
      return next.slice(0, 12);
    });
  }, [selectedFigureType, selectedTemplate, title]);

  useEffect(() => {
    if (!props.items.length) {
      setSelectedWorkId("");
      return;
    }
    if (!props.items.some((item) => item.id === selectedWorkId)) {
      setSelectedWorkId(props.items[0]?.id || "");
    }
  }, [props.items, selectedWorkId]);

  useEffect(() => {
    setPage(1);
  }, [templateScopeFilter, workSearch, workStageFilter]);

  useEffect(() => {
    setManualRecoverTaskId(selectedWork?.providerTaskId || "");
  }, [selectedWork?.id, selectedWork?.providerTaskId]);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const createDisabled = !props.canEdit || !selectedTemplate || !selectedFigure || !script.trim();
  const selectedWorkIsRecoverable = Boolean(selectedWork && isRecoverableWork(selectedWork));

  const handleCopyScript = async () => {
    const text = script.trim();
    if (!text) {
      setScriptActionMessage("当前没有可复制的脚本内容。");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setScriptActionMessage("脚本已复制到剪贴板。");
    } catch {
      setScriptActionMessage("复制失败，请手动复制脚本内容。");
    }
  };

  const handleExportScript = () => {
    const text = script.trim();
    if (!text) {
      setScriptActionMessage("当前没有可导出的脚本内容。");
      return;
    }
    try {
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileName = `${(title.trim() || selectedTemplate?.name || "数字人口播脚本").replace(/[\\/:*?\"<>|]/g, "_")}.txt`;
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setScriptActionMessage("脚本已导出为 txt 文件。");
    } catch {
      setScriptActionMessage("导出失败，请稍后重试。");
    }
  };

  const handleRetrySelectedWork = async () => {
    if (!selectedWork || !props.canEdit || props.isSubmitting || selectedWork.stage !== "FAILED") {
      return;
    }
    await props.onCreate({
      title: `${selectedWork.title} 重试`,
      personId: selectedWork.personId,
      personName: selectedWork.personName,
      personSource: selectedWork.personSource,
      figureType: selectedWork.figureType,
      figureCoverUrl: selectedWork.figureCoverUrl,
      figurePreviewVideoUrl: selectedWork.figurePreviewVideoUrl,
      figureWidth: selectedWork.figureWidth,
      figureHeight: selectedWork.figureHeight,
      audioManId: selectedWork.audioManId,
      audioName: selectedWork.audioName,
      script: selectedWork.content,
      speechRate: selectedWork.speechRate,
      pitch: selectedWork.pitch,
      volume: selectedWork.volume,
      language: selectedWork.language,
      backgroundColor: selectedWork.backgroundColor,
      subtitleEnabled: selectedWork.subtitleEnabled,
      subtitleTextColor: selectedWork.subtitleTextColor,
      subtitleStrokeColor: selectedWork.subtitleStrokeColor,
      screenWidth: selectedWork.screenWidth,
      screenHeight: selectedWork.screenHeight,
    });
  };

  return (
    <section className="workspace-panel strategy-page-card">
      <WorkspaceSectionHeader
        sectionLabel={props.sectionLabel}
        sectionDescription={props.sectionDescription}
        createLabel="提交数字人视频"
        refreshDisabled={props.isLoading || props.isSubmitting}
        createDisabled={createDisabled}
        onRefresh={props.onRefresh}
        onOpenCreate={() => {
          if (createDisabled || !selectedTemplate || !selectedFigure) {
            return;
          }
          void props.onCreate({
            title: title.trim() || `${selectedTemplate.name} 数字人口播`,
            personId: selectedTemplate.id,
            personName: selectedTemplate.name,
            personSource: "COMMON",
            figureType: selectedFigure.type,
            figureCoverUrl: selectedFigure.cover,
            figurePreviewVideoUrl: selectedFigure.previewVideoUrl,
            figureWidth: selectedFigure.width,
            figureHeight: selectedFigure.height,
            audioManId: selectedTemplate.audioManId,
            audioName: selectedTemplate.audioName,
            script: script.trim(),
            speechRate: Number(speechRate || 1),
            pitch: Number(pitch || 0),
            volume: Number(volume || 1),
            language: selectedTemplate.audioLang || "cn",
            backgroundColor,
            subtitleEnabled,
            subtitleTextColor,
            subtitleStrokeColor,
            screenWidth: Number(screenWidth || 1080),
            screenHeight: Number(screenHeight || 1920),
          });
        }}
      />

      <article className="light-data-panel report-editor-panel report-editor-panel--compact" style={{ marginTop: 20 }}>
        <div className="report-editor-head">
          <div>
            <strong>模板库与生成参数</strong>
            <p>先选模板，再填写口播脚本和字幕参数，提交后系统会调用蝉镜创建数字人视频任务。</p>
          </div>
          <div className="report-editor-actions">
            <span className={`archive-pill ${props.templates.length ? "status-ready" : "status-in_progress"}`}>
              {props.templatePageInfo?.totalCount
                ? `已加载 ${props.templates.length}/${props.templatePageInfo.totalCount} 个模板`
                : props.templates.length
                  ? `${props.templates.length} 个模板`
                  : "暂无模板"}
            </span>
            <span className={`archive-pill ${props.items.length ? "status-ready" : "status-in_progress"}`}>
              {filteredWorks.length ? `${filteredWorks.length} 条作品` : "暂无作品"}
            </span>
          </div>
        </div>

        <div className="personal-grid">
          <label className="field">
            <span>模板标签</span>
            <select
              value={props.activeTagId || ""}
              onChange={(event) => {
                void props.onTemplateTagChange(event.target.value);
              }}
              disabled={props.isTemplateLoading}
            >
              <option value="">全部标签</option>
              {props.templateTagGroups.flatMap((group) =>
                group.tagList.map((tag) => (
                  <option key={tag.id} value={String(tag.id)}>
                    {group.name} / {tag.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="field">
            <span>模板搜索</span>
            <input
              value={templateSearch}
              onChange={(event) => setTemplateSearch(event.target.value)}
              placeholder="搜索模板名、音色或标签"
            />
          </label>
          <label className="field">
            <span>模板范围</span>
            <select value={templateScopeFilter} onChange={(event) => setTemplateScopeFilter(event.target.value as "ALL" | "FAVORITES" | "RECENT")}>
              <option value="ALL">全部模板</option>
              <option value="FAVORITES">仅看收藏</option>
              <option value="RECENT">最近使用</option>
            </select>
          </label>
          <label className="field">
            <span>数字人模板</span>
            <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
              {filteredTemplates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>形象类型</span>
            <select value={selectedFigureType} onChange={(event) => setSelectedFigureType(event.target.value as DigitalHumanFigureType)}>
              {(selectedTemplate?.figures || []).map((item) => (
                <option key={item.type} value={item.type}>
                  {getFigureTypeLabel(item.type)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>作品标题</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：新品活动数字人口播" />
          </label>
          <label className="field field-full">
            <span>口播脚本</span>
            <textarea
              className="composer-form-textarea"
              value={script}
              onChange={(event) => setScript(event.target.value)}
              placeholder="请输入适合 15-60 秒数字人口播的视频脚本。"
            />
          </label>
          <div className="field field-full">
            <span>脚本快捷模板</span>
            <div className="strategy-inline-actions" style={{ marginTop: 8, flexWrap: "wrap" }}>
              {DIGITAL_HUMAN_SCRIPT_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  className="secondary-button"
                  onClick={() => setScript((current) => current.trim() ? `${current.trim()}\n\n${preset.content}` : preset.content)}
                >
                  {preset.label}
                </button>
              ))}
              <button type="button" className="secondary-button" onClick={() => setScript("")}>
                清空脚本
              </button>
              <button type="button" className="secondary-button" onClick={() => void handleCopyScript()}>
                复制脚本
              </button>
              <button type="button" className="secondary-button" onClick={handleExportScript}>
                导出脚本
              </button>
            </div>
            <small className="personal-meta">可先插入一版基础结构，再按实际产品和场景补充细节。</small>
            {scriptActionMessage ? <small className="personal-meta">{scriptActionMessage}</small> : null}
          </div>
          <label className="field">
            <span>语速</span>
            <input value={speechRate} onChange={(event) => setSpeechRate(event.target.value)} />
          </label>
          <label className="field">
            <span>音调</span>
            <input value={pitch} onChange={(event) => setPitch(event.target.value)} />
          </label>
          <label className="field">
            <span>音量</span>
            <input value={volume} onChange={(event) => setVolume(event.target.value)} />
          </label>
          <label className="field">
            <span>背景色</span>
            <input value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} />
          </label>
          <label className="field">
            <span>画布宽度</span>
            <input value={screenWidth} onChange={(event) => setScreenWidth(event.target.value)} />
          </label>
          <label className="field">
            <span>画布高度</span>
            <input value={screenHeight} onChange={(event) => setScreenHeight(event.target.value)} />
          </label>
          <label className="field">
            <span>字幕开关</span>
            <select value={subtitleEnabled ? "yes" : "no"} onChange={(event) => setSubtitleEnabled(event.target.value === "yes")}>
              <option value="yes">开启</option>
              <option value="no">关闭</option>
            </select>
          </label>
          <label className="field">
            <span>字幕颜色</span>
            <input value={subtitleTextColor} onChange={(event) => setSubtitleTextColor(event.target.value)} />
          </label>
          <label className="field">
            <span>描边颜色</span>
            <input value={subtitleStrokeColor} onChange={(event) => setSubtitleStrokeColor(event.target.value)} />
          </label>
        </div>

        <div className="personal-grid" style={{ marginTop: 16 }}>
          <div className="entity-card personal-card">
            <strong>{selectedTemplate?.name || "未选择模板"}</strong>
            <p className="personal-meta">
              {selectedTemplate?.audioName ? `默认音色：${selectedTemplate.audioName}` : "请选择模板"}
            </p>
            <p className="panel-subtext">{selectedTemplate?.tagNames?.join(" / ") || "支持按标签筛选蝉镜公共数字人模板。"}</p>
            {selectedTemplate?.audioPreview ? (
              <audio controls preload="none" src={selectedTemplate.audioPreview} style={{ width: "100%", marginTop: 12 }} />
            ) : (
              <p className="panel-subtext" style={{ marginTop: 12 }}>当前模板暂无音色试听链接。</p>
            )}
            {selectedTemplate?.id ? (
              <div className="strategy-inline-actions" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setFavoriteTemplateIds((current) =>
                      current.includes(selectedTemplate.id)
                        ? current.filter((item) => item !== selectedTemplate.id)
                        : [selectedTemplate.id, ...current].slice(0, 30),
                    )
                  }
                >
                  {isSelectedTemplateFavorite ? "取消收藏" : "收藏模板"}
                </button>
              </div>
            ) : null}
          </div>
          <div className="entity-card personal-card">
            <strong>{selectedFigure ? getFigureTypeLabel(selectedFigure.type) : "形象预览"}</strong>
            <p className="personal-meta">
              {selectedFigure ? `${selectedFigure.width} x ${selectedFigure.height}` : "待选择"}
            </p>
            {selectedFigure?.cover ? (
              <img src={selectedFigure.cover} alt={selectedTemplate?.name || "数字人模板"} style={{ width: "100%", borderRadius: 16, marginTop: 12 }} />
            ) : (
              <p className="panel-subtext">当前模板暂无封面图。</p>
            )}
            {selectedFigure?.previewVideoUrl ? (
              <video controls preload="metadata" src={selectedFigure.previewVideoUrl} style={{ width: "100%", borderRadius: 16, marginTop: 12, background: "#0f1525" }} />
            ) : null}
          </div>
          <div className="entity-card personal-card">
            <strong>配置提醒</strong>
            <p className="panel-subtext">请先在个人中心的第三方平台里配置蝉镜凭证，格式为 `appId::secretKey`。</p>
            <p className="panel-subtext">模板、作品列表和找回动作都会直接走蝉镜 OpenAPI。</p>
            <p className="panel-subtext">如果模板较多，可先按标签筛选，再用关键词搜索模板名、音色或标签。</p>
            <p className="panel-subtext">常用模板可加入收藏，最近点过的模板会自动进入“最近使用”。</p>
          </div>
        </div>

        {recentTemplates.length ? (
          <div className="strategy-inline-actions" style={{ marginTop: 16, flexWrap: "wrap" }}>
            <span className="panel-subtext">最近使用：</span>
            {recentTemplates.map((item) => (
              <button
                key={item.id}
                type="button"
                className="secondary-button"
                onClick={() => setSelectedTemplateId(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>
        ) : null}

        {props.onLoadMoreTemplates && props.templatePageInfo && props.templatePageInfo.page < props.templatePageInfo.totalPage ? (
          <div className="strategy-inline-actions" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void props.onLoadMoreTemplates?.()}
              disabled={props.isTemplateLoading}
            >
              {props.isTemplateLoading ? "加载中..." : "继续加载模板"}
            </button>
            <span className="panel-subtext">
              当前第 {props.templatePageInfo.page}/{props.templatePageInfo.totalPage} 页，每页 {props.templatePageInfo.size} 条
            </span>
          </div>
        ) : null}
      </article>

      <article className="light-data-panel report-editor-panel report-editor-panel--compact" style={{ marginTop: 20 }}>
        <div className="report-editor-head">
          <div>
            <strong>作品中心</strong>
            <p>展示最近生成的数字人视频作品，支持找回结果、删除记录和媒体预览。</p>
          </div>
        </div>

        <div className="personal-grid" style={{ marginBottom: 16 }}>
          <label className="field">
            <span>作品搜索</span>
            <input
              value={workSearch}
              onChange={(event) => setWorkSearch(event.target.value)}
              placeholder="搜索标题、数字人、音色或脚本内容"
            />
          </label>
          <label className="field">
            <span>状态筛选</span>
            <select value={workStageFilter} onChange={(event) => setWorkStageFilter(event.target.value)}>
              <option value="ALL">全部状态</option>
              <option value="RECOVERABLE">待找回</option>
              <option value="QUEUED">排队中</option>
              <option value="GENERATING">生成中</option>
              <option value="SUCCESS">已完成</option>
              <option value="FAILED">失败</option>
            </select>
          </label>
        </div>

        <div className="strategy-inline-actions" style={{ marginBottom: 16, flexWrap: "wrap" }}>
          <button type="button" className="secondary-button" onClick={() => setWorkStageFilter("ALL")}>
            查看全部
          </button>
          <button type="button" className="secondary-button" onClick={() => setWorkStageFilter("FAILED")}>
            只看失败
          </button>
          <button type="button" className="secondary-button" onClick={() => setWorkStageFilter("RECOVERABLE")}>
            只看待找回
          </button>
          <button type="button" className="secondary-button" onClick={() => setWorkStageFilter("SUCCESS")}>
            只看已完成
          </button>
          <button type="button" className="secondary-button" onClick={() => setWorkStageFilter("GENERATING")}>
            只看生成中
          </button>
          <button type="button" className="secondary-button" onClick={() => setWorkSearch("")}>
            清空搜索
          </button>
        </div>

        {!props.items.length ? (
          <div className="empty-state">当前还没有数字人作品，先从上方选择模板并提交一条视频任务。</div>
        ) : !filteredWorks.length ? (
          <div className="empty-state">当前筛选条件下没有匹配作品，试试清空关键词或切换状态。</div>
        ) : (
          <>
            <div className="xhs-material-library">
              <div className="xhs-material-card-grid">
                {pagedItems.map((item) => (
                  <article key={item.id} className="xhs-material-card">
                    <button
                      type="button"
                      className={`xhs-material-card-stage ${selectedWork?.id === item.id ? "is-active" : ""}`}
                      onClick={() => setSelectedWorkId(item.id)}
                    >
                      {item.coverImageUrl ? (
                        <img className="xhs-material-card-media" src={item.coverImageUrl} alt={item.title} />
                      ) : item.videoUrl ? (
                        <video className="xhs-material-card-media" src={item.videoUrl} muted preload="none" />
                      ) : (
                        <span className="xhs-material-card-empty">暂无封面</span>
                      )}
                      <span className={`xhs-material-card-badge ${getStageClass(item.stage)}`}>{getStageLabel(item.stage)}</span>
                    </button>
                    <div className="xhs-material-card-body">
                      <strong>{item.title}</strong>
                      <p>{item.personName} · {getFigureTypeLabel(item.figureType)}</p>
                      <p>{props.formatDateTime(item.createdAt)}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {pageCount > 1 ? (
              <div className="pagination-bar">
                <button type="button" className="secondary-button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  上一页
                </button>
                <span className="panel-subtext">第 {page} / {pageCount} 页</span>
                <button type="button" className="secondary-button" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>
                  下一页
                </button>
              </div>
            ) : null}

            {selectedWork ? (
              <article className="light-data-panel report-editor-panel" style={{ marginTop: 20 }}>
                <div className="report-editor-head">
                  <div>
                    <strong>{selectedWork.title}</strong>
                    <p>
                      {selectedWork.personName}
                      {" · "}
                      {getFigureTypeLabel(selectedWork.figureType)}
                      {selectedWork.audioName ? ` · ${selectedWork.audioName}` : ""}
                    </p>
                  </div>
                  <div className="report-editor-actions">
                    <span className={`archive-pill ${getStageClass(selectedWork.stage)}`}>{getStageLabel(selectedWork.stage)}</span>
                    {selectedWorkIsRecoverable ? <span className="archive-pill status-in_progress">待找回</span> : null}
                    {selectedWork.thirdPartyStatusLabel ? (
                      <span className="archive-pill status-pending">{selectedWork.thirdPartyStatusLabel}</span>
                    ) : null}
                    <span className="archive-pill status-pending">{props.formatDateTime(selectedWork.updatedAt)}</span>
                  </div>
                </div>

                <div className="personal-grid">
                  <div className="report-editor-pane field-full">
                    <span>口播脚本</span>
                    <textarea className="report-markdown-textarea composer-form-textarea" value={selectedWork.content} readOnly />
                  </div>
                  <div className="report-editor-pane">
                    <span>数字人封面</span>
                    {selectedWork.coverImageUrl ? (
                      <img src={selectedWork.coverImageUrl} alt={selectedWork.title} style={{ width: "100%", borderRadius: 20, border: "1px solid #dfe5f2" }} />
                    ) : (
                      <div className="empty-state">暂无封面。</div>
                    )}
                  </div>
                  <div className="report-editor-pane">
                    <span>最终视频</span>
                    {selectedWork.videoUrl ? (
                      <video controls preload="metadata" src={selectedWork.videoUrl} style={{ width: "100%", borderRadius: 20, background: "#0f1525" }} />
                    ) : (
                      <div className="empty-state">视频生成完成后这里会显示最终成片。</div>
                    )}
                  </div>
                </div>

                {selectedWork.thirdPartyStatusDetail ? (
                  <div className="report-inline-tip" style={{ marginTop: 16 }}>{selectedWork.thirdPartyStatusDetail}</div>
                ) : null}

                <div className="personal-grid" style={{ marginTop: 16 }}>
                  <label className="field field-full">
                    <span>手动找回蝉镜任务 ID</span>
                    <input
                      value={manualRecoverTaskId}
                      onChange={(event) => setManualRecoverTaskId(event.target.value)}
                      placeholder="可手动输入蝉镜任务 ID，用于补找回最终视频结果"
                      disabled={!props.canEdit || props.isSubmitting}
                    />
                    <small className="personal-meta">适用于已知蝉镜任务 ID，但当前作品未回填最终视频的场景。</small>
                  </label>
                </div>

                <div className="strategy-inline-actions" style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void props.onRecoverVideo({ workId: selectedWork.id, providerTaskId: selectedWork.providerTaskId })}
                    disabled={!props.canEdit || props.isSubmitting || !selectedWork.providerTaskId}
                  >
                    找回视频结果
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void props.onRecoverVideo({ workId: selectedWork.id, providerTaskId: manualRecoverTaskId.trim() || undefined })}
                    disabled={!props.canEdit || props.isSubmitting || !manualRecoverTaskId.trim()}
                  >
                    按任务 ID 找回
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void handleRetrySelectedWork()}
                    disabled={!props.canEdit || props.isSubmitting || selectedWork.stage !== "FAILED"}
                  >
                    失败重试
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => props.onPreview(selectedWork)}
                    disabled={!selectedWork.videoUrl && !selectedWork.coverImageUrl}
                  >
                    预览媒体
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void props.onDelete(selectedWork.id)}
                    disabled={!props.canEdit || props.isSubmitting}
                  >
                    删除
                  </button>
                </div>
              </article>
            ) : null}
          </>
        )}
      </article>
    </section>
  );
}
