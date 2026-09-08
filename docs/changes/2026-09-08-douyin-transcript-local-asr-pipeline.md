# 2026-09-08 抖音视频文案提取切换为本地 ASR 链路

## 背景

品牌增长策略里的抖音采集作品，之前“视频转文案”主链路是把视频地址直接交给 `GLM` 多模态模型读取。

这条方案存在两个持续性问题：

1. 依赖外部模型服务必须能直接访问视频 URL
2. 语音识别被绑定成“读视频理解”，成本更高，也更容易受 URL、鉴权和网络抖动影响

用户明确要求把这类“视频转文案”切到更稳定的本地 ASR 方案，不再继续依赖 `GLM` 直接读视频。

## 本次改动

### 1. 主链路改为本地 ASR

当前抖音视频文案提取正式切换为：

- `ASR_PRIMARY = paraformer`
- `ASR_FALLBACK = whisper`

具体执行顺序：

1. 优先取抖音作品原始 `videoSourceUrl`
2. 若原始地址不可用，再回退到站内已缓存视频副本
3. 服务端先用 `ffmpeg` 从视频中抽取 `16k wav` 单声道音频
4. 先调用 `Paraformer`
5. 若 `Paraformer` 失败，再自动回退到 `Whisper`

### 2. 新增本地 ASR service

新增：

- `apps/server/src/modules/third-party-platforms/local-asr.service.ts`
- `scripts/local-asr-transcribe.py`

职责拆分：

- `CollectorsService` 只负责抖音作品状态流转与结果写库
- `LocalAsrService` 负责：
  - 下载远程视频或读取站内缓存视频
  - 抽音频
  - 调用 `Paraformer / Whisper`
  - 返回统一文案结果

### 3. OpenClaw / Skill 口径同步收口

`extract_douyin_work_transcript` 及相关 Skill 文档不再把问题默认解释成“GLM Key 额度不足”，而是改为：

- 优先判断本地 ASR 环境是否已准备好
- 对 `Paraformer runtime missing`、`Whisper runtime missing` 等缺失错误给出明确解释

## 运行时准备

### Docker 标准运行态

当前 `docker/server.Dockerfile` 已补：

- `python3`
- `python3-pip`
- `docker/local-asr-requirements.txt` 自动安装：
  - `funasr`
  - `modelscope`
  - `faster-whisper`

`docker/docker-compose.local-postgres.yml` 里的 `db-init` 与 `server` 服务也都已补齐：

- `VIDEO_TRANSCRIPT_ASR_PRIMARY`
- `VIDEO_TRANSCRIPT_ASR_FALLBACK`
- `LOCAL_ASR_PYTHON_BIN`
- `VIDEO_TRANSCRIPT_LANGUAGE`
- `PARAFORMER_MODEL_NAME`
- `WHISPER_MODEL_NAME`
- `WHISPER_DEVICE`
- `WHISPER_COMPUTE_TYPE`

### 源码运行态 / 本机运行

默认读取：

- `VIDEO_TRANSCRIPT_ASR_PRIMARY`
- `VIDEO_TRANSCRIPT_ASR_FALLBACK`
- `LOCAL_ASR_PYTHON_BIN`
- `VIDEO_TRANSCRIPT_LANGUAGE`
- `PARAFORMER_MODEL_NAME`
- `WHISPER_MODEL_NAME`
- `WHISPER_DEVICE`
- `WHISPER_COMPUTE_TYPE`

默认值为：

- `VIDEO_TRANSCRIPT_ASR_PRIMARY=paraformer`
- `VIDEO_TRANSCRIPT_ASR_FALLBACK=whisper`

## 影响范围

- 影响 `品牌增长 -> 收集数据 -> 抖音` 的视频文案提取主链路
- 影响 OpenClaw `extract_douyin_work_transcript` 的底层执行方式
- 不改抖音采集表结构
- 不改页面入口与列表结构

## 验证

1. `pnpm --filter server build`
2. 手工验证重点：
   - 原始视频地址可用时，直接抽音频走本地 ASR
   - 仅有站内缓存视频时，也能回退读取缓存副本
   - `Paraformer` 失败时，自动回落 `Whisper`
   - 错误提示不再默认收口成 `GLM` 额度问题
