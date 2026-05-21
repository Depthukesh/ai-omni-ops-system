# 2026-05-21 抖音对标作品字段展示补齐

## 背景

- 用户在线上验证“对标作品信息及数据”时发现，成功采集后的表格字段少于先前确认的 Tikhub 参数集。
- 经排查，后端采集与映射已包含这些字段，但前端表格未全部展示。

## 本次调整

- 补齐“对标作品信息及数据”表格展示字段：
  - 作品描述 `desc`
  - 作品时长 `video.duration`
  - 视频封面 `video.cover.url_list`
  - 视频播放地址 `video.play_addr.url_list`
  - 作品点赞数 `digg_count`
  - 作品评论数 `comment_count`
  - 作品分享数 `share_count`
  - 作品收藏数 `collect_count`
  - 作者昵称 `author.nickname`
  - 作者抖音号 `author.unique_id`
  - 作者粉丝数 `author.follower_count`
  - 作者总获赞 `author.total_favorited`
  - 作者头像 `author.avatar_300x300.url_list`
  - 播放量 `play_count`

- 同步更新表格上方说明文案，确保与最终展示字段一致。

## 影响文件

- `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`
