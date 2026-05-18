"use client";

import {
  type AsyncAction,
  type MaterialOption,
  type ProductOption,
  type SelectOption,
  type StringChangeHandler,
} from "./shared-types";
import {
  type VideoProviderOptionRecord,
  type XhsOriginalReferenceTemplateCategoryRecord,
  type XhsOriginalReferenceTemplateRecord,
} from "../../../services/works";
import { OriginalCreateReferenceFields } from "./original-create-reference-fields";

export interface OriginalCreateModalProps {
  open: boolean;
  isPublishing: boolean;
  calendarOptions: SelectOption[];
  customTopicOption: string;
  noProductOption: string;
  autoImageCountOption: string;
  products: ProductOption[];
  calendarValue: string;
  customTopic: string;
  productValue: string;
  accountRoleValue: string;
  accountRoleOptions: SelectOption[];
  imageCountValue: string;
  injectMarketingPlanValue: string;
  additionalInstruction: string;
  coverReferenceFile: File | null;
  galleryReferenceFiles: File[];
  referenceTemplateCategories: XhsOriginalReferenceTemplateCategoryRecord[];
  referenceTemplateItems: XhsOriginalReferenceTemplateRecord[];
  isReferenceTemplatesLoading: boolean;
  referenceTemplatesError: string;
  onClose: () => void;
  onCreate: AsyncAction;
  onCalendarChange: StringChangeHandler;
  onCustomTopicChange: StringChangeHandler;
  onProductChange: StringChangeHandler;
  onAccountRoleChange: StringChangeHandler;
  onImageCountChange: StringChangeHandler;
  onInjectMarketingPlanChange: StringChangeHandler;
  onAdditionalInstructionChange: StringChangeHandler;
  onCoverReferenceFileChange: (file: File | null) => void;
  onGalleryReferenceFilesChange: (files: File[]) => void;
  onReloadReferenceTemplates: () => void | Promise<void>;
}

export function OriginalCreateModal(props: OriginalCreateModalProps) {
  if (!props.open) {
    return null;
  }

  return (
    <div className="media-preview-overlay" onClick={props.onClose}>
      <div className="media-preview-dialog calendar-detail-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="media-preview-close" onClick={props.onClose}>
          关闭
        </button>
        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>添加原创笔记</strong>
              <p className="personal-meta">选择营销日历选题、产品与参考图后，直接触发完整原创图文生成链路。</p>
            </div>
          </div>
          <div className="personal-grid">
            <label>
              <span>营销日历</span>
              <select value={props.calendarValue} onChange={(event) => props.onCalendarChange(event.target.value)}>
                {props.calendarOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
                <option value={props.customTopicOption}>自己有选题，不使用系统选题</option>
              </select>
            </label>
            <label>
              <span>产品</span>
              <select value={props.productValue} onChange={(event) => props.onProductChange(event.target.value)}>
                {props.products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.productName}
                  </option>
                ))}
                <option value={props.noProductOption}>不植入产品</option>
              </select>
            </label>
            <label>
              <span>账号角色</span>
              <select value={props.accountRoleValue} onChange={(event) => props.onAccountRoleChange(event.target.value)}>
                {props.accountRoleOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            {props.calendarValue === props.customTopicOption ? (
              <label className="field-full">
                <span>自定义选题</span>
                <input
                  value={props.customTopic}
                  onChange={(event) => props.onCustomTopicChange(event.target.value)}
                  placeholder="请输入你的原创笔记选题"
                />
              </label>
            ) : null}
            <OriginalCreateReferenceFields
              coverReferenceFile={props.coverReferenceFile}
              galleryReferenceFiles={props.galleryReferenceFiles}
              referenceTemplateCategories={props.referenceTemplateCategories}
              referenceTemplateItems={props.referenceTemplateItems}
              isReferenceTemplatesLoading={props.isReferenceTemplatesLoading}
              referenceTemplatesError={props.referenceTemplatesError}
              onCoverReferenceFileChange={props.onCoverReferenceFileChange}
              onGalleryReferenceFilesChange={props.onGalleryReferenceFilesChange}
              onReloadReferenceTemplates={props.onReloadReferenceTemplates}
            />
            <label>
              <span>配图数量</span>
              <select value={props.imageCountValue} onChange={(event) => props.onImageCountChange(event.target.value)}>
                <option value={props.autoImageCountOption}>自由发挥</option>
                {Array.from({ length: 9 }, (_, index) => index + 2).map((count) => (
                  <option key={count} value={String(count)}>
                    {count}张
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>植入营销策划方案</span>
              <select value={props.injectMarketingPlanValue} onChange={(event) => props.onInjectMarketingPlanChange(event.target.value)}>
                <option value="yes">是</option>
                <option value="no">否</option>
              </select>
            </label>
            <label className="field-full">
              <span>用户要求</span>
              <textarea
                className="report-markdown-textarea"
                value={props.additionalInstruction}
                onChange={(event) => props.onAdditionalInstructionChange(event.target.value)}
                placeholder="例如：更偏生活方式感、门店场景感更强、语气更克制。"
              />
            </label>
          </div>
          <div className="strategy-inline-actions">
            <button type="button" className="primary-button" onClick={() => void props.onCreate()} disabled={props.isPublishing}>
              {props.isPublishing ? "创作中..." : "一键创作"}
            </button>
            <button type="button" className="secondary-button" onClick={props.onClose} disabled={props.isPublishing}>
              取消
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}

export interface RewriteCreateModalProps {
  open: boolean;
  isPublishing: boolean;
  noProductOption: string;
  materials: MaterialOption[];
  products: ProductOption[];
  materialValue: string;
  productValue: string;
  accountRoleValue: string;
  accountRoleOptions: SelectOption[];
  injectMarketingPlanValue: string;
  additionalInstruction: string;
  onClose: () => void;
  onCreate: AsyncAction;
  onMaterialChange: StringChangeHandler;
  onProductChange: StringChangeHandler;
  onAccountRoleChange: StringChangeHandler;
  onInjectMarketingPlanChange: StringChangeHandler;
  onAdditionalInstructionChange: StringChangeHandler;
}

export function RewriteCreateModal(props: RewriteCreateModalProps) {
  if (!props.open) {
    return null;
  }

  return (
    <div className="media-preview-overlay" onClick={props.onClose}>
      <div className="media-preview-dialog calendar-detail-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="media-preview-close" onClick={props.onClose}>
          关闭
        </button>
        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>添加二创笔记</strong>
              <p className="personal-meta">从素材库选择参考作品，结合产品与用户要求，直接触发完整二创图文生成链路。</p>
            </div>
          </div>
          <div className="personal-grid">
            <label className="field-full">
              <span>素材库</span>
              <select value={props.materialValue} onChange={(event) => props.onMaterialChange(event.target.value)}>
                {props.materials.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>产品</span>
              <select value={props.productValue} onChange={(event) => props.onProductChange(event.target.value)}>
                {props.products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.productName}
                  </option>
                ))}
                <option value={props.noProductOption}>不植入产品</option>
              </select>
            </label>
            <label>
              <span>账号角色</span>
              <select value={props.accountRoleValue} onChange={(event) => props.onAccountRoleChange(event.target.value)}>
                {props.accountRoleOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>植入营销策划方案</span>
              <select value={props.injectMarketingPlanValue} onChange={(event) => props.onInjectMarketingPlanChange(event.target.value)}>
                <option value="yes">是</option>
                <option value="no">否</option>
              </select>
            </label>
            <label className="field-full">
              <span>用户要求</span>
              <textarea
                className="report-markdown-textarea"
                value={props.additionalInstruction}
                onChange={(event) => props.onAdditionalInstructionChange(event.target.value)}
                placeholder="例如：保留原作品的爆点结构，但语气更像品牌官方账号，图片更高级一点。"
              />
            </label>
          </div>
          <div className="strategy-inline-actions">
            <button type="button" className="primary-button" onClick={() => void props.onCreate()} disabled={props.isPublishing || !props.materials.length}>
              {props.isPublishing ? "创作中..." : "一键创作"}
            </button>
            <button type="button" className="secondary-button" onClick={props.onClose} disabled={props.isPublishing}>
              取消
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}

export interface VideoCreateModalProps {
  open: boolean;
  isPublishing: boolean;
  calendarOptions: SelectOption[];
  customTopicOption: string;
  noProductOption: string;
  customVideoProviderOption: string;
  videoProviderOptions: VideoProviderOptionRecord[];
  products: ProductOption[];
  materialNotes: MaterialOption[];
  calendarValue: string;
  customTopic: string;
  productValue: string;
  materialValue: string;
  accountRoleValue: string;
  accountRoleOptions: SelectOption[];
  referenceImageFile: File | null;
  videoKindValue: string;
  copyAdditionalInstruction: string;
  providerValue: string;
  customProviderValue: string;
  customModelName: string;
  durationValue: string;
  injectMarketingPlanValue: string;
  additionalInstruction: string;
  onClose: () => void;
  onCreate: AsyncAction;
  onCalendarChange: StringChangeHandler;
  onProductChange: StringChangeHandler;
  onMaterialChange: StringChangeHandler;
  onAccountRoleChange: StringChangeHandler;
  onCustomTopicChange: StringChangeHandler;
  onReferenceImageFileChange: (file: File | null) => void;
  onVideoKindChange: StringChangeHandler;
  onCopyAdditionalInstructionChange: StringChangeHandler;
  onProviderChange: StringChangeHandler;
  onCustomProviderChange: StringChangeHandler;
  onCustomModelNameChange: StringChangeHandler;
  onDurationChange: StringChangeHandler;
  onInjectMarketingPlanChange: StringChangeHandler;
  onAdditionalInstructionChange: StringChangeHandler;
}

export function VideoCreateModal(props: VideoCreateModalProps) {
  if (!props.open) {
    return null;
  }

  return (
    <div className="media-preview-overlay" onClick={props.onClose}>
      <div className="media-preview-dialog calendar-detail-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="media-preview-close" onClick={props.onClose}>
          关闭
        </button>
        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>添加视频笔记</strong>
              <p className="personal-meta">提交后先生成创意剧本和故事板，故事板确认后再继续生成短视频。</p>
            </div>
          </div>
          <div className="personal-grid">
            <label>
              <span>营销日历</span>
              <select value={props.calendarValue} onChange={(event) => props.onCalendarChange(event.target.value)}>
                {props.calendarOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
                <option value={props.customTopicOption}>自己有选题，不使用系统选题</option>
              </select>
            </label>
            <label>
              <span>产品</span>
              <select value={props.productValue} onChange={(event) => props.onProductChange(event.target.value)}>
                {props.products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.productName}
                  </option>
                ))}
                <option value={props.noProductOption}>不植入产品</option>
              </select>
            </label>
            <label>
              <span>视频类型</span>
              <select value={props.videoKindValue} onChange={(event) => props.onVideoKindChange(event.target.value)}>
                <option value="BRAND_PROMO">品牌宣传视频</option>
                <option value="SPOKEN_SELLING">口播带货视频</option>
                <option value="SKIT_SELLING">短剧带货视频</option>
                <option value="REMIX">复刻视频</option>
              </select>
            </label>
            <label>
              <span>账号角色</span>
              <select value={props.accountRoleValue} onChange={(event) => props.onAccountRoleChange(event.target.value)}>
                {props.accountRoleOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            {props.calendarValue === props.customTopicOption ? (
              <label className="field-full">
                <span>自定义选题</span>
                <input
                  value={props.customTopic}
                  onChange={(event) => props.onCustomTopicChange(event.target.value)}
                  placeholder="请输入你的视频笔记选题"
                />
              </label>
            ) : null}
            <label>
              <span>素材库</span>
              <select value={props.materialValue} onChange={(event) => props.onMaterialChange(event.target.value)}>
                <option value="">不添加素材</option>
                {props.materialNotes
                  .filter((item) => "videoUrl" in item ? Boolean((item as { videoUrl?: string }).videoUrl) : true)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
              </select>
              <p className="panel-subtext">
                {props.videoKindValue === "REMIX"
                  ? "复刻视频必须选择一个视频素材。"
                  : "可选：只展示素材库中的视频类型素材。"}
              </p>
            </label>
            <label className="field-full">
              <span>上传产品图/参考图</span>
              <input
                type="file"
                accept="image/*"
                disabled={props.productValue !== props.noProductOption}
                onChange={(event) => props.onReferenceImageFileChange(event.target.files?.[0] || null)}
              />
              <strong>{props.referenceImageFile?.name || "未上传"}</strong>
              <p className="panel-subtext">
                {props.productValue !== props.noProductOption
                  ? "已选择产品，若要上传参考图，请先切换为“不植入产品”。"
                  : "参考图与产品不可同时选择。"}
              </p>
            </label>
            <label>
              <span>视频大模型</span>
              <select value={props.providerValue} onChange={(event) => props.onProviderChange(event.target.value)}>
                {props.videoProviderOptions.map((item) => (
                  <option key={item.backendKey} value={item.backendKey}>
                    {item.recommended ? `${item.label}（推荐）` : item.label}
                  </option>
                ))}
                <option value={props.customVideoProviderOption}>自行选择</option>
              </select>
            </label>
            {props.providerValue === props.customVideoProviderOption ? (
              <>
                <label>
                  <span>自选视频后端</span>
                  <select value={props.customProviderValue} onChange={(event) => props.onCustomProviderChange(event.target.value)}>
                    {props.videoProviderOptions.map((item) => (
                      <option key={item.backendKey} value={item.backendKey}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>自定义模型名</span>
                  <input
                    value={props.customModelName}
                    onChange={(event) => props.onCustomModelNameChange(event.target.value)}
                    placeholder="可选：手动输入该后端的具体 model"
                  />
                </label>
              </>
            ) : null}
            <label>
              <span>视频时长</span>
              <select value={props.durationValue} onChange={(event) => props.onDurationChange(event.target.value)}>
                {["10", "15"].map((value) => (
                  <option key={value} value={value}>
                    {value}s
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>植入营销策划方案</span>
              <select value={props.injectMarketingPlanValue} onChange={(event) => props.onInjectMarketingPlanChange(event.target.value)}>
                <option value="yes">是</option>
                <option value="no">否</option>
              </select>
            </label>
            <label className="field-full">
              <span>用户要求（剧本）</span>
              <textarea
                className="report-markdown-textarea composer-form-textarea"
                value={props.copyAdditionalInstruction}
                onChange={(event) => props.onCopyAdditionalInstructionChange(event.target.value)}
                placeholder="例如：标题更有冲击力，正文更像口播文案。"
              />
            </label>
            <label className="field-full">
              <span>用户要求（故事板/视频）</span>
              <textarea
                className="report-markdown-textarea composer-form-textarea"
                value={props.additionalInstruction}
                onChange={(event) => props.onAdditionalInstructionChange(event.target.value)}
                placeholder="例如：镜头节奏更快，氛围更轻盈，尽量突出产品使用瞬间。"
              />
            </label>
          </div>
          <div className="strategy-inline-actions">
            <button type="button" className="primary-button" onClick={() => void props.onCreate()} disabled={props.isPublishing}>
              {props.isPublishing ? "创作中..." : "一键创作"}
            </button>
            <button type="button" className="secondary-button" onClick={props.onClose} disabled={props.isPublishing}>
              取消
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
