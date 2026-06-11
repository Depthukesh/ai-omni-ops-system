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
        topic: { type: "string" },
        styleHint: { type: "string" },
        productId: { type: "string" },
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
    writeResult(message.id, {
      tools: TOOL_DEFINITIONS,
    });
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
      const payload = await handleToolCall(toolName, toolArgs);
      writeResult(message.id, {
        content: [
          {
            type: "text",
            text: toJson(payload),
          },
        ],
        isError: false,
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
