# 抖音 Tikhub 字段映射

## 目标

- 为抖音板块建立一套可直接接入页面的标准字段模型。
- 明确每个字段来自哪个 Tikhub 接口、原始路径在哪里、是否必需、是否需要统计补丁。
- 保持低风险：先做字段收敛与页面模型，不改 API 协议，不改数据库 schema。

## 接口分工

- 品牌账号信息：`获取指定用户的信息`
- 竞品账号信息：`获取指定用户的信息`
- 品牌作品信息及数据：`获取用户主页作品数据`
- 对标作品信息及数据：`获取单个作品数据 V3 (无版权限制)` + `获取作品的统计数据`

## 账号字段最小集

| 字段 | 中文含义 | 来源接口 | 原始路径 | 必需 | 统计补丁 |
| --- | --- | --- | --- | --- | --- |
| `sourceAccountId` | 账号抓取主键 | 获取指定用户的信息 | `data.user.sec_uid` | 是 | 否 |
| `externalUserId` | 抖音内部用户 ID | 获取指定用户的信息 | `data.user.uid` | 是 | 否 |
| `accountName` | 账号名称 | 获取指定用户的信息 | `data.user.nickname` | 是 | 否 |
| `username` | 抖音号 | 获取指定用户的信息 | `data.user.unique_id` | 否 | 否 |
| `shortId` | 短号 | 获取指定用户的信息 | `data.user.short_id` | 否 | 否 |
| `accountLink` | 主页链接 | 获取指定用户的信息 | `data.user.share_info.share_url` | 否 | 否 |
| `avatar` | 头像 | 获取指定用户的信息 | `data.user.avatar_168x168.url_list[0]` | 否 | 否 |
| `description` | 账号简介 | 获取指定用户的信息 | `data.user.signature` | 否 | 否 |
| `fanCount` | 粉丝数 | 获取指定用户的信息 | `data.user.follower_count` | 是 | 否 |
| `followCount` | 关注数 | 获取指定用户的信息 | `data.user.following_count` | 否 | 否 |
| `likedCount` | 获赞总数 | 获取指定用户的信息 | `data.user.total_favorited` | 否 | 否 |
| `postedCount` | 作品数 | 获取指定用户的信息 | `data.user.aweme_count` | 否 | 否 |
| `ipLocation` | IP 属地 | 获取指定用户的信息 | `data.user.ip_location` | 否 | 否 |
| `enterpriseVerifyReason` | 企业认证文案 | 获取指定用户的信息 | `data.user.enterprise_verify_reason` | 否 | 否 |
| `customVerify` | 自定义认证文案 | 获取指定用户的信息 | `data.user.custom_verify` | 否 | 否 |

## 作品字段最小集

| 字段 | 中文含义 | 来源接口 | 原始路径 | 必需 | 统计补丁 |
| --- | --- | --- | --- | --- | --- |
| `workId` | 作品主键 | 主页作品 / 单作品详情 | `data.aweme_list[].aweme_id` / `data.aweme_detail.aweme_id` | 是 | 否 |
| `title` | 页面标题 | 主页作品 / 单作品详情 | `data.aweme_list[].desc` / `data.aweme_detail.desc` | 是 | 否 |
| `description` | 正文文案 | 主页作品 / 单作品详情 | `data.aweme_list[].desc` / `data.aweme_detail.desc` | 否 | 否 |
| `workType` | 作品类型 | 派生 | 由 `images_count`、`aweme_type`、`video` 共同判断 | 是 | 否 |
| `workUrl` | 作品链接 | 主页作品 / 单作品详情 | `data.aweme_list[].share_info.share_url` / `data.aweme_detail.share_info.share_url` | 否 | 否 |
| `authorName` | 作者昵称 | 主页作品 / 单作品详情 | `author.nickname` | 否 | 否 |
| `authorUniqueId` | 作者抖音号 | 主页作品 / 单作品详情 | `author.unique_id` | 否 | 否 |
| `publishTimeText` | 发布时间 | 主页作品 / 单作品详情 | `create_time` | 否 | 否 |
| `coverUrl` | 作品封面 | 单作品详情优先 | `data.aweme_detail.video.cover.url_list[0]` | 否 | 否 |
| `imageList` | 图文图片列表 | 主页作品 / 单作品详情 | `images[].url_list[0]` | 否 | 否 |
| `videoUrl` | 视频地址 | 单作品详情 | `video.play_addr / bit_rate[].play_addr` | 否 | 否 |
| `hashtags` | 话题标签 | 主页作品 / 单作品详情 | `cha_list[].cha_name` | 否 | 否 |
| `musicTitle` | 配乐标题 | 单作品详情 | `data.aweme_detail.music.title` | 否 | 否 |
| `musicAuthor` | 配乐作者 | 单作品详情 | `data.aweme_detail.music.author` | 否 | 否 |
| `likeCount` | 点赞数 | 主页作品 / 统计接口 | `statistics.digg_count` / `statistics_list[].digg_count` | 否 | 是 |
| `playCount` | 播放量 | 统计接口优先 | `statistics_list[].play_count` | 是 | 是 |
| `shareCount` | 分享数 | 主页作品 / 统计接口 | `statistics.share_count` / `statistics_list[].share_count` | 否 | 是 |
| `downloadCount` | 下载数 | 统计接口 | `statistics_list[].download_count` | 否 | 是 |
| `commentCount` | 评论数 | 主页作品 / 单作品详情 | `statistics.comment_count` | 否 | 否 |
| `collectCount` | 收藏数 | 主页作品 / 单作品详情 | `statistics.collect_count` | 否 | 否 |

## 统计补丁规则

- 用 `aweme_id` 作为 join key，把 `获取作品的统计数据` 中的统计值补到作品记录上。
- 优先级建议：
  - `playCount`: 统计接口优先
  - `likeCount`: 统计接口优先
  - `shareCount`: 统计接口优先
  - `downloadCount`: 仅统计接口提供
- `commentCount` 与 `collectCount` 不能依赖统计接口，仍以主页作品或单作品详情为准。

## 已知缺口

- 账号侧没有稳定的“被收藏总量”字段，不能类比小红书直接补 `collectedCount`。
- 单作品详情里的视频直链不保证稳定，页面层不应强依赖。
- 爆款判断、后续动作、评分等都不是 Tikhub 原生字段，需要业务规则层自行计算。
- 图文/视频类型不能只看 `video` 字段，必须综合 `images_count` 与 `aweme_type` 判断。

## 当前落地状态

- 前端已用这套字段模型搭出抖音板块字段预览表与示例卡。
- 后续只需要把真实接口返回映射到这些标准字段，即可替换当前示例数据。
