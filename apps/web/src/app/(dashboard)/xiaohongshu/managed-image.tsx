"use client";

import { type ImgHTMLAttributes } from "react";

type LoadingMode = "eager" | "lazy";
type FetchPriorityMode = "auto" | "high" | "low";

export interface ManagedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "loading"> {
  loadingMode?: LoadingMode;
  fetchPriorityMode?: FetchPriorityMode;
}

export function ManagedImage(props: ManagedImageProps) {
  const {
    loadingMode = "lazy",
    fetchPriorityMode,
    decoding = "async",
    draggable = false,
    ...rest
  } = props;

  return (
    <img
      {...rest}
      loading={loadingMode}
      decoding={decoding}
      fetchPriority={fetchPriorityMode || (loadingMode === "eager" ? "high" : "low")}
      draggable={draggable}
    />
  );
}
