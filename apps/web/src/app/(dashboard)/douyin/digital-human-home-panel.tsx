"use client";

import { useMemo, useState } from "react";
import type {
  DigitalHumanFigureType,
  DigitalHumanTemplateRecord,
  DouyinDigitalHumanCustomPersonRecord,
  DouyinDigitalHumanVideoWorkRecord,
} from "../../../services/works";
import type { OptionalDateFormatter } from "../xiaohongshu/shared-types";

type TrainType = "figure" | "both";
type ResolutionRate = "1080p" | "4K";

export interface DigitalHumanHomePanelProps {
  templates: DigitalHumanTemplateRecord[];
  favoriteTemplateIds: string[];
  customPersons: DouyinDigitalHumanCustomPersonRecord[];
  works: DouyinDigitalHumanVideoWorkRecord[];
  publicVoiceCount: number;
  customVoiceCount: number;
  isSubmitting: boolean;
  canEdit: boolean;
  formatDateTime: OptionalDateFormatter;
  onRefresh: () => void | Promise<void>;
  onCreateCustomPerson: (payload: {
    name?: string;
    trainingVideoFile?: File | null;
    trainType?: TrainType;
    language?: string;
    resolutionRate?: ResolutionRate;
    errorSkip?: boolean;
  }) => Promise<boolean>;
  onUseTemplate: (payload: {
    templateId: string;
    figureType?: DigitalHumanFigureType;
  }) => void;
  onUseCustomPerson: (customPersonId: string) => void;
  onOpenCreator: () => void;
  onOpenTemplateLibrary: () => void;
  onOpenVoiceLibrary: () => void;
  onOpenWorksCenter: () => void;
}

function getCustomPersonStatusLabel(status?: DouyinDigitalHumanCustomPersonRecord["status"]) {
  switch (status) {
    case "SUCCESS":
      return "可创作";
    case "FAILED":
      return "训练失败";
    case "RUNNING":
      return "训练中";
    default:
      return "等待中";
  }
}

function getCustomPersonStatusClass(status?: DouyinDigitalHumanCustomPersonRecord["status"]) {
  switch (status) {
    case "SUCCESS":
      return "status-ready";
    case "FAILED":
      return "status-pending";
    default:
      return "status-in_progress";
  }
}

function getWorkStageLabel(stage?: DouyinDigitalHumanVideoWorkRecord["stage"]) {
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

function getWorkStageClass(stage?: DouyinDigitalHumanVideoWorkRecord["stage"]) {
  switch (stage) {
    case "SUCCESS":
      return "status-ready";
    case "FAILED":
      return "status-pending";
    default:
      return "status-in_progress";
  }
}

export function DigitalHumanHomePanel(props: DigitalHumanHomePanelProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [customPersonName, setCustomPersonName] = useState("");
  const [trainingVideoFile, setTrainingVideoFile] = useState<File | null>(null);
  const [trainType, setTrainType] = useState<TrainType>("both");
  const [language, setLanguage] = useState("cn");
  const [resolutionRate, setResolutionRate] = useState<ResolutionRate>("1080p");
  const [errorSkip, setErrorSkip] = useState(true);

  const favoriteTemplateIdSet = useMemo(() => new Set(props.favoriteTemplateIds), [props.favoriteTemplateIds]);
  const myDigitalHumans = useMemo(
    () => [...props.customPersons].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()).slice(0, 6),
    [props.customPersons],
  );
  const publicDigitalHumans = useMemo(
    () =>
      [...props.templates]
        .sort((left, right) => {
          const leftFavorite = favoriteTemplateIdSet.has(left.id) ? 1 : 0;
          const rightFavorite = favoriteTemplateIdSet.has(right.id) ? 1 : 0;
          if (leftFavorite !== rightFavorite) {
            return rightFavorite - leftFavorite;
          }
          return left.name.localeCompare(right.name, "zh-CN");
        })
        .slice(0, 8),
    [favoriteTemplateIdSet, props.templates],
  );
  const recentWorks = useMemo(
    () => [...props.works].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()).slice(0, 4),
    [props.works],
  );

  const resetCreateDialog = () => {
    setCustomPersonName("");
    setTrainingVideoFile(null);
    setTrainType("both");
    setLanguage("cn");
    setResolutionRate("1080p");
    setErrorSkip(true);
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    resetCreateDialog();
  };

  const handleSubmitCreate = async () => {
    if (!trainingVideoFile) {
      return;
    }
    const success = await props.onCreateCustomPerson({
      name: customPersonName.trim() || undefined,
      trainingVideoFile,
      trainType,
      language,
      resolutionRate,
      errorSkip,
    });
    if (!success) {
      return;
    }
    closeCreateDialog();
  };

  return (
    <article className="light-data-panel report-editor-panel report-editor-panel--compact" style={{ marginTop: 20 }}>
      <div className="report-editor-head">
        <div>
          <strong>数字人首页</strong>
          <p>把快速创建、我的数字人、公共数字人、模板库、语音库和最近作品收口成一条更轻的创作主流程。</p>
        </div>
        <div className="report-editor-actions">
          <span className="archive-pill status-ready">{props.customPersons.length} 个我的数字人</span>
          <span className="archive-pill status-ready">{props.templates.length} 个公共数字人</span>
          <span className="archive-pill status-ready">{props.publicVoiceCount} 个公共声音</span>
          <span className="archive-pill status-ready">{props.customVoiceCount} 个我的声音</span>
        </div>
      </div>

      <div className="digital-human-home-hero">
        <button
          type="button"
          className="digital-human-home-quick-card"
          onClick={() => setIsCreateDialogOpen(true)}
          disabled={!props.canEdit || props.isSubmitting}
        >
          <span className="digital-human-home-quick-card__icon">+</span>
          <strong>快速创建数字人</strong>
          <span>上传一段训练视频，提交后会自动进入“我的数字人”列表。</span>
        </button>

        <div className="digital-human-home-hero__actions">
          <button type="button" className="primary-button" onClick={props.onOpenCreator}>
            进入创作作品
          </button>
          <button type="button" className="secondary-button" onClick={props.onOpenTemplateLibrary}>
            去模板库挑选
          </button>
          <button type="button" className="secondary-button" onClick={props.onOpenVoiceLibrary}>
            去语音库管理
          </button>
          <button type="button" className="secondary-button" onClick={props.onOpenWorksCenter}>
            查看作品中心
          </button>
          <button type="button" className="secondary-button" onClick={() => void props.onRefresh()} disabled={props.isSubmitting}>
            刷新首页数据
          </button>
        </div>
      </div>

      <section className="digital-human-home-section">
        <div className="digital-human-home-section__head">
          <div>
            <strong>我的数字人</strong>
            <p className="panel-subtext">优先展示最近训练或最近更新的数字人，训练成功后可直接带入创作作品。</p>
          </div>
          <button type="button" className="secondary-button" onClick={() => setIsCreateDialogOpen(true)} disabled={!props.canEdit || props.isSubmitting}>
            再创建一个
          </button>
        </div>
        <div className="digital-human-home-grid">
          {myDigitalHumans.length ? (
            myDigitalHumans.map((item) => (
              <article key={item.id} className="digital-human-home-card">
                <div className="digital-human-home-card__media">
                  {item.coverImageUrl ? (
                    <img src={item.coverImageUrl} alt={item.name} className="digital-human-home-card__image" />
                  ) : (
                    <div className="digital-human-home-card__empty">暂无封面</div>
                  )}
                </div>
                <div className="digital-human-home-card__body">
                  <div className="digital-human-home-card__title-row">
                    <strong>{item.name}</strong>
                    <span className={`archive-pill ${getCustomPersonStatusClass(item.status)}`}>{getCustomPersonStatusLabel(item.status)}</span>
                  </div>
                  <p className="panel-subtext">
                    {item.trainType === "both" ? "形象 + 音色" : "仅形象"}
                    {item.audioManId ? " / 已返回音色" : ""}
                    {item.support4k ? " / 支持 4K" : ""}
                  </p>
                  <p className="panel-subtext">最近更新：{props.formatDateTime(item.updatedAt)}</p>
                  <div className="digital-human-home-card__actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => props.onUseCustomPerson(item.id)}
                      disabled={item.status !== "SUCCESS"}
                    >
                      去创作
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">当前还没有我的数字人，点击“快速创建数字人”先提交一段训练视频。</div>
          )}
        </div>
      </section>

      <section className="digital-human-home-section">
        <div className="digital-human-home-section__head">
          <div>
            <strong>公共数字人</strong>
            <p className="panel-subtext">复用当前模板库中的热门人物，收藏模板会优先展示，点击后直接带入创作作品。</p>
          </div>
          <button type="button" className="secondary-button" onClick={props.onOpenTemplateLibrary}>
            查看完整模板库
          </button>
        </div>
        <div className="digital-human-home-grid digital-human-home-grid--compact">
          {publicDigitalHumans.length ? (
            publicDigitalHumans.map((item) => {
              const previewFigure = item.figures[0];
              return (
                <article key={item.id} className="digital-human-home-card">
                  <div className="digital-human-home-card__media">
                    {previewFigure?.cover ? (
                      <img src={previewFigure.cover} alt={item.name} className="digital-human-home-card__image" />
                    ) : (
                      <div className="digital-human-home-card__empty">暂无封面</div>
                    )}
                  </div>
                  <div className="digital-human-home-card__body">
                    <div className="digital-human-home-card__title-row">
                      <strong>{item.name}</strong>
                      {favoriteTemplateIdSet.has(item.id) ? <span className="archive-pill status-ready">已收藏</span> : null}
                    </div>
                    <p className="panel-subtext">{item.tagNames.slice(0, 3).join(" / ") || item.audioName || "公共模板"}</p>
                    <div className="digital-human-home-card__actions">
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => props.onUseTemplate({ templateId: item.id, figureType: previewFigure?.type })}
                      >
                        去创作
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="empty-state">当前没有可用的公共数字人模板，请先检查蝉镜模板配置或刷新数据。</div>
          )}
        </div>
      </section>

      <section className="digital-human-home-section">
        <div className="digital-human-home-section__head">
          <div>
            <strong>最近作品</strong>
            <p className="panel-subtext">统一承接当前品牌的数字人视频任务，可快速查看状态并前往作品中心继续处理。</p>
          </div>
          <button type="button" className="secondary-button" onClick={props.onOpenWorksCenter}>
            打开作品中心
          </button>
        </div>
        <div className="digital-human-home-work-grid">
          {recentWorks.length ? (
            recentWorks.map((item) => (
              <article key={item.id} className="digital-human-home-work-card">
                <div>
                  <div className="digital-human-home-card__title-row">
                    <strong>{item.title}</strong>
                    <span className={`archive-pill ${getWorkStageClass(item.stage)}`}>{getWorkStageLabel(item.stage)}</span>
                  </div>
                  <p className="panel-subtext">
                    {item.personName}
                    {item.audioName ? ` / ${item.audioName}` : ""}
                  </p>
                  <p className="panel-subtext">最近更新：{props.formatDateTime(item.updatedAt)}</p>
                </div>
                <div className="digital-human-home-card__actions">
                  <button type="button" className="secondary-button" onClick={props.onOpenWorksCenter}>
                    去作品中心
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">当前还没有数字人作品，去“创作作品”提交第一条任务即可。</div>
          )}
        </div>
      </section>

      {isCreateDialogOpen ? (
        <div className="digital-human-template-modal-overlay" onClick={closeCreateDialog}>
          <div className="digital-human-template-modal digital-human-home-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="report-editor-head">
              <div>
                <strong>快速创建数字人</strong>
                <p>上传训练视频后，系统会复用现有定制数字人链路提交训练，完成后自动出现在“我的数字人”。</p>
              </div>
              <button type="button" className="secondary-button" onClick={closeCreateDialog}>
                关闭
              </button>
            </div>

            <div className="personal-grid" style={{ marginTop: 16 }}>
              <label className="field">
                <span>数字人名称</span>
                <input value={customPersonName} onChange={(event) => setCustomPersonName(event.target.value)} placeholder="例如：品牌讲解数字人" />
              </label>
              <label className="field">
                <span>训练类型</span>
                <select value={trainType} onChange={(event) => setTrainType(event.target.value as TrainType)}>
                  <option value="both">形象 + 音色</option>
                  <option value="figure">仅形象</option>
                </select>
              </label>
              <label className="field">
                <span>语言</span>
                <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                  <option value="cn">中文</option>
                  <option value="en">英文</option>
                </select>
              </label>
              <label className="field">
                <span>输出规格</span>
                <select value={resolutionRate} onChange={(event) => setResolutionRate(event.target.value as ResolutionRate)}>
                  <option value="1080p">1080p</option>
                  <option value="4K">4K</option>
                </select>
              </label>
              <label className="field field-full">
                <span>训练视频</span>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/*"
                  onChange={(event) => setTrainingVideoFile(event.target.files?.[0] || null)}
                />
                <p className="panel-subtext" style={{ marginTop: 8 }}>
                  支持上传 MP4 / MOV，提交后会进入训练流程。{trainingVideoFile ? `当前已选择：${trainingVideoFile.name}` : "请先选择训练视频。"}
                </p>
              </label>
              <label className="field field-full" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" checked={errorSkip} onChange={(event) => setErrorSkip(event.target.checked)} style={{ width: 16, height: 16 }} />
                <span style={{ marginBottom: 0 }}>检测到低质量片段时自动跳过，优先保证可训练性</span>
              </label>
            </div>

            <div className="digital-human-home-dialog__actions">
              <button type="button" className="secondary-button" onClick={closeCreateDialog}>
                取消
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleSubmitCreate()}
                disabled={!props.canEdit || props.isSubmitting || !trainingVideoFile}
              >
                {props.isSubmitting ? "提交中..." : "确定创建"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
