"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  continueXiaohongshuVideoGeneration,
  deleteXiaohongshuVideoWork,
  deleteXiaohongshuOriginalWork,
  deleteXiaohongshuRewriteWork,
  regenerateXiaohongshuVideoStoryboard,
  type XiaohongshuOriginalWorkRecord,
  type XiaohongshuRewriteWorkRecord,
  type XiaohongshuVideoWorkRecord,
  updateXiaohongshuVideoWork,
  updateXiaohongshuOriginalWork,
  updateXiaohongshuRewriteWork,
} from "../../../services/works";

type StringSetter = Dispatch<SetStateAction<string>>;
type NoticeSetter = (value: string) => void;
type OriginalWorksSetter = Dispatch<SetStateAction<XiaohongshuOriginalWorkRecord[]>>;
type RewriteWorksSetter = Dispatch<SetStateAction<XiaohongshuRewriteWorkRecord[]>>;
type VideoWorksSetter = Dispatch<SetStateAction<XiaohongshuVideoWorkRecord[]>>;

type OriginalMutationOptions = {
  works: XiaohongshuOriginalWorkRecord[];
  setWorks: OriginalWorksSetter;
  selectedWorkId: string;
  setSelectedWorkId: StringSetter;
  deletingWorkId: string;
  setDeletingWorkId: StringSetter;
  editingWorkId: string;
  editingTitle: string;
  editingContent: string;
  setSavingWorkId: StringSetter;
  cancelEdit: () => void;
};

type RewriteMutationOptions = {
  works: XiaohongshuRewriteWorkRecord[];
  setWorks: RewriteWorksSetter;
  selectedWorkId: string;
  setSelectedWorkId: StringSetter;
  deletingWorkId: string;
  setDeletingWorkId: StringSetter;
  editingWorkId: string;
  editingTitle: string;
  editingContent: string;
  setSavingWorkId: StringSetter;
  cancelEdit: () => void;
};

type VideoMutationOptions = {
  works: XiaohongshuVideoWorkRecord[];
  setWorks: VideoWorksSetter;
  selectedWorkId: string;
  setSelectedWorkId: StringSetter;
  deletingWorkId: string;
  setDeletingWorkId: StringSetter;
  editingWorkId: string;
  editingTitle: string;
  editingContent: string;
  editingStoryboardPrompt: string;
  setSavingWorkId: StringSetter;
  setEditingStoryboardPrompt: StringSetter;
  cancelEdit: () => void;
};

export function useWorkMutationActions(options: {
  brandId?: string;
  setNotice: NoticeSetter;
  setErrorMessage: NoticeSetter;
  original: OriginalMutationOptions;
  rewrite: RewriteMutationOptions;
  video: VideoMutationOptions;
}) {
  const resolvedBrandId = options.brandId || "";

  async function saveOriginalWork() {
    if (!options.original.editingWorkId) {
      return;
    }

    const title = options.original.editingTitle.trim();
    const content = options.original.editingContent.trim();
    if (!title || !content) {
      options.setErrorMessage("标题和正文不能为空。");
      return;
    }

    options.original.setSavingWorkId(options.original.editingWorkId);
    options.setNotice("");
    options.setErrorMessage("");

    try {
      const result = await updateXiaohongshuOriginalWork(resolvedBrandId, options.original.editingWorkId, {
        title,
        content,
      });
      options.original.setWorks((current) => current.map((item) => (item.id === result.item.id ? result.item : item)));
      options.original.setSelectedWorkId(result.item.id);
      options.original.cancelEdit();
      options.setNotice("原创笔记已更新。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "原创笔记更新失败";
      options.setErrorMessage(`保存失败：${message}`);
    } finally {
      options.original.setSavingWorkId("");
    }
  }

  async function deleteOriginalWork(workId: string) {
    options.original.setDeletingWorkId(workId);
    options.setNotice("");
    options.setErrorMessage("");

    try {
      await deleteXiaohongshuOriginalWork(resolvedBrandId, workId);
      const remainingItems = options.original.works.filter((item) => item.id !== workId);
      options.original.setWorks(remainingItems);
      if (options.original.selectedWorkId === workId) {
        options.original.setSelectedWorkId(remainingItems[0]?.id || "");
      }
      if (options.original.editingWorkId === workId) {
        options.original.cancelEdit();
      }
      options.setNotice("原创笔记已删除。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "原创笔记删除失败";
      options.setErrorMessage(`删除失败：${message}`);
    } finally {
      options.original.setDeletingWorkId("");
    }
  }

  async function saveRewriteWork() {
    if (!options.rewrite.editingWorkId) {
      return;
    }

    const title = options.rewrite.editingTitle.trim();
    const content = options.rewrite.editingContent.trim();
    if (!title || !content) {
      options.setErrorMessage("标题和正文不能为空。");
      return;
    }

    options.rewrite.setSavingWorkId(options.rewrite.editingWorkId);
    options.setNotice("");
    options.setErrorMessage("");

    try {
      const result = await updateXiaohongshuRewriteWork(resolvedBrandId, options.rewrite.editingWorkId, {
        title,
        content,
      });
      options.rewrite.setWorks((current) => current.map((item) => (item.id === result.item.id ? result.item : item)));
      options.rewrite.setSelectedWorkId(result.item.id);
      options.rewrite.cancelEdit();
      options.setNotice("二创笔记已更新。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "二创笔记更新失败";
      options.setErrorMessage(`保存失败：${message}`);
    } finally {
      options.rewrite.setSavingWorkId("");
    }
  }

  async function deleteRewriteWork(workId: string) {
    options.rewrite.setDeletingWorkId(workId);
    options.setNotice("");
    options.setErrorMessage("");

    try {
      await deleteXiaohongshuRewriteWork(resolvedBrandId, workId);
      const remainingItems = options.rewrite.works.filter((item) => item.id !== workId);
      options.rewrite.setWorks(remainingItems);
      if (options.rewrite.selectedWorkId === workId) {
        options.rewrite.setSelectedWorkId(remainingItems[0]?.id || "");
      }
      if (options.rewrite.editingWorkId === workId) {
        options.rewrite.cancelEdit();
      }
      options.setNotice("二创笔记已删除。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "二创笔记删除失败";
      options.setErrorMessage(`删除失败：${message}`);
    } finally {
      options.rewrite.setDeletingWorkId("");
    }
  }

  async function saveVideoWork() {
    if (!options.video.editingWorkId) {
      return;
    }

    const title = options.video.editingTitle.trim();
    const content = options.video.editingContent.trim();
    if (!title || !content) {
      options.setErrorMessage("标题和正文不能为空。");
      return;
    }

    options.video.setSavingWorkId(options.video.editingWorkId);
    options.setNotice("");
    options.setErrorMessage("");

    try {
      const result = await updateXiaohongshuVideoWork(resolvedBrandId, options.video.editingWorkId, {
        title,
        content,
        storyboardPrompt: options.video.editingStoryboardPrompt.trim() || undefined,
      });
      options.video.setWorks((current) => current.map((item) => (item.id === result.item.id ? result.item : item)));
      options.video.setSelectedWorkId(result.item.id);
      options.video.setEditingStoryboardPrompt(result.item.storyboardPrompt || "");
      options.video.cancelEdit();
      options.setNotice("视频笔记已更新。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "视频笔记更新失败";
      options.setErrorMessage(`保存失败：${message}`);
    } finally {
      options.video.setSavingWorkId("");
    }
  }

  async function deleteVideoWork(workId: string) {
    options.video.setDeletingWorkId(workId);
    options.setNotice("");
    options.setErrorMessage("");

    try {
      await deleteXiaohongshuVideoWork(resolvedBrandId, workId);
      const remainingItems = options.video.works.filter((item) => item.id !== workId);
      options.video.setWorks(remainingItems);
      if (options.video.selectedWorkId === workId) {
        options.video.setSelectedWorkId(remainingItems[0]?.id || "");
      }
      if (options.video.editingWorkId === workId) {
        options.video.cancelEdit();
      }
      options.setNotice("视频笔记已删除。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "视频笔记删除失败";
      options.setErrorMessage(`删除失败：${message}`);
    } finally {
      options.video.setDeletingWorkId("");
    }
  }

  async function regenerateVideoStoryboard(workId: string, storyboardPrompt: string) {
    const nextPrompt = storyboardPrompt.trim();
    if (!workId) {
      return;
    }
    if (!nextPrompt) {
      options.setErrorMessage("故事板提示词不能为空。");
      return;
    }

    options.video.setSavingWorkId(workId);
    options.setNotice("");
    options.setErrorMessage("");

    try {
      const result = await regenerateXiaohongshuVideoStoryboard(resolvedBrandId, workId, {
        storyboardPrompt: nextPrompt,
      });
      options.video.setWorks((current) => current.map((item) => (item.id === result.item.id ? result.item : item)));
      options.video.setSelectedWorkId(result.item.id);
      options.video.setEditingStoryboardPrompt(result.item.storyboardPrompt || nextPrompt);
      options.setNotice("故事板已重新提交生成，稍后会刷新最新图片。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "故事板重新生成失败";
      options.setErrorMessage(`提交失败：${message}`);
    } finally {
      options.video.setSavingWorkId("");
    }
  }

  async function generateVideoFromStoryboard(workId: string, customVideoModelName?: string) {
    if (!workId) {
      return;
    }

    options.video.setSavingWorkId(workId);
    options.setNotice("");
    options.setErrorMessage("");

    try {
      const result = await continueXiaohongshuVideoGeneration(resolvedBrandId, workId, {
        customVideoModelName: customVideoModelName?.trim() || undefined,
      });
      options.video.setWorks((current) => current.map((item) => (item.id === result.item.id ? result.item : item)));
      options.video.setSelectedWorkId(result.item.id);
      options.video.setEditingStoryboardPrompt(result.item.storyboardPrompt || "");
      options.setNotice("已进入短视频生成阶段，稍后可返回查看成片。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "短视频生成失败";
      options.setErrorMessage(`提交失败：${message}`);
    } finally {
      options.video.setSavingWorkId("");
    }
  }

  return {
    saveOriginalWork,
    deleteOriginalWork,
    saveRewriteWork,
    deleteRewriteWork,
    saveVideoWork,
    deleteVideoWork,
    regenerateVideoStoryboard,
    generateVideoFromStoryboard,
  };
}
