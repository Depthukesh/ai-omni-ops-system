const baseUrl = (process.env.OPENCLAW_SMOKE_BASE_URL || "http://127.0.0.1:3013/api").replace(/\/$/, "");
const account = process.env.OPENCLAW_SMOKE_ACCOUNT || "13800000000";
const password = process.env.OPENCLAW_SMOKE_PASSWORD || "123456";

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

function assertSummaryShape(name, payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error(`${name} 未返回对象响应`);
  }
  const requiredKeys = ["status", "title", "summary", "highlights", "data", "links", "allowed", "requiresConfirmation"];
  for (const key of requiredKeys) {
    if (!(key in payload)) {
      throw new Error(`${name} 缺少字段 ${key}`);
    }
  }
  if (payload.status !== "success") {
    throw new Error(`${name} status 不是 success`);
  }
  if (!Array.isArray(payload.highlights)) {
    throw new Error(`${name} highlights 不是数组`);
  }
  if (!Array.isArray(payload.links)) {
    throw new Error(`${name} links 不是数组`);
  }
}

async function login() {
  const { response, payload } = await requestJson("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account, password }),
  });
  if (!response.ok) {
    throw new Error(`登录失败: ${response.status} ${JSON.stringify(payload)}`);
  }
  if (!payload?.accessToken || !payload?.currentBrandId) {
    throw new Error("登录响应缺少 accessToken 或 currentBrandId");
  }
  return payload;
}

async function main() {
  const loginPayload = await login();
  const headers = {
    Authorization: `Bearer ${loginPayload.accessToken}`,
    "x-brand-id": loginPayload.currentBrandId,
    "Content-Type": "application/json",
  };
  const kbName = `OpenClaw联调测试库-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  const results = [];

  const growth = await requestJson("/openclaw/mcp/reports/brand-growth/latest-summary", {
    headers,
  });
  if (!growth.response.ok) {
    throw new Error(`品牌增长报告最新摘要失败: ${growth.response.status} ${JSON.stringify(growth.payload)}`);
  }
  assertSummaryShape("品牌增长报告最新摘要", growth.payload);
  results.push({
    endpoint: "growth-latest-summary",
    ok: true,
    httpStatus: growth.response.status,
    title: growth.payload.title,
    summary: growth.payload.summary,
  });

  const plan = await requestJson("/openclaw/mcp/reports/half-year-marketing-plan/generate", {
    method: "POST",
    headers,
    body: JSON.stringify({
      planningYear: "2026",
      focus: "验证 OpenClaw MCP 对接 smoke test",
    }),
  });
  if (plan.response.ok) {
    assertSummaryShape("半年营销规划生成", plan.payload);
    results.push({
      endpoint: "half-year-marketing-plan-generate",
      ok: true,
      httpStatus: plan.response.status,
      title: plan.payload.title,
      summary: plan.payload.summary,
    });
  } else if (plan.response.status === 503) {
    results.push({
      endpoint: "half-year-marketing-plan-generate",
      ok: false,
      blocked: true,
      httpStatus: plan.response.status,
      errorMessage: plan.payload?.message || "外部依赖未配置",
    });
  } else {
    throw new Error(`半年营销规划生成失败: ${plan.response.status} ${JSON.stringify(plan.payload)}`);
  }

  const createKb = await requestJson("/openclaw/mcp/knowledge-bases/create", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: kbName,
      description: "用于 OpenClaw 本地 HTTP smoke test",
    }),
  });
  if (!createKb.response.ok) {
    throw new Error(`知识库创建失败: ${createKb.response.status} ${JSON.stringify(createKb.payload)}`);
  }
  assertSummaryShape("知识库创建", createKb.payload);
  const knowledgeBaseId = createKb.payload?.data?.knowledgeBase?.id;
  if (!knowledgeBaseId) {
    throw new Error("知识库创建响应缺少 knowledgeBase.id");
  }
  results.push({
    endpoint: "knowledge-base-create",
    ok: true,
    httpStatus: createKb.response.status,
    title: createKb.payload.title,
    knowledgeBaseId,
  });

  const upload = await requestJson("/openclaw/mcp/knowledge-bases/upload-files", {
    method: "POST",
    headers,
    body: JSON.stringify({
      knowledgeBaseId,
      items: [
        {
          title: "OpenClaw 对接测试资料",
          description: "本地 smoke test 上传",
          sourceName: "Trae Smoke Test",
          fileUrl: "https://example.com/openclaw-smoke-test.pdf",
          priority: 90,
        },
      ],
    }),
  });
  if (!upload.response.ok) {
    throw new Error(`知识资料上传失败: ${upload.response.status} ${JSON.stringify(upload.payload)}`);
  }
  assertSummaryShape("知识资料上传", upload.payload);
  const uploadedCount = Array.isArray(upload.payload?.data?.items) ? upload.payload.data.items.length : 0;
  results.push({
    endpoint: "knowledge-bases-upload-files",
    ok: true,
    httpStatus: upload.response.status,
    title: upload.payload.title,
    uploadedCount,
    firstItemStatus: upload.payload?.data?.items?.[0]?.status,
  });

  console.log(JSON.stringify({
    baseUrl,
    currentBrandId: loginPayload.currentBrandId,
    results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
