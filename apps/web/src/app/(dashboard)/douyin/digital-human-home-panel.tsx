"use client";

import { useMemo, useRef, useState } from "react";
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
  const [activeTab, setActiveTab] = useState<"MY" | "PUBLIC">("MY");
  const [customPersonName, setCustomPersonName] = useState("");
  const [trainingVideoFile, setTrainingVideoFile] = useState<File | null>(null);
  const [agreedToCreate, setAgreedToCreate] = useState(true);
  const trainingVideoInputRef = useRef<HTMLInputElement | null>(null);

  const favoriteTemplateIdSet = useMemo(() => new Set(props.favoriteTemplateIds), [props.favoriteTemplateIds]);
  const myDigitalHumans = useMemo(
    () => [...props.customPersons].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()).slice(0, 8),
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
        .slice(0, 12),
    [favoriteTemplateIdSet, props.templates],
  );
  const exampleCards = useMemo(
    () =>
      [...myDigitalHumans.map((item) => ({ id: item.id, name: item.name, cover: item.coverImageUrl })), ...publicDigitalHumans.map((item) => ({ id: item.id, name: item.name, cover: item.figures[0]?.cover }))]
        .filter((item) => item.cover)
        .slice(0, 3),
    [myDigitalHumans, publicDigitalHumans],
  );
  const recentWorks = useMemo(
    () => [...props.works].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()).slice(0, 3),
    [props.works],
  );

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setCustomPersonName("");
    setTrainingVideoFile(null);
    setAgreedToCreate(true);
  };

  const handleSubmitCreate = async () => {
    if (!trainingVideoFile) {
      return;
    }
    const success = await props.onCreateCustomPerson({
      name: customPersonName.trim() || undefined,
      trainingVideoFile,
      trainType: "both",
      language: "cn",
      resolutionRate: "1080p",
      errorSkip: true,
    });
    if (!success) {
      return;
    }
    closeCreateDialog();
  };

  const renderCustomCard = (item: DouyinDigitalHumanCustomPersonRecord) => (
    <article key={item.id} className="digital-human-home-v2-card">
      <div className="digital-human-home-v2-card__media">
        {item.coverImageUrl ? <img src={item.coverImageUrl} alt={item.name} className="digital-human-home-v2-card__image" /> : <div className="digital-human-home-v2-card__empty">暂无封面</div>}
        <div className="digital-human-home-v2-card__overlay">
          <button type="button" className="primary-button" onClick={() => props.onUseCustomPerson(item.id)} disabled={item.status !== "SUCCESS"}>
            去创作
          </button>
        </div>
      </div>
      <div className="digital-human-home-v2-card__body">
        <strong>{item.name}</strong>
        <div className="digital-human-home-v2-card__meta">
          <span className={`archive-pill ${getCustomPersonStatusClass(item.status)}`}>{getCustomPersonStatusLabel(item.status)}</span>
          <span>{item.audioManId ? "1个素材" : "训练完成后可创作"}</span>
        </div>
      </div>
    </article>
  );

  const renderTemplateCard = (item: DigitalHumanTemplateRecord) => {
    const previewFigure = item.figures[0];
    return (
      <article key={item.id} className="digital-human-home-v2-card">
        <div className="digital-human-home-v2-card__media">
          {previewFigure?.cover ? <img src={previewFigure.cover} alt={item.name} className="digital-human-home-v2-card__image" /> : <div className="digital-human-home-v2-card__empty">暂无封面</div>}
          <div className="digital-human-home-v2-card__overlay">
            <button type="button" className="primary-button" onClick={() => props.onUseTemplate({ templateId: item.id, figureType: previewFigure?.type })}>
              去创作
            </button>
          </div>
        </div>
        <div className="digital-human-home-v2-card__body">
          <strong>{item.name}</strong>
          <div className="digital-human-home-v2-card__meta">
            <span>{favoriteTemplateIdSet.has(item.id) ? "已收藏" : item.audioName || "公共数字人"}</span>
            <span>{item.tagNames.length ? `${item.tagNames.length}个标签` : "可直接创作"}</span>
          </div>
        </div>
      </article>
    );
  };

  return (
    <article className="light-data-panel report-editor-panel report-editor-panel--compact digital-human-home-v2" style={{ marginTop: 20 }}>
      <div className="digital-human-home-v2__head">
        <div>
          <strong>数字人</strong>
          <p>按你给的参考图调整为卡片流主页，先看我的数字人和公共数字人，再进入创作作品。</p>
        </div>
        <div className="report-editor-actions">
          <span className="archive-pill status-ready">{props.customPersons.length} 个我的数字人</span>
          <span className="archive-pill status-ready">{props.templates.length} 个公共数字人</span>
          <span className="archive-pill status-ready">{props.publicVoiceCount + props.customVoiceCount} 个声音资源</span>
        </div>
      </div>

      <div className="digital-human-home-v2__tabs">
        <button type="button" className={`personal-reference-tab ${activeTab === "MY" ? "is-active" : ""}`} onClick={() => setActiveTab("MY")}>
          我的数字人
        </button>
        <button type="button" className={`personal-reference-tab ${activeTab === "PUBLIC" ? "is-active" : ""}`} onClick={() => setActiveTab("PUBLIC")}>
          公共数字人
        </button>
      </div>

      {activeTab === "MY" ? (
        <>
          <div className="digital-human-home-v2__grid">
            <button
              type="button"
              className="digital-human-home-v2-quick-card"
              onClick={() => setIsCreateDialogOpen(true)}
              disabled={!props.canEdit || props.isSubmitting}
            >
              <span className="digital-human-home-v2-quick-card__icon">+</span>
              <strong>快速创建数字人</strong>
              <span>上传一段视频，系统会沿用现有训练链路创建你的专属数字人。</span>
            </button>
            {myDigitalHumans.map(renderCustomCard)}
          </div>
          {!myDigitalHumans.length ? <div className="empty-state">当前还没有我的数字人，先点击“快速创建数字人”上传训练视频。</div> : null}
        </>
      ) : (
        <div className="digital-human-home-v2__grid">{publicDigitalHumans.map(renderTemplateCard)}</div>
      )}

      <div className="digital-human-home-v2__footer">
        <button type="button" className="secondary-button" onClick={props.onOpenCreator}>
          进入创作作品
        </button>
        <button type="button" className="secondary-button" onClick={props.onOpenTemplateLibrary}>
          查看完整模板库
        </button>
        <button type="button" className="secondary-button" onClick={props.onOpenVoiceLibrary}>
          打开语音库
        </button>
        <button type="button" className="secondary-button" onClick={() => void props.onRefresh()} disabled={props.isSubmitting}>
          刷新列表
        </button>
      </div>

      <section className="digital-human-home-v2__recent">
        <div className="digital-human-home-section__head">
          <div>
            <strong>最近作品</strong>
            <p className="panel-subtext">所有生成结果继续统一进入作品中心。</p>
          </div>
          <button type="button" className="secondary-button" onClick={props.onOpenWorksCenter}>
            打开作品中心
          </button>
        </div>
        <div className="digital-human-home-work-grid">
          {recentWorks.length ? (
            recentWorks.map((item) => (
              <article key={item.id} className="digital-human-home-work-card">
                <div className="digital-human-home-card__title-row">
                  <strong>{item.title}</strong>
                  <span className={`archive-pill ${getWorkStageClass(item.stage)}`}>{getWorkStageLabel(item.stage)}</span>
                </div>
                <p className="panel-subtext">{item.personName || "数字人作品"}</p>
                <p className="panel-subtext">最近更新：{props.formatDateTime(item.updatedAt)}</p>
              </article>
            ))
          ) : (
            <div className="empty-state">当前还没有数字人作品，去创作作品提交第一条任务即可。</div>
          )}
        </div>
      </section>

      {isCreateDialogOpen ? (
        <div className="digital-human-template-modal-overlay" onClick={closeCreateDialog}>
          <div className="digital-human-template-modal digital-human-home-v2-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="digital-human-home-v2-dialog__head">
              <strong>视频生成数字人</strong>
              <button type="button" className="secondary-button" onClick={closeCreateDialog}>
                关闭
              </button>
            </div>

            <div className="digital-human-home-v2-dialog__requirements">
              <div>
                <span>视频方向</span>
                <strong>横向或纵向</strong>
              </div>
              <div>
                <span>文件格式</span>
                <strong>mp4、mov</strong>
              </div>
              <div>
                <span>视频时长</span>
                <strong>5秒-30分钟</strong>
              </div>
              <div>
                <span>文件大小</span>
                <strong>小于500MB</strong>
              </div>
            </div>

            <input
              ref={trainingVideoInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/*"
              className="reference-upload-input"
              onChange={(event) => setTrainingVideoFile(event.target.files?.[0] || null)}
              disabled={!props.canEdit || props.isSubmitting}
            />
            <div
              className="digital-human-home-v2-dialog__upload"
              role="button"
              tabIndex={props.canEdit && !props.isSubmitting ? 0 : -1}
              aria-disabled={!props.canEdit || props.isSubmitting}
              onClick={() => {
                if (!props.canEdit || props.isSubmitting) {
                  return;
                }
                trainingVideoInputRef.current?.click();
              }}
              onKeyDown={(event) => {
                if (!props.canEdit || props.isSubmitting) {
                  return;
                }
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  trainingVideoInputRef.current?.click();
                }
              }}
            >
              <span className="digital-human-home-v2-dialog__upload-icon">↑</span>
              <strong>请上传一段视频，作为驱动数字人的底版视频</strong>
              <small>{trainingVideoFile ? `已选择：${trainingVideoFile.name}` : "将文件拖到此处，或点击此区域上传"}</small>
            </div>

            <label className="field">
              <span>数字人名称</span>
              <input value={customPersonName} onChange={(event) => setCustomPersonName(event.target.value)} placeholder="例如：品牌讲解数字人" />
            </label>

            {exampleCards.length ? (
              <div className="digital-human-home-v2-dialog__examples">
                <div className="digital-human-home-v2-dialog__examples-head">
                  <strong>示例视频</strong>
                  <span>暂时没有视频素材？可以先参考现有数字人封面效果</span>
                </div>
                <div className="digital-human-home-v2-dialog__examples-grid">
                  {exampleCards.map((item) => (
                    <div key={item.id} className="digital-human-home-v2-dialog__example-card">
                      <img src={item.cover} alt={item.name} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <label className="digital-human-home-v2-dialog__agree">
              <input type="checkbox" checked={agreedToCreate} onChange={(event) => setAgreedToCreate(event.target.checked)} />
              <span>我已阅读并同意《使用者承诺须知》</span>
            </label>

            <div className="digital-human-home-v2-dialog__actions">
              <button type="button" className="secondary-button" onClick={closeCreateDialog}>
                取消
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleSubmitCreate()}
                disabled={!props.canEdit || props.isSubmitting || !trainingVideoFile || !agreedToCreate}
              >
                {props.isSubmitting ? "提交中..." : "确定"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
