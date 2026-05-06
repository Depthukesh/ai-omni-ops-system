"use client";

import { type MediaLightboxState } from "./shared-types";

export interface MediaLightboxProps {
  state: MediaLightboxState | null;
  onClose: () => void;
}

export function MediaLightbox(props: MediaLightboxProps) {
  if (!props.state) {
    return null;
  }

  return (
    <div className="media-lightbox" role="dialog" aria-modal="true" onClick={props.onClose}>
      <div className="media-lightbox-panel" onClick={(event) => event.stopPropagation()}>
        <div className="media-lightbox-head">
          <strong>{props.state.title}</strong>
          <button type="button" className="media-preview-close" onClick={props.onClose}>
            关闭
          </button>
        </div>
        <div className="media-lightbox-body">
          {props.state.type === "VIDEO" ? (
            <video controls preload="metadata" className="xhs-material-lightbox-video" src={props.state.url} />
          ) : (
            <img src={props.state.url} alt={props.state.title} className="media-lightbox-image" />
          )}
        </div>
      </div>
    </div>
  );
}
