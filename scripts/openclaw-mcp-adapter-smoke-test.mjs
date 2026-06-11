import { spawn } from "node:child_process";

const serverScriptPath = process.env.OPENCLAW_ADAPTER_SERVER_PATH || "scripts/openclaw-ai-omni-mcp-server.mjs";
const baseUrl = process.env.AI_OMNI_OPS_BASE_URL || "http://127.0.0.1:3014/api";

function createTransport(child) {
  let buffer = Buffer.alloc(0);
  let nextId = 1;
  const pending = new Map();

  child.stdout.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) {
        return;
      }
      const headerText = buffer.slice(0, headerEnd).toString("utf8");
      const contentLengthLine = headerText
        .split("\r\n")
        .find((line) => line.toLowerCase().startsWith("content-length:"));
      if (!contentLengthLine) {
        throw new Error("MCP 响应缺少 Content-Length");
      }
      const contentLength = Number(contentLengthLine.split(":")[1]?.trim());
      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + contentLength;
      if (buffer.length < bodyEnd) {
        return;
      }
      const body = buffer.slice(bodyStart, bodyEnd).toString("utf8");
      buffer = buffer.slice(bodyEnd);
      const message = JSON.parse(body);
      if (message.id !== undefined && pending.has(message.id)) {
        const resolver = pending.get(message.id);
        pending.delete(message.id);
        resolver(message);
      }
    }
  });

  function sendMessage(message) {
    const body = Buffer.from(JSON.stringify(message), "utf8");
    const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "utf8");
    child.stdin.write(Buffer.concat([header, body]));
  }

  return {
    request(method, params) {
      const id = nextId++;
      sendMessage({ jsonrpc: "2.0", id, method, params });
      return new Promise((resolve, reject) => {
        pending.set(id, (message) => {
          if (message.error) {
            reject(new Error(message.error.message || "MCP 请求失败"));
            return;
          }
          resolve(message.result);
        });
      });
    },
    notify(method, params) {
      sendMessage({ jsonrpc: "2.0", method, params });
    },
  };
}

function extractJsonContent(result) {
  const text = result?.content?.[0]?.text;
  if (!text) {
    throw new Error("工具结果缺少文本内容");
  }
  return JSON.parse(text);
}

async function main() {
  const child = spawn(process.execPath, [serverScriptPath], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      AI_OMNI_OPS_BASE_URL: baseUrl,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stderrText = "";
  child.stderr.on("data", (chunk) => {
    stderrText += chunk.toString("utf8");
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      process.stderr.write(`MCP server exited with code ${code}\n${stderrText}`);
    }
  });

  const transport = createTransport(child);

  try {
    const initialize = await transport.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "openclaw-mcp-adapter-smoke-test",
        version: "0.1.0",
      },
    });

    transport.notify("notifications/initialized", {});

    const toolsResult = await transport.request("tools/list", {});
    const toolNames = Array.isArray(toolsResult?.tools) ? toolsResult.tools.map((tool) => tool.name) : [];
    const requiredTools = [
      "get_current_brand_context",
      "get_latest_brand_growth_report_summary",
      "create_knowledge_base",
      "upload_knowledge_base_files",
    ];
    for (const toolName of requiredTools) {
      if (!toolNames.includes(toolName)) {
        throw new Error(`tools/list 缺少工具 ${toolName}`);
      }
    }

    const contextResult = await transport.request("tools/call", {
      name: "get_current_brand_context",
      arguments: {},
    });
    if (contextResult?.isError) {
      throw new Error(`get_current_brand_context 调用失败: ${contextResult.content?.[0]?.text || "unknown"}`);
    }
    const contextPayload = extractJsonContent(contextResult);

    const growthResult = await transport.request("tools/call", {
      name: "get_latest_brand_growth_report_summary",
      arguments: {},
    });
    if (growthResult?.isError) {
      throw new Error(`get_latest_brand_growth_report_summary 调用失败: ${growthResult.content?.[0]?.text || "unknown"}`);
    }
    const growthPayload = extractJsonContent(growthResult);

    const knowledgeBaseName = `OpenClawMCPAdapterTest-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
    const createKnowledgeBaseResult = await transport.request("tools/call", {
      name: "create_knowledge_base",
      arguments: {
        name: knowledgeBaseName,
        description: "用于验证 OpenClaw MCP adapter 对接",
      },
    });
    if (createKnowledgeBaseResult?.isError) {
      throw new Error(`create_knowledge_base 调用失败: ${createKnowledgeBaseResult.content?.[0]?.text || "unknown"}`);
    }
    const knowledgeBasePayload = extractJsonContent(createKnowledgeBaseResult);
    const knowledgeBaseId = knowledgeBasePayload?.data?.knowledgeBase?.id;
    if (!knowledgeBaseId) {
      throw new Error("create_knowledge_base 未返回 knowledgeBase.id");
    }

    const uploadFilesResult = await transport.request("tools/call", {
      name: "upload_knowledge_base_files",
      arguments: {
        knowledgeBaseId,
        items: [
          {
            title: "OpenClaw MCP Adapter Smoke Test",
            description: "通过 MCP stdio 适配器上传",
            sourceName: "Trae Adapter Smoke Test",
            fileUrl: "https://example.com/openclaw-mcp-adapter-smoke-test.pdf",
            priority: 80,
          },
        ],
      },
    });
    if (uploadFilesResult?.isError) {
      throw new Error(`upload_knowledge_base_files 调用失败: ${uploadFilesResult.content?.[0]?.text || "unknown"}`);
    }
    const uploadPayload = extractJsonContent(uploadFilesResult);

    console.log(
      JSON.stringify(
        {
          baseUrl,
          initialize,
          toolCount: toolNames.length,
          verifiedTools: requiredTools,
          contextTitle: contextPayload?.title,
          growthTitle: growthPayload?.title,
          knowledgeBaseId,
          uploadStatus: uploadPayload?.data?.items?.[0]?.status,
        },
        null,
        2,
      ),
    );
  } finally {
    child.kill();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
