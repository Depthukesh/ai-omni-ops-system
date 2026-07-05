const baseUrl = (process.env.AI_OMNI_OPS_BASE_URL || "http://127.0.0.1:3014/api").replace(/\/$/, "");
const account = process.env.AI_OMNI_OPS_ACCOUNT || "13800000000";
const password = process.env.AI_OMNI_OPS_PASSWORD || "123456";
const brandIdOverride = process.env.AI_OMNI_OPS_BRAND_ID || "";
const accessTokenOverride = process.env.AI_OMNI_OPS_ACCESS_TOKEN || "";

const SERVER_INFO = {
  name: "ai-omni-ops-openclaw-mcp",
  version: "0.1.0",
};

const TOOL_DEFINITIONS = [
  {
    name: "get_current_brand_context",
    description: "获取当前登录账号的默认品牌、角色和权限摘要。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_recent_tasks_summary",
    description: "汇总当前品牌最近任务状态，可按时间范围和任务类型筛选。",
    inputSchema: {
      type: "object",
      properties: {
        timeRange: { type: "string", description: "可选，例如 7d、30d、90d。" },
        taskTypes: { type: "array", items: { type: "string" }, description: "可选任务类型数组。" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_failed_tasks_summary",
    description: "汇总当前品牌最近失败任务及主要失败原因。",
    inputSchema: {
      type: "object",
      properties: {
        timeRange: { type: "string", description: "可选，例如 7d、30d、90d。" },
        taskTypes: { type: "array", items: { type: "string" }, description: "可选任务类型数组。" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_recent_knowledge_files",
    description: "查看当前品牌最近新增的知识资料和处理状态。",
    inputSchema: {
      type: "object",
      properties: {
        timeRange: { type: "string" },
        knowledgeBaseId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_skill_config_summary",
    description: "查看当前品牌技能配置摘要，可按 skillKey 定位单个技能。",
    inputSchema: {
      type: "object",
      properties: {
        skillKey: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_my_third_party_platforms",
    description: "查看当前品牌第三方接口配置摘要，包括 API Key 遮罩状态、动态状态，以及 OpenClaw 是否可直接复用该品牌共享凭证。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "check_my_third_party_platform_runtime_access",
    description: "检查当前品牌某个第三方平台的共享凭证是否可被 OpenClaw 直接复用。只返回遮罩状态和可用性，不返回明文 API Key。",
    inputSchema: {
      type: "object",
      properties: {
        platformId: { type: "string" },
        platformName: { type: "string" },
        baseUrl: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "update_my_third_party_platform_secret",
    description: "更新当前品牌指定第三方平台的 API Key。",
    inputSchema: {
      type: "object",
      properties: {
        platformId: { type: "string" },
        apiKey: { type: "string" },
      },
      required: ["platformId", "apiKey"],
      additionalProperties: false,
    },
  },
  {
    name: "get_latest_brand_growth_report_summary",
    description: "获取当前品牌最新品牌增长报告摘要。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "create_brand_growth_report",
    description: "触发当前品牌的品牌增长报告生成任务。",
    inputSchema: {
      type: "object",
      properties: {
        goal: { type: "string" },
        timeRange: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_half_year_marketing_plan",
    description: "触发当前品牌的半年营销规划生成任务。",
    inputSchema: {
      type: "object",
      properties: {
        planningYear: { type: "string" },
        focus: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_knowledge_base",
    description: "为当前品牌创建业务知识库。",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "upload_knowledge_base_files",
    description: "向指定知识库上传资料，支持按知识库 ID 或名称定位。",
    inputSchema: {
      type: "object",
      properties: {
        knowledgeBaseId: { type: "string" },
        knowledgeBaseName: { type: "string" },
        items: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              sourceName: { type: "string" },
              fileUrl: { type: "string" },
              priority: { type: "integer" },
            },
            required: ["fileUrl"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    },
  },
  {
    name: "create_xiaohongshu_original_note",
    description: "触发小红书原创图文生成。",
    inputSchema: {
      type: "object",
      properties: {
        calendarItemId: { type: "string" },
        customTopicName: { type: "string" },
        topic: { type: "string" },
        productId: { type: "string" },
        accountRole: { type: "string" },
        imageCount: { type: "integer", minimum: 2, maximum: 10 },
        includeMarketingPlan: { type: "boolean" },
        additionalInstruction: { type: "string" },
        noteTitle: { type: "string" },
        noteContent: { type: "string" },
        styleHint: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_wechat_article",
    description: "触发公众号文章草稿生成。",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        content: { type: "string" },
        author: { type: "string" },
        styleHint: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "manage_douyin_video_production",
    description: "统一管理抖音视频生产，覆盖普通视频、直接生视频、混剪短视频、数字人、口型驱动、RunningHub 和广告预审。数字人分支已支持模板列表、公共语音库、我的自定义音色、音色克隆、纯 TTS 试听任务和数字人作品生成。",
    inputSchema: {
      type: "object",
      properties: {
        section: { type: "string", description: "可选：video、direct_video、remix_short_video、digital_human、lip_sync、runninghub、ad_preaudit。" },
        action: { type: "string", description: "例如 list_works、generate、recover、list_templates、list_voice_library、list_custom_voices、create_custom_voice、create_speech_task、get_speech_task、list_apps、save_config 等。" },
        workId: { type: "string" },
        taskId: { type: "string" },
        voiceId: { type: "string" },
        templateId: { type: "string" },
        customPersonId: { type: "string" },
        appKey: { type: "string" },
        mediaAssetId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
        page: { type: "integer", minimum: 1, maximum: 1000 },
        size: { type: "integer", minimum: 1, maximum: 100 },
        sort: { type: "string" },
        tagIds: { type: "array", items: { type: "integer" } },
        payload: {
          type: "object",
          description: "对应动作的请求体，结构与网站原始接口保持一致。",
          additionalProperties: true,
        },
      },
      required: ["section", "action"],
      additionalProperties: false,
    },
  },
  {
    name: "get_openclaw_creative_materials",
    description: "查看当前品牌指定板块下的创作素材列表。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat"] },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_openclaw_creative_material",
    description: "为当前品牌指定板块保存一条创作素材，可保存文本、图片、视频、语音或 BGM 等结果。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat"] },
        title: { type: "string" },
        description: { type: "string" },
        materialType: { type: "string" },
        fileUrl: { type: "string" },
        fileName: { type: "string" },
        mimeType: { type: "string" },
        textContent: { type: "string" },
      },
      required: ["title", "materialType"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_openclaw_creative_material",
    description: "删除指定板块下的一条创作素材。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat"] },
        materialId: { type: "string" },
      },
      required: ["materialId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_openclaw_video_works",
    description: "查看当前品牌指定板块下的视频作品列表。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat"] },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_openclaw_video_work",
    description: "为当前品牌指定板块保存一条最终视频作品。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat"] },
        title: { type: "string" },
        description: { type: "string" },
        scriptContent: { type: "string" },
        coverImageUrl: { type: "string" },
        videoUrl: { type: "string" },
      },
      required: ["title", "videoUrl"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_openclaw_video_work",
    description: "删除指定板块下的一条视频作品。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat"] },
        workId: { type: "string" },
      },
      required: ["workId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_openclaw_video_work_douyin_desktop_publish_session",
    description: "为指定 OpenClaw 视频作品创建抖音电脑端发布会话，便于通过浏览器扩展自动填充发布信息。",
    inputSchema: {
      type: "object",
      properties: {
        workspaceScope: { type: "string", enum: ["brand_growth", "xiaohongshu", "douyin", "wechat"] },
        workId: { type: "string" },
        accountId: { type: "string" },
      },
      required: ["workId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_douyin_collection_workspace",
    description: "查看当前品牌资料库中的抖音搜集数据工作区摘要。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_douyin_brand_accounts",
    description: "同步当前品牌的抖音品牌账号数据。",
    inputSchema: {
      type: "object",
      properties: {
        accountLocators: { type: "array", items: { type: "string" } },
        accountEntries: {
          type: "array",
          items: {
            type: "object",
            properties: {
              locator: { type: "string" },
              accountRole: { type: "string" },
            },
            required: ["locator"],
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_douyin_competitor_accounts",
    description: "同步当前品牌的抖音竞品账号数据。",
    inputSchema: {
      type: "object",
      properties: {
        accountLocators: { type: "array", items: { type: "string" } },
        accountEntries: {
          type: "array",
          items: {
            type: "object",
            properties: {
              locator: { type: "string" },
              accountRole: { type: "string" },
            },
            required: ["locator"],
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_douyin_benchmark_works",
    description: "同步当前品牌的抖音对标作品数据，需要提供作品 aweme_id。",
    inputSchema: {
      type: "object",
      properties: {
        benchmarkAwemeIds: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_douyin_search_works",
    description: "按关键词同步当前品牌的抖音搜索结果。",
    inputSchema: {
      type: "object",
      properties: {
        searchKeyword: { type: "string" },
        searchSortType: { type: "string" },
        searchPublishTime: { type: "string" },
        searchFilterDuration: { type: "string" },
        searchContentType: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_douyin_comment_data",
    description: "同步当前品牌的抖音评论数据。",
    inputSchema: {
      type: "object",
      properties: {
        commentSourceUrls: { type: "array", items: { type: "string" } },
        commentPageRequests: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sourceUrl: { type: "string" },
              cursor: { type: "string" },
            },
            required: ["sourceUrl"],
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_douyin_keyword_recommendations",
    description: "按关键词同步当前品牌的抖音关键词推荐数据。",
    inputSchema: {
      type: "object",
      properties: {
        searchKeyword: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_douyin_low_fan_explosive_works",
    description: "同步当前品牌的抖音低粉爆款榜数据。",
    inputSchema: {
      type: "object",
      properties: {
        primaryTagId: { type: "integer" },
        secondaryTagId: { type: "integer" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_douyin_high_completion_rate_works",
    description: "同步当前品牌的抖音高完播率榜数据。",
    inputSchema: {
      type: "object",
      properties: {
        primaryTagId: { type: "integer" },
        secondaryTagId: { type: "integer" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_douyin_high_like_rate_works",
    description: "同步当前品牌的抖音高点赞率榜数据。",
    inputSchema: {
      type: "object",
      properties: {
        primaryTagId: { type: "integer" },
        secondaryTagId: { type: "integer" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sync_douyin_city_hotspots",
    description: "同步当前品牌的抖音同城热点榜数据。",
    inputSchema: {
      type: "object",
      properties: {
        cityCode: { type: "integer" },
      },
      additionalProperties: false,
    },
  },
];

let authCache;
let readBuffer = Buffer.alloc(0);
let initialized = false;

function toJson(value) {
  return JSON.stringify(value, null, 2);
}

function writeMessage(message) {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "utf8");
  process.stdout.write(Buffer.concat([header, body]));
}

function writeResult(id, result) {
  writeMessage({ jsonrpc: "2.0", id, result });
}

function writeError(id, code, message, data) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data }),
    },
  });
}

function writeToolError(id, message, details) {
  writeResult(id, {
    content: [
      {
        type: "text",
        text: toJson({
          status: "error",
          message,
          ...(details === undefined ? {} : { details }),
        }),
      },
    ],
    isError: true,
  });
}

function parseFrames() {
  while (true) {
    const headerEnd = readBuffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      return;
    }
    const headerText = readBuffer.slice(0, headerEnd).toString("utf8");
    const contentLengthLine = headerText
      .split("\r\n")
      .find((line) => line.toLowerCase().startsWith("content-length:"));
    if (!contentLengthLine) {
      readBuffer = Buffer.alloc(0);
      return;
    }
    const contentLength = Number(contentLengthLine.split(":")[1]?.trim());
    const messageStart = headerEnd + 4;
    const messageEnd = messageStart + contentLength;
    if (readBuffer.length < messageEnd) {
      return;
    }
    const body = readBuffer.slice(messageStart, messageEnd).toString("utf8");
    readBuffer = readBuffer.slice(messageEnd);
    try {
      const message = JSON.parse(body);
      void handleMessage(message);
    } catch (error) {
      process.stderr.write(`Invalid MCP message: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }
}

function createQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length) {
        search.set(key, value.join(","));
      }
      continue;
    }
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    payload = text;
  }
  return { response, payload };
}

async function login() {
  if (accessTokenOverride && brandIdOverride) {
    return {
      accessToken: accessTokenOverride,
      currentBrandId: brandIdOverride,
    };
  }
  if (!authCache) {
    authCache = requestJson("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account, password }),
    }).then(({ response, payload }) => {
      if (!response.ok) {
        throw new Error(`登录失败: ${response.status} ${typeof payload === "string" ? payload : JSON.stringify(payload)}`);
      }
      if (!payload?.accessToken || !payload?.currentBrandId) {
        throw new Error("登录响应缺少 accessToken 或 currentBrandId");
      }
      return payload;
    });
  }
  return authCache;
}

async function callApi(path, options = {}) {
  const auth = await login();
  const headers = {
    Authorization: `Bearer ${auth.accessToken}`,
    "x-brand-id": brandIdOverride || auth.currentBrandId,
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };
  const { response, payload } = await requestJson(path, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload ? payload.message : `请求失败: ${response.status}`;
    const error = new Error(String(message));
    error.httpStatus = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function callMcp(method, params = {}, id = 1) {
  const auth = await login();
  const headers = {
    Authorization: `Bearer ${auth.accessToken}`,
    "x-brand-id": brandIdOverride || auth.currentBrandId,
    "Content-Type": "application/json",
  };
  const { response, payload } = await requestJson("/openclaw/mcp", {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params,
    }),
  });
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload ? payload.message : `MCP 请求失败: ${response.status}`;
    const error = new Error(String(message));
    error.httpStatus = response.status;
    error.payload = payload;
    throw error;
  }
  if (payload?.error) {
    const error = new Error(String(payload.error.message || "MCP 调用失败"));
    error.httpStatus = payload.error.code;
    error.payload = payload.error.data;
    throw error;
  }
  return payload?.result;
}

async function handleToolCall(name, args = {}) {
  switch (name) {
    case "get_current_brand_context":
      return callApi("/openclaw/mcp/context/current-brand");
    case "get_recent_tasks_summary":
      return callApi(`/openclaw/mcp/tasks/recent-summary${createQuery(args)}`);
    case "get_failed_tasks_summary":
      return callApi(`/openclaw/mcp/tasks/failed-summary${createQuery(args)}`);
    case "get_recent_knowledge_files":
      return callApi(`/openclaw/mcp/knowledge-bases/recent-files${createQuery(args)}`);
    case "get_skill_config_summary":
      return callApi(`/openclaw/mcp/skills/config-summary${createQuery(args)}`);
    case "get_latest_brand_growth_report_summary":
      return callApi("/openclaw/mcp/reports/brand-growth/latest-summary");
    case "create_brand_growth_report":
      return callApi("/openclaw/mcp/reports/brand-growth/generate", { method: "POST", body: args });
    case "create_half_year_marketing_plan":
      return callApi("/openclaw/mcp/reports/half-year-marketing-plan/generate", { method: "POST", body: args });
    case "create_knowledge_base":
      return callApi("/openclaw/mcp/knowledge-bases/create", { method: "POST", body: args });
    case "upload_knowledge_base_files":
      return callApi("/openclaw/mcp/knowledge-bases/upload-files", { method: "POST", body: args });
    case "create_xiaohongshu_original_note":
      return callApi("/openclaw/mcp/works/xiaohongshu/original/generate", { method: "POST", body: args });
    case "create_wechat_article":
      return callApi("/openclaw/mcp/works/wechat/articles/generate", { method: "POST", body: args });
    case "manage_douyin_video_production":
      return callMcp("tools/call", { name, arguments: args });
    case "get_douyin_collection_workspace":
      return callApi(`/openclaw/mcp/brand-growth/douyin-collection/workspace${createQuery(args)}`);
    case "sync_douyin_brand_accounts":
      return callApi("/openclaw/mcp/brand-growth/douyin-collection/brand-accounts/sync", { method: "POST", body: args });
    case "sync_douyin_competitor_accounts":
      return callApi("/openclaw/mcp/brand-growth/douyin-collection/competitor-accounts/sync", { method: "POST", body: args });
    case "sync_douyin_benchmark_works":
      return callApi("/openclaw/mcp/brand-growth/douyin-collection/benchmark-works/sync", { method: "POST", body: args });
    case "sync_douyin_search_works":
      return callApi("/openclaw/mcp/brand-growth/douyin-collection/search-works/sync", { method: "POST", body: args });
    case "sync_douyin_comment_data":
      return callApi("/openclaw/mcp/brand-growth/douyin-collection/comment-data/sync", { method: "POST", body: args });
    case "sync_douyin_keyword_recommendations":
      return callApi("/openclaw/mcp/brand-growth/douyin-collection/keyword-recommendations/sync", { method: "POST", body: args });
    case "sync_douyin_low_fan_explosive_works":
      return callApi("/openclaw/mcp/brand-growth/douyin-collection/low-fan-explosive-works/sync", { method: "POST", body: args });
    case "sync_douyin_high_completion_rate_works":
      return callApi("/openclaw/mcp/brand-growth/douyin-collection/high-completion-rate-works/sync", { method: "POST", body: args });
    case "sync_douyin_high_like_rate_works":
      return callApi("/openclaw/mcp/brand-growth/douyin-collection/high-like-rate-works/sync", { method: "POST", body: args });
    case "sync_douyin_city_hotspots":
      return callApi("/openclaw/mcp/brand-growth/douyin-collection/city-hotspots/sync", { method: "POST", body: args });
    default:
      throw new Error(`未知工具: ${name}`);
  }
}

async function handleMessage(message) {
  if (!message || typeof message !== "object") {
    return;
  }

  if (message.method === "notifications/initialized") {
    initialized = true;
    return;
  }

  if (message.method === "initialize") {
    writeResult(message.id, {
      protocolVersion: message.params?.protocolVersion || "2024-11-05",
      capabilities: {
        tools: {},
      },
      serverInfo: SERVER_INFO,
    });
    return;
  }

  if (message.method === "ping") {
    writeResult(message.id, {});
    return;
  }

  if (message.method === "tools/list") {
    try {
      const result = await callMcp("tools/list", {}, message.id);
      writeResult(message.id, result || { tools: TOOL_DEFINITIONS });
    } catch (error) {
      writeToolError(
        message.id,
        error instanceof Error ? error.message : String(error),
        {
          httpStatus: error?.httpStatus,
          payload: error?.payload,
          method: "tools/list",
        },
      );
    }
    return;
  }

  if (message.method === "tools/call") {
    if (!initialized) {
      writeToolError(message.id, "MCP 会话尚未完成初始化");
      return;
    }
    const toolName = message.params?.name;
    const toolArgs = message.params?.arguments ?? message.params?.args ?? {};
    if (!toolName) {
      writeToolError(message.id, "缺少工具名称");
      return;
    }
    try {
      const result = await callMcp("tools/call", {
        name: toolName,
        arguments: toolArgs,
      }, message.id);
      writeResult(message.id, result || {
        content: [
          {
            type: "text",
            text: toJson({ status: "error", message: "远端 MCP 未返回结果" }),
          },
        ],
        isError: true,
      });
    } catch (error) {
      writeToolError(
        message.id,
        error instanceof Error ? error.message : String(error),
        {
          httpStatus: error?.httpStatus,
          payload: error?.payload,
          toolName,
        },
      );
    }
    return;
  }

  if (message.id !== undefined) {
    writeError(message.id, -32601, `Method not found: ${message.method}`);
  }
}

process.stdin.on("data", (chunk) => {
  readBuffer = Buffer.concat([readBuffer, chunk]);
  parseFrames();
});

process.stdin.on("end", () => {
  process.exit(0);
});

process.stdin.resume();
