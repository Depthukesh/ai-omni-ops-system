"use client";

export interface NoteCreateModalCopy {
  title: string;
  metaText: string;
}

export type NoteCreateModalKind = "original" | "rewrite" | "video";

export const NOTE_CREATE_MODAL_COPY_MAP: Record<NoteCreateModalKind, NoteCreateModalCopy> = {
  original: {
    title: "添加原创笔记",
    metaText: "选择营销日历选题、产品与参考图后，直接触发完整原创图文生成链路。",
  },
  rewrite: {
    title: "添加二创笔记",
    metaText: "从素材库选择参考作品，结合产品与用户要求，直接触发完整二创图文生成链路。",
  },
  video: {
    title: "添加视频笔记",
    metaText: "提交后先生成创意剧本和故事板，故事板确认后再继续生成短视频。",
  },
};

export const ORIGINAL_CREATE_MODAL_COPY = NOTE_CREATE_MODAL_COPY_MAP.original;
export const REWRITE_CREATE_MODAL_COPY = NOTE_CREATE_MODAL_COPY_MAP.rewrite;
export const VIDEO_CREATE_MODAL_COPY = NOTE_CREATE_MODAL_COPY_MAP.video;
