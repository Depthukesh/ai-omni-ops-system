"use client";

export type MediaKind = "IMAGE" | "VIDEO";

export type MediaLightboxState = {
  title: string;
  url: string;
  type: MediaKind;
};

export type CalendarOption = {
  id?: string;
  topicName?: string;
};

export type SelectOption = {
  value: string;
  label: string;
};

export type ProductOption = {
  id?: string;
  productName?: string;
  imageUrl?: string;
};

export type MaterialOption = {
  id?: string;
  title?: string;
  videoUrl?: string;
};

export type PlatformAccount = {
  id?: string;
  platform: string;
  accountName?: string;
  accountLink?: string;
};

export type AsyncAction = () => void | Promise<void>;
export type StringChangeHandler = (value: string) => void;
export type OptionalDateFormatter = (value?: string) => string;
