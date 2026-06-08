"use client";

export type DouyinPublishableWorkTarget = {
  id: string;
  workKind: "VIDEO_STORYBOARD" | "VIDEO_DIRECT" | "DIGITAL_HUMAN";
  title: string;
  sourceLabel: string;
  content?: string;
  videoUrl?: string;
};
