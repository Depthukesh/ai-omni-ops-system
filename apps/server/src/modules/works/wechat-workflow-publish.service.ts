import { BadRequestException, Injectable } from "@nestjs/common";
import type { WechatArticleDraftRecord, WechatWorkflowSessionRecord } from "./works.service";

@Injectable()
export class WechatWorkflowPublishService {
  buildWorkflowPublishConfig(params: {
    target: Pick<
      WechatWorkflowSessionRecord,
      "accountId" | "accountName" | "commentMode" | "imageBundle" | "publishConfig" | "htmlContent"
    >;
    config?: {
      appId?: string;
      appSecret?: string;
      whitelistIps: string[];
    };
    coverImageUrl: string;
    fanCommentsOnly: boolean;
  }): NonNullable<WechatWorkflowSessionRecord["publishConfig"]> {
    const checklist = [
      params.config?.appId && params.config?.appSecret ? "已配置 AppID / AppSecret" : "缺少 AppID / AppSecret",
      params.config?.whitelistIps?.length ? "已配置 IP 白名单" : "缺少 IP 白名单",
      params.coverImageUrl ? "已生成封面图" : "缺少封面图",
      params.target.htmlContent ? "已生成 HTML" : "缺少 HTML",
      "已确认评论策略",
    ];
    const ready = Boolean(
      params.config?.appId
      && params.config?.appSecret
      && params.config?.whitelistIps?.length
      && params.coverImageUrl
      && params.target.htmlContent,
    );
    return {
      ready,
      accountId: params.target.accountId,
      accountName: params.target.accountName,
      coverImageUrl: params.coverImageUrl,
      commentMode: params.target.commentMode,
      fanCommentsOnly: params.fanCommentsOnly,
      checklist,
      mediaId: params.target.publishConfig?.mediaId,
      publishedAt: params.target.publishConfig?.publishedAt,
      publishTaskId: params.target.publishConfig?.publishTaskId,
    };
  }

  buildPublishedWorkflowPublishConfig(params: {
    target: Pick<
      WechatWorkflowSessionRecord,
      "accountId" | "accountName" | "commentMode" | "publishConfig"
    >;
    mediaId: string;
    publishTaskId: string;
    publishedAt: string;
  }): NonNullable<WechatWorkflowSessionRecord["publishConfig"]> {
    return {
      ready: true,
      accountId: params.target.accountId,
      accountName: params.target.accountName,
      coverImageUrl: params.target.publishConfig?.coverImageUrl,
      commentMode: params.target.commentMode,
      fanCommentsOnly: params.target.publishConfig?.fanCommentsOnly ?? false,
      checklist: params.target.publishConfig?.checklist || [],
      mediaId: params.mediaId,
      publishedAt: params.publishedAt,
      publishTaskId: params.publishTaskId,
    };
  }

  buildWorkflowPublishPayload(params: {
    target: Pick<
      WechatWorkflowSessionRecord,
      "title" | "author" | "summary" | "commentMode" | "publishConfig"
    >;
    resolvedHtml: string;
  }) {
    return {
      title: params.target.title,
      author: params.target.author,
      summary: params.target.summary,
      htmlContent: params.resolvedHtml,
      coverImageUrl: params.target.publishConfig?.coverImageUrl || "",
      needOpenComment: this.resolveNeedOpenComment(params.target.commentMode),
      onlyFansCanComment: this.resolveOnlyFansCanComment(
        params.target.commentMode,
        params.target.publishConfig?.fanCommentsOnly ?? false,
      ),
    };
  }

  buildDraftPublishPayload(params: {
    draft: Pick<
      WechatArticleDraftRecord,
      "title" | "author" | "summary" | "commentMode" | "imageTasks"
    >;
    resolvedHtml: string;
  }) {
    return {
      title: params.draft.title,
      author: params.draft.author,
      summary: params.draft.summary,
      htmlContent: params.resolvedHtml,
      coverImageUrl: this.resolveDraftCoverImageUrl(params.draft),
      needOpenComment: this.resolveNeedOpenComment(params.draft.commentMode),
      onlyFansCanComment: this.resolveOnlyFansCanComment(params.draft.commentMode, params.draft.commentMode === "fans"),
    };
  }

  buildPublishConfirmErrorDetail(publishConfig: Pick<NonNullable<WechatWorkflowSessionRecord["publishConfig"]>, "ready">) {
    return publishConfig.ready ? undefined : "发布确认未完成，请检查 API 凭证、白名单、封面图和 HTML。";
  }

  private resolveNeedOpenComment(commentMode: WechatWorkflowSessionRecord["commentMode"]) {
    return commentMode !== "close";
  }

  private resolveOnlyFansCanComment(
    commentMode: WechatWorkflowSessionRecord["commentMode"],
    fanCommentsOnly: boolean,
  ) {
    if (commentMode === "close") {
      return false;
    }
    if (commentMode === "fans") {
      return true;
    }
    return fanCommentsOnly;
  }

  private resolveDraftCoverImageUrl(
    draft: Pick<WechatArticleDraftRecord, "imageTasks">,
  ) {
    const coverTask = draft.imageTasks?.find((item) => item.kind === "cover");
    const coverImageUrl = coverTask?.generatedImageUrls.find((item) => Boolean(String(item || "").trim()));
    if (!coverImageUrl) {
      throw new BadRequestException("请先为公众号文章生成封面图，再执行 API 发布。");
    }
    return coverImageUrl;
  }
}
