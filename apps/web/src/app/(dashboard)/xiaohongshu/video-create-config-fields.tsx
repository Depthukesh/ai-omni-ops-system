"use client";

import type { MaterialOption, StringChangeHandler } from "./shared-types";
import type { StoryboardImageModelOptionRecord, VideoProviderOptionRecord } from "../../../services/works";

export interface VideoCreateConfigFieldsProps {
  noProductOption: string;
  customVideoProviderOption: string;
  videoProviderOptions: VideoProviderOptionRecord[];
  storyboardImageModelOptions: StoryboardImageModelOptionRecord[];
  materialNotes: MaterialOption[];
  productValue: string;
  materialValue: string;
  referenceImageFile: File | null;
  videoKindValue: string;
  copyAdditionalInstruction: string;
  providerValue: string;
  customProviderValue: string;
  customModelName: string;
  storyboardImageModelValue: string;
  durationValue: string;
  injectMarketingPlanValue: string;
  additionalInstruction: string;
  onMaterialChange: StringChangeHandler;
  onReferenceImageFileChange: (file: File | null) => void;
  onVideoKindChange: StringChangeHandler;
  onCopyAdditionalInstructionChange: StringChangeHandler;
  onProviderChange: StringChangeHandler;
  onCustomProviderChange: StringChangeHandler;
  onCustomModelNameChange: StringChangeHandler;
  onStoryboardImageModelChange: StringChangeHandler;
  onDurationChange: StringChangeHandler;
  onInjectMarketingPlanChange: StringChangeHandler;
  onAdditionalInstructionChange: StringChangeHandler;
}

export function VideoCreateConfigFields(props: VideoCreateConfigFieldsProps) {
  const formatProviderLabel = (item: VideoProviderOptionRecord) => {
    const baseLabel = item.providerName ? `${item.label}（${item.providerName}）` : item.label;
    return item.recommended ? `${baseLabel}（推荐）` : baseLabel;
  };

  return (
    <>
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
        <span>素材库</span>
        <select value={props.materialValue} onChange={(event) => props.onMaterialChange(event.target.value)}>
          <option value="">不添加素材</option>
          {props.materialNotes
            .filter((item) => ("videoUrl" in item ? Boolean((item as { videoUrl?: string }).videoUrl) : true))
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
              {formatProviderLabel(item)}
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
                  {item.providerName ? `${item.label}（${item.providerName}）` : item.label}
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
        <span>故事板生图大模型</span>
        <select
          value={props.storyboardImageModelValue}
          onChange={(event) => props.onStoryboardImageModelChange(event.target.value)}
        >
          {props.storyboardImageModelOptions.map((item) => (
            <option key={item.selectionKey} value={item.selectionKey}>
              {item.recommended ? `${item.label}（推荐）` : item.label}
            </option>
          ))}
        </select>
        <p className="panel-subtext">仅影响第 2 阶段故事板图片生成，不影响最终视频模型。</p>
      </label>
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
    </>
  );
}
