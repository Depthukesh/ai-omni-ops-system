"use client";

import { useRef, useState } from "react";
import {
  type AsyncAction,
  type MaterialOption,
  type ProductOption,
  type SelectOption,
  type StringChangeHandler,
} from "./shared-types";
import {
  downloadXiaohongshuOriginalReferenceTemplateFile,
  type VideoProviderOptionRecord,
  type XhsOriginalReferenceTemplateCategoryRecord,
  type XhsOriginalReferenceTemplateRecord,
} from "../../../services/works";
import { OriginalReferenceTemplatePicker } from "./original-reference-template-picker";

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
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [pickerMode, setPickerMode] = useState<"cover" | "gallery" | null>(null);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [templateErrorMessage, setTemplateErrorMessage] = useState("");

  if (!props.open) {
    return null;
  }

  async function applyTemplates(items: XhsOriginalReferenceTemplateRecord[]) {
    if (!items.length) {
      return;
    }
    setIsApplyingTemplate(true);
    setTemplateErrorMessage("");
    try {
      const files = await Promise.all(items.map((item) => downloadXiaohongshuOriginalReferenceTemplateFile(item)));
      if (pickerMode === "cover") {
        props.onCoverReferenceFileChange(files[0] || null);
      } else if (pickerMode === "gallery") {
        props.onGalleryReferenceFilesChange(files);
      }
      setPickerMode(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "参考模板加载失败";
      setTemplateErrorMessage(message);
    } finally {
      setIsApplyingTemplate(false);
    }
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
            <label className="field-full">
              <span>封面参考图</span>
              <div className="reference-upload-panel">
                <div className="reference-upload-actions">
                  <button type="button" className="primary-button" onClick={() => setPickerMode("cover")}>
                    选择封面模板
                  </button>
                  <button type="button" className="secondary-button" onClick={() => coverInputRef.current?.click()}>
                    本地上传
                  </button>
                  {props.coverReferenceFile ? (
                    <button type="button" className="secondary-button" onClick={() => props.onCoverReferenceFileChange(null)}>
                      清空
                    </button>
                  ) : null}
                </div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="reference-upload-input"
                  onChange={(event) => props.onCoverReferenceFileChange(event.target.files?.[0] || null)}
                />
                <strong>{props.coverReferenceFile?.name || "未选择封面参考图"}</strong>
                <p className="panel-subtext">选择模板后，会把该图片直接作为封面参考图送入现有参考图分析与生图链路。</p>
              </div>
            </label>
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
              <span>配图参考图</span>
              <div className="reference-upload-panel">
                <div className="reference-upload-actions">
                  <button type="button" className="primary-button" onClick={() => setPickerMode("gallery")}>
                    选择配图模板
                  </button>
                  <button type="button" className="secondary-button" onClick={() => galleryInputRef.current?.click()}>
                    本地上传
                  </button>
                  {props.galleryReferenceFiles.length ? (
                    <button type="button" className="secondary-button" onClick={() => props.onGalleryReferenceFilesChange([])}>
                      清空
                    </button>
                  ) : null}
                </div>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="reference-upload-input"
                  onChange={(event) => props.onGalleryReferenceFilesChange(Array.from(event.target.files || []))}
                />
                <strong>
                  {props.galleryReferenceFiles.length
                    ? props.galleryReferenceFiles.map((item) => item.name).join("、")
                    : "未选择配图参考图"}
                </strong>
                <p className="panel-subtext">可一次选择多张模板，系统会把这些图片作为配图风格参考并继续生成配图提示词。</p>
              </div>
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
          {templateErrorMessage ? <div className="report-inline-tip report-inline-tip--error">{templateErrorMessage}</div> : null}
          <div className="strategy-inline-actions">
            <button type="button" className="primary-button" onClick={() => void props.onCreate()} disabled={props.isPublishing}>
              {props.isPublishing ? "创作中..." : "一键创作"}
            </button>
            <button type="button" className="secondary-button" onClick={props.onClose} disabled={props.isPublishing}>
              取消
            </button>
          </div>
        </article>
        <OriginalReferenceTemplatePicker
          open={Boolean(pickerMode)}
          multi={pickerMode === "gallery"}
          title={pickerMode === "gallery" ? "选择配图参考模板" : "选择封面参考模板"}
          description={
            pickerMode === "gallery"
              ? "按分类挑选多张配图模板，系统会将所选图片作为配图风格参考。"
              : "按分类挑选一张封面模板，系统会将所选图片作为封面参考图。"
          }
          categories={props.referenceTemplateCategories}
          items={props.referenceTemplateItems}
          isLoading={props.isReferenceTemplatesLoading}
          errorMessage={props.referenceTemplatesError}
          isSubmitting={isApplyingTemplate}
          onClose={() => setPickerMode(null)}
          onReload={props.onReloadReferenceTemplates}
          onConfirm={applyTemplates}
        />
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
  injectMarketingPlanValue: string;
  additionalInstruction: string;
  onClose: () => void;
  onCreate: AsyncAction;
  onMaterialChange: StringChangeHandler;
  onProductChange: StringChangeHandler;
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
  customVideoDurationOption: string;
  videoProviderOptions: VideoProviderOptionRecord[];
  products: ProductOption[];
  calendarValue: string;
  customTopic: string;
  productValue: string;
  referenceImageFile: File | null;
  copyAdditionalInstruction: string;
  providerValue: string;
  customProviderValue: string;
  customModelName: string;
  durationValue: string;
  customDurationValue: string;
  injectMarketingPlanValue: string;
  outputPromptValue: string;
  additionalInstruction: string;
  onClose: () => void;
  onCreate: AsyncAction;
  onCalendarChange: StringChangeHandler;
  onProductChange: StringChangeHandler;
  onCustomTopicChange: StringChangeHandler;
  onReferenceImageFileChange: (file: File | null) => void;
  onCopyAdditionalInstructionChange: StringChangeHandler;
  onProviderChange: StringChangeHandler;
  onCustomProviderChange: StringChangeHandler;
  onCustomModelNameChange: StringChangeHandler;
  onDurationChange: StringChangeHandler;
  onCustomDurationChange: StringChangeHandler;
  onInjectMarketingPlanChange: StringChangeHandler;
  onOutputPromptChange: StringChangeHandler;
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
              <p className="personal-meta">选择营销日历、产品或参考图后，直接触发视频笔记文案、短视频提示词和成片生成链路。</p>
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
            <label className="field-full">
              <span>上传参考图</span>
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
                {["6", "8", "10", "12", "15", "30"].map((value) => (
                  <option key={value} value={value}>
                    {value}s
                  </option>
                ))}
                <option value={props.customVideoDurationOption}>自行选择</option>
              </select>
            </label>
            {props.durationValue === props.customVideoDurationOption ? (
              <label>
                <span>自定义视频时长</span>
                <input
                  value={props.customDurationValue}
                  onChange={(event) => props.onCustomDurationChange(event.target.value)}
                  inputMode="numeric"
                  placeholder="请输入秒数，例如 18"
                />
              </label>
            ) : null}
            <label>
              <span>植入营销策划方案</span>
              <select value={props.injectMarketingPlanValue} onChange={(event) => props.onInjectMarketingPlanChange(event.target.value)}>
                <option value="yes">是</option>
                <option value="no">否</option>
              </select>
            </label>
            <label>
              <span>输出视频提示词</span>
              <select value={props.outputPromptValue} onChange={(event) => props.onOutputPromptChange(event.target.value)}>
                <option value="yes">是</option>
                <option value="no">否</option>
              </select>
            </label>
            <label className="field-full">
              <span>用户要求（文案）</span>
              <textarea
                className="report-markdown-textarea composer-form-textarea"
                value={props.copyAdditionalInstruction}
                onChange={(event) => props.onCopyAdditionalInstructionChange(event.target.value)}
                placeholder="例如：标题更有冲击力，正文更像口播文案。"
              />
            </label>
            <label className="field-full">
              <span>用户要求（视频生成）</span>
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
