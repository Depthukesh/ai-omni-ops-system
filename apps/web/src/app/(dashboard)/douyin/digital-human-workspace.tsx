"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type DigitalHumanFigureType,
  type DigitalHumanTemplateRecord,
  type DigitalHumanTemplateTagGroupRecord,
  type DouyinDigitalHumanVideoWorkRecord,
} from "../../../services/works";
import { WorkspaceSectionHeader } from "../xiaohongshu/note-workspace-shared-panels";
import { type OptionalDateFormatter } from "../xiaohongshu/shared-types";

const PAGE_SIZE = 18;

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

export interface DouyinDigitalHumanWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  isSubmitting: boolean;
  canEdit: boolean;
  items: DouyinDigitalHumanVideoWorkRecord[];
  templateTagGroups: DigitalHumanTemplateTagGroupRecord[];
  templates: DigitalHumanTemplateRecord[];
  onRefresh: () => void | Promise<void>;
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
  const [selectedTagId, setSelectedTagId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
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

  const filteredTemplates = useMemo(() => {
    if (!selectedTagId) {
      return props.templates;
    }
    return props.templates.filter((item) => item.tagIds.includes(Number(selectedTagId)));
  }, [props.templates, selectedTagId]);

  const selectedTemplate = useMemo(
    () => filteredTemplates.find((item) => item.id === selectedTemplateId) || filteredTemplates[0],
    [filteredTemplates, selectedTemplateId],
  );

  const selectedFigure = useMemo(
    () => selectedTemplate?.figures.find((item) => item.type === selectedFigureType) || selectedTemplate?.figures[0],
    [selectedFigureType, selectedTemplate],
  );

  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return props.items.slice(start, start + PAGE_SIZE);
  }, [page, props.items]);

  const pageCount = Math.max(1, Math.ceil(props.items.length / PAGE_SIZE));
  const selectedWork = useMemo(
    () => props.items.find((item) => item.id === selectedWorkId) || props.items[0],
    [props.items, selectedWorkId],
  );

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
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const createDisabled = !props.canEdit || !selectedTemplate || !selectedFigure || !script.trim();

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
              {props.templates.length ? `${props.templates.length} 个模板` : "暂无模板"}
            </span>
            <span className={`archive-pill ${props.items.length ? "status-ready" : "status-in_progress"}`}>
              {props.items.length ? `${props.items.length} 条作品` : "暂无作品"}
            </span>
          </div>
        </div>

        <div className="personal-grid">
          <label className="field">
            <span>模板标签</span>
            <select value={selectedTagId} onChange={(event) => setSelectedTagId(event.target.value)}>
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
          </div>
          <div className="entity-card personal-card">
            <strong>配置提醒</strong>
            <p className="panel-subtext">请先在个人中心的第三方平台里配置蝉镜凭证，格式为 `appId::secretKey`。</p>
            <p className="panel-subtext">模板、作品列表和找回动作都会直接走蝉镜 OpenAPI。</p>
          </div>
        </div>
      </article>

      <article className="light-data-panel report-editor-panel report-editor-panel--compact" style={{ marginTop: 20 }}>
        <div className="report-editor-head">
          <div>
            <strong>作品中心</strong>
            <p>展示最近生成的数字人视频作品，支持找回结果、删除记录和媒体预览。</p>
          </div>
        </div>

        {!props.items.length ? (
          <div className="empty-state">当前还没有数字人作品，先从上方选择模板并提交一条视频任务。</div>
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

                <div className="strategy-inline-actions" style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void props.onRecoverVideo({ workId: selectedWork.id, providerTaskId: selectedWork.providerTaskId })}
                    disabled={!props.canEdit || props.isSubmitting}
                  >
                    找回视频结果
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
