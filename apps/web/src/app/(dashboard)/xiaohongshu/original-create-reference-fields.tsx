"use client";

import { useRef, useState } from "react";
import {
  downloadXiaohongshuOriginalReferenceTemplateFile,
  type XhsOriginalReferenceTemplateCategoryRecord,
  type XhsOriginalReferenceTemplateRecord,
} from "../../../services/works";
import { OriginalReferenceTemplatePicker } from "./original-reference-template-picker";

export interface OriginalCreateReferenceFieldsProps {
  coverReferenceFile: File | null;
  galleryReferenceFiles: File[];
  referenceTemplateCategories: XhsOriginalReferenceTemplateCategoryRecord[];
  referenceTemplateItems: XhsOriginalReferenceTemplateRecord[];
  isReferenceTemplatesLoading: boolean;
  referenceTemplatesError: string;
  onCoverReferenceFileChange: (file: File | null) => void;
  onGalleryReferenceFilesChange: (files: File[]) => void;
  onReloadReferenceTemplates: () => void | Promise<void>;
}

export function OriginalCreateReferenceFields(props: OriginalCreateReferenceFieldsProps) {
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [pickerMode, setPickerMode] = useState<"cover" | "gallery" | null>(null);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [templateErrorMessage, setTemplateErrorMessage] = useState("");

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
    <>
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
            {props.galleryReferenceFiles.length ? props.galleryReferenceFiles.map((item) => item.name).join("、") : "未选择配图参考图"}
          </strong>
          <p className="panel-subtext">可一次选择多张模板，系统会把这些图片作为配图风格参考并继续生成配图提示词。</p>
        </div>
      </label>

      {templateErrorMessage ? <div className="report-inline-tip report-inline-tip--error">{templateErrorMessage}</div> : null}

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
    </>
  );
}
