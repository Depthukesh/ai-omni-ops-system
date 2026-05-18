"use client";

import { useEffect, useState } from "react";
import { requestBlobByUrl } from "../../services/http";

const DEFAULT_IDLE_TTL_MS = 2 * 60 * 1000;

type ProtectedMediaPayload = {
  objectUrl: string;
  fileName: string;
};

type ProtectedMediaCacheEntry = ProtectedMediaPayload & {
  retainCount: number;
  evictionTimer?: ReturnType<typeof setTimeout>;
  promise?: Promise<ProtectedMediaPayload>;
};

const protectedMediaCache = new Map<string, ProtectedMediaCacheEntry>();

export interface UseProtectedMediaAssetOptions {
  enabled?: boolean;
  idleTtlMs?: number;
}

export function useProtectedMediaAsset(sourceUrl?: string, options?: UseProtectedMediaAssetOptions) {
  const [objectUrl, setObjectUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const enabled = options?.enabled ?? true;
  const idleTtlMs = options?.idleTtlMs ?? DEFAULT_IDLE_TTL_MS;

  useEffect(() => {
    if (!sourceUrl || !enabled) {
      setObjectUrl("");
      setFileName("");
      setIsLoading(false);
      setErrorMessage("");
      return;
    }

    let active = true;
    acquireProtectedMedia(sourceUrl);
    const cached = readCachedProtectedMedia(sourceUrl);
    if (cached) {
      setObjectUrl(cached.objectUrl);
      setFileName(cached.fileName);
      setIsLoading(false);
      setErrorMessage("");
    } else {
      setObjectUrl("");
      setFileName("");
      setIsLoading(true);
      setErrorMessage("");
    }

    void loadProtectedMedia(sourceUrl)
      .then((payload) => {
        if (!active) {
          return;
        }
        setObjectUrl(payload.objectUrl);
        setFileName(payload.fileName);
        setErrorMessage("");
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setObjectUrl("");
        setFileName("");
        setErrorMessage(error instanceof Error ? error.message : "附件加载失败");
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      releaseProtectedMedia(sourceUrl, idleTtlMs);
    };
  }, [enabled, idleTtlMs, sourceUrl]);

  return {
    objectUrl,
    fileName,
    isLoading,
    errorMessage,
  };
}

function readCachedProtectedMedia(sourceUrl: string): ProtectedMediaPayload | null {
  const entry = protectedMediaCache.get(sourceUrl);
  if (!entry?.objectUrl) {
    return null;
  }

  return {
    objectUrl: entry.objectUrl,
    fileName: entry.fileName,
  };
}

function acquireProtectedMedia(sourceUrl: string) {
  const entry = ensureProtectedMediaEntry(sourceUrl);
  entry.retainCount += 1;
  clearProtectedMediaEviction(entry);
}

function releaseProtectedMedia(sourceUrl: string, idleTtlMs: number) {
  const entry = protectedMediaCache.get(sourceUrl);
  if (!entry) {
    return;
  }

  entry.retainCount = Math.max(0, entry.retainCount - 1);
  if (entry.retainCount > 0) {
    return;
  }

  clearProtectedMediaEviction(entry);
  entry.evictionTimer = setTimeout(() => {
    const current = protectedMediaCache.get(sourceUrl);
    if (!current || current.retainCount > 0) {
      return;
    }
    if (current.objectUrl) {
      URL.revokeObjectURL(current.objectUrl);
    }
    protectedMediaCache.delete(sourceUrl);
  }, Math.max(0, idleTtlMs));
}

async function loadProtectedMedia(sourceUrl: string): Promise<ProtectedMediaPayload> {
  const existing = readCachedProtectedMedia(sourceUrl);
  if (existing) {
    return existing;
  }

  const entry = ensureProtectedMediaEntry(sourceUrl);
  if (entry.promise) {
    return entry.promise;
  }

  const promise = requestBlobByUrl(sourceUrl)
    .then(({ blob, fileName }) => {
      const current = ensureProtectedMediaEntry(sourceUrl);
      current.objectUrl = URL.createObjectURL(blob);
      current.fileName = fileName;
      current.promise = undefined;
      return {
        objectUrl: current.objectUrl,
        fileName: current.fileName,
      };
    })
    .catch((error) => {
      const current = protectedMediaCache.get(sourceUrl);
      if (current) {
        current.promise = undefined;
        if (!current.objectUrl && current.retainCount === 0) {
          protectedMediaCache.delete(sourceUrl);
        }
      }
      throw error;
    });

  entry.promise = promise;
  return promise;
}

function ensureProtectedMediaEntry(sourceUrl: string) {
  const existing = protectedMediaCache.get(sourceUrl);
  if (existing) {
    return existing;
  }

  const entry: ProtectedMediaCacheEntry = {
    objectUrl: "",
    fileName: "",
    retainCount: 0,
  };
  protectedMediaCache.set(sourceUrl, entry);
  return entry;
}

function clearProtectedMediaEviction(entry: ProtectedMediaCacheEntry) {
  if (entry.evictionTimer) {
    clearTimeout(entry.evictionTimer);
    entry.evictionTimer = undefined;
  }
}
