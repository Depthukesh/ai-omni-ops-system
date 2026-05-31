"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type CreateDouyinVoiceCloneForm,
  type DouyinCustomVoiceRecord,
  type DouyinSpeechTaskRecord,
  type DouyinVoiceLibraryRecord,
  type GenerateDouyinSpeechForm,
  type VoiceLibraryPageInfo,
} from "../../../services/works";

type VoiceLibraryTab = "PUBLIC" | "CUSTOM";
type VoiceDialogType = "CLONE" | "SYNTHESIS" | null;

type VoiceListItem = {
  id: string;
  name: string;
  gender?: string;
  lang?: string;
  desc?: string;
  speed?: number;
  pitch?: number;
  audition?: string;
  isCustom: boolean;
  raw: DouyinVoiceLibraryRecord | DouyinCustomVoiceRecord;
};

export interface DigitalHumanVoiceLibraryWorkspaceProps {
  publicVoices: DouyinVoiceLibraryRecord[];
  customVoices: DouyinCustomVoiceRecord[];
  publicVoicePageInfo?: VoiceLibraryPageInfo;
  customVoicePageInfo?: VoiceLibraryPageInfo;
  publicVoiceLoadError?: string;
  customVoiceLoadError?: string;
  currentSpeechTask?: DouyinSpeechTaskRecord | null;
  currentSpeechTaskId?: string;
  isSubmitting: boolean;
  canEdit: boolean;
  onRefresh: () => void | Promise<void>;
  onRefreshPublicVoices: (page: number) => Promise<void>;
  onRefreshCustomVoices: (page: number) => Promise<void>;
  onCreateCustomVoice: (payload: CreateDouyinVoiceCloneForm) => Promise<boolean>;
  onDeleteCustomVoice: (voiceId: string) => Promise<boolean>;
  onCreateSpeechTask: (payload: GenerateDouyinSpeechForm) => Promise<boolean>;
  onRefreshSpeechTask: (taskId?: string) => Promise<boolean>;
}

function getCustomVoiceStatusLabel(status?: number) {
  switch (status) {
    case 2:
      return "已完成";
    case 4:
      return "失败";
    case 3:
      return "已过期";
    case 99:
      return "已删除";
    case 1:
      return "制作中";
    default:
      return "等待中";
  }
}

function getCustomVoiceStatusClass(status?: number) {
  switch (status) {
    case 2:
      return "status-ready";
    case 4:
    case 99:
      return "status-pending";
    default:
      return "status-in_progress";
  }
}

function getSpeechTaskStatusLabel(status?: number, errMsg?: string, errReason?: string) {
  if (errMsg || errReason) {
    return "生成失败";
  }
  switch (status) {
    case 9:
      return "已完成";
    case 1:
      return "生成中";
    default:
      return "等待中";
  }
}

export function DigitalHumanVoiceLibraryWorkspace(props: DigitalHumanVoiceLibraryWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<VoiceLibraryTab>("PUBLIC");
  const [activeDialog, setActiveDialog] = useState<VoiceDialogType>(null);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [languageFilter, setLanguageFilter] = useState("ALL");
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [synthesisVoiceId, setSynthesisVoiceId] = useState("");
  const [cloneName, setCloneName] = useState("");
  const [cloneModelType, setCloneModelType] = useState<CreateDouyinVoiceCloneForm["modelType"]>("cicada1.0");
  const [cloneLanguage, setCloneLanguage] = useState<CreateDouyinVoiceCloneForm["language"]>("cn");
  const [clonePreviewText, setClonePreviewText] = useState("");
  const [cloneAudioFile, setCloneAudioFile] = useState<File | null>(null);
  const [speechText, setSpeechText] = useState("");
  const [speechSpeed, setSpeechSpeed] = useState("1");
  const [speechPitch, setSpeechPitch] = useState("1");
  const [speechDialect, setSpeechDialect] = useState("0");

  const publicVoiceList = useMemo<VoiceListItem[]>(
    () => props.publicVoices.map((item) => ({
      id: item.id,
      name: item.name,
      gender: item.gender,
      lang: item.lang,
      desc: item.desc || "",
      speed: item.speed,
      pitch: item.pitch,
      audition: item.audition,
      isCustom: false,
      raw: item,
    })),
    [props.publicVoices],
  );

  const customVoiceList = useMemo<VoiceListItem[]>(
    () => props.customVoices.map((item) => ({
      id: item.id,
      name: item.name,
      gender: undefined,
      lang: undefined,
      desc: item.type || "",
      speed: undefined,
      pitch: undefined,
      audition: item.audioPath,
      isCustom: true,
      raw: item,
    })),
    [props.customVoices],
  );

  const currentList = activeTab === "CUSTOM" ? customVoiceList : publicVoiceList;
  const allVoiceOptions = useMemo(
    () => [...publicVoiceList, ...customVoiceList],
    [customVoiceList, publicVoiceList],
  );

  const filteredVoices = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return currentList.filter((item) => {
      if (keyword && ![item.name, item.desc, item.gender, item.lang].join(" ").toLowerCase().includes(keyword)) {
        return false;
      }
      if (!item.isCustom && genderFilter !== "ALL" && item.gender !== genderFilter) {
        return false;
      }
      if (!item.isCustom && languageFilter !== "ALL" && item.lang !== languageFilter) {
        return false;
      }
      return true;
    });
  }, [currentList, genderFilter, languageFilter, search]);

  useEffect(() => {
    const available = filteredVoices.map((item) => item.id);
    if (!available.length) {
      setSelectedVoiceId("");
      return;
    }
    if (!available.includes(selectedVoiceId)) {
      setSelectedVoiceId(available[0]);
    }
  }, [filteredVoices, selectedVoiceId]);

  const selectedVoice = filteredVoices.find((item) => item.id === selectedVoiceId) || filteredVoices[0];
  const synthesisVoice = allVoiceOptions.find((item) => item.id === synthesisVoiceId)
    || allVoiceOptions.find((item) => item.id === selectedVoice?.id)
    || allVoiceOptions[0];
  const publicPages = Array.from({ length: props.publicVoicePageInfo?.totalPage || 0 }, (_, index) => index + 1);
  const customPages = Array.from({ length: props.customVoicePageInfo?.totalPage || 0 }, (_, index) => index + 1);
  const activeLoadError = activeTab === "PUBLIC" ? props.publicVoiceLoadError : props.customVoiceLoadError;
  const currentSpeechStatus = getSpeechTaskStatusLabel(
    props.currentSpeechTask?.status,
    props.currentSpeechTask?.errMsg,
    props.currentSpeechTask?.errReason,
  );

  useEffect(() => {
    if (activeDialog !== "SYNTHESIS") {
      return;
    }
    if (synthesisVoiceId && allVoiceOptions.some((item) => item.id === synthesisVoiceId)) {
      return;
    }
    if (selectedVoice?.id) {
      setSynthesisVoiceId(selectedVoice.id);
      return;
    }
    if (allVoiceOptions[0]?.id) {
      setSynthesisVoiceId(allVoiceOptions[0].id);
    }
  }, [activeDialog, allVoiceOptions, selectedVoice?.id, synthesisVoiceId]);

  const openCloneDialog = () => {
    setActiveDialog("CLONE");
  };

  const openSynthesisDialog = (voiceId?: string) => {
    const nextVoiceId = String(voiceId || selectedVoice?.id || allVoiceOptions[0]?.id || "").trim();
    if (nextVoiceId) {
      setSynthesisVoiceId(nextVoiceId);
    }
    setActiveDialog("SYNTHESIS");
  };

  const closeDialog = () => {
    setActiveDialog(null);
  };

  return (
    <article className="light-data-panel report-editor-panel report-editor-panel--compact digital-human-voice-library" style={{ marginTop: 20 }}>
      <div className="report-editor-head digital-human-voice-library__head">
        <div>
          <strong>语音库</strong>
          <p>页面改为按蝉镜语音库方向展示全部声音卡片，定制声音和语音合成通过弹窗完成，结果可回流到我的声音与合成结果区。</p>
        </div>
        <div className="report-editor-actions">
          <span className={`archive-pill ${props.publicVoices.length || props.customVoices.length ? "status-ready" : "status-in_progress"}`}>
            公共 {props.publicVoicePageInfo?.totalCount || props.publicVoices.length} / 我的 {props.customVoicePageInfo?.totalCount || props.customVoices.length}
          </span>
          <button type="button" className="primary-button" onClick={openCloneDialog} disabled={!props.canEdit || props.isSubmitting}>
            声音克隆
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => openSynthesisDialog()}
            disabled={!props.canEdit || props.isSubmitting || !allVoiceOptions.length}
          >
            语音合成
          </button>
          <button type="button" className="secondary-button" onClick={() => void props.onRefresh()} disabled={props.isSubmitting}>
            刷新列表
          </button>
        </div>
      </div>

      <div className="digital-human-voice-library__toolbar">
        <div className="strategy-inline-actions">
          <button
            type="button"
            className={activeTab === "PUBLIC" ? "primary-button" : "secondary-button"}
            onClick={() => setActiveTab("PUBLIC")}
          >
            公共声音
          </button>
          <button
            type="button"
            className={activeTab === "CUSTOM" ? "primary-button" : "secondary-button"}
            onClick={() => setActiveTab("CUSTOM")}
          >
            我的声音
          </button>
        </div>
        <small className="panel-subtext">
          {activeTab === "PUBLIC" ? "浏览蝉镜公共声音，点击卡片可直接发起语音合成。" : "定制声音创建成功后会自动出现在这里。"}
        </small>
      </div>

      {activeLoadError ? (
        <div className="empty-state" style={{ marginTop: 0 }}>
          {activeLoadError}
        </div>
      ) : null}

      <div className="digital-human-voice-library__filters">
        <label className="field">
          <span>搜索声音</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索名称、描述或语种" />
        </label>
        {activeTab === "PUBLIC" ? (
          <>
            <label className="field">
              <span>性别</span>
              <select value={genderFilter} onChange={(event) => setGenderFilter(event.target.value)}>
                <option value="ALL">全部</option>
                <option value="female">女声</option>
                <option value="male">男声</option>
              </select>
            </label>
            <label className="field">
              <span>语种</span>
              <select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}>
                <option value="ALL">全部</option>
                <option value="multilingual">多语种</option>
                <option value="cn">中文</option>
                <option value="en">英文</option>
              </select>
            </label>
          </>
        ) : null}
      </div>

      {selectedVoice ? (
        <div className="entity-card personal-card digital-human-voice-library__selected-card">
          <div>
            <strong>当前选中：{selectedVoice.name}</strong>
            <p className="panel-subtext" style={{ marginTop: 8 }}>
              {[selectedVoice.gender, selectedVoice.lang, selectedVoice.desc].filter(Boolean).join(" / ") || "暂无更多描述"}
            </p>
          </div>
          <div className="strategy-inline-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => openSynthesisDialog(selectedVoice.id)}
              disabled={!props.canEdit || props.isSubmitting}
            >
              用这个声音合成
            </button>
            {selectedVoice.isCustom ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => void props.onDeleteCustomVoice(selectedVoice.id)}
                disabled={!props.canEdit || props.isSubmitting}
              >
                删除声音
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <article className="report-editor-pane digital-human-voice-library__list-pane">
        <div className="digital-human-voice-library__section-head">
          <span>{activeTab === "PUBLIC" ? "声音列表" : "我的声音"}</span>
          <small className="panel-subtext">已筛选 {filteredVoices.length} 个声音</small>
        </div>
        {!filteredVoices.length ? (
          <div className="empty-state" style={{ marginTop: 12 }}>
            {activeLoadError
              ? "当前语音列表读取失败，请先处理上方报错后再重试。"
              : activeTab === "PUBLIC"
                ? "当前没有读取到公共声音。"
                : "当前还没有定制声音，点击上方“声音克隆”即可创建。"}
          </div>
        ) : (
          <div className="digital-human-voice-library__list-grid">
            {filteredVoices.map((item) => (
              <article key={item.id} className={`entity-card personal-card digital-human-voice-library__voice-card ${selectedVoice?.id === item.id ? "is-active" : ""}`}>
                <button
                  type="button"
                  className={`digital-human-voice-library__voice-stage ${selectedVoice?.id === item.id ? "is-active" : ""}`}
                  onClick={() => setSelectedVoiceId(item.id)}
                >
                  <span className="digital-human-voice-library__voice-stage-label">{item.isCustom ? "我的声音" : "公共声音"}</span>
                  <span className={`archive-pill ${item.isCustom ? getCustomVoiceStatusClass((item.raw as DouyinCustomVoiceRecord).status) : "status-ready"}`}>
                    {item.isCustom ? getCustomVoiceStatusLabel((item.raw as DouyinCustomVoiceRecord).status) : "可试听"}
                  </span>
                </button>
                <div className="digital-human-voice-library__voice-body">
                  <strong>{item.name}</strong>
                  <p>{[item.gender, item.lang, item.desc].filter(Boolean).join(" / ") || "暂无更多描述"}</p>
                  {item.audition ? (
                    <audio controls preload="none" src={item.audition} style={{ width: "100%", marginTop: 8 }} />
                  ) : (
                    <p className="panel-subtext" style={{ marginTop: 8 }}>当前暂无试听音频。</p>
                  )}
                  <div className="strategy-inline-actions" style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => openSynthesisDialog(item.id)}
                      disabled={!props.canEdit || props.isSubmitting}
                    >
                      语音合成
                    </button>
                    {item.isCustom ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void props.onDeleteCustomVoice(item.id)}
                        disabled={!props.canEdit || props.isSubmitting}
                      >
                        删除
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {activeTab === "PUBLIC" && publicPages.length > 1 ? (
          <div className="digital-human-voice-library__pagination">
            {publicPages.map((page) => (
              <button
                key={page}
                type="button"
                className={(props.publicVoicePageInfo?.page || 1) === page ? "primary-button" : "secondary-button"}
                onClick={() => void props.onRefreshPublicVoices(page)}
                disabled={props.isSubmitting}
              >
                {page}
              </button>
            ))}
          </div>
        ) : null}

        {activeTab === "CUSTOM" && customPages.length > 1 ? (
          <div className="digital-human-voice-library__pagination">
            {customPages.map((page) => (
              <button
                key={page}
                type="button"
                className={(props.customVoicePageInfo?.page || 1) === page ? "primary-button" : "secondary-button"}
                onClick={() => void props.onRefreshCustomVoices(page)}
                disabled={props.isSubmitting}
              >
                {page}
              </button>
            ))}
          </div>
        ) : null}
      </article>

      <div className="entity-card personal-card digital-human-voice-library__result-card">
        <div className="digital-human-voice-library__section-head">
          <span>最近一次语音合成</span>
          <div className="strategy-inline-actions">
            <small className="panel-subtext">{props.currentSpeechTaskId || props.currentSpeechTask?.id || "暂无任务"}</small>
            <button
              type="button"
              className="secondary-button"
              disabled={props.isSubmitting || !props.currentSpeechTaskId}
              onClick={() => void props.onRefreshSpeechTask(props.currentSpeechTaskId)}
            >
              刷新结果
            </button>
          </div>
        </div>
        {props.currentSpeechTask ? (
          <>
            <p className="personal-meta" style={{ marginTop: 8 }}>
              任务状态：{currentSpeechStatus}
            </p>
            {props.currentSpeechTask.full?.url ? (
              <audio controls preload="none" src={props.currentSpeechTask.full.url} style={{ width: "100%", marginTop: 12 }} />
            ) : (
              <p className="panel-subtext" style={{ marginTop: 12 }}>当前还没有返回合成音频链接。</p>
            )}
            {props.currentSpeechTask.subtitles.length ? (
              <div className="digital-human-voice-library__subtitle-section">
                <strong>字幕切片</strong>
                <div className="digital-human-voice-library__subtitle-grid">
                  {props.currentSpeechTask.subtitles.slice(0, 8).map((item) => (
                    <div key={item.key} className="entity-card personal-card digital-human-voice-library__subtitle-card">
                      <p className="panel-subtext">{item.startTime}s - {item.endTime}s</p>
                      <p>{item.subtitle}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="empty-state" style={{ marginTop: 12 }}>
            这里会显示最近一次语音合成结果，包括音频地址和字幕切片。
          </div>
        )}
      </div>

      {activeDialog === "CLONE" ? (
        <div className="digital-human-template-modal-overlay" onClick={closeDialog}>
          <div className="digital-human-template-modal digital-human-voice-library__modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="digital-human-template-modal__close" onClick={closeDialog}>
              关闭
            </button>
            <div className="digital-human-voice-library__modal-stack">
              <div className="digital-human-voice-library__modal-header">
                <strong>声音克隆</strong>
                <p>上传样本人声，创建属于品牌的定制声音。创建成功后会自动出现在“我的声音”里。</p>
              </div>
              <div className="personal-grid">
                <label className="field">
                  <span>声音名称</span>
                  <input value={cloneName} onChange={(event) => setCloneName(event.target.value)} placeholder="例如：品牌讲师女声" />
                </label>
                <label className="field">
                  <span>模型</span>
                  <select value={cloneModelType} onChange={(event) => setCloneModelType(event.target.value as CreateDouyinVoiceCloneForm["modelType"])}>
                    <option value="cicada1.0">cicada1.0</option>
                    <option value="cicada3.0">cicada3.0</option>
                    <option value="cicada3.0-turbo">cicada3.0-turbo</option>
                  </select>
                </label>
                <label className="field">
                  <span>语种</span>
                  <select value={cloneLanguage} onChange={(event) => setCloneLanguage(event.target.value as CreateDouyinVoiceCloneForm["language"])}>
                    <option value="cn">中文</option>
                    <option value="en">英文</option>
                  </select>
                </label>
                <label className="field field-full">
                  <span>试听文案</span>
                  <input value={clonePreviewText} onChange={(event) => setClonePreviewText(event.target.value)} placeholder="最多 50 个字符" />
                </label>
                <label className="field field-full">
                  <span>克隆音频</span>
                  <input
                    type="file"
                    accept="audio/mp3,audio/mpeg,audio/wav,audio/x-wav,audio/m4a,audio/*"
                    onChange={(event) => setCloneAudioFile(event.target.files?.[0] || null)}
                    disabled={!props.canEdit || props.isSubmitting}
                  />
                  <small className="personal-meta">
                    {cloneAudioFile ? `已选择：${cloneAudioFile.name}` : "支持 mp3、wav、m4a；建议干净人声、连续讲话不低于 10 秒。"}
                  </small>
                </label>
              </div>
              <div className="strategy-inline-actions">
                <button
                  type="button"
                  className="primary-button"
                  disabled={!props.canEdit || props.isSubmitting || !cloneAudioFile}
                  onClick={async () => {
                    const success = await props.onCreateCustomVoice({
                      name: cloneName.trim() || undefined,
                      audioFile: cloneAudioFile,
                      modelType: cloneModelType,
                      language: cloneLanguage,
                      text: clonePreviewText.trim() || undefined,
                    });
                    if (success) {
                      setCloneName("");
                      setClonePreviewText("");
                      setCloneAudioFile(null);
                      setActiveTab("CUSTOM");
                      closeDialog();
                    }
                  }}
                >
                  创建定制声音
                </button>
                <button type="button" className="secondary-button" onClick={closeDialog}>
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeDialog === "SYNTHESIS" ? (
        <div className="digital-human-template-modal-overlay" onClick={closeDialog}>
          <div className="digital-human-template-modal digital-human-voice-library__modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="digital-human-template-modal__close" onClick={closeDialog}>
              关闭
            </button>
            <div className="digital-human-voice-library__modal-stack">
              <div className="digital-human-voice-library__modal-header">
                <strong>语音合成</strong>
                <p>选择一个声音并输入文案，生成新的语音音频。合成结果会展示在页面下方的结果区。</p>
              </div>
              <div className="personal-grid">
                <label className="field field-full">
                  <span>当前声音</span>
                  <select value={synthesisVoice?.id || ""} onChange={(event) => setSynthesisVoiceId(event.target.value)}>
                    {allVoiceOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.isCustom ? "我的声音" : "公共声音"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>语速</span>
                  <input value={speechSpeed} onChange={(event) => setSpeechSpeed(event.target.value)} placeholder="1" />
                </label>
                <label className="field">
                  <span>音调</span>
                  <input value={speechPitch} onChange={(event) => setSpeechPitch(event.target.value)} placeholder="1" />
                </label>
                <label className="field">
                  <span>方言</span>
                  <select value={speechDialect} onChange={(event) => setSpeechDialect(event.target.value)}>
                    <option value="0">默认</option>
                    <option value="1">东北话</option>
                    <option value="2">关中话</option>
                    <option value="3">江淮官话</option>
                    <option value="5">冀鲁官话</option>
                    <option value="6">青海话</option>
                    <option value="7">吴语</option>
                    <option value="8">天津话</option>
                    <option value="9">西南官话</option>
                    <option value="10">中原官话</option>
                    <option value="11">粤语</option>
                    <option value="12">闽南语</option>
                  </select>
                </label>
                <label className="field field-full">
                  <span>合成文案</span>
                  <textarea value={speechText} onChange={(event) => setSpeechText(event.target.value)} rows={7} placeholder="输入要合成的文本，长度限制 4000 字以内" />
                </label>
              </div>
              <div className="strategy-inline-actions">
                <button
                  type="button"
                  className="primary-button"
                  disabled={!props.canEdit || props.isSubmitting || !synthesisVoice?.id || !speechText.trim()}
                  onClick={async () => {
                    const success = await props.onCreateSpeechTask({
                      audioManId: synthesisVoice?.id,
                      text: speechText.trim(),
                      speed: Number(speechSpeed || 1),
                      pitch: Number(speechPitch || 1),
                      dialect: Number(speechDialect || 0),
                    });
                    if (success) {
                      setSpeechText("");
                      closeDialog();
                    }
                  }}
                >
                  开始合成
                </button>
                <button type="button" className="secondary-button" onClick={closeDialog}>
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
