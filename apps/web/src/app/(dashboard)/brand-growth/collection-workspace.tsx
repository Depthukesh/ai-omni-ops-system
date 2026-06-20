"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type {
  AsyncAction,
  FeishuAppConfigForm,
  FeishuBindingForm,
  MediaPreviewState,
  OptionalDateFormatter,
  OptionalNumberFormatter,
  ValueAction,
} from "./shared-types";
import type {
  DouyinCollectedAccountRecord,
  DouyinCityHotspotRecord,
  DouyinCityOption,
  DouyinContentTagOption,
  DouyinCollectionWorkspace,
  DouyinKeywordRecommendationRecord,
  DouyinCollectedWorkRecord,
  XhsAccountRole,
  XhsCollectedAccountRecord,
  XhsCollectedNoteRecord,
} from "../../../services/collectors";
import type {
  FeishuAppConfigRecord,
  FeishuAuthStatusRecord,
  FeishuBindingRecord,
} from "../../../services/brand-growth";
import type { DailyHotspotItem, DailyHotspotPlatformRecord } from "../../../services/daily-hotspots";
import { API_BASE_URL, requestBlobByUrl } from "../../../services/http";

export type XiaohongshuCollectionCardKey =
  | "brandAccount"
  | "competitorAccount"
  | "brandWorks"
  | "benchmarkWorks"
  | "searchNotes";

export const xiaohongshuCollectionCards: Array<{
  key: XiaohongshuCollectionCardKey;
  label: string;
}> = [
  { key: "brandAccount", label: "品牌账号信息" },
  { key: "competitorAccount", label: "竞品账号信息" },
  { key: "brandWorks", label: "品牌作品信息及数据" },
  { key: "benchmarkWorks", label: "对标作品信息及数据" },
  { key: "searchNotes", label: "搜索笔记" },
];

export type XhsAccountBindingEntry = {
  id: string;
  locator: string;
  accountRole?: XhsAccountRole;
};

export type DouyinCollectionCardKey =
  | "brandAccount"
  | "competitorAccount"
  | "brandWorks"
  | "competitorWorks"
  | "benchmarkWorks"
  | "searchWorks"
  | "keywordRecommendations"
  | "lowFanExplosiveWorks"
  | "highCompletionRateWorks"
  | "highLikeRateWorks"
  | "cityHotspots";

export const douyinCollectionCards: Array<{
  key: DouyinCollectionCardKey;
  label: string;
}> = [
  { key: "brandAccount", label: "品牌账号信息" },
  { key: "competitorAccount", label: "竞品账号信息" },
  { key: "brandWorks", label: "品牌作品信息及数据" },
  { key: "competitorWorks", label: "竞品作品信息及数据" },
  { key: "benchmarkWorks", label: "对标作品信息及数据" },
  { key: "searchWorks", label: "搜索关键词" },
  { key: "keywordRecommendations", label: "关键词推荐" },
  { key: "lowFanExplosiveWorks", label: "获取低粉爆款榜" },
  { key: "highCompletionRateWorks", label: "获取高完播率榜" },
  { key: "highLikeRateWorks", label: "获取高点赞率榜" },
  { key: "cityHotspots", label: "同城热点榜" },
];

type DouyinFieldPreviewRow = {
  field: string;
  label: string;
  source: string;
  path: string;
  required: "必需" | "可选";
  patch: "否" | "是";
};

type KeywordRecommendationEntry = {
  id: string;
  keyword: string;
};

const DOUYIN_SEARCH_SORT_OPTIONS = [
  { value: "0", label: "综合排序" },
  { value: "1", label: "最多点赞" },
  { value: "2", label: "最新发布" },
] as const;

const DOUYIN_SEARCH_PUBLISH_TIME_OPTIONS = [
  { value: "0", label: "不限" },
  { value: "1", label: "最近一天" },
  { value: "7", label: "最近一周" },
  { value: "180", label: "最近半年" },
] as const;

const DOUYIN_SEARCH_DURATION_OPTIONS = [
  { value: "0", label: "不限" },
  { value: "0-1", label: "1 分钟以内" },
  { value: "1-5", label: "1-5 分钟" },
  { value: "5-10000", label: "5 分钟以上" },
] as const;

const DOUYIN_SEARCH_CONTENT_TYPE_OPTIONS = [
  { value: "0", label: "不限" },
  { value: "1", label: "视频" },
  { value: "2", label: "图片" },
  { value: "3", label: "文章" },
] as const;

const douyinFieldPreviewMap: Record<DouyinCollectionCardKey, DouyinFieldPreviewRow[]> = {
  brandAccount: [
    { field: "sourceAccountId", label: "账号抓取主键", source: "获取指定用户的信息", path: "data.user.sec_uid", required: "必需", patch: "否" },
    { field: "externalUserId", label: "抖音内部用户 ID", source: "获取指定用户的信息", path: "data.user.uid", required: "必需", patch: "否" },
    { field: "accountName", label: "用户昵称", source: "获取指定用户的信息", path: "data.user.nickname", required: "必需", patch: "否" },
    { field: "username", label: "抖音号", source: "获取指定用户的信息", path: "data.user.unique_id", required: "可选", patch: "否" },
    { field: "description", label: "个人签名/简介", source: "获取指定用户的信息", path: "data.user.signature", required: "可选", patch: "否" },
    { field: "avatar", label: "头像 300 尺寸", source: "获取指定用户的信息", path: "data.user.avatar_300x300.url_list[0]", required: "可选", patch: "否" },
    { field: "fanCount", label: "粉丝数", source: "获取指定用户的信息", path: "data.user.follower_count", required: "必需", patch: "否" },
    { field: "followCount", label: "关注数", source: "获取指定用户的信息", path: "data.user.following_count", required: "可选", patch: "否" },
    { field: "likedCount", label: "获赞总数", source: "获取指定用户的信息", path: "data.user.total_favorited", required: "可选", patch: "否" },
    { field: "postedCount", label: "作品数", source: "获取指定用户的信息", path: "data.user.aweme_count", required: "可选", patch: "否" },
  ],
  competitorAccount: [
    { field: "sourceAccountId", label: "账号抓取主键", source: "获取指定用户的信息", path: "data.user.sec_uid", required: "必需", patch: "否" },
    { field: "externalUserId", label: "抖音内部用户 ID", source: "获取指定用户的信息", path: "data.user.uid", required: "必需", patch: "否" },
    { field: "accountName", label: "用户昵称", source: "获取指定用户的信息", path: "data.user.nickname", required: "必需", patch: "否" },
    { field: "username", label: "抖音号", source: "获取指定用户的信息", path: "data.user.unique_id", required: "可选", patch: "否" },
    { field: "description", label: "账号简介", source: "获取指定用户的信息", path: "data.user.signature", required: "可选", patch: "否" },
    { field: "avatar", label: "头像 300 尺寸", source: "获取指定用户的信息", path: "data.user.avatar_300x300.url_list[0]", required: "可选", patch: "否" },
    { field: "followCount", label: "关注数", source: "获取指定用户的信息", path: "data.user.following_count", required: "可选", patch: "否" },
    { field: "fanCount", label: "粉丝数", source: "获取指定用户的信息", path: "data.user.follower_count", required: "必需", patch: "否" },
    { field: "likedCount", label: "获赞总数", source: "获取指定用户的信息", path: "data.user.total_favorited", required: "可选", patch: "否" },
    { field: "postedCount", label: "作品数", source: "获取指定用户的信息", path: "data.user.aweme_count", required: "可选", patch: "否" },
  ],
  brandWorks: [
    { field: "workId", label: "作品主键", source: "获取用户主页作品数据", path: "data.aweme_list[].aweme_id", required: "必需", patch: "否" },
    { field: "description", label: "作品描述/文案", source: "获取用户主页作品数据", path: "data.aweme_list[].desc", required: "必需", patch: "否" },
    { field: "publishTimeText", label: "发布时间戳", source: "获取用户主页作品数据", path: "data.aweme_list[].create_time", required: "可选", patch: "否" },
    { field: "mediaType", label: "媒体类型", source: "获取用户主页作品数据", path: "data.aweme_list[].media_type", required: "可选", patch: "否" },
    { field: "durationMs", label: "视频时长(毫秒)", source: "获取用户主页作品数据", path: "data.aweme_list[].duration", required: "可选", patch: "否" },
    { field: "likeCount", label: "点赞数", source: "获取用户主页作品数据", path: "data.aweme_list[].statistics.digg_count", required: "可选", patch: "否" },
    { field: "commentCount", label: "评论数", source: "获取用户主页作品数据", path: "data.aweme_list[].statistics.comment_count", required: "可选", patch: "否" },
    { field: "shareCount", label: "分享数", source: "获取用户主页作品数据", path: "data.aweme_list[].statistics.share_count", required: "可选", patch: "否" },
    { field: "collectCount", label: "收藏数", source: "获取用户主页作品数据", path: "data.aweme_list[].statistics.collect_count", required: "可选", patch: "否" },
    { field: "recommendCount", label: "推荐数", source: "获取用户主页作品数据", path: "data.aweme_list[].statistics.recommend_count", required: "可选", patch: "否" },
    { field: "imageList", label: "图文列表", source: "获取用户主页作品数据", path: "data.aweme_list[].images", required: "可选", patch: "否" },
    { field: "awemeType", label: "作品类型", source: "获取用户主页作品数据", path: "data.aweme_list[].aweme_type", required: "可选", patch: "否" },
    { field: "videoUrl", label: "视频下载地址", source: "获取用户主页作品数据", path: "data.aweme_list[].video_download_addr", required: "可选", patch: "否" },
  ],
  competitorWorks: [
    { field: "workId", label: "作品主键", source: "获取用户主页作品数据", path: "data.aweme_list[].aweme_id", required: "必需", patch: "否" },
    { field: "description", label: "作品描述/文案", source: "获取用户主页作品数据", path: "data.aweme_list[].desc", required: "必需", patch: "否" },
    { field: "publishTimeText", label: "发布时间戳", source: "获取用户主页作品数据", path: "data.aweme_list[].create_time", required: "可选", patch: "否" },
    { field: "mediaType", label: "媒体类型", source: "获取用户主页作品数据", path: "data.aweme_list[].media_type", required: "可选", patch: "否" },
    { field: "durationMs", label: "视频时长(毫秒)", source: "获取用户主页作品数据", path: "data.aweme_list[].duration", required: "可选", patch: "否" },
    { field: "likeCount", label: "点赞数", source: "获取用户主页作品数据", path: "data.aweme_list[].statistics.digg_count", required: "可选", patch: "否" },
    { field: "commentCount", label: "评论数", source: "获取用户主页作品数据", path: "data.aweme_list[].statistics.comment_count", required: "可选", patch: "否" },
    { field: "shareCount", label: "分享数", source: "获取用户主页作品数据", path: "data.aweme_list[].statistics.share_count", required: "可选", patch: "否" },
    { field: "collectCount", label: "收藏数", source: "获取用户主页作品数据", path: "data.aweme_list[].statistics.collect_count", required: "可选", patch: "否" },
    { field: "recommendCount", label: "推荐数", source: "获取用户主页作品数据", path: "data.aweme_list[].statistics.recommend_count", required: "可选", patch: "否" },
    { field: "imageList", label: "图文列表", source: "获取用户主页作品数据", path: "data.aweme_list[].images", required: "可选", patch: "否" },
    { field: "awemeType", label: "作品类型", source: "获取用户主页作品数据", path: "data.aweme_list[].aweme_type", required: "可选", patch: "否" },
    { field: "videoUrl", label: "视频下载地址", source: "获取用户主页作品数据", path: "data.aweme_list[].video_download_addr", required: "可选", patch: "否" },
  ],
  benchmarkWorks: [
    { field: "description", label: "作品描述", source: "获取单个作品数据 V3", path: "data.aweme_detail.desc", required: "必需", patch: "否" },
    { field: "durationMs", label: "作品时长", source: "获取单个作品数据 V3", path: "data.aweme_detail.video.duration", required: "可选", patch: "否" },
    { field: "coverUrl", label: "视频封面", source: "获取单个作品数据 V3", path: "data.aweme_detail.video.cover.url_list[0]", required: "可选", patch: "否" },
    { field: "videoUrl", label: "视频播放地址", source: "获取单个作品数据 V3", path: "data.aweme_detail.video.play_addr.url_list[0]", required: "可选", patch: "否" },
    { field: "authorName", label: "作者昵称", source: "获取单个作品数据 V3", path: "data.aweme_detail.author.nickname", required: "可选", patch: "否" },
    { field: "authorUniqueId", label: "作者抖音号", source: "获取单个作品数据 V3", path: "data.aweme_detail.author.unique_id", required: "可选", patch: "否" },
    { field: "authorFollowerCount", label: "作者粉丝数", source: "获取单个作品数据 V3", path: "data.aweme_detail.author.follower_count", required: "可选", patch: "否" },
    { field: "authorLikedCount", label: "作者总获赞", source: "获取单个作品数据 V3", path: "data.aweme_detail.author.total_favorited", required: "可选", patch: "否" },
    { field: "authorAvatar", label: "作者头像", source: "获取单个作品数据 V3", path: "data.aweme_detail.author.avatar_300x300.url_list[0]", required: "可选", patch: "否" },
    { field: "playCount", label: "播放量", source: "获取作品的统计数据", path: "data.statistics_list[].play_count", required: "必需", patch: "是" },
    { field: "likeCount", label: "点赞数", source: "获取单个作品数据 V3 / 统计数据", path: "data.aweme_detail.statistics.digg_count / data.statistics_list[].digg_count", required: "可选", patch: "是" },
    { field: "shareCount", label: "分享数", source: "获取单个作品数据 V3 / 统计数据", path: "data.aweme_detail.statistics.share_count / data.statistics_list[].share_count", required: "可选", patch: "是" },
    { field: "downloadCount", label: "下载数", source: "获取作品的统计数据", path: "data.statistics_list[].download_count", required: "可选", patch: "是" },
    { field: "commentCount", label: "评论数", source: "获取单个作品数据 V3", path: "data.aweme_detail.statistics.comment_count", required: "可选", patch: "否" },
  ],
  searchWorks: [
    { field: "workId", label: "作品 ID", source: "获取综合搜索 V1", path: "data[].aweme_info.aweme_id", required: "必需", patch: "否" },
    { field: "description", label: "作品描述", source: "获取综合搜索 V1", path: "data[].aweme_info.desc", required: "必需", patch: "否" },
    { field: "coverUrl", label: "视频封面", source: "获取综合搜索 V1", path: "data[].aweme_info.video.cover.url_list[0]", required: "可选", patch: "否" },
    { field: "videoUrl", label: "视频地址", source: "获取综合搜索 V1", path: "data[].aweme_info.video.download_addr.url_list[0]", required: "可选", patch: "否" },
    { field: "authorName", label: "作者昵称", source: "获取综合搜索 V1", path: "data[].aweme_info.author.nickname", required: "可选", patch: "否" },
    { field: "authorUniqueId", label: "作者抖音号", source: "获取综合搜索 V1", path: "data[].aweme_info.author.unique_id", required: "可选", patch: "否" },
    { field: "authorAvatar", label: "作者头像", source: "获取综合搜索 V1", path: "data[].aweme_info.author.avatar_medium.url_list[0]", required: "可选", patch: "否" },
    { field: "durationMs", label: "作品时长", source: "获取综合搜索 V1", path: "data[].aweme_info.video.duration", required: "可选", patch: "否" },
    { field: "publishTimeText", label: "发布时间", source: "获取综合搜索 V1", path: "data[].aweme_info.create_time", required: "可选", patch: "否" },
    { field: "playCount", label: "播放量", source: "获取综合搜索 V1", path: "data[].aweme_info.statistics.play_count", required: "可选", patch: "否" },
    { field: "likeCount", label: "点赞数", source: "获取综合搜索 V1", path: "data[].aweme_info.statistics.digg_count", required: "可选", patch: "否" },
    { field: "commentCount", label: "评论数", source: "获取综合搜索 V1", path: "data[].aweme_info.statistics.comment_count", required: "可选", patch: "否" },
    { field: "shareCount", label: "分享数", source: "获取综合搜索 V1", path: "data[].aweme_info.statistics.share_count", required: "可选", patch: "否" },
    { field: "collectCount", label: "收藏数", source: "获取综合搜索 V1", path: "data[].aweme_info.statistics.collect_count", required: "可选", patch: "否" },
  ],
  keywordRecommendations: [
    { field: "searchKeyword", label: "搜索关键词", source: "获取搜索关键词推荐", path: "data.sug_list[].content", required: "必需", patch: "否" },
    { field: "recommendedKeyword", label: "推荐关键词", source: "获取搜索关键词推荐", path: "data.sug_list[].content / data.sug_list[].word_record.words_content", required: "必需", patch: "否" },
    { field: "searchTime", label: "搜索时间", source: "获取搜索关键词推荐", path: "data.extra.now", required: "可选", patch: "否" },
    { field: "queryId", label: "推荐查询 ID", source: "获取搜索关键词推荐", path: "data.sug_list[].words_query_record.query_id", required: "可选", patch: "否" },
  ],
  lowFanExplosiveWorks: [
    { field: "workId", label: "作品 ID", source: "获取低粉爆款榜", path: "data.data.data[].item_id", required: "必需", patch: "否" },
    { field: "description", label: "作品描述", source: "获取低粉爆款榜", path: "data.data.data[].item_title", required: "必需", patch: "否" },
    { field: "coverUrl", label: "作品封面", source: "获取低粉爆款榜", path: "data.data.data[].item_cover_url", required: "可选", patch: "否" },
    { field: "durationMs", label: "作品时长", source: "获取低粉爆款榜", path: "data.data.data[].item_duration", required: "可选", patch: "否" },
    { field: "authorName", label: "作者昵称", source: "获取低粉爆款榜", path: "data.data.data[].nick_name", required: "可选", patch: "否" },
    { field: "authorAvatar", label: "作者头像", source: "获取低粉爆款榜", path: "data.data.data[].avatar_url", required: "可选", patch: "否" },
    { field: "authorFollowerCount", label: "作者粉丝数", source: "获取低粉爆款榜", path: "data.data.data[].fans_cnt", required: "可选", patch: "否" },
    { field: "playCount", label: "播放量", source: "获取低粉爆款榜", path: "data.data.data[].play_cnt", required: "可选", patch: "否" },
    { field: "publishTimeText", label: "发布时间", source: "获取低粉爆款榜", path: "data.data.data[].publish_time", required: "可选", patch: "否" },
    { field: "score", label: "榜单分数", source: "获取低粉爆款榜", path: "data.data.data[].score", required: "可选", patch: "否" },
    { field: "videoUrl", label: "作品链接", source: "获取低粉爆款榜", path: "data.data.data[].item_url", required: "可选", patch: "否" },
    { field: "likeCount", label: "点赞数", source: "获取低粉爆款榜", path: "data.data.data[].like_cnt", required: "可选", patch: "否" },
  ],
  highCompletionRateWorks: [
    { field: "workId", label: "作品 ID", source: "获取高完播率榜", path: "data.data.data[].item_id", required: "必需", patch: "否" },
    { field: "description", label: "作品描述", source: "获取高完播率榜", path: "data.data.data[].item_title", required: "必需", patch: "否" },
    { field: "coverUrl", label: "作品封面", source: "获取高完播率榜", path: "data.data.data[].item_cover_url", required: "可选", patch: "否" },
    { field: "durationMs", label: "作品时长", source: "获取高完播率榜", path: "data.data.data[].item_duration", required: "可选", patch: "否" },
    { field: "authorName", label: "作者昵称", source: "获取高完播率榜", path: "data.data.data[].nick_name", required: "可选", patch: "否" },
    { field: "authorAvatar", label: "作者头像", source: "获取高完播率榜", path: "data.data.data[].avatar_url", required: "可选", patch: "否" },
    { field: "authorFollowerCount", label: "作者粉丝数", source: "获取高完播率榜", path: "data.data.data[].fans_cnt", required: "可选", patch: "否" },
    { field: "playCount", label: "播放量", source: "获取高完播率榜", path: "data.data.data[].play_cnt", required: "可选", patch: "否" },
    { field: "publishTimeText", label: "发布时间", source: "获取高完播率榜", path: "data.data.data[].publish_time", required: "可选", patch: "否" },
    { field: "score", label: "榜单分数", source: "获取高完播率榜", path: "data.data.data[].score", required: "可选", patch: "否" },
    { field: "videoUrl", label: "作品链接", source: "获取高完播率榜", path: "data.data.data[].item_url", required: "可选", patch: "否" },
    { field: "likeCount", label: "点赞数", source: "获取高完播率榜", path: "data.data.data[].like_cnt", required: "可选", patch: "否" },
  ],
  highLikeRateWorks: [
    { field: "workId", label: "作品 ID", source: "获取高点赞率榜", path: "data.data.data[].item_id", required: "必需", patch: "否" },
    { field: "description", label: "作品描述", source: "获取高点赞率榜", path: "data.data.data[].item_title", required: "必需", patch: "否" },
    { field: "coverUrl", label: "作品封面", source: "获取高点赞率榜", path: "data.data.data[].item_cover_url", required: "可选", patch: "否" },
    { field: "durationMs", label: "作品时长", source: "获取高点赞率榜", path: "data.data.data[].item_duration", required: "可选", patch: "否" },
    { field: "authorName", label: "作者昵称", source: "获取高点赞率榜", path: "data.data.data[].nick_name", required: "可选", patch: "否" },
    { field: "authorAvatar", label: "作者头像", source: "获取高点赞率榜", path: "data.data.data[].avatar_url", required: "可选", patch: "否" },
    { field: "authorFollowerCount", label: "作者粉丝数", source: "获取高点赞率榜", path: "data.data.data[].fans_cnt", required: "可选", patch: "否" },
    { field: "playCount", label: "播放量", source: "获取高点赞率榜", path: "data.data.data[].play_cnt", required: "可选", patch: "否" },
    { field: "publishTimeText", label: "发布时间", source: "获取高点赞率榜", path: "data.data.data[].publish_time", required: "可选", patch: "否" },
    { field: "score", label: "榜单分数", source: "获取高点赞率榜", path: "data.data.data[].score", required: "可选", patch: "否" },
    { field: "videoUrl", label: "作品链接", source: "获取高点赞率榜", path: "data.data.data[].item_url", required: "可选", patch: "否" },
    { field: "likeCount", label: "点赞数", source: "获取高点赞率榜", path: "data.data.data[].like_cnt", required: "可选", patch: "否" },
  ],
  cityHotspots: [
    { field: "cityLabel", label: "城市名称", source: "获取中国城市列表", path: "data.data[].label", required: "必需", patch: "否" },
    { field: "rank", label: "当前排名", source: "获取同城热点榜", path: "data.data.objs[].rank", required: "必需", patch: "否" },
    { field: "rankDiff", label: "排名变化", source: "获取同城热点榜", path: "data.data.objs[].rank_diff", required: "可选", patch: "否" },
    { field: "sentence", label: "热点词", source: "获取同城热点榜", path: "data.data.objs[].sentence", required: "必需", patch: "否" },
    { field: "createAtText", label: "日期时间", source: "获取同城热点榜", path: "data.data.objs[].create_at", required: "可选", patch: "否" },
    { field: "hotScore", label: "热度值", source: "获取同城热点榜", path: "data.data.objs[].hot_score", required: "可选", patch: "否" },
    { field: "videoCount", label: "相关视频数", source: "获取同城热点榜", path: "data.data.objs[].video_count", required: "可选", patch: "否" },
    { field: "sentenceTag", label: "热点分类标签", source: "获取同城热点榜", path: "data.data.objs[].sentence_tag", required: "可选", patch: "否" },
    { field: "trends", label: "近一小时趋势", source: "获取同城热点榜", path: "data.data.objs[].trends[]", required: "可选", patch: "否" },
  ],
};

export interface BrandGrowthCollectionWorkspaceProps {
  activePage: "feishuCollection" | "xiaohongshuCollection" | "douyinCollection" | "dailyHotspot";
  pageTitle: string;
  pageDescription: string;
  dataSource: "api" | "error" | "loading";
  notice: string;
  errorMessage: string;
  onRefreshData: AsyncAction;
  templateUrl: string;
  activeXhsCollectionCard: XiaohongshuCollectionCardKey;
  onXhsCollectionCardChange: ValueAction<XiaohongshuCollectionCardKey>;
  xhsSyncForm: {
    brandAccountEntries: XhsAccountBindingEntry[];
    competitorAccountEntries: XhsAccountBindingEntry[];
    brandWorkLocators: string;
    benchmarkNoteLocators: string;
    searchKeyword: string;
  };
  setXhsSyncForm: Dispatch<SetStateAction<{
    brandAccountEntries: XhsAccountBindingEntry[];
    competitorAccountEntries: XhsAccountBindingEntry[];
    brandWorkLocators: string;
    benchmarkNoteLocators: string;
    searchKeyword: string;
  }>>;
  activeDouyinCollectionCard: DouyinCollectionCardKey;
  onDouyinCollectionCardChange: ValueAction<DouyinCollectionCardKey>;
  feishuBinding: FeishuBindingRecord | null;
  feishuAppConfig: FeishuAppConfigRecord | null;
  feishuAuthStatus: FeishuAuthStatusRecord | null;
  feishuBindingForm: FeishuBindingForm;
  setFeishuBindingForm: Dispatch<SetStateAction<FeishuBindingForm>>;
  feishuAppConfigForm: FeishuAppConfigForm;
  setFeishuAppConfigForm: Dispatch<SetStateAction<FeishuAppConfigForm>>;
  canSyncFeishuWorkspace: boolean;
  isHydrating: boolean;
  isSavingFeishuAppConfig: boolean;
  isSavingFeishuBinding: boolean;
  isSyncingFeishuWorkspace: boolean;
  isSyncingXhsWorkspace: boolean;
  douyinWorkspace: DouyinCollectionWorkspace;
  isSyncingDouyinWorkspace: boolean;
  douyinSyncForm: {
    brandAccountEntries: XhsAccountBindingEntry[];
    competitorAccountEntries: XhsAccountBindingEntry[];
    benchmarkAwemeIds: string;
    searchKeyword: string;
    searchSortType: string;
    searchPublishTime: string;
    searchFilterDuration: string;
    searchContentType: string;
    keywordRecommendationEntries: KeywordRecommendationEntry[];
    lowFanExplosiveWorks: {
      primaryTagId: string;
      secondaryTagId: string;
    };
    highCompletionRateWorks: {
      primaryTagId: string;
      secondaryTagId: string;
    };
    highLikeRateWorks: {
      primaryTagId: string;
      secondaryTagId: string;
    };
    cityHotspots: {
      cityCode: string;
    };
  };
  setDouyinSyncForm: Dispatch<SetStateAction<{
    brandAccountEntries: XhsAccountBindingEntry[];
    competitorAccountEntries: XhsAccountBindingEntry[];
    benchmarkAwemeIds: string;
    searchKeyword: string;
    searchSortType: string;
    searchPublishTime: string;
    searchFilterDuration: string;
    searchContentType: string;
    keywordRecommendationEntries: KeywordRecommendationEntry[];
    lowFanExplosiveWorks: {
      primaryTagId: string;
      secondaryTagId: string;
    };
    highCompletionRateWorks: {
      primaryTagId: string;
      secondaryTagId: string;
    };
    highLikeRateWorks: {
      primaryTagId: string;
      secondaryTagId: string;
    };
    cityHotspots: {
      cityCode: string;
    };
  }>>;
  onSaveFeishuAppConfig: AsyncAction;
  onStartFeishuAuth: AsyncAction;
  onSaveFeishuBinding: AsyncAction;
  onSyncFeishuWorkspace: AsyncAction;
  onSyncXhsWorkspace: AsyncAction;
  onSyncXhsSearchNotes: AsyncAction;
  onSyncAllXhsBrandAccounts: AsyncAction;
  onSyncSingleXhsBrandAccount: ValueAction<XhsAccountBindingEntry>;
  onSyncSingleXhsCompetitorAccount: ValueAction<XhsAccountBindingEntry>;
  onSyncDouyinWorkspace: AsyncAction;
  onSyncAllDouyinBrandAccounts: AsyncAction;
  onSyncAllDouyinCompetitorAccounts: AsyncAction;
  onSyncSingleDouyinBrandAccount: ValueAction<XhsAccountBindingEntry>;
  onSyncSingleDouyinCompetitorAccount: ValueAction<XhsAccountBindingEntry>;
  onSyncSingleDouyinKeywordRecommendation: ValueAction<string>;
  sortedBrandAccounts: XhsCollectedAccountRecord[];
  sortedCompetitorAccounts: XhsCollectedAccountRecord[];
  sortedBrandNotes: XhsCollectedNoteRecord[];
  sortedBenchmarkNotes: XhsCollectedNoteRecord[];
  sortedSearchNotes: XhsCollectedNoteRecord[];
  sortedDouyinBrandAccounts: DouyinCollectedAccountRecord[];
  sortedDouyinCompetitorAccounts: DouyinCollectedAccountRecord[];
  sortedDouyinBrandWorks: DouyinCollectedWorkRecord[];
  sortedDouyinCompetitorWorks: DouyinCollectedWorkRecord[];
  sortedDouyinBenchmarkWorks: DouyinCollectedWorkRecord[];
  sortedDouyinSearchWorks: DouyinCollectedWorkRecord[];
  sortedDouyinKeywordRecommendations: DouyinKeywordRecommendationRecord[];
  sortedDouyinLowFanExplosiveWorks: DouyinCollectedWorkRecord[];
  sortedDouyinHighCompletionRateWorks: DouyinCollectedWorkRecord[];
  sortedDouyinHighLikeRateWorks: DouyinCollectedWorkRecord[];
  sortedDouyinCityHotspots: DouyinCityHotspotRecord[];
  brandNotesPage: number;
  setBrandNotesPage: Dispatch<SetStateAction<number>>;
  brandNotesPageCount: number;
  brandNotesPageSize: number;
  setBrandNotesPageSize: Dispatch<SetStateAction<number>>;
  paginatedBrandNotes: XhsCollectedNoteRecord[];
  addingMaterialAssetId: string;
  onAddBenchmarkNoteToMaterial: ValueAction<string>;
  onAddDouyinBenchmarkWorkToMaterial: ValueAction<DouyinCollectedWorkRecord>;
  onRemoveDouyinKeywordRecommendation: ValueAction<string>;
  onPreviewMedia: ValueAction<MediaPreviewState>;
  buildFeishuMediaProxyUrl: (sourceUrl?: string, download?: boolean) => string;
  formatDateTime: OptionalDateFormatter;
  formatDateLabel: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
  formatMetric: OptionalNumberFormatter;
  deletingDouyinKeywordRecommendationId: string;
  selectedHotspotDate: string;
  hotspotAvailableDates: string[];
  activeHotspotRecord?: DailyHotspotPlatformRecord;
  sortedHotspotItems: DailyHotspotItem[];
  paginatedHotspotItems: DailyHotspotItem[];
  hotspotPage: number;
  setHotspotPage: Dispatch<SetStateAction<number>>;
  hotspotPageCount: number;
  hotspotPageSize: number;
  setHotspotPageSize: Dispatch<SetStateAction<number>>;
  isSyncingDailyHotspots: boolean;
  onDailyHotspotDateChange: ValueAction<string>;
  onSyncDailyHotspots: (platformTitles?: string[]) => void | Promise<void>;
  formatHotspotHeat: OptionalNumberFormatter;
}

function useProtectedMediaAsset(sourceUrl?: string) {
  const [objectUrl, setObjectUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!sourceUrl) {
      setObjectUrl("");
      setFileName("");
      setIsLoading(false);
      setErrorMessage("");
      return;
    }

    if (!isProtectedMediaSource(sourceUrl)) {
      setObjectUrl(sourceUrl);
      setFileName(buildMediaFileNameFromUrl(sourceUrl));
      setIsLoading(false);
      setErrorMessage("");
      return;
    }

    let active = true;
    let currentObjectUrl = "";
    setIsLoading(true);
    setErrorMessage("");

    void requestBlobByUrl(sourceUrl)
      .then(({ blob, fileName: resolvedFileName }) => {
        if (!active) {
          return;
        }
        currentObjectUrl = URL.createObjectURL(blob);
        setObjectUrl(currentObjectUrl);
        setFileName(resolvedFileName);
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
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [sourceUrl]);

  return {
    objectUrl,
    fileName,
    isLoading,
    errorMessage,
  };
}

function isProtectedMediaSource(sourceUrl?: string) {
  if (!sourceUrl) {
    return false;
  }
  const normalized = sourceUrl.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return normalized.startsWith("/")
    || normalized.startsWith(API_BASE_URL.toLowerCase())
    || normalized.includes("/api/collectors/")
    || normalized.includes("/api/brand-growth/");
}

function buildMediaFileNameFromUrl(sourceUrl: string) {
  try {
    const resolved = new URL(sourceUrl, "https://local.invalid");
    const segment = resolved.pathname.split("/").filter(Boolean).pop();
    return segment || "asset";
  } catch {
    return "asset";
  }
}

function useProtectedMediaGallery(sourceUrls: string[]) {
  const [items, setItems] = useState<Array<{
    sourceUrl: string;
    objectUrl: string;
    fileName: string;
    isLoading: boolean;
    errorMessage: string;
  }>>([]);

  useEffect(() => {
    if (!sourceUrls.length) {
      setItems([]);
      return;
    }

    let active = true;
    const createdObjectUrls: string[] = [];
    setItems(
      sourceUrls.map((sourceUrl) => ({
        sourceUrl,
        objectUrl: "",
        fileName: "",
        isLoading: true,
        errorMessage: "",
      })),
    );

    void Promise.allSettled(
      sourceUrls.map(async (sourceUrl) => {
        if (!isProtectedMediaSource(sourceUrl)) {
          return {
            objectUrl: sourceUrl,
            fileName: buildMediaFileNameFromUrl(sourceUrl),
            shouldRevoke: false,
          };
        }
        const response = await requestBlobByUrl(sourceUrl);
        const objectUrl = URL.createObjectURL(response.blob);
        return {
          objectUrl,
          fileName: response.fileName,
          shouldRevoke: true,
        };
      }),
    )
      .then((results) => {
        if (!active) {
          return;
        }
        setItems(
          results.map((result, index) => {
            const sourceUrl = sourceUrls[index] || "";
            if (result.status === "fulfilled") {
              if (result.value.shouldRevoke) {
                createdObjectUrls.push(result.value.objectUrl);
              }
              return {
                sourceUrl,
                objectUrl: result.value.objectUrl,
                fileName: result.value.fileName,
                isLoading: false,
                errorMessage: "",
              };
            }
            return {
              sourceUrl,
              objectUrl: "",
              fileName: "",
              isLoading: false,
              errorMessage: result.reason instanceof Error ? result.reason.message : "附件加载失败",
            };
          }),
        );
      });

    return () => {
      active = false;
      createdObjectUrls.forEach((item) => URL.revokeObjectURL(item));
    };
  }, [sourceUrls]);

  return items;
}

function ProtectedImageThumb(props: {
  sourceUrl: string;
  title: string;
  onPreviewMedia: ValueAction<MediaPreviewState>;
  showDownloadLink?: boolean;
}) {
  const media = useProtectedMediaAsset(props.sourceUrl);

  if (media.errorMessage) {
    return <div className="note-empty-media">{media.errorMessage}</div>;
  }

  return (
    <div className="note-image-card">
      <button
        type="button"
        className="note-image-thumb"
        title={props.title}
        onClick={() => media.objectUrl && props.onPreviewMedia({ url: media.objectUrl, title: props.title })}
        disabled={!media.objectUrl}
      >
        {media.objectUrl ? <img src={media.objectUrl} alt={props.title} /> : <span>{media.isLoading ? "附件加载中..." : "附件暂不可用"}</span>}
      </button>
      {props.showDownloadLink !== false && media.objectUrl ? (
        <a href={media.objectUrl} download={media.fileName || undefined} className="note-data-link">
          下载附件
        </a>
      ) : props.showDownloadLink !== false ? (
        <span className="note-data-link">{media.isLoading ? "准备下载..." : "下载不可用"}</span>
      ) : null}
    </div>
  );
}

function ProtectedImageGallery(props: {
  sourceUrls: string[];
  title: string;
  onPreviewMedia: ValueAction<MediaPreviewState>;
}) {
  const mediaItems = useProtectedMediaGallery(props.sourceUrls);
  const visibleItems = mediaItems.slice(0, 4);
  const previewableUrls = mediaItems.map((item) => item.objectUrl).filter(Boolean);
  const remainingCount = Math.max(props.sourceUrls.length - visibleItems.length, 0);

  return (
    <div className="note-image-card">
      <div className="note-image-grid">
        {visibleItems.map((item, index) => (
          <div key={`${item.sourceUrl}-${index + 1}`} className="note-image-card">
            <button
              type="button"
              className="note-image-thumb"
              title={`${props.title} 第 ${index + 1} 张`}
              onClick={() =>
                item.objectUrl
                  && props.onPreviewMedia({
                    url: item.objectUrl,
                    title: props.title,
                    galleryUrls: previewableUrls,
                    activeIndex: previewableUrls.indexOf(item.objectUrl),
                  })}
              disabled={!item.objectUrl}
            >
              {item.objectUrl ? (
                <>
                  <img src={item.objectUrl} alt={`${props.title} 第 ${index + 1} 张`} />
                  {remainingCount > 0 && index === visibleItems.length - 1 ? (
                    <span className="note-image-more-badge">+{remainingCount}</span>
                  ) : null}
                </>
              ) : (
                <span>{item.isLoading ? "附件加载中..." : item.errorMessage || "附件暂不可用"}</span>
              )}
            </button>
          </div>
        ))}
      </div>
      <span className="note-image-count">
        共 {props.sourceUrls.length} 张
      </span>
    </div>
  );
}

function ProtectedVideoPanel(props: {
  sourceUrl?: string;
}) {
  const media = useProtectedMediaAsset(props.sourceUrl);

  if (!props.sourceUrl) {
    return null;
  }

  return (
    <>
      {media.objectUrl ? (
        <div className="note-video-shell">
          <video
            controls
            preload="metadata"
            className="note-video-player"
            src={media.objectUrl}
          />
        </div>
      ) : media.errorMessage ? (
        <div className="note-empty-media">{media.errorMessage}</div>
      ) : (
        <div className="note-empty-media">视频加载中...</div>
      )}
      <div className="note-media-actions">
        {media.objectUrl ? (
          <a
            href={media.objectUrl}
            target="_blank"
            rel="noreferrer"
            className="note-data-link"
          >
            查看视频附件
          </a>
        ) : null}
        {media.objectUrl ? (
          <a href={media.objectUrl} download={media.fileName || undefined} className="note-data-link">
            下载视频附件
          </a>
        ) : null}
      </div>
    </>
  );
}

function ProtectedVideoLink(props: {
  sourceUrl?: string;
  title?: string;
  onPreviewMedia?: ValueAction<MediaPreviewState>;
}) {
  const media = useProtectedMediaAsset(props.sourceUrl);
  const onPreviewMedia = props.onPreviewMedia;

  if (!props.sourceUrl) {
    return <span>-</span>;
  }

  if (media.errorMessage) {
    return <span className="note-data-link">{media.errorMessage}</span>;
  }

  if (!media.objectUrl) {
    return <span className="note-data-link">{media.isLoading ? "视频加载中..." : "视频暂不可用"}</span>;
  }

  if (onPreviewMedia) {
    return (
      <a
        href={media.objectUrl}
        className="note-data-link"
        onClick={(event) => {
          event.preventDefault();
          void onPreviewMedia({
            url: media.objectUrl!,
            title: props.title || "视频预览",
            type: "VIDEO",
            downloadUrl: media.objectUrl!,
            downloadName: media.fileName || undefined,
          });
        }}
      >
        打开视频
      </a>
    );
  }

  return (
    <a href={media.objectUrl} target="_blank" rel="noreferrer" className="note-data-link">
      打开视频
    </a>
  );
}

function CollectionPageStatus(props: {
  dataSource: "api" | "error" | "loading";
  notice: string;
  errorMessage: string;
  isHydrating: boolean;
}) {
  return (
    <div className="workspace-status" style={{ marginBottom: 16 }}>
      <span
        className={`archive-pill ${
          props.dataSource === "api" ? "status-ready" : props.dataSource === "loading" ? "status-in_progress" : "status-pending"
        }`}
      >
        {props.dataSource === "api" ? "接口数据" : props.dataSource === "loading" ? "加载中" : "接口异常"}
      </span>
      {props.isHydrating ? <span className="status-text">正在加载当前页面数据...</span> : null}
      {!props.isHydrating && props.notice ? <span className="status-text success-text">{props.notice}</span> : null}
      {!props.isHydrating && props.errorMessage ? <span className="status-text error-text">{props.errorMessage}</span> : null}
    </div>
  );
}

const XHS_ACCOUNT_ROLE_OPTIONS: Array<{ value: XhsAccountRole; label: string; description: string }> = [
  { value: "BRAND", label: "品牌号", description: "官方品牌主体账号，适合品牌内容与官方活动。" },
  { value: "STAFF", label: "员工号", description: "员工或门店同事出镜账号，适合真实视角分享。" },
  { value: "TALENT", label: "达人号", description: "达人/KOC/KOL 视角账号，适合种草合作内容。" },
];

function getXhsAccountRoleLabel(role?: XhsAccountRole) {
  if (role === "STAFF") {
    return "员工号";
  }
  if (role === "TALENT") {
    return "达人号";
  }
  return "品牌号";
}

function normalizeXhsAccountEntryLocator(locator: string) {
  const trimmed = locator.trim();
  if (!trimmed) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
      .replace(/[#?].*$/, "")
      .replace(/\/+$/, "")
      .toLowerCase();
  }
  return trimmed.toLowerCase();
}

function buildXhsAccountEntryId(locator: string, target: "brand" | "competitor") {
  const compact = normalizeXhsAccountEntryLocator(locator)
    .replace(/^https?:\/\/(www\.)?/i, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return `xhs_${target}_account_${compact || "entry"}`;
}

function upsertXhsAccountEntries(
  entries: XhsAccountBindingEntry[],
  nextEntry: XhsAccountBindingEntry,
  target: "brand" | "competitor",
) {
  const normalizedLocator = normalizeXhsAccountEntryLocator(nextEntry.locator);
  if (!normalizedLocator) {
    return entries;
  }
  const preparedEntry: XhsAccountBindingEntry = {
    ...nextEntry,
    id: nextEntry.id || buildXhsAccountEntryId(normalizedLocator, target),
    locator: nextEntry.locator.trim(),
  };
  const matchedIndex = entries.findIndex((item) => normalizeXhsAccountEntryLocator(item.locator) === normalizedLocator);
  if (matchedIndex < 0) {
    return [...entries, preparedEntry];
  }
  return entries.map((item, index) => (index === matchedIndex ? { ...item, ...preparedEntry } : item));
}

function doesXhsAccountMatchEntry(account: XhsCollectedAccountRecord, entry: XhsAccountBindingEntry) {
  const normalizedEntry = normalizeXhsAccountEntryLocator(entry.locator);
  if (!normalizedEntry) {
    return false;
  }
  const normalizedSourceLink = normalizeXhsAccountEntryLocator(account.sourceAccountLink || "");
  const normalizedExternalUserId = normalizeXhsAccountEntryLocator(account.externalUserId || "");
  return normalizedEntry === normalizedSourceLink || normalizedEntry === normalizedExternalUserId;
}

function buildDouyinAccountMatchTokens(value: string) {
  const trimmed = value.trim();
  const normalized = normalizeXhsAccountEntryLocator(trimmed);
  if (!normalized) {
    return [] as string[];
  }

  const tokens = new Set<string>();
  const pushToken = (candidate?: string | null) => {
    const normalizedCandidate = normalizeXhsAccountEntryLocator(candidate || "");
    if (!normalizedCandidate) {
      return;
    }
    tokens.add(normalizedCandidate);
    tokens.add(normalizedCandidate.replace(/^@+/, ""));
  };

  pushToken(trimmed);

  try {
    const url = new URL(trimmed);
    const pathSegments = url.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);
    const userSegmentIndex = pathSegments.findIndex((segment) => segment.toLowerCase() === "user");
    if (userSegmentIndex >= 0) {
      pushToken(pathSegments[userSegmentIndex + 1]);
    }
    pushToken(url.searchParams.get("sec_uid"));
    pushToken(url.searchParams.get("sec_user_id"));
    pushToken(url.searchParams.get("uid"));
    pushToken(url.searchParams.get("user_id"));
  } catch {
    // Ignore non-URL locators and rely on the raw normalized token instead.
  }

  const pathUserMatch = normalized.match(/\/user\/([^/?#]+)/i);
  if (pathUserMatch) {
    pushToken(pathUserMatch[1]);
  }

  return [...tokens].filter(Boolean);
}

function doesDouyinAccountMatchEntry(account: DouyinCollectedAccountRecord, entry: XhsAccountBindingEntry) {
  const entryTokens = buildDouyinAccountMatchTokens(entry.locator);
  if (!entryTokens.length) {
    return false;
  }
  const accountTokens = new Set<string>();
  [
    account.sourceAccountLink,
    account.accountLink,
    account.externalUserId,
    account.username,
    account.sourceAccountId,
    account.shortId,
  ].forEach((value) => {
    buildDouyinAccountMatchTokens(value || "").forEach((token) => accountTokens.add(token));
  });
  return entryTokens.some((token) => accountTokens.has(token));
}

function normalizeKeywordRecommendationKeyword(keyword: string) {
  return keyword.trim().toLowerCase();
}

function buildKeywordRecommendationEntryId() {
  return `douyin_keyword_${Math.random().toString(36).slice(2, 10)}`;
}

function upsertKeywordRecommendationEntries(
  entries: KeywordRecommendationEntry[],
  nextEntry: KeywordRecommendationEntry,
) {
  const normalizedKeyword = normalizeKeywordRecommendationKeyword(nextEntry.keyword);
  if (!normalizedKeyword) {
    return entries;
  }
  const preparedEntry = {
    ...nextEntry,
    keyword: nextEntry.keyword.trim(),
  };
  const matchedIndex = entries.findIndex((item) => normalizeKeywordRecommendationKeyword(item.keyword) === normalizedKeyword);
  if (matchedIndex < 0) {
    return [...entries, preparedEntry];
  }
  return entries.map((item, index) => (index === matchedIndex ? { ...item, ...preparedEntry } : item));
}

function doesKeywordRecommendationMatchEntry(
  item: DouyinKeywordRecommendationRecord,
  entry: KeywordRecommendationEntry,
) {
  return normalizeKeywordRecommendationKeyword(item.searchKeyword) === normalizeKeywordRecommendationKeyword(entry.keyword);
}

function XhsAccountBindingSubmitPanel(props: {
  title: string;
  description: string;
  modalTitle: string;
  modalDescription: string;
  emptyDescription: string;
  target: "brand" | "competitor";
  enableRoleSelection?: boolean;
  entries: XhsAccountBindingEntry[];
  syncedAccounts: XhsCollectedAccountRecord[];
  isSubmitting: boolean;
  onChangeEntries: ValueAction<XhsAccountBindingEntry[]>;
  onSubmitEntry: ValueAction<XhsAccountBindingEntry>;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftLocator, setDraftLocator] = useState("");
  const [draftRole, setDraftRole] = useState<XhsAccountRole>("BRAND");

  const handleSave = () => {
    const trimmedLocator = draftLocator.trim();
    if (!trimmedLocator) {
      return;
    }
    props.onChangeEntries(
      upsertXhsAccountEntries(props.entries, {
        id: buildXhsAccountEntryId(trimmedLocator, props.target),
        locator: trimmedLocator,
        accountRole: props.enableRoleSelection ? draftRole : undefined,
      }, props.target),
    );
    setDraftLocator("");
    setDraftRole("BRAND");
    setIsModalOpen(false);
  };

  const handleDelete = (entryId: string) => {
    props.onChangeEntries(props.entries.filter((item) => item.id !== entryId));
  };

  return (
    <>
      <article className="light-data-panel xhs-account-builder" style={{ marginBottom: 16 }}>
        <div className="collection-result-head">
          <div>
            <h3>{props.title}</h3>
            <p>{props.description}</p>
          </div>
          <button type="button" className="secondary-button" onClick={() => setIsModalOpen(true)} disabled={props.isSubmitting}>
            添加账号
          </button>
        </div>
        {props.entries.length ? (
          <div className="xhs-account-entry-list">
            {props.entries.map((entry) => {
              const hasSyncedResult = props.syncedAccounts.some((item) => doesXhsAccountMatchEntry(item, entry));
              return (
                <div key={entry.id} className="xhs-account-entry-row">
                  <div className="xhs-account-entry-row__body">
                    <div className="xhs-account-entry-row__meta">
                      {props.enableRoleSelection ? (
                        <span className="xhs-account-role-badge">{getXhsAccountRoleLabel(entry.accountRole)}</span>
                      ) : null}
                      <span className={`archive-pill ${hasSyncedResult ? "status-ready" : "status-pending"}`}>
                        {hasSyncedResult ? "已采集" : "待提交"}
                      </span>
                    </div>
                    <strong>{entry.locator}</strong>
                  </div>
                  <div className="xhs-account-entry-row__actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void props.onSubmitEntry(entry)}
                      disabled={props.isSubmitting}
                    >
                      {props.isSubmitting ? "提交中..." : "提交"}
                    </button>
                    <button
                      type="button"
                      className="note-inline-button"
                      onClick={() => handleDelete(entry.id)}
                      disabled={props.isSubmitting}
                    >
                      删除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="xhs-account-entry-empty">
            {props.emptyDescription}
          </div>
        )}
      </article>
      {isModalOpen ? (
        <div className="xhs-account-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setIsModalOpen(false)}>
          <div className="xhs-account-modal" onClick={(event) => event.stopPropagation()}>
            <div className="xhs-account-modal__head">
              <div>
                <strong>{props.modalTitle}</strong>
                <p>{props.modalDescription}</p>
              </div>
              <button type="button" className="xhs-account-modal__close" onClick={() => setIsModalOpen(false)}>
                关闭
              </button>
            </div>
            {props.enableRoleSelection ? (
              <div className="xhs-account-role-grid">
                {XHS_ACCOUNT_ROLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`xhs-account-role-card ${draftRole === option.value ? "is-active" : ""}`}
                    onClick={() => setDraftRole(option.value)}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <label className="field">
              <span>账号链接或 user_id</span>
              <input
                value={draftLocator}
                onChange={(event) => setDraftLocator(event.target.value)}
                placeholder="请输入主页链接、分享链接或 user_id"
              />
            </label>
            <div className="xhs-account-modal__actions">
              <button type="button" className="secondary-button" onClick={() => setIsModalOpen(false)}>
                取消
              </button>
              <button type="button" className="primary-button" onClick={handleSave} disabled={!draftLocator.trim()}>
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function DouyinAccountBindingSubmitPanel(props: {
  title: string;
  description: string;
  modalTitle: string;
  modalDescription: string;
  emptyDescription: string;
  target: "brand" | "competitor";
  enableRoleSelection?: boolean;
  entries: XhsAccountBindingEntry[];
  syncedAccounts: DouyinCollectedAccountRecord[];
  isSubmitting: boolean;
  onChangeEntries: ValueAction<XhsAccountBindingEntry[]>;
  onSubmitEntry: ValueAction<XhsAccountBindingEntry>;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftLocator, setDraftLocator] = useState("");
  const [draftRole, setDraftRole] = useState<XhsAccountRole>("BRAND");

  const handleSave = () => {
    const trimmedLocator = draftLocator.trim();
    if (!trimmedLocator) {
      return;
    }
    props.onChangeEntries(
      upsertXhsAccountEntries(props.entries, {
        id: buildXhsAccountEntryId(trimmedLocator, props.target),
        locator: trimmedLocator,
        accountRole: props.enableRoleSelection ? draftRole : undefined,
      }, props.target),
    );
    setDraftLocator("");
    setDraftRole("BRAND");
    setIsModalOpen(false);
  };

  const handleDelete = (entryId: string) => {
    props.onChangeEntries(props.entries.filter((item) => item.id !== entryId));
  };

  return (
    <>
      <article className="light-data-panel xhs-account-builder" style={{ marginBottom: 16 }}>
        <div className="collection-result-head">
          <div>
            <h3>{props.title}</h3>
            <p>{props.description}</p>
          </div>
          <button type="button" className="secondary-button" onClick={() => setIsModalOpen(true)} disabled={props.isSubmitting}>
            添加账号
          </button>
        </div>
        {props.entries.length ? (
          <div className="xhs-account-entry-list">
            {props.entries.map((entry) => {
              const hasSyncedResult = props.syncedAccounts.some((item) => doesDouyinAccountMatchEntry(item, entry));
              return (
                <div key={entry.id} className="xhs-account-entry-row">
                  <div className="xhs-account-entry-row__body">
                    <div className="xhs-account-entry-row__meta">
                      {props.enableRoleSelection ? (
                        <span className="xhs-account-role-badge">{getXhsAccountRoleLabel(entry.accountRole)}</span>
                      ) : null}
                      <span className={`archive-pill ${hasSyncedResult ? "status-ready" : "status-pending"}`}>
                        {hasSyncedResult ? "已采集" : "待提交"}
                      </span>
                    </div>
                    <strong>{entry.locator}</strong>
                  </div>
                  <div className="xhs-account-entry-row__actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void props.onSubmitEntry(entry)}
                      disabled={props.isSubmitting}
                    >
                      {props.isSubmitting ? "提交中..." : "提交"}
                    </button>
                    <button
                      type="button"
                      className="note-inline-button"
                      onClick={() => handleDelete(entry.id)}
                      disabled={props.isSubmitting}
                    >
                      删除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="xhs-account-entry-empty">
            {props.emptyDescription}
          </div>
        )}
      </article>
      {isModalOpen ? (
        <div className="xhs-account-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setIsModalOpen(false)}>
          <div className="xhs-account-modal" onClick={(event) => event.stopPropagation()}>
            <div className="xhs-account-modal__head">
              <div>
                <strong>{props.modalTitle}</strong>
                <p>{props.modalDescription}</p>
              </div>
              <button type="button" className="xhs-account-modal__close" onClick={() => setIsModalOpen(false)}>
                关闭
              </button>
            </div>
            {props.enableRoleSelection ? (
              <div className="xhs-account-role-grid">
                {XHS_ACCOUNT_ROLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`xhs-account-role-card ${draftRole === option.value ? "is-active" : ""}`}
                    onClick={() => setDraftRole(option.value)}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <label className="field">
              <span>账号链接或抖音号</span>
              <input
                value={draftLocator}
                onChange={(event) => setDraftLocator(event.target.value)}
                placeholder="请输入主页链接、分享链接、sec_uid 或抖音号"
              />
            </label>
            <div className="xhs-account-modal__actions">
              <button type="button" className="secondary-button" onClick={() => setIsModalOpen(false)}>
                取消
              </button>
              <button type="button" className="primary-button" onClick={handleSave} disabled={!draftLocator.trim()}>
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function DouyinKeywordRecommendationBuilder(props: {
  entries: KeywordRecommendationEntry[];
  results: DouyinKeywordRecommendationRecord[];
  isSubmitting: boolean;
  onChangeEntries: ValueAction<KeywordRecommendationEntry[]>;
  onSubmitEntry: ValueAction<string>;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftKeyword, setDraftKeyword] = useState("");
  const [historyKeyword, setHistoryKeyword] = useState("");

  const handleSave = () => {
    const trimmedKeyword = draftKeyword.trim();
    if (!trimmedKeyword) {
      return;
    }
    props.onChangeEntries(
      upsertKeywordRecommendationEntries(props.entries, {
        id: buildKeywordRecommendationEntryId(),
        keyword: trimmedKeyword,
      }),
    );
    setDraftKeyword("");
    setIsModalOpen(false);
  };

  const handleDelete = (entryId: string) => {
    props.onChangeEntries(props.entries.filter((item) => item.id !== entryId));
  };

  const historyItems = historyKeyword
    ? props.results.filter((item) => normalizeKeywordRecommendationKeyword(item.searchKeyword) === normalizeKeywordRecommendationKeyword(historyKeyword))
    : [];

  return (
    <>
      <article className="light-data-panel xhs-account-builder keyword-recommendation-builder">
        <div className="collection-result-head">
          <div>
            <h3>关键词推荐</h3>
            <p>延续品牌账号信息的轻卡片管理方式，先维护关键词池，再按需逐条提交获取推荐词结果。</p>
          </div>
          <button type="button" className="secondary-button" onClick={() => setIsModalOpen(true)} disabled={props.isSubmitting}>
            添加关键词
          </button>
        </div>
        {props.entries.length ? (
          <div className="keyword-recommendation-entry-grid">
            {props.entries.map((entry) => {
              const hasSyncedResult = props.results.some((item) => doesKeywordRecommendationMatchEntry(item, entry));
              return (
                <article key={entry.id} className="keyword-recommendation-entry-card">
                  <div className="keyword-recommendation-entry-card__head">
                    <span className={`archive-pill ${hasSyncedResult ? "status-ready" : "status-pending"}`}>
                      {hasSyncedResult ? "已回填" : "待提交"}
                    </span>
                    <span className="keyword-recommendation-entry-card__meta">
                      历史 {props.results.filter((item) => doesKeywordRecommendationMatchEntry(item, entry)).length} 条
                    </span>
                  </div>
                  <strong>{entry.keyword}</strong>
                  <div className="keyword-recommendation-entry-card__actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void props.onSubmitEntry(entry.keyword)}
                      disabled={props.isSubmitting}
                    >
                      {props.isSubmitting ? "提交中..." : "提交"}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setHistoryKeyword(entry.keyword)}
                    >
                      查看
                    </button>
                    <button
                      type="button"
                      className="note-inline-button"
                      onClick={() => handleDelete(entry.id)}
                      disabled={props.isSubmitting}
                    >
                      删除
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="xhs-account-entry-empty">
            当前还没有添加推荐关键词，请先新增关键词后再逐条提交。
          </div>
        )}
      </article>
      {isModalOpen ? (
        <div className="xhs-account-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setIsModalOpen(false)}>
          <div className="xhs-account-modal keyword-recommendation-modal" onClick={(event) => event.stopPropagation()}>
            <div className="xhs-account-modal__head">
              <div>
                <strong>添加关键词</strong>
                <p>保存后进入待提交列表。每个关键词都支持单独提交并回填推荐结果。</p>
              </div>
              <button type="button" className="xhs-account-modal__close" onClick={() => setIsModalOpen(false)}>
                关闭
              </button>
            </div>
            <label className="field">
              <span>关键词</span>
              <input
                value={draftKeyword}
                onChange={(event) => setDraftKeyword(event.target.value)}
                placeholder="请输入搜索关键词，例如：生日蛋糕、轻食沙拉、门店探店"
              />
            </label>
            <div className="xhs-account-modal__actions">
              <button type="button" className="secondary-button" onClick={() => setIsModalOpen(false)}>
                取消
              </button>
              <button type="button" className="primary-button" onClick={handleSave} disabled={!draftKeyword.trim()}>
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {historyKeyword ? (
        <div className="xhs-account-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setHistoryKeyword("")}>
          <div className="xhs-account-modal keyword-recommendation-history-modal" onClick={(event) => event.stopPropagation()}>
            <div className="xhs-account-modal__head">
              <div>
                <strong>历史记录</strong>
                <p>关键词“{historyKeyword}”的历史推荐结果按时间倒序展示，最新结果排在最前面。</p>
              </div>
              <button type="button" className="xhs-account-modal__close" onClick={() => setHistoryKeyword("")}>
                关闭
              </button>
            </div>
            {historyItems.length ? (
              <div className="keyword-recommendation-table keyword-recommendation-table--history">
                <div className="keyword-recommendation-table__head">
                  <span>搜索关键词</span>
                  <span>推荐关键词</span>
                  <span>搜索时间</span>
                </div>
                <div className="keyword-recommendation-table__body">
                  {historyItems.map((item) => (
                    <div key={item.id} className="keyword-recommendation-table__row">
                      <strong>{item.searchKeyword || "-"}</strong>
                      <strong>{item.recommendedKeyword || "-"}</strong>
                      <strong>{item.searchTime || item.collectedAt || "-"}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="note-empty-state">当前关键词还没有历史记录，请先提交一次再查看。</div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function DouyinKeywordRecommendationResults(props: {
  items: DouyinKeywordRecommendationRecord[];
  deletingItemId: string;
  onDelete: ValueAction<string>;
}) {
  return (
    <article className="light-data-panel">
      <div className="collection-result-head">
        <div>
          <h3>关键词推荐结果</h3>
          <p>调用 TikHub 抖音搜索关键词推荐接口，回填搜索关键词、推荐关键词和搜索时间。</p>
        </div>
      </div>
      {props.items.length ? (
        <div className="keyword-recommendation-table">
          <div className="keyword-recommendation-table__head keyword-recommendation-table__head--with-action">
            <span>搜索关键词</span>
            <span>推荐关键词</span>
            <span>搜索时间</span>
            <span>操作</span>
          </div>
          <div className="keyword-recommendation-table__body">
            {props.items.map((item) => (
              <div key={item.id} className="keyword-recommendation-table__row keyword-recommendation-table__row--with-action">
                <strong>{item.searchKeyword || "-"}</strong>
                <strong>{item.recommendedKeyword || "-"}</strong>
                <strong>{item.searchTime || "-"}</strong>
                <div className="keyword-recommendation-table__action">
                  <button
                    type="button"
                    className="note-inline-button"
                    onClick={() => void props.onDelete(item.id)}
                    disabled={props.deletingItemId === item.id}
                  >
                    {props.deletingItemId === item.id ? "删除中..." : "删除"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="note-empty-state">当前还没有关键词推荐结果，请先提交右侧关键词。</div>
      )}
    </article>
  );
}

function DouyinFieldPreviewTable(props: {
  rows: DouyinFieldPreviewRow[];
}) {
  return (
    <div className="collection-field-preview">
      <table className="soft-table compact-table">
        <thead>
          <tr>
            <th>字段</th>
            <th>含义</th>
            <th>来源接口</th>
            <th>原始路径</th>
            <th>必需</th>
            <th>统计补丁</th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <tr key={`${row.field}-${row.path}`}>
              <td><code>{row.field}</code></td>
              <td>{row.label}</td>
              <td>{row.source}</td>
              <td><code>{row.path}</code></td>
              <td>{row.required}</td>
              <td>{row.patch}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DouyinAccountPreviewCard(props: {
  item: DouyinCollectedAccountRecord;
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
}) {
  const item = props.item;
  return (
    <article className="collection-sync-card">
      <div className="collection-sync-head">
        <div className="collection-sync-title">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {item.avatar ? (
              <img
                src={item.avatar}
                alt={item.accountName || "抖音头像"}
                style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              />
            ) : null}
            <div>
              <strong>{item.accountName || "-"}</strong>
              <div className="personal-meta">{item.username || item.shortId || "未提供抖音号"}</div>
            </div>
          </div>
          <span>
            {item.accountLink ? (
              <a href={item.accountLink} target="_blank" rel="noreferrer">
                {item.accountLink}
              </a>
            ) : (
              "未提供主页链接"
            )}
          </span>
        </div>
        <span className="collection-sync-time">{props.formatDateTime(item.collectedAt)}</span>
      </div>
      <div className="collection-sync-grid">
        <div className="collection-sync-item">
          <span>sec_uid</span>
          <strong className="collection-sync-code">{item.sourceAccountId}</strong>
        </div>
        <div className="collection-sync-item">
          <span>用户 ID</span>
          <strong className="collection-sync-code">{item.externalUserId || "-"}</strong>
        </div>
        <div className="collection-sync-item">
          <span>抖音号</span>
          <strong>{item.username || item.shortId || "-"}</strong>
        </div>
        <div className="collection-sync-item">
          <span>作品数</span>
          <strong>{props.formatCount(item.postedCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>粉丝数</span>
          <strong>{props.formatCount(item.fanCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>获赞数</span>
          <strong>{props.formatCount(item.likedCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>关注数</span>
          <strong>{props.formatCount(item.followCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>IP 属地</span>
          <strong>{item.ipLocation || "-"}</strong>
        </div>
        <div className="collection-sync-item">
          <span>认证信息</span>
          <strong>{item.enterpriseVerifyReason || item.customVerify || "-"}</strong>
        </div>
        <div className="collection-sync-item collection-sync-item--full">
          <span>账号简介</span>
          <strong>{item.description || "未提供简介"}</strong>
        </div>
      </div>
    </article>
  );
}

function DouyinWorkPreviewCard(props: {
  item: DouyinCollectedWorkRecord;
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
  formatMetric: OptionalNumberFormatter;
  onPreviewMedia: ValueAction<MediaPreviewState>;
}) {
  const item = props.item;
  const hashtagText = item.hashtags?.length ? item.hashtags.join(" / ") : "无";
  return (
    <article className="collection-sync-card">
      <div className="collection-sync-head">
        <div className="collection-sync-title">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {item.authorAvatar ? (
              <img
                src={item.authorAvatar}
                alt={item.authorName || "作者头像"}
                style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              />
            ) : null}
            <div>
              <strong>{item.title || "-"}</strong>
              <div className="personal-meta">{item.authorName || "-"}</div>
            </div>
          </div>
          <span>
            {item.workUrl ? (
              <a href={item.workUrl} target="_blank" rel="noreferrer">
                {item.workUrl}
              </a>
            ) : (
              "未提供作品链接"
            )}
          </span>
        </div>
        <div className="collection-sync-actions">
          <span className="collection-sync-time">{props.formatDateTime(item.collectedAt)}</span>
          {item.statsPatched ? <span className="archive-pill status-ready">统计已补丁</span> : null}
        </div>
      </div>
      <div className="collection-sync-grid">
        <div className="collection-sync-item">
          <span>作品 ID</span>
          <strong className="collection-sync-code">{item.workId}</strong>
        </div>
        <div className="collection-sync-item">
          <span>作品类型</span>
          <strong>{item.workType || "-"}</strong>
        </div>
        <div className="collection-sync-item">
          <span>媒体类型</span>
          <strong>{item.mediaType ?? "-"}</strong>
        </div>
        <div className="collection-sync-item">
          <span>作者</span>
          <strong>{item.authorName || "-"}</strong>
        </div>
        <div className="collection-sync-item">
          <span>作者抖音号</span>
          <strong>{item.authorUniqueId || "-"}</strong>
        </div>
        <div className="collection-sync-item">
          <span>发布时间</span>
          <strong>{item.publishTimeText || "-"}</strong>
        </div>
        <div className="collection-sync-item">
          <span>时长</span>
          <strong>{item.durationMs ?? "-"}</strong>
        </div>
        <div className="collection-sync-item">
          <span>播放</span>
          <strong>{props.formatCount(item.playCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>点赞</span>
          <strong>{props.formatCount(item.likeCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>评论</span>
          <strong>{props.formatCount(item.commentCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>收藏</span>
          <strong>{props.formatCount(item.collectCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>分享</span>
          <strong>{props.formatCount(item.shareCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>下载</span>
          <strong>{props.formatCount(item.downloadCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>推荐</span>
          <strong>{props.formatCount(item.recommendCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>赞藏率</span>
          <strong>{props.formatMetric(item.likeCollectRatio)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>分享率</span>
          <strong>{props.formatMetric(item.shareRatio)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>配乐</span>
          <strong>{item.musicTitle || "-"}</strong>
        </div>
        <div className="collection-sync-item">
          <span>作者粉丝</span>
          <strong>{props.formatCount(item.authorFollowerCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>作者总获赞</span>
          <strong>{props.formatCount(item.authorLikedCount)}</strong>
        </div>
        <div className="collection-sync-item">
          <span>爆款判断</span>
          <strong>{item.isExplosive || "-"}</strong>
        </div>
        <div className="collection-sync-item collection-sync-item--full">
          <span>话题标签</span>
          <strong>{hashtagText}</strong>
        </div>
        <div className="collection-sync-item collection-sync-item--full">
          <span>正文摘要</span>
          <strong>{item.description || "暂无正文内容"}</strong>
        </div>
        {item.coverUrl ? (
          <div className="collection-sync-item collection-sync-item--full">
            <span>封面</span>
            <a href={item.coverUrl} target="_blank" rel="noreferrer" className="note-data-link">
              查看封面
            </a>
          </div>
        ) : null}
        {item.videoUrl ? (
          <div className="collection-sync-item collection-sync-item--full">
            <span>视频地址</span>
            <a
              href={item.videoUrl}
              className="note-data-link"
              onClick={(event) => {
                event.preventDefault();
                void props.onPreviewMedia({
                  url: item.videoUrl!,
                  title: item.title || item.workId || "抖音视频预览",
                  type: "VIDEO",
                });
              }}
            >
              打开视频
            </a>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function DouyinSubmitPanel(props: {
  title: string;
  value: string;
  placeholder: string;
  isSubmitting: boolean;
  onChange: ValueAction<string>;
  onSubmit: AsyncAction;
}) {
  return (
    <article className="light-data-panel" style={{ marginBottom: 16 }}>
      <div className="collection-result-head">
        <div>
          <h3>{props.title}</h3>
        </div>
        <button type="button" className="primary-button" onClick={() => void props.onSubmit()} disabled={props.isSubmitting}>
          {props.isSubmitting ? "提交中..." : "提交"}
        </button>
      </div>
      <label className="field">
        <textarea
          rows={4}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          placeholder={props.placeholder}
        />
      </label>
    </article>
  );
}

function DouyinSearchSubmitPanel(props: {
  title: string;
  value: string;
  placeholder: string;
  isSubmitting: boolean;
  sortType: string;
  publishTime: string;
  filterDuration: string;
  contentType: string;
  onChange: ValueAction<string>;
  onChangeFilters: ValueAction<{
    sortType: string;
    publishTime: string;
    filterDuration: string;
    contentType: string;
  }>;
  onSubmit: AsyncAction;
}) {
  return (
    <article className="light-data-panel" style={{ marginBottom: 16 }}>
      <div className="collection-result-head">
        <div>
          <h3>{props.title}</h3>
          <p>支持排序方式、发布时间、视频时长和内容类型筛选，帮助更快锁定目标搜索结果。</p>
        </div>
        <button type="button" className="primary-button" onClick={() => void props.onSubmit()} disabled={props.isSubmitting}>
          {props.isSubmitting ? "提交中..." : "提交"}
        </button>
      </div>
      <label className="field">
        <textarea
          rows={4}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          placeholder={props.placeholder}
        />
      </label>
      <div className="form-grid two-column" style={{ marginTop: 16 }}>
        <label className="field">
          <span>排序方式</span>
          <select
            value={props.sortType}
            onChange={(event) =>
              props.onChangeFilters({
                sortType: event.target.value,
                publishTime: props.publishTime,
                filterDuration: props.filterDuration,
                contentType: props.contentType,
              })}
          >
            {DOUYIN_SEARCH_SORT_OPTIONS.map((item) => (
              <option key={`douyin-search-sort-${item.value}`} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>发布时间</span>
          <select
            value={props.publishTime}
            onChange={(event) =>
              props.onChangeFilters({
                sortType: props.sortType,
                publishTime: event.target.value,
                filterDuration: props.filterDuration,
                contentType: props.contentType,
              })}
          >
            {DOUYIN_SEARCH_PUBLISH_TIME_OPTIONS.map((item) => (
              <option key={`douyin-search-publish-${item.value}`} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>视频时长</span>
          <select
            value={props.filterDuration}
            onChange={(event) =>
              props.onChangeFilters({
                sortType: props.sortType,
                publishTime: props.publishTime,
                filterDuration: event.target.value,
                contentType: props.contentType,
              })}
          >
            {DOUYIN_SEARCH_DURATION_OPTIONS.map((item) => (
              <option key={`douyin-search-duration-${item.value}`} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>内容类型</span>
          <select
            value={props.contentType}
            onChange={(event) =>
              props.onChangeFilters({
                sortType: props.sortType,
                publishTime: props.publishTime,
                filterDuration: props.filterDuration,
                contentType: event.target.value,
              })}
          >
            {DOUYIN_SEARCH_CONTENT_TYPE_OPTIONS.map((item) => (
              <option key={`douyin-search-content-type-${item.value}`} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </article>
  );
}

function DouyinCategorySubmitPanel(props: {
  title: string;
  tags: DouyinContentTagOption[];
  value: {
    primaryTagId: string;
    secondaryTagId: string;
  };
  isSubmitting: boolean;
  onChange: ValueAction<{
    primaryTagId: string;
    secondaryTagId: string;
  }>;
  onSubmit: AsyncAction;
}) {
  const selectedPrimaryTag = props.tags.find((item) => String(item.value) === props.value.primaryTagId);
  const secondaryTags = selectedPrimaryTag?.children ?? [];

  return (
    <article className="light-data-panel" style={{ marginBottom: 16 }}>
      <div className="collection-result-head">
        <div>
          <h3>{props.title}</h3>
          <p>先选择一级分类和二级分类，再提交当前榜单采集。</p>
        </div>
        <button type="button" className="primary-button" onClick={() => void props.onSubmit()} disabled={props.isSubmitting}>
          {props.isSubmitting ? "提交中..." : "提交"}
        </button>
      </div>
      <div className="form-grid two-column">
        <label className="field">
          <span>一级分类</span>
          <select
            value={props.value.primaryTagId}
            onChange={(event) =>
              props.onChange({
                primaryTagId: event.target.value,
                secondaryTagId: "",
              })
            }
          >
            <option value="">请选择一级分类</option>
            {props.tags.map((item) => (
              <option key={`douyin-primary-tag-${item.value}`} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>二级分类</span>
          <select
            value={props.value.secondaryTagId}
            onChange={(event) =>
              props.onChange({
                primaryTagId: props.value.primaryTagId,
                secondaryTagId: event.target.value,
              })
            }
            disabled={!selectedPrimaryTag}
          >
            <option value="">{selectedPrimaryTag ? "请选择二级分类" : "请先选择一级分类"}</option>
            {secondaryTags.map((item) => (
              <option key={`douyin-secondary-tag-${item.value}`} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </article>
  );
}

function DouyinCitySubmitPanel(props: {
  title: string;
  cities: DouyinCityOption[];
  value: {
    cityCode: string;
  };
  isSubmitting: boolean;
  onChange: ValueAction<{
    cityCode: string;
  }>;
  onSubmit: AsyncAction;
}) {
  return (
    <article className="light-data-panel" style={{ marginBottom: 16 }}>
      <div className="collection-result-head">
        <div>
          <h3>{props.title}</h3>
          <p>先选择城市，再提交同城热点榜采集。返回的是近一小时内的热点变化数据。</p>
        </div>
        <button type="button" className="primary-button" onClick={() => void props.onSubmit()} disabled={props.isSubmitting}>
          {props.isSubmitting ? "提交中..." : "提交"}
        </button>
      </div>
      <div className="form-grid two-column">
        <label className="field">
          <span>城市</span>
          <select
            value={props.value.cityCode}
            onChange={(event) => props.onChange({ cityCode: event.target.value })}
          >
            <option value="">请选择城市</option>
            {props.cities.map((item) => (
              <option key={`douyin-city-option-${item.value}`} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </article>
  );
}

function ScrollableTableShell(props: {
  children: ReactNode;
}) {
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomScrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [scrollWidth, setScrollWidth] = useState(0);

  useEffect(() => {
    const contentNode = contentRef.current;
    if (!contentNode) {
      return;
    }

    const syncWidth = () => {
      setScrollWidth(contentNode.scrollWidth);
    };

    syncWidth();
    const observer = new ResizeObserver(syncWidth);
    observer.observe(contentNode);
    return () => observer.disconnect();
  }, []);

  const syncScroll = (source: "top" | "bottom") => {
    const top = topScrollRef.current;
    const bottom = bottomScrollRef.current;
    if (!top || !bottom) {
      return;
    }
    if (source === "top") {
      bottom.scrollLeft = top.scrollLeft;
      return;
    }
    top.scrollLeft = bottom.scrollLeft;
  };

  return (
    <div className="table-scroll-shell">
      <div className="table-scrollbar-top" ref={topScrollRef} onScroll={() => syncScroll("top")}>
        <div style={{ width: `${scrollWidth}px` }} />
      </div>
      <div className="table-scrollbar-body" ref={bottomScrollRef} onScroll={() => syncScroll("bottom")}>
        <div ref={contentRef}>
          {props.children}
        </div>
      </div>
    </div>
  );
}

function ExpandableTextCell(props: {
  value?: string;
  emptyText?: string;
  compactRows?: 1 | 2 | 3;
}) {
  const [expanded, setExpanded] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const text = String(props.value || "").trim();
  if (!text) {
    return <span className="table-cell-empty">{props.emptyText || "-"}</span>;
  }

  useEffect(() => {
    if (!expanded) {
      return undefined;
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (shellRef.current?.contains(event.target as Node)) {
        return;
      }
      setExpanded(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [expanded]);

  return (
    <div ref={shellRef} className={`table-text-shell ${expanded ? "is-expanded" : ""}`} data-rows={props.compactRows || 2}>
      <button
        type="button"
        className="table-text-cell"
        data-rows={props.compactRows || 2}
        onClick={() => setExpanded((current) => !current)}
        title={expanded ? "点击收起" : "点击展开查看"}
      >
        {text}
      </button>
      {expanded ? (
        <div className="table-text-popover" role="dialog" aria-label="单元格完整内容">
          {text}
        </div>
      ) : null}
    </div>
  );
}

function AvatarPreviewLink(props: {
  src?: string;
  alt: string;
}) {
  if (!props.src) {
    return <span className="table-cell-empty">-</span>;
  }

  return (
    <a href={props.src} target="_blank" rel="noreferrer" className="table-avatar-link" title="点击查看原图">
      <img src={props.src} alt={props.alt} className="table-avatar-thumb" />
    </a>
  );
}

function CopyableCell(props: {
  value?: string | number;
  emptyText?: string;
}) {
  const text = String(props.value ?? "").trim();
  if (!text) {
    return <span className="table-cell-empty">{props.emptyText || "-"}</span>;
  }
  return (
    <ExpandableTextCell value={text} emptyText={props.emptyText} compactRows={1} />
  );
}

function formatDurationSeconds(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return `${Math.max(0, Math.round(value / 1000))} 秒`;
}

function formatOptionalCount(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return value.toLocaleString("zh-CN");
}

function DouyinVideoPreviewCell(props: {
  item: DouyinCollectedWorkRecord;
  onPreviewMedia: ValueAction<MediaPreviewState>;
}) {
  const { item } = props;
  if (item.videoUrl) {
    return (
      <a
        href={item.videoUrl}
        className="note-data-link"
        onClick={(event) => {
          event.preventDefault();
          void props.onPreviewMedia({
            url: item.videoUrl!,
            title: item.title || item.workId || "抖音视频预览",
            type: "VIDEO",
          });
        }}
      >
        打开预览
      </a>
    );
  }
  if (item.videoCacheStatus === "PENDING") {
    return <span className="note-data-link">缓存中</span>;
  }
  if (item.videoCacheStatus === "FAILED") {
    return <span className="note-data-link" title={item.videoCacheLastError || undefined}>缓存失败</span>;
  }
  if (item.videoCacheStatus === "EXPIRED") {
    return <span className="note-data-link">缓存已过期</span>;
  }
  return <span>-</span>;
}

function formatTrendSummary(trends: DouyinCityHotspotRecord["trends"]) {
  if (!trends.length) {
    return "-";
  }
  const latest = trends[trends.length - 1];
  return latest?.datetime
    ? `${trends.length} 个点，最新 ${latest.datetime}`
    : `${trends.length} 个点`;
}

function MaterialLibraryCheckbox(props: {
  checked: boolean;
  busy: boolean;
  title: string;
  onToggle: AsyncAction;
}) {
  return (
    <button
      type="button"
      className={`material-library-checkbox ${props.checked ? "is-checked" : ""}`}
      onClick={() => void props.onToggle()}
      disabled={props.busy}
      role="checkbox"
      aria-checked={props.checked}
      aria-label={props.title}
      title={props.busy ? "处理中..." : props.title}
    >
      <span className="material-library-checkbox__box" aria-hidden="true">
        <span className="material-library-checkbox__mark" />
      </span>
    </button>
  );
}

function DouyinAccountTable(props: {
  items: DouyinCollectedAccountRecord[];
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
}) {
  return (
    <ScrollableTableShell>
      <table className="soft-table douyin-data-table">
        <thead>
          <tr>
            <th>昵称</th>
            <th>抖音号</th>
            <th>简介</th>
            <th>头像</th>
            <th>粉丝数</th>
            <th>关注数</th>
            <th>作品数</th>
            <th>总获赞</th>
            <th>主页链接</th>
            <th>采集时间</th>
          </tr>
        </thead>
        <tbody>
          {props.items.map((item) => (
            <tr key={item.id}>
              <td>{item.accountName || "-"}</td>
              <td>{item.username || item.shortId || "-"}</td>
              <td className="table-cell-wide">
                <ExpandableTextCell value={item.description} emptyText="未提供简介" compactRows={2} />
              </td>
              <td>
                <AvatarPreviewLink src={item.avatar} alt={`${item.accountName || "抖音账号"}头像`} />
              </td>
              <td>{props.formatCount(item.fanCount)}</td>
              <td>{props.formatCount(item.followCount)}</td>
              <td>{props.formatCount(item.postedCount)}</td>
              <td>{props.formatCount(item.likedCount)}</td>
              <td>
                {item.accountLink ? (
                  <a href={item.accountLink} target="_blank" rel="noreferrer" className="note-data-link">
                    打开主页
                  </a>
                ) : "-"}
              </td>
              <td>{props.formatDateTime(item.collectedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollableTableShell>
  );
}

function DouyinBrandWorksTable(props: {
  items: DouyinCollectedWorkRecord[];
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
  onPreviewMedia: ValueAction<MediaPreviewState>;
}) {
  return (
    <ScrollableTableShell>
      <table className="soft-table douyin-data-table">
        <thead>
          <tr>
            <th>作品 ID</th>
            <th>作品描述/文案</th>
            <th>发布时间</th>
            <th>媒体类型</th>
            <th>时长</th>
            <th>点赞</th>
            <th>评论</th>
            <th>分享</th>
            <th>收藏</th>
            <th>推荐</th>
            <th>图文列表</th>
            <th>作品类型</th>
            <th>视频下载地址</th>
            <th>采集时间</th>
          </tr>
        </thead>
        <tbody>
          {props.items.map((item) => (
            <tr key={item.id}>
              <td><CopyableCell value={item.workId} /></td>
              <td className="table-cell-wide">
                <ExpandableTextCell value={item.description || item.title} emptyText="暂无作品描述" compactRows={2} />
              </td>
              <td>{item.publishTimeText || "-"}</td>
              <td>{item.mediaType ?? "-"}</td>
              <td>{formatDurationSeconds(item.durationMs)}</td>
              <td>{props.formatCount(item.likeCount)}</td>
              <td>{props.formatCount(item.commentCount)}</td>
              <td>{props.formatCount(item.shareCount)}</td>
              <td>{props.formatCount(item.collectCount)}</td>
              <td>{props.formatCount(item.recommendCount)}</td>
              <td>{item.imageList?.length ? `${item.imageList.length} 张` : "-"}</td>
              <td>{(item.awemeType ?? item.workType) || "-"}</td>
              <td><DouyinVideoPreviewCell item={item} onPreviewMedia={props.onPreviewMedia} /></td>
              <td>{props.formatDateTime(item.collectedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollableTableShell>
  );
}

function DouyinMaterialReadyWorksTable(props: {
  items: DouyinCollectedWorkRecord[];
  addingMaterialAssetId: string;
  onAddToMaterialLibrary: ValueAction<DouyinCollectedWorkRecord>;
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
  onPreviewMedia: ValueAction<MediaPreviewState>;
  showBillboardColumns?: boolean;
  showWorkUrlColumn?: boolean;
  videoColumnLabel?: string;
}) {
  const showBillboardColumns = props.showBillboardColumns ?? true;
  const showWorkUrlColumn = props.showWorkUrlColumn ?? false;
  const videoColumnLabel = props.videoColumnLabel || "视频地址";
  return (
    <ScrollableTableShell>
      <table className="soft-table douyin-data-table">
        <thead>
          <tr>
            <th>素材库</th>
            <th>作品 ID</th>
            <th>作品描述</th>
            {showBillboardColumns ? <th>来源榜单</th> : null}
            {showBillboardColumns ? <th>一级分类</th> : null}
            {showBillboardColumns ? <th>二级分类</th> : null}
            <th>作品时长</th>
            <th>作品封面</th>
            {showWorkUrlColumn ? <th>作品链接</th> : null}
            <th>{videoColumnLabel}</th>
            <th>作品点赞数</th>
            <th>作品评论数</th>
            <th>作品分享数</th>
            <th>作品收藏数</th>
            <th>作者昵称</th>
            <th>作者抖音号</th>
            <th>作者粉丝数</th>
            <th>作者总获赞</th>
            <th>作者头像</th>
            <th>播放量</th>
            <th>采集时间</th>
          </tr>
        </thead>
        <tbody>
          {props.items.map((item) => (
            <tr key={item.id}>
              <td>
                <MaterialLibraryCheckbox
                  checked={Boolean(item.isInMaterialLibrary)}
                  busy={props.addingMaterialAssetId === item.id}
                  title={item.isInMaterialLibrary ? "取消加入素材库" : "加入素材库"}
                  onToggle={() => props.onAddToMaterialLibrary(item)}
                />
              </td>
              <td><CopyableCell value={item.workId} /></td>
              <td className="table-cell-wide">
                <ExpandableTextCell value={item.description || item.title} emptyText="暂无作品描述" compactRows={2} />
              </td>
              {showBillboardColumns ? <td>{item.billboardLabel || "-"}</td> : null}
              {showBillboardColumns ? <td>{item.primaryTagLabel || "-"}</td> : null}
              {showBillboardColumns ? <td>{item.secondaryTagLabel || "-"}</td> : null}
              <td>{formatDurationSeconds(item.durationMs)}</td>
              <td>
                <AvatarPreviewLink src={item.coverUrl} alt={`${item.title || item.workId}封面`} />
              </td>
              {showWorkUrlColumn ? (
                <td>
                  {item.workUrl ? (
                    <a href={item.workUrl} target="_blank" rel="noreferrer" className="note-data-link">
                      打开作品
                    </a>
                  ) : "-"}
                </td>
              ) : null}
              <td><DouyinVideoPreviewCell item={item} onPreviewMedia={props.onPreviewMedia} /></td>
              <td>{props.formatCount(item.likeCount)}</td>
              <td>{props.formatCount(item.commentCount)}</td>
              <td>{props.formatCount(item.shareCount)}</td>
              <td>{props.formatCount(item.collectCount)}</td>
              <td className="table-cell-wide">
                <ExpandableTextCell value={item.authorName} emptyText="-" compactRows={2} />
              </td>
              <td><CopyableCell value={item.authorUniqueId} /></td>
              <td>{formatOptionalCount(item.authorFollowerCount)}</td>
              <td>{formatOptionalCount(item.authorLikedCount)}</td>
              <td>
                <AvatarPreviewLink src={item.authorAvatar} alt={`${item.authorName || "作者"}头像`} />
              </td>
              <td>{formatOptionalCount(item.playCount)}</td>
              <td>{props.formatDateTime(item.collectedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollableTableShell>
  );
}

function DouyinCityHotspotTable(props: {
  items: DouyinCityHotspotRecord[];
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
}) {
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(props.items.length / PAGE_SIZE));
  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    return props.items.slice(startIndex, startIndex + PAGE_SIZE);
  }, [page, props.items]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  useEffect(() => {
    setPage(1);
  }, [props.items.length]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="hotspot-list-tools" style={{ justifyContent: "space-between" }}>
        <span className="archive-pill status-ready">共 {props.items.length} 条</span>
        <span className="archive-pill status-pending">每页 20 行</span>
      </div>
      <ScrollableTableShell>
        <table className="soft-table douyin-data-table">
          <thead>
            <tr>
              <th>城市</th>
              <th>排名</th>
              <th>排名变化</th>
              <th>日期+时间</th>
              <th>热点词</th>
              <th>热度值</th>
              <th>相关视频数</th>
              <th>热点分类标签</th>
              <th>热点资料</th>
              <th>采集时间</th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.map((item) => (
              <tr key={item.id}>
                <td>{item.cityLabel || "-"}</td>
                <td>{item.rank || "-"}</td>
                <td>{item.rankDiff ?? "-"}</td>
                <td>{item.createAtText || "-"}</td>
                <td className="table-cell-wide">
                  <ExpandableTextCell value={item.sentence} emptyText="暂无热点词" compactRows={2} />
                </td>
                <td>{props.formatCount(item.hotScore)}</td>
                <td>{props.formatCount(item.videoCount)}</td>
                <td>{item.sentenceTag ?? "-"}</td>
                <td className="table-cell-wide">
                  <ExpandableTextCell
                    value={[
                      item.sentenceId ? `热点ID：${item.sentenceId}` : "",
                      item.cityCode ? `城市编码：${item.cityCode}` : "",
                      `趋势：${formatTrendSummary(item.trends)}`,
                    ].filter(Boolean).join("；")}
                    emptyText="-"
                    compactRows={2}
                  />
                </td>
                <td>{props.formatDateTime(item.collectedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollableTableShell>
      {props.items.length > PAGE_SIZE ? (
        <div className="note-pagination-bar hotspot-pagination-bar">
          <div className="note-pagination-summary">
            <span>第 {page} / {pageCount} 页</span>
            <span>当前显示 {paginatedItems.length} 条</span>
          </div>
          <div className="note-pagination-actions">
            <button
              type="button"
              className="note-inline-button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              上一页
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((currentPage) => (
              <button
                key={`city-hotspot-page-${currentPage}`}
                type="button"
                className={`note-page-button ${currentPage === page ? "is-active" : ""}`}
                onClick={() => setPage(currentPage)}
              >
                {currentPage}
              </button>
            ))}
            <button
              type="button"
              className="note-inline-button"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={page === pageCount}
            >
              下一页
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function XhsAccountTable(props: {
  items: XhsCollectedAccountRecord[];
  showAccountRole?: boolean;
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
}) {
  const showAccountRole = props.showAccountRole ?? false;
  return (
    <ScrollableTableShell>
      <table className="soft-table douyin-data-table">
        <thead>
          <tr>
            <th>昵称</th>
            {showAccountRole ? <th>账号类型</th> : null}
            <th>用户 ID</th>
            <th>简介</th>
            <th>头像</th>
            <th>粉丝数</th>
            <th>关注数</th>
            <th>作品数</th>
            <th>获赞数</th>
            <th>收藏数</th>
            <th>IP 属地</th>
            <th>主页链接</th>
            <th>采集时间</th>
          </tr>
        </thead>
        <tbody>
          {props.items.map((item) => (
            <tr key={item.id}>
              <td>{item.accountName || "-"}</td>
              {showAccountRole ? <td>{getXhsAccountRoleLabel(item.accountRole)}</td> : null}
              <td><CopyableCell value={item.externalUserId} /></td>
              <td className="table-cell-wide">
                <ExpandableTextCell value={item.description} emptyText="未提供简介" compactRows={2} />
              </td>
              <td>
                <AvatarPreviewLink src={item.avatar} alt={`${item.accountName || "小红书账号"}头像`} />
              </td>
              <td>{props.formatCount(item.fanCount)}</td>
              <td>{props.formatCount(item.followCount)}</td>
              <td>{props.formatCount(item.postedCount)}</td>
              <td>{props.formatCount(item.likedCount)}</td>
              <td>{props.formatCount(item.collectedCount)}</td>
              <td>{item.ipLocation || "-"}</td>
              <td>
                {item.sourceAccountLink ? (
                  <a href={item.sourceAccountLink} target="_blank" rel="noreferrer" className="note-data-link">
                    打开主页
                  </a>
                ) : "-"}
              </td>
              <td>{props.formatDateTime(item.collectedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollableTableShell>
  );
}

function XhsNoteMetricChip(props: {
  label: string;
  value: string;
}) {
  return (
    <div className="xhs-note-metric-chip">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function XhsNoteCard(props: {
  item: XhsCollectedNoteRecord;
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
  formatMetric?: OptionalNumberFormatter;
  onPreviewMedia: ValueAction<MediaPreviewState>;
  materialAction?: ReactNode;
  linkUrl?: string;
  showRatioMetrics?: boolean;
}) {
  const linkUrl = props.linkUrl || props.item.noteUrl || props.item.sourceUrl;
  const metrics = [
    { label: "点赞", value: props.formatCount(props.item.likeCount) },
    { label: "收藏", value: props.formatCount(props.item.collectCount) },
    { label: "分享", value: props.formatCount(props.item.shareCount) },
    { label: "评论", value: props.formatCount(props.item.commentCount) },
  ];
  if (props.showRatioMetrics && props.formatMetric) {
    metrics.push(
      { label: "赞藏率", value: props.formatMetric(props.item.likeCollectRatio) },
      { label: "赞评率", value: props.formatMetric(props.item.likeCommentRatio) },
      { label: "分享率", value: props.formatMetric(props.item.shareRatio) },
    );
  }

  return (
    <article className="xhs-note-card">
      <div className="xhs-note-card__content">
        <div className="xhs-note-card__header">
          <div className="xhs-note-card__title-block">
            <div className="xhs-note-card__chips">
              <span className="xhs-note-chip xhs-note-chip--strong">笔记 ID {props.item.noteId || "-"}</span>
              <span className="xhs-note-chip">{props.item.noteType || "未标注类型"}</span>
              <span className="xhs-note-chip">{props.item.nickname || "未提供作者"}</span>
              {props.item.externalUserId ? <span className="xhs-note-chip">用户 {props.item.externalUserId}</span> : null}
              {props.item.createdAtText ? <span className="xhs-note-chip">发布 {props.item.createdAtText}</span> : null}
            </div>
            <h4 className="xhs-note-card__title">{props.item.title || "未提供标题"}</h4>
            <div className="xhs-note-card__description">
              <ExpandableTextCell value={props.item.description} emptyText="暂无正文内容" compactRows={2} />
            </div>
          </div>
          <div className="xhs-note-card__actions">
            {props.materialAction}
            {linkUrl ? (
              <a href={linkUrl} target="_blank" rel="noreferrer" className="note-data-link">
                查看作品
              </a>
            ) : null}
            <span className="xhs-note-card__collected-at">
              采集于 {props.formatDateTime(props.item.collectedAt)}
            </span>
          </div>
        </div>
        <div className="xhs-note-metric-grid">
          {metrics.map((metric) => (
            <XhsNoteMetricChip key={`${props.item.id}-${metric.label}`} label={metric.label} value={metric.value} />
          ))}
        </div>
      </div>
      <aside className="xhs-note-card__media">
        <div className="xhs-note-card__media-block">
          <span className="xhs-note-card__media-label">图片</span>
          {props.item.imageList?.length ? (
            <ProtectedImageGallery
              sourceUrls={props.item.imageList}
              title={props.item.title || props.item.noteId}
              onPreviewMedia={props.onPreviewMedia}
            />
          ) : (
            <div className="note-empty-media">暂无图片</div>
          )}
        </div>
        <div className="xhs-note-card__media-block xhs-note-card__media-block--compact">
          <span className="xhs-note-card__media-label">视频</span>
          <div className="xhs-note-card__video-link">
            <ProtectedVideoLink
              sourceUrl={props.item.videoUrl}
              title={props.item.title || props.item.noteId || "视频预览"}
              onPreviewMedia={props.onPreviewMedia}
            />
          </div>
        </div>
      </aside>
    </article>
  );
}

function XhsNotesTable(props: {
  items: XhsCollectedNoteRecord[];
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
  onPreviewMedia: ValueAction<MediaPreviewState>;
}) {
  return (
    <div className="xhs-note-card-list">
      {props.items.map((item) => (
        <XhsNoteCard
          key={item.id}
          item={item}
          formatDateTime={props.formatDateTime}
          formatCount={props.formatCount}
          onPreviewMedia={props.onPreviewMedia}
        />
      ))}
    </div>
  );
}

function XhsBenchmarkNotesTable(props: {
  items: XhsCollectedNoteRecord[];
  addingMaterialAssetId: string;
  onAddToMaterialLibrary: ValueAction<string>;
  formatDateTime: OptionalDateFormatter;
  formatCount: OptionalNumberFormatter;
  formatMetric: OptionalNumberFormatter;
  onPreviewMedia: ValueAction<MediaPreviewState>;
}) {
  return (
    <div className="xhs-note-card-list">
      {props.items.map((item) => (
        <XhsNoteCard
          key={item.id}
          item={item}
          formatDateTime={props.formatDateTime}
          formatCount={props.formatCount}
          formatMetric={props.formatMetric}
          onPreviewMedia={props.onPreviewMedia}
          showRatioMetrics
          linkUrl={item.sourceUrl || item.noteUrl}
          materialAction={(
            <button
              type="button"
              className="note-inline-button"
              onClick={() => void props.onAddToMaterialLibrary(item.id)}
              disabled={props.addingMaterialAssetId === item.id || Boolean(item.isInMaterialLibrary)}
            >
              {item.isInMaterialLibrary
                ? "已加入素材库"
                : props.addingMaterialAssetId === item.id
                  ? "加入中..."
                  : "加入素材库"}
            </button>
          )}
        />
      ))}
    </div>
  );
}

export function BrandGrowthCollectionWorkspace(props: BrandGrowthCollectionWorkspaceProps) {
  const xiaohongshuSyncedCount =
    props.sortedBrandAccounts.length +
    props.sortedCompetitorAccounts.length +
    props.sortedBrandNotes.length +
    props.sortedBenchmarkNotes.length +
    props.sortedSearchNotes.length;
  const douyinSyncedCount =
    props.sortedDouyinBrandAccounts.length +
    props.sortedDouyinCompetitorAccounts.length +
    props.sortedDouyinBrandWorks.length +
    props.sortedDouyinCompetitorWorks.length +
    props.sortedDouyinBenchmarkWorks.length +
    props.sortedDouyinSearchWorks.length +
    props.sortedDouyinKeywordRecommendations.length +
    props.sortedDouyinLowFanExplosiveWorks.length +
    props.sortedDouyinHighCompletionRateWorks.length +
    props.sortedDouyinHighLikeRateWorks.length +
    props.sortedDouyinCityHotspots.length;
  const feishuConfigReady = Boolean(props.feishuAppConfig?.appId || props.feishuAppConfigForm.appId.trim());
  const feishuBindingReady = Boolean(props.feishuBinding?.wikiUrl || props.feishuBindingForm.wikiUrl.trim());
  const douyinContentTags = props.douyinWorkspace.contentTags ?? [];
  const douyinCityOptions = props.douyinWorkspace.cityOptions ?? [];
  const douyinPreviewItems =
    props.activeDouyinCollectionCard === "brandAccount"
      ? props.sortedDouyinBrandAccounts
      : props.activeDouyinCollectionCard === "competitorAccount"
        ? props.sortedDouyinCompetitorAccounts
        : props.activeDouyinCollectionCard === "brandWorks"
          ? props.sortedDouyinBrandWorks
          : props.activeDouyinCollectionCard === "competitorWorks"
            ? props.sortedDouyinCompetitorWorks
          : props.activeDouyinCollectionCard === "benchmarkWorks"
            ? props.sortedDouyinBenchmarkWorks
            : props.activeDouyinCollectionCard === "searchWorks"
              ? props.sortedDouyinSearchWorks
            : props.activeDouyinCollectionCard === "lowFanExplosiveWorks"
              ? props.sortedDouyinLowFanExplosiveWorks
              : props.activeDouyinCollectionCard === "highCompletionRateWorks"
                ? props.sortedDouyinHighCompletionRateWorks
                : props.sortedDouyinHighLikeRateWorks;
  if (props.activePage === "dailyHotspot") {
    return (
      <article className="workspace-panel strategy-page-card hotspot-page-card">
        <div className="strategy-card-toolbar">
          <div>
            <strong>{props.pageTitle}</strong>
            <p>{props.pageDescription}</p>
          </div>
          <div className="strategy-inline-actions">
            <button type="button" className="secondary-button" onClick={() => void props.onRefreshData()} disabled={props.isHydrating}>
              刷新数据
            </button>
          </div>
        </div>
        <CollectionPageStatus
          dataSource={props.dataSource}
          notice={props.notice}
          errorMessage={props.errorMessage}
          isHydrating={props.isHydrating}
        />
        <article className="light-data-panel hotspot-overview-panel">
          <div className="hotspot-panel-head">
            <div className="hotspot-panel-copy">
              <h3>{props.activeHotspotRecord?.title || "热搜榜"}</h3>
              <p>{props.activeHotspotRecord?.description || "这里展示每日热点搜索结果。"}</p>
              <span className="hotspot-auto-tip">每天 4:00 自动更新当天热搜榜</span>
            </div>
            <div className="hotspot-panel-actions">
              <label className="hotspot-date-picker">
                <span>查看日期</span>
                <select
                  value={props.selectedHotspotDate}
                  onChange={(event) => void props.onDailyHotspotDateChange(event.target.value)}
                  disabled={props.isSyncingDailyHotspots || !props.hotspotAvailableDates.length}
                >
                  {props.hotspotAvailableDates.map((date) => (
                    <option key={date} value={date}>
                      {props.formatDateLabel(date)}
                    </option>
                  ))}
                </select>
              </label>
              <span
                className={`archive-pill ${
                  props.activeHotspotRecord?.syncStatus === "SUCCESS"
                    ? "status-ready"
                    : props.activeHotspotRecord?.syncStatus === "FAILED"
                      ? "status-pending"
                      : "status-in_progress"
                }`}
              >
                {props.activeHotspotRecord?.syncStatus || "IDLE"}
              </span>
              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  void props.onSyncDailyHotspots(props.activeHotspotRecord ? [props.activeHotspotRecord.title] : undefined)
                }
                disabled={props.isSyncingDailyHotspots}
              >
                {props.isSyncingDailyHotspots ? "搜索中..." : "手动搜索"}
              </button>
            </div>
          </div>

          {props.activeHotspotRecord?.lastError ? (
            <div className="hotspot-error-banner">
              <strong>最近一次搜索失败</strong>
              <p>{props.activeHotspotRecord.lastError}</p>
            </div>
          ) : null}
        </article>

        <article className="light-data-panel">
          <div className="hotspot-list-head">
            <h3>热点榜单</h3>
            <div className="hotspot-list-tools">
              <span className="archive-pill status-ready">共 {props.sortedHotspotItems.length} 条</span>
              <label className="note-page-size-picker hotspot-page-size-picker">
                <span>每页</span>
                <select
                  value={props.hotspotPageSize}
                  onChange={(event) => props.setHotspotPageSize(Number(event.target.value))}
                >
                  {[10, 20].map((size) => (
                    <option key={`hotspot-page-size-${size}`} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <span>条</span>
              </label>
            </div>
          </div>
          <div className="hotspot-ranking-list">
            {props.sortedHotspotItems.length ? (
              props.paginatedHotspotItems.map((item) => (
                <article key={item.id} className="hotspot-ranking-card">
                  <div className="hotspot-ranking-rank">#{item.rank}</div>
                  <div className="hotspot-ranking-body">
                    <strong>{item.title}</strong>
                    <div className="hotspot-ranking-meta">
                      <span>热度 {props.formatHotspotHeat(item.hot)}</span>
                      <span>
                        时间{" "}
                        {props.formatDateTime(
                          item.timestamp
                            ? new Date(item.timestamp).toISOString()
                            : props.activeHotspotRecord?.updateTime || props.activeHotspotRecord?.collectedAt,
                        )}
                      </span>
                    </div>
                  </div>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer" className="table-link-pill">
                      查看源链接
                    </a>
                  ) : (
                    <span className="archive-pill status-pending">无直达链接</span>
                  )}
                </article>
              ))
            ) : (
              <div className="empty-state">
                当前榜单还没有可展示的热点条目。若刚执行过搜索但仍为空，通常表示接口权限不足或返回结构为空。
              </div>
            )}
          </div>
          {props.sortedHotspotItems.length ? (
            <div className="note-pagination-bar hotspot-pagination-bar">
              <div className="note-pagination-summary">
                <span>
                  第 {props.hotspotPage} / {props.hotspotPageCount} 页
                </span>
                <span>当前显示 {props.paginatedHotspotItems.length} 条</span>
              </div>
              <div className="note-pagination-actions">
                <button
                  type="button"
                  className="note-inline-button"
                  onClick={() => props.setHotspotPage((current) => Math.max(1, current - 1))}
                  disabled={props.hotspotPage === 1}
                >
                  上一页
                </button>
                {Array.from({ length: props.hotspotPageCount }, (_, index) => index + 1).map((page) => (
                  <button
                    key={`hotspot-page-${page}`}
                    type="button"
                    className={`note-page-button ${page === props.hotspotPage ? "is-active" : ""}`}
                    onClick={() => props.setHotspotPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  className="note-inline-button"
                  onClick={() => props.setHotspotPage((current) => Math.min(props.hotspotPageCount, current + 1))}
                  disabled={props.hotspotPage === props.hotspotPageCount}
                >
                  下一页
                </button>
              </div>
            </div>
          ) : null}
        </article>
      </article>
    );
  }

  return (
    <div className="strategy-collection-stack">
      {props.activePage === "feishuCollection" ? (
        <article className="workspace-panel strategy-page-card feishu-binding-panel">
          <div className="strategy-card-toolbar">
            <div>
              <strong>{props.pageTitle}</strong>
              <p>{props.pageDescription}</p>
            </div>
            <div className="strategy-inline-actions">
              <button type="button" className="secondary-button" onClick={() => void props.onRefreshData()} disabled={props.isHydrating}>
                刷新数据
              </button>
              <a href={props.templateUrl} target="_blank" rel="noreferrer" className="secondary-button">
                打开飞书模板
              </a>
            </div>
          </div>
          <CollectionPageStatus
            dataSource={props.dataSource}
            notice={props.notice}
            errorMessage={props.errorMessage}
            isHydrating={props.isHydrating}
          />
          <div className="strategy-chip-row">
            <span className={`archive-pill ${feishuConfigReady ? "status-ready" : "status-pending"}`}>
              {feishuConfigReady ? "应用已配置" : "待配置应用"}
            </span>
            <span className={`archive-pill ${props.feishuAuthStatus?.connected ? "status-ready" : "status-pending"}`}>
              {props.feishuAuthStatus?.connected ? "飞书已连接" : "待连接飞书"}
            </span>
            <span className={`archive-pill ${feishuBindingReady ? "status-ready" : "status-pending"}`}>
              {feishuBindingReady ? "副本已绑定" : "待绑定副本"}
            </span>
            <span className={`archive-pill ${props.canSyncFeishuWorkspace ? "status-ready" : "status-pending"}`}>
              {props.canSyncFeishuWorkspace ? "可执行同步" : "待完成同步前置"}
            </span>
          </div>
          <div className="feishu-compact-steps">
            <span>01 配置应用</span>
            <span>02 连接飞书</span>
            <span>03 绑定副本</span>
            <span>04 同步数据</span>
          </div>
          <div className="form-grid two-column">
            <label className="field">
              <span>App ID</span>
              <input
                value={props.feishuAppConfigForm.appId}
                onChange={(event) =>
                  props.setFeishuAppConfigForm((current) => ({ ...current, appId: event.target.value }))
                }
                placeholder="请输入当前用户自己的飞书 App ID"
              />
            </label>
            <label className="field">
              <span>App Secret</span>
              <input
                type="password"
                value={props.feishuAppConfigForm.appSecret}
                onChange={(event) =>
                  props.setFeishuAppConfigForm((current) => ({ ...current, appSecret: event.target.value }))
                }
                placeholder={props.feishuAppConfig?.appSecretMasked || "请输入当前用户自己的飞书 App Secret"}
              />
            </label>
            <label className="field field-full">
              <span>授权回调地址</span>
              <input
                value={props.feishuAppConfigForm.redirectUri}
                onChange={(event) =>
                  props.setFeishuAppConfigForm((current) => ({ ...current, redirectUri: event.target.value }))
                }
                placeholder="例如 https://17ai.site/api/auth/feishu/oauth/callback"
              />
            </label>
            <label className="field field-full">
              <span>授权 Scope</span>
              <input
                value={props.feishuAppConfigForm.scope}
                onChange={(event) =>
                  props.setFeishuAppConfigForm((current) => ({ ...current, scope: event.target.value }))
                }
                placeholder="默认会自动填入读取 Base/Wiki 所需 scope"
              />
            </label>
            <label className="field field-full">
              <span>飞书多维表格链接</span>
              <input
                value={props.feishuBindingForm.wikiUrl}
                onChange={(event) =>
                  props.setFeishuBindingForm((current) => ({ ...current, wikiUrl: event.target.value }))
                }
                placeholder="粘贴飞书 wiki 或多维表格副本链接，例如 https://.../wiki/... 或 https://.../base/..."
              />
            </label>
          </div>
          <div className="feishu-binding-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => void props.onSaveFeishuAppConfig()}
              disabled={props.isHydrating || props.isSavingFeishuAppConfig}
            >
              {props.isSavingFeishuAppConfig ? "保存中..." : "保存应用配置"}
            </button>
            <button type="button" className="secondary-button" onClick={() => void props.onStartFeishuAuth()}>
              {props.feishuAuthStatus?.connected ? "更换飞书账号" : "连接飞书"}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void props.onSaveFeishuBinding()}
              disabled={props.isHydrating || props.isSavingFeishuBinding}
            >
              {props.isSavingFeishuBinding ? "绑定中..." : "保存绑定"}
            </button>
          </div>
        </article>
      ) : null}

      {props.activePage === "xiaohongshuCollection" ? (
        <article className="workspace-panel strategy-page-card strategy-collection-page-card">
          <div className="strategy-card-toolbar">
            <div>
              <strong>{props.pageTitle}</strong>
              <p>直接通过 Tikhub 提取品牌账号、竞品账号、品牌作品、对标作品与搜索笔记结果。</p>
            </div>
            <div className="strategy-inline-actions">
              <button type="button" className="secondary-button" onClick={() => void props.onRefreshData()} disabled={props.isHydrating}>
                刷新数据
              </button>
            </div>
          </div>
          <CollectionPageStatus
            dataSource={props.dataSource}
            notice={props.notice}
            errorMessage={props.errorMessage}
            isHydrating={props.isHydrating}
          />
          <div className="strategy-chip-row">
            <span className="archive-pill status-ready">数据源：Tikhub</span>
            <span className={`archive-pill ${xiaohongshuSyncedCount ? "status-ready" : "status-pending"}`}>
              已同步 {xiaohongshuSyncedCount} 条
            </span>
          </div>
          <div className="strategy-chip-row">
            {xiaohongshuCollectionCards.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`filter-chip ${props.activeXhsCollectionCard === item.key ? "is-active" : ""}`}
                onClick={() => props.onXhsCollectionCardChange(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {props.activeXhsCollectionCard === "brandAccount" ? (
            <>
              <XhsAccountBindingSubmitPanel
                title="品牌账号信息"
                description="按账号逐条维护采集入口，支持区分品牌号、员工号和达人号，并在行内直接提交更新。"
                modalTitle="添加品牌账号"
                modalDescription="先选择账号类型，再输入小红书主页链接、分享链接或 user_id。"
                emptyDescription="右上角点击“添加账号”后，按账号类型逐条保存；保存后每个账号会单独展示并可直接提交采集。"
                target="brand"
                enableRoleSelection
                entries={props.xhsSyncForm.brandAccountEntries}
                syncedAccounts={props.sortedBrandAccounts}
                isSubmitting={props.isHydrating || props.isSyncingXhsWorkspace}
                onChangeEntries={(entries) => props.setXhsSyncForm((current) => ({ ...current, brandAccountEntries: entries }))}
                onSubmitEntry={props.onSyncSingleXhsBrandAccount}
              />
              <article className="light-data-panel">
                <div className="collection-result-head">
                  <div>
                    <h3>品牌账号信息</h3>
                    <p>调用 Tikhub 用户信息接口获取品牌账号画像。</p>
                  </div>
                  <span className={`archive-pill ${props.sortedBrandAccounts.length ? "status-ready" : "status-pending"}`}>
                    已同步 {props.sortedBrandAccounts.length} 条
                  </span>
                </div>
                {props.sortedBrandAccounts.length ? (
                  <XhsAccountTable
                    items={props.sortedBrandAccounts}
                    showAccountRole
                    formatDateTime={props.formatDateTime}
                    formatCount={props.formatCount}
                  />
                ) : (
                  <div className="note-empty-state">当前还没有品牌账号结果，先添加账号并点击对应行的提交按钮。</div>
                )}
              </article>
            </>
          ) : null}
          {props.activeXhsCollectionCard === "competitorAccount" ? (
            <>
              <XhsAccountBindingSubmitPanel
                title="竞品账号信息"
                description="按账号逐条绑定竞品采集入口，可同时维护多个竞品账号，并在行内直接提交覆盖更新。"
                modalTitle="添加竞品账号"
                modalDescription="输入小红书主页链接、分享链接或 user_id，保存后可逐条提交采集。"
                emptyDescription="右上角点击“添加账号”后，逐条保存竞品账号；保存后每个账号会单独展示并可直接提交采集。"
                target="competitor"
                entries={props.xhsSyncForm.competitorAccountEntries}
                syncedAccounts={props.sortedCompetitorAccounts}
                isSubmitting={props.isHydrating || props.isSyncingXhsWorkspace}
                onChangeEntries={(entries) => props.setXhsSyncForm((current) => ({ ...current, competitorAccountEntries: entries }))}
                onSubmitEntry={props.onSyncSingleXhsCompetitorAccount}
              />
              <article className="light-data-panel">
                <div className="collection-result-head">
                  <div>
                    <h3>竞品账号信息</h3>
                    <p>调用 Tikhub 用户信息接口获取竞品账号画像。</p>
                  </div>
                  <span className={`archive-pill ${props.sortedCompetitorAccounts.length ? "status-ready" : "status-pending"}`}>
                    已同步 {props.sortedCompetitorAccounts.length} 条
                  </span>
                </div>
                {props.sortedCompetitorAccounts.length ? (
                  <XhsAccountTable
                    items={props.sortedCompetitorAccounts}
                    formatDateTime={props.formatDateTime}
                    formatCount={props.formatCount}
                  />
                ) : (
                  <div className="note-empty-state">当前还没有竞品账号结果，先添加账号并点击对应行的提交按钮。</div>
                )}
              </article>
            </>
          ) : null}
          {props.activeXhsCollectionCard === "brandWorks" ? (
            <>
              <article className="light-data-panel xhs-account-builder" style={{ marginBottom: 16 }}>
                <div className="collection-result-head">
                  <div>
                    <h3>品牌作品信息及数据</h3>
                    <p>直接复用“品牌账号信息”里已绑定的品牌账号，点击提交后按这些账号拉取作品并更新下面列表。</p>
                  </div>
                  <div className="strategy-inline-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void props.onSyncAllXhsBrandAccounts()}
                      disabled={props.isHydrating || props.isSyncingXhsWorkspace || !props.xhsSyncForm.brandAccountEntries.length}
                    >
                      {props.isHydrating || props.isSyncingXhsWorkspace ? "同步中..." : "同步品牌账号信息"}
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void props.onSyncXhsWorkspace()}
                      disabled={props.isHydrating || props.isSyncingXhsWorkspace || !props.xhsSyncForm.brandAccountEntries.length}
                    >
                      {props.isHydrating || props.isSyncingXhsWorkspace ? "提交中..." : "提交"}
                    </button>
                  </div>
                </div>
                {props.xhsSyncForm.brandAccountEntries.length ? (
                  <div className="xhs-account-entry-list">
                    {props.xhsSyncForm.brandAccountEntries.map((entry) => (
                      <div key={`brand-work-source-${entry.id}`} className="xhs-account-entry-row">
                        <div className="xhs-account-entry-row__body">
                          <div className="xhs-account-entry-row__meta">
                            {entry.accountRole ? (
                              <span className="xhs-account-role-badge">{getXhsAccountRoleLabel(entry.accountRole)}</span>
                            ) : null}
                            <span className="archive-pill status-ready">作品采集来源</span>
                          </div>
                          <strong>{entry.locator}</strong>
                        </div>
                        <div className="xhs-account-entry-row__actions">
                          <button
                            type="button"
                            className="note-inline-button"
                            onClick={() => props.setXhsSyncForm((current) => ({
                              ...current,
                              brandAccountEntries: current.brandAccountEntries.filter((item) => item.id !== entry.id),
                            }))}
                            disabled={props.isHydrating || props.isSyncingXhsWorkspace}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="xhs-account-entry-empty">
                    先在“品牌账号信息”里绑定至少一个品牌账号，品牌作品采集会自动复用这些账号。
                  </div>
                )}
              </article>
              <article className="light-data-panel">
                <div className="collection-result-head">
                  <div>
                    <h3>品牌作品信息及数据</h3>
                    <p>调用 Tikhub 作者作品接口，按列表形式展示品牌账号下的作品及基础数据。</p>
                  </div>
                  <span className={`archive-pill ${props.sortedBrandNotes.length ? "status-ready" : "status-pending"}`}>
                    已同步 {props.sortedBrandNotes.length} 条
                  </span>
                </div>
                {props.sortedBrandNotes.length ? (
                  <XhsNotesTable
                    items={props.paginatedBrandNotes}
                    formatDateTime={props.formatDateTime}
                    formatCount={props.formatCount}
                    onPreviewMedia={props.onPreviewMedia}
                  />
                ) : (
                  <div className="note-empty-state">当前还没有品牌作品结果，先在品牌账号信息里绑定账号，再点击这里的提交按钮。</div>
                )}
                {props.sortedBrandNotes.length ? (
                  <div className="note-pagination-bar">
                    <div className="note-pagination-summary">
                      <span>共 {props.sortedBrandNotes.length} 条</span>
                      <span>
                        第 {props.brandNotesPage} / {props.brandNotesPageCount} 页
                      </span>
                    </div>
                    <div className="note-pagination-actions">
                      <button
                        type="button"
                        className="note-inline-button"
                        onClick={() => props.setBrandNotesPage((current) => Math.max(1, current - 1))}
                        disabled={props.brandNotesPage === 1}
                      >
                        上一页
                      </button>
                      {Array.from({ length: props.brandNotesPageCount }, (_, index) => index + 1).map((page) => (
                        <button
                          key={`brand-note-page-${page}`}
                          type="button"
                          className={`note-page-button ${page === props.brandNotesPage ? "is-active" : ""}`}
                          onClick={() => props.setBrandNotesPage(page)}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="note-inline-button"
                        onClick={() => props.setBrandNotesPage((current) => Math.min(props.brandNotesPageCount, current + 1))}
                        disabled={props.brandNotesPage === props.brandNotesPageCount}
                      >
                        下一页
                      </button>
                      <label className="note-page-size-picker">
                        <span>每页</span>
                        <select
                          value={props.brandNotesPageSize}
                          onChange={(event) => props.setBrandNotesPageSize(Number(event.target.value))}
                        >
                          {[10, 20, 30, 50].map((size) => (
                            <option key={`page-size-${size}`} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                        <span>个</span>
                      </label>
                    </div>
                  </div>
                ) : null}
              </article>
            </>
          ) : null}
          {props.activeXhsCollectionCard === "benchmarkWorks" ? (
            <>
              <DouyinSubmitPanel
                title="对标作品信息及数据"
                value={props.xhsSyncForm.benchmarkNoteLocators}
                onChange={(value) => props.setXhsSyncForm((current) => ({ ...current, benchmarkNoteLocators: value }))}
                placeholder="每行一个小红书作品链接、分享链接或 note_id"
                isSubmitting={props.isHydrating || props.isSyncingXhsWorkspace}
                onSubmit={props.onSyncXhsWorkspace}
              />
              <article className="light-data-panel">
                <div className="collection-result-head">
                  <div>
                    <h3>对标作品信息及数据</h3>
                    <p>调用 Tikhub 作品详情接口获取单条作品的详情与互动数据。</p>
                  </div>
                  <span className={`archive-pill ${props.sortedBenchmarkNotes.length ? "status-ready" : "status-pending"}`}>
                    已同步 {props.sortedBenchmarkNotes.length} 条
                  </span>
                </div>
                {props.sortedBenchmarkNotes.length ? (
                  <XhsBenchmarkNotesTable
                    items={props.sortedBenchmarkNotes}
                    addingMaterialAssetId={props.addingMaterialAssetId}
                    onAddToMaterialLibrary={props.onAddBenchmarkNoteToMaterial}
                    formatDateTime={props.formatDateTime}
                    formatCount={props.formatCount}
                    formatMetric={props.formatMetric}
                    onPreviewMedia={props.onPreviewMedia}
                  />
                ) : (
                  <div className="note-empty-state">当前还没有对标作品结果，先提交作品链接或 note_id。</div>
                )}
              </article>
            </>
          ) : null}
          {props.activeXhsCollectionCard === "searchNotes" ? (
            <>
              <article className="light-data-panel" style={{ marginBottom: 16 }}>
                <div className="collection-result-head">
                  <div>
                    <h3>搜索笔记</h3>
                    <p>调用 Tikhub 搜索笔记接口，按关键词检索小红书笔记，左侧素材库按钮可直接同步到小红书素材库。</p>
                  </div>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void props.onSyncXhsSearchNotes()}
                    disabled={props.isHydrating || props.isSyncingXhsWorkspace}
                  >
                    {props.isHydrating || props.isSyncingXhsWorkspace ? "提交中..." : "提交"}
                  </button>
                </div>
                <label className="field">
                  <span>搜索关键词</span>
                  <input
                    value={props.xhsSyncForm.searchKeyword}
                    onChange={(event) => props.setXhsSyncForm((current) => ({ ...current, searchKeyword: event.target.value }))}
                    placeholder="请输入笔记关键词，例如 咖啡店探店、夏日穿搭、烘焙教程"
                  />
                </label>
              </article>
              <article className="light-data-panel">
                <div className="collection-result-head">
                  <div>
                    <h3>搜索笔记结果</h3>
                    <p>调用 Tikhub 搜索笔记接口，结果结构与对标作品列表保持一致，可直接加入小红书素材库。</p>
                  </div>
                  <span className={`archive-pill ${props.sortedSearchNotes.length ? "status-ready" : "status-pending"}`}>
                    已同步 {props.sortedSearchNotes.length} 条
                  </span>
                </div>
                {props.sortedSearchNotes.length ? (
                  <XhsBenchmarkNotesTable
                    items={props.sortedSearchNotes}
                    addingMaterialAssetId={props.addingMaterialAssetId}
                    onAddToMaterialLibrary={props.onAddBenchmarkNoteToMaterial}
                    formatDateTime={props.formatDateTime}
                    formatCount={props.formatCount}
                    formatMetric={props.formatMetric}
                    onPreviewMedia={props.onPreviewMedia}
                  />
                ) : (
                  <div className="note-empty-state">当前还没有搜索笔记结果，先输入关键词并提交。</div>
                )}
              </article>
            </>
          ) : null}
        </article>
      ) : null}

      {props.activePage === "douyinCollection" ? (
        <article className="workspace-panel strategy-page-card strategy-collection-page-card">
          <div className="strategy-card-toolbar">
            <div>
              <strong>{props.pageTitle}</strong>
              <p>对标作品保留手动输入，新增 3 个垂类榜单和 1 个按城市采集的同城热点榜，结果按各自结构展示。</p>
            </div>
            <div className="strategy-inline-actions">
              <button type="button" className="secondary-button" onClick={() => void props.onRefreshData()} disabled={props.isHydrating}>
                刷新数据
              </button>
            </div>
          </div>
          <CollectionPageStatus
            dataSource={props.dataSource}
            notice={props.notice}
            errorMessage={props.errorMessage}
            isHydrating={props.isHydrating}
          />
          <div className="strategy-chip-row">
            <span className="archive-pill status-ready">数据源：Tikhub</span>
            <span className="archive-pill status-ready">播放量：统计接口补丁</span>
            <span className={`archive-pill ${douyinContentTags.length ? "status-ready" : "status-pending"}`}>
              {douyinContentTags.length ? `垂类标签 ${douyinContentTags.length} 组` : "垂类标签待加载"}
            </span>
            <span className={`archive-pill ${douyinCityOptions.length ? "status-ready" : "status-pending"}`}>
              {douyinCityOptions.length ? `城市列表 ${douyinCityOptions.length} 个` : "城市列表待加载"}
            </span>
            <span className={`archive-pill ${douyinSyncedCount ? "status-ready" : "status-pending"}`}>
              已同步 {douyinSyncedCount} 条
            </span>
          </div>
          <div className="strategy-chip-row">
            {douyinCollectionCards.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`filter-chip ${props.activeDouyinCollectionCard === item.key ? "is-active" : ""}`}
                onClick={() => props.onDouyinCollectionCardChange(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {props.activeDouyinCollectionCard === "brandAccount" ? (
            <>
              <DouyinAccountBindingSubmitPanel
                title="品牌账号信息"
                description="按账号逐条维护抖音品牌号入口，支持区分品牌号、员工号和达人号，并逐行提交更新。"
                modalTitle="添加品牌抖音账号"
                modalDescription="先选择账号类型，再录入主页链接、分享链接、sec_uid 或抖音号，保存后进入账号绑定列表。"
                emptyDescription="当前还没有添加品牌账号，请先点击右上角添加账号。"
                target="brand"
                enableRoleSelection
                entries={props.douyinSyncForm.brandAccountEntries}
                syncedAccounts={props.sortedDouyinBrandAccounts}
                isSubmitting={props.isHydrating || props.isSyncingDouyinWorkspace}
                onChangeEntries={(entries) => props.setDouyinSyncForm((current) => ({ ...current, brandAccountEntries: entries }))}
                onSubmitEntry={props.onSyncSingleDouyinBrandAccount}
              />
              <article className="light-data-panel">
                <div className="collection-result-head">
                  <div>
                    <h3>品牌账号信息</h3>
                  </div>
                </div>
                {douyinPreviewItems.length ? (
                  <DouyinAccountTable
                    items={douyinPreviewItems as DouyinCollectedAccountRecord[]}
                    formatDateTime={props.formatDateTime}
                    formatCount={props.formatCount}
                  />
                ) : (
                  <div className="note-empty-state">当前还没有采集到品牌账号信息，请先添加品牌抖音账号并提交。</div>
                )}
              </article>
            </>
          ) : null}
          {props.activeDouyinCollectionCard === "competitorAccount" ? (
            <>
              <DouyinAccountBindingSubmitPanel
                title="竞品账号信息"
                description="按账号逐条维护竞品抖音账号入口，支持绑定多个竞品账号，并按行提交更新。"
                modalTitle="添加竞品抖音账号"
                modalDescription="录入竞品账号主页链接、分享链接、sec_uid 或抖音号，保存后进入账号绑定列表。"
                emptyDescription="当前还没有添加竞品账号，请先点击右上角添加账号。"
                target="competitor"
                entries={props.douyinSyncForm.competitorAccountEntries}
                syncedAccounts={props.sortedDouyinCompetitorAccounts}
                isSubmitting={props.isHydrating || props.isSyncingDouyinWorkspace}
                onChangeEntries={(entries) => props.setDouyinSyncForm((current) => ({ ...current, competitorAccountEntries: entries }))}
                onSubmitEntry={props.onSyncSingleDouyinCompetitorAccount}
              />
              <article className="light-data-panel">
                <div className="collection-result-head">
                  <div>
                    <h3>竞品账号信息</h3>
                  </div>
                </div>
                {douyinPreviewItems.length ? (
                  <DouyinAccountTable
                    items={douyinPreviewItems as DouyinCollectedAccountRecord[]}
                    formatDateTime={props.formatDateTime}
                    formatCount={props.formatCount}
                  />
                ) : (
                  <div className="note-empty-state">当前还没有采集到竞品账号信息，请先添加竞品抖音账号并提交。</div>
                )}
              </article>
            </>
          ) : null}
          {props.activeDouyinCollectionCard === "brandWorks" ? (
            <>
              <article className="light-data-panel xhs-account-builder" style={{ marginBottom: 16 }}>
                <div className="collection-result-head">
                  <div>
                    <h3>品牌作品信息及数据</h3>
                    <p>直接复用“品牌账号信息”里已绑定的抖音品牌账号，先同步账号信息，再提交拉取这些账号下的品牌作品。</p>
                  </div>
                  <div className="strategy-inline-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void props.onSyncAllDouyinBrandAccounts()}
                      disabled={props.isHydrating || props.isSyncingDouyinWorkspace || !props.douyinSyncForm.brandAccountEntries.length}
                    >
                      {props.isHydrating || props.isSyncingDouyinWorkspace ? "同步中..." : "同步品牌账号信息"}
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void props.onSyncDouyinWorkspace()}
                      disabled={props.isHydrating || props.isSyncingDouyinWorkspace || !props.douyinSyncForm.brandAccountEntries.length}
                    >
                      {props.isHydrating || props.isSyncingDouyinWorkspace ? "提交中..." : "提交"}
                    </button>
                  </div>
                </div>
                {props.douyinSyncForm.brandAccountEntries.length ? (
                  <div className="xhs-account-entry-list">
                    {props.douyinSyncForm.brandAccountEntries.map((entry) => {
                      const hasSyncedResult = props.sortedDouyinBrandAccounts.some((item) => doesDouyinAccountMatchEntry(item, entry));
                      return (
                        <div key={`douyin-brand-work-source-${entry.id}`} className="xhs-account-entry-row">
                          <div className="xhs-account-entry-row__body">
                            <div className="xhs-account-entry-row__meta">
                              {entry.accountRole ? (
                                <span className="xhs-account-role-badge">{getXhsAccountRoleLabel(entry.accountRole)}</span>
                              ) : null}
                              <span className={`archive-pill ${hasSyncedResult ? "status-ready" : "status-pending"}`}>
                                {hasSyncedResult ? "作品源已就绪" : "待同步账号"}
                              </span>
                            </div>
                            <strong>{entry.locator}</strong>
                          </div>
                          <div className="xhs-account-entry-row__actions">
                            <button
                              type="button"
                              className="note-inline-button"
                              onClick={() => props.setDouyinSyncForm((current) => ({
                                ...current,
                                brandAccountEntries: current.brandAccountEntries.filter((item) => item.id !== entry.id),
                              }))}
                              disabled={props.isHydrating || props.isSyncingDouyinWorkspace}
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="xhs-account-entry-empty">
                    当前还没有绑定品牌抖音账号，请先到“品牌账号信息”里添加账号。
                  </div>
                )}
              </article>
              <article className="light-data-panel">
                <div className="collection-result-head">
                  <div>
                    <h3>品牌作品信息及数据</h3>
                  </div>
                </div>
                {douyinPreviewItems.length ? (
                  <DouyinBrandWorksTable
                    items={douyinPreviewItems as DouyinCollectedWorkRecord[]}
                    formatDateTime={props.formatDateTime}
                    formatCount={props.formatCount}
                    onPreviewMedia={props.onPreviewMedia}
                  />
                ) : (
                  <div className="note-empty-state">当前还没有采集到品牌作品信息，请先同步品牌账号信息后再提交。</div>
                )}
              </article>
            </>
          ) : null}
          {props.activeDouyinCollectionCard === "competitorWorks" ? (
            <>
              <article className="light-data-panel xhs-account-builder" style={{ marginBottom: 16 }}>
                <div className="collection-result-head">
                  <div>
                    <h3>竞品作品信息及数据</h3>
                    <p>直接复用“竞品账号信息”里已绑定的抖音竞品账号，先同步竞品账号信息，再提交拉取这些账号下的竞品作品。</p>
                  </div>
                  <div className="strategy-inline-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void props.onSyncAllDouyinCompetitorAccounts()}
                      disabled={props.isHydrating || props.isSyncingDouyinWorkspace || !props.douyinSyncForm.competitorAccountEntries.length}
                    >
                      {props.isHydrating || props.isSyncingDouyinWorkspace ? "同步中..." : "同步竞品账号信息"}
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void props.onSyncDouyinWorkspace()}
                      disabled={props.isHydrating || props.isSyncingDouyinWorkspace || !props.douyinSyncForm.competitorAccountEntries.length}
                    >
                      {props.isHydrating || props.isSyncingDouyinWorkspace ? "提交中..." : "提交"}
                    </button>
                  </div>
                </div>
                {props.douyinSyncForm.competitorAccountEntries.length ? (
                  <div className="xhs-account-entry-list">
                    {props.douyinSyncForm.competitorAccountEntries.map((entry) => {
                      const hasSyncedResult = props.sortedDouyinCompetitorAccounts.some((item) => doesDouyinAccountMatchEntry(item, entry));
                      return (
                        <div key={`douyin-competitor-work-source-${entry.id}`} className="xhs-account-entry-row">
                          <div className="xhs-account-entry-row__body">
                            <div className="xhs-account-entry-row__meta">
                              <span className={`archive-pill ${hasSyncedResult ? "status-ready" : "status-pending"}`}>
                                {hasSyncedResult ? "作品源已就绪" : "待同步账号"}
                              </span>
                            </div>
                            <strong>{entry.locator}</strong>
                          </div>
                          <div className="xhs-account-entry-row__actions">
                            <button
                              type="button"
                              className="note-inline-button"
                              onClick={() => props.setDouyinSyncForm((current) => ({
                                ...current,
                                competitorAccountEntries: current.competitorAccountEntries.filter((item) => item.id !== entry.id),
                              }))}
                              disabled={props.isHydrating || props.isSyncingDouyinWorkspace}
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="xhs-account-entry-empty">
                    当前还没有绑定竞品抖音账号，请先到“竞品账号信息”里添加账号。
                  </div>
                )}
              </article>
              <article className="light-data-panel">
                <div className="collection-result-head">
                  <div>
                    <h3>竞品作品信息及数据</h3>
                  </div>
                </div>
                {douyinPreviewItems.length ? (
                  <DouyinBrandWorksTable
                    items={douyinPreviewItems as DouyinCollectedWorkRecord[]}
                    formatDateTime={props.formatDateTime}
                    formatCount={props.formatCount}
                    onPreviewMedia={props.onPreviewMedia}
                  />
                ) : (
                  <div className="note-empty-state">当前还没有采集到竞品作品信息，请先同步竞品账号信息后再提交。</div>
                )}
              </article>
            </>
          ) : null}
          {props.activeDouyinCollectionCard === "benchmarkWorks" ? (
            <>
              <DouyinSubmitPanel
                title="对标作品链接"
                value={props.douyinSyncForm.benchmarkAwemeIds}
                onChange={(value) => props.setDouyinSyncForm((current) => ({ ...current, benchmarkAwemeIds: value }))}
                placeholder="每行一个作品链接或 aweme_id"
                isSubmitting={props.isHydrating || props.isSyncingDouyinWorkspace}
                onSubmit={props.onSyncDouyinWorkspace}
              />
              <article className="light-data-panel">
                <div className="collection-result-head">
                  <div>
                    <h3>对标作品信息及数据</h3>
                  </div>
                </div>
                {douyinPreviewItems.length ? (
                  <DouyinMaterialReadyWorksTable
                    items={douyinPreviewItems as DouyinCollectedWorkRecord[]}
                    addingMaterialAssetId={props.addingMaterialAssetId}
                    onAddToMaterialLibrary={props.onAddDouyinBenchmarkWorkToMaterial}
                    formatDateTime={props.formatDateTime}
                    formatCount={props.formatCount}
                    onPreviewMedia={props.onPreviewMedia}
                    showBillboardColumns={false}
                    showWorkUrlColumn
                    videoColumnLabel="视频预览"
                  />
                ) : (
                  <div className="note-empty-state">当前还没有采集到对标作品信息，请先输入作品链接并提交。</div>
                )}
              </article>
            </>
          ) : null}
          {props.activeDouyinCollectionCard === "searchWorks" ? (
            <>
              <DouyinSearchSubmitPanel
                title="搜索关键词"
                value={props.douyinSyncForm.searchKeyword}
                onChange={(value) => props.setDouyinSyncForm((current) => ({ ...current, searchKeyword: value }))}
                sortType={props.douyinSyncForm.searchSortType}
                publishTime={props.douyinSyncForm.searchPublishTime}
                filterDuration={props.douyinSyncForm.searchFilterDuration}
                contentType={props.douyinSyncForm.searchContentType}
                onChangeFilters={(filters) =>
                  props.setDouyinSyncForm((current) => ({
                    ...current,
                    searchSortType: filters.sortType,
                    searchPublishTime: filters.publishTime,
                    searchFilterDuration: filters.filterDuration,
                    searchContentType: filters.contentType,
                  }))}
                placeholder="请输入抖音搜索关键词，例如：生日蛋糕、探店咖啡、烘焙教程"
                isSubmitting={props.isHydrating || props.isSyncingDouyinWorkspace}
                onSubmit={props.onSyncDouyinWorkspace}
              />
              <article className="light-data-panel">
                <div className="collection-result-head">
                  <div>
                    <h3>搜索关键词结果</h3>
                    <p>调用 TikHub 抖音综合搜索接口，返回关键词下的视频结果，支持加入抖音素材库。</p>
                  </div>
                </div>
                {douyinPreviewItems.length ? (
                  <DouyinMaterialReadyWorksTable
                    items={douyinPreviewItems as DouyinCollectedWorkRecord[]}
                    addingMaterialAssetId={props.addingMaterialAssetId}
                    onAddToMaterialLibrary={props.onAddDouyinBenchmarkWorkToMaterial}
                    formatDateTime={props.formatDateTime}
                    formatCount={props.formatCount}
                    onPreviewMedia={props.onPreviewMedia}
                    showBillboardColumns={false}
                    showWorkUrlColumn
                    videoColumnLabel="视频预览"
                  />
                ) : (
                  <div className="note-empty-state">当前还没有搜索结果，请先输入关键词并提交。</div>
                )}
              </article>
            </>
          ) : null}
          {props.activeDouyinCollectionCard === "keywordRecommendations" ? (
            <>
              <DouyinKeywordRecommendationBuilder
                entries={props.douyinSyncForm.keywordRecommendationEntries}
                results={props.sortedDouyinKeywordRecommendations}
                isSubmitting={props.isHydrating || props.isSyncingDouyinWorkspace}
                onChangeEntries={(entries) =>
                  props.setDouyinSyncForm((current) => ({ ...current, keywordRecommendationEntries: entries }))}
                onSubmitEntry={props.onSyncSingleDouyinKeywordRecommendation}
              />
              <DouyinKeywordRecommendationResults
                items={props.sortedDouyinKeywordRecommendations}
                deletingItemId={props.deletingDouyinKeywordRecommendationId}
                onDelete={props.onRemoveDouyinKeywordRecommendation}
              />
            </>
          ) : null}
          {props.activeDouyinCollectionCard === "lowFanExplosiveWorks" ? (
            <>
              <DouyinCategorySubmitPanel
                title="获取低粉爆款榜"
                tags={douyinContentTags}
                value={props.douyinSyncForm.lowFanExplosiveWorks}
                onChange={(value) => props.setDouyinSyncForm((current) => ({ ...current, lowFanExplosiveWorks: value }))}
                isSubmitting={props.isHydrating || props.isSyncingDouyinWorkspace}
                onSubmit={props.onSyncDouyinWorkspace}
              />
              <article className="light-data-panel">
                <div className="collection-result-head">
                  <div>
                    <h3>低粉爆款榜</h3>
                  </div>
                </div>
                {douyinPreviewItems.length ? (
                  <DouyinMaterialReadyWorksTable
                    items={douyinPreviewItems as DouyinCollectedWorkRecord[]}
                    addingMaterialAssetId={props.addingMaterialAssetId}
                    onAddToMaterialLibrary={props.onAddDouyinBenchmarkWorkToMaterial}
                    formatDateTime={props.formatDateTime}
                    formatCount={props.formatCount}
                    onPreviewMedia={props.onPreviewMedia}
                  />
                ) : (
                  <div className="note-empty-state">当前还没有采集到低粉爆款榜结果，请先选择垂类分类并提交。</div>
                )}
              </article>
            </>
          ) : null}
          {props.activeDouyinCollectionCard === "highCompletionRateWorks" ? (
            <>
              <DouyinCategorySubmitPanel
                title="获取高完播率榜"
                tags={douyinContentTags}
                value={props.douyinSyncForm.highCompletionRateWorks}
                onChange={(value) => props.setDouyinSyncForm((current) => ({ ...current, highCompletionRateWorks: value }))}
                isSubmitting={props.isHydrating || props.isSyncingDouyinWorkspace}
                onSubmit={props.onSyncDouyinWorkspace}
              />
              <article className="light-data-panel">
                <div className="collection-result-head">
                  <div>
                    <h3>高完播率榜</h3>
                  </div>
                </div>
                {douyinPreviewItems.length ? (
                  <DouyinMaterialReadyWorksTable
                    items={douyinPreviewItems as DouyinCollectedWorkRecord[]}
                    addingMaterialAssetId={props.addingMaterialAssetId}
                    onAddToMaterialLibrary={props.onAddDouyinBenchmarkWorkToMaterial}
                    formatDateTime={props.formatDateTime}
                    formatCount={props.formatCount}
                    onPreviewMedia={props.onPreviewMedia}
                  />
                ) : (
                  <div className="note-empty-state">当前还没有采集到高完播率榜结果，请先选择垂类分类并提交。</div>
                )}
              </article>
            </>
          ) : null}
          {props.activeDouyinCollectionCard === "highLikeRateWorks" ? (
            <>
              <DouyinCategorySubmitPanel
                title="获取高点赞率榜"
                tags={douyinContentTags}
                value={props.douyinSyncForm.highLikeRateWorks}
                onChange={(value) => props.setDouyinSyncForm((current) => ({ ...current, highLikeRateWorks: value }))}
                isSubmitting={props.isHydrating || props.isSyncingDouyinWorkspace}
                onSubmit={props.onSyncDouyinWorkspace}
              />
              <article className="light-data-panel">
                <div className="collection-result-head">
                  <div>
                    <h3>高点赞率榜</h3>
                  </div>
                </div>
                {douyinPreviewItems.length ? (
                  <DouyinMaterialReadyWorksTable
                    items={douyinPreviewItems as DouyinCollectedWorkRecord[]}
                    addingMaterialAssetId={props.addingMaterialAssetId}
                    onAddToMaterialLibrary={props.onAddDouyinBenchmarkWorkToMaterial}
                    formatDateTime={props.formatDateTime}
                    formatCount={props.formatCount}
                    onPreviewMedia={props.onPreviewMedia}
                  />
                ) : (
                  <div className="note-empty-state">当前还没有采集到高点赞率榜结果，请先选择垂类分类并提交。</div>
                )}
              </article>
            </>
          ) : null}
          {props.activeDouyinCollectionCard === "cityHotspots" ? (
            <>
              <DouyinCitySubmitPanel
                title="获取同城热点榜"
                cities={douyinCityOptions}
                value={props.douyinSyncForm.cityHotspots}
                onChange={(value) => props.setDouyinSyncForm((current) => ({ ...current, cityHotspots: value }))}
                isSubmitting={props.isHydrating || props.isSyncingDouyinWorkspace}
                onSubmit={props.onSyncDouyinWorkspace}
              />
              <article className="light-data-panel">
                <div className="collection-result-head">
                  <div>
                    <h3>同城热点榜</h3>
                    <p>展示当前城市近一小时内的热点词、日期时间、热度与趋势资料。</p>
                  </div>
                </div>
                {props.sortedDouyinCityHotspots.length ? (
                  <DouyinCityHotspotTable
                    items={props.sortedDouyinCityHotspots}
                    formatDateTime={props.formatDateTime}
                    formatCount={props.formatCount}
                  />
                ) : (
                  <div className="note-empty-state">当前还没有采集到同城热点榜结果，请先选择城市并提交。</div>
                )}
              </article>
            </>
          ) : null}
        </article>
      ) : null}
    </div>
  );
}
