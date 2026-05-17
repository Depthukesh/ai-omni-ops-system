"use client";

import { useState } from "react";
import { type XiaohongshuOriginalWorkRecord, type XiaohongshuRewriteWorkRecord, type XiaohongshuVideoWorkRecord } from "../../../services/works";

export function useWorkEditors() {
  const [editingOriginalWorkId, setEditingOriginalWorkId] = useState("");
  const [editingOriginalTitle, setEditingOriginalTitle] = useState("");
  const [editingOriginalContent, setEditingOriginalContent] = useState("");
  const [savingOriginalWorkId, setSavingOriginalWorkId] = useState("");

  const [editingRewriteWorkId, setEditingRewriteWorkId] = useState("");
  const [editingRewriteTitle, setEditingRewriteTitle] = useState("");
  const [editingRewriteContent, setEditingRewriteContent] = useState("");
  const [savingRewriteWorkId, setSavingRewriteWorkId] = useState("");

  const [editingVideoWorkId, setEditingVideoWorkId] = useState("");
  const [editingVideoTitle, setEditingVideoTitle] = useState("");
  const [editingVideoContent, setEditingVideoContent] = useState("");
  const [editingVideoStoryboardPrompt, setEditingVideoStoryboardPrompt] = useState("");
  const [savingVideoWorkId, setSavingVideoWorkId] = useState("");

  function startEditOriginalWork(item: XiaohongshuOriginalWorkRecord, onSelect?: (workId: string) => void) {
    onSelect?.(item.id);
    setEditingOriginalWorkId(item.id);
    setEditingOriginalTitle(item.title);
    setEditingOriginalContent(item.content);
  }

  function cancelEditOriginalWork() {
    setEditingOriginalWorkId("");
    setEditingOriginalTitle("");
    setEditingOriginalContent("");
  }

  function startEditRewriteWork(item: XiaohongshuRewriteWorkRecord, onSelect?: (workId: string) => void) {
    onSelect?.(item.id);
    setEditingRewriteWorkId(item.id);
    setEditingRewriteTitle(item.title);
    setEditingRewriteContent(item.content);
  }

  function cancelEditRewriteWork() {
    setEditingRewriteWorkId("");
    setEditingRewriteTitle("");
    setEditingRewriteContent("");
  }

  function startEditVideoWork(item: XiaohongshuVideoWorkRecord, onSelect?: (workId: string) => void) {
    onSelect?.(item.id);
    setEditingVideoWorkId(item.id);
    setEditingVideoTitle(item.title);
    setEditingVideoContent(item.content);
    setEditingVideoStoryboardPrompt(item.storyboardPrompt || "");
  }

  function cancelEditVideoWork() {
    setEditingVideoWorkId("");
    setEditingVideoTitle("");
    setEditingVideoContent("");
    setEditingVideoStoryboardPrompt("");
  }

  return {
    editingOriginalWorkId,
    editingOriginalTitle,
    editingOriginalContent,
    savingOriginalWorkId,
    editingRewriteWorkId,
    editingRewriteTitle,
    editingRewriteContent,
    savingRewriteWorkId,
    editingVideoWorkId,
    editingVideoTitle,
    editingVideoContent,
    editingVideoStoryboardPrompt,
    savingVideoWorkId,
    setEditingOriginalTitle,
    setEditingOriginalContent,
    setSavingOriginalWorkId,
    setEditingRewriteTitle,
    setEditingRewriteContent,
    setSavingRewriteWorkId,
    setEditingVideoTitle,
    setEditingVideoContent,
    setEditingVideoStoryboardPrompt,
    setSavingVideoWorkId,
    startEditOriginalWork,
    cancelEditOriginalWork,
    startEditRewriteWork,
    cancelEditRewriteWork,
    startEditVideoWork,
    cancelEditVideoWork,
  };
}
