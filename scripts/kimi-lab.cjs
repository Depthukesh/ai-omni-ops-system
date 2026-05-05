const fs = require("node:fs");
const path = require("node:path");

const projectRoot = fs.realpathSync.native(path.resolve(__dirname, ".."));
const runtimeRoot = path.join(projectRoot, ".runtime", "kimi-lab");
const domesticConfigPath = path.resolve(projectRoot, "..", "第三方api接口文生文国内.txt");

function ensureDirectory(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function printHelp() {
  console.log(
    [
      "Kimi 2.6 Terminal Lab",
      "",
      "Usage:",
      "  npm run kimi:lab -- --mode short",
      "  npm run kimi:lab -- --mode json",
      "  npm run kimi:lab -- --mode markdown",
      "  npm run kimi:lab -- --mode custom --prompt \"请写一个标题\"",
      "  npm run kimi:lab -- --mode custom --prompt \"只回复收到\" --stream true",
      "",
      "Options:",
      "  --mode short|json|markdown|custom",
      "  --prompt <text>                 custom mode required",
      "  --system <text>                 optional system prompt",
      "  --response-format text|json_object",
      "  --max-completion-tokens <n>     default depends on mode",
      "  --temperature <n>               default 1",
      "  --model <name>                  default kimi-k2.6",
      "  --key-index <n>                 default 1",
      "  --stream true|false             default false",
      "  --list-keys true                show available key count",
      "  --help true                     show this help",
      "",
      "Runtime output:",
      `  ${runtimeRoot}`,
    ].join("\n"),
  );
}

function readDomesticConfig() {
  if (!fs.existsSync(domesticConfigPath)) {
    throw new Error(`未找到配置文件: ${domesticConfigPath}`);
  }
  return fs.readFileSync(domesticConfigPath, "utf8");
}

function extractKimiSection(content) {
  const start = content.search(/kimi[:：]/i);
  const end = content.search(/GLM[:：]/i);
  if (start < 0) {
    throw new Error("未找到 Kimi 配置段落");
  }
  return content.slice(start, end > start ? end : undefined);
}

function extractKimiKeys(content) {
  const section = extractKimiSection(content);
  return Array.from(new Set(section.match(/sk-[A-Za-z0-9]+/g) || []));
}

function toBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }
  return String(value).trim().toLowerCase() === "true";
}

function toNumber(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildPreset(mode) {
  const presets = {
    short: {
      system: "You are a concise assistant.",
      prompt: "请只回复两个字：收到。不要解释。",
      responseFormat: "text",
      maxCompletionTokens: 64,
    },
    json: {
      system: "你是一个只输出 JSON 的助手。",
      prompt: "请输出一个 JSON 对象，字段只有 title 和 bullets。title 是“武汉烘焙种草”，bullets 是 3 条字符串数组，每条不超过 10 个字。",
      responseFormat: "json_object",
      maxCompletionTokens: 180,
    },
    markdown: {
      system: "你是一个中文营销策划助手，只输出最终 Markdown，不要解释过程。",
      prompt: "请输出一个很短的 Markdown 片段，必须包含标题“## 一、策略方向”和“## 二、内容建议”，每节各 2 个要点，总字数控制在 120 字内。",
      responseFormat: "text",
      maxCompletionTokens: 320,
    },
  };
  return presets[mode];
}

function buildRequestFromArgs(args) {
  const mode = String(args.mode || "short").trim().toLowerCase();
  const preset = mode === "custom" ? undefined : buildPreset(mode);
  if (mode !== "custom" && !preset) {
    throw new Error(`不支持的 mode: ${mode}`);
  }
  const prompt = args.prompt || preset?.prompt;
  if (!prompt) {
    throw new Error("custom mode 必须传 --prompt");
  }
  const system = args.system || preset?.system || "You are a helpful assistant.";
  const responseFormat = String(args["response-format"] || preset?.responseFormat || "text");
  const maxCompletionTokens = toNumber(args["max-completion-tokens"], preset?.maxCompletionTokens || 256);
  const temperature = toNumber(args.temperature, 1);
  const model = String(args.model || "kimi-k2.6");
  const stream = toBoolean(args.stream, false);
  return {
    mode,
    model,
    stream,
    requestBody: {
      model,
      temperature,
      max_completion_tokens: maxCompletionTokens,
      response_format: { type: responseFormat },
      stream,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    },
  };
}

async function readStreamResponse(response) {
  const decoder = new TextDecoder("utf-8");
  const reader = response.body.getReader();
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text;
}

function parseStreamText(streamText) {
  const lines = streamText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"));
  let content = "";
  let finishReason = "";
  for (const line of lines) {
    const payloadText = line.slice(5).trim();
    if (!payloadText || payloadText === "[DONE]") {
      continue;
    }
    try {
      const payload = JSON.parse(payloadText);
      const choice = payload.choices?.[0];
      const delta = choice?.delta || {};
      if (typeof delta.content === "string") {
        content += delta.content;
      }
      if (choice?.finish_reason) {
        finishReason = String(choice.finish_reason);
      }
    } catch {
      // Ignore malformed chunks and keep raw output in saved artifacts.
    }
  }
  return { content, finishReason };
}

async function main() {
  ensureDirectory(runtimeRoot);
  const args = parseArgs(process.argv.slice(2));
  if (toBoolean(args.help, false)) {
    printHelp();
    return;
  }

  const configText = readDomesticConfig();
  const keys = extractKimiKeys(configText);
  if (!keys.length) {
    throw new Error("未找到 Kimi API Key");
  }
  if (toBoolean(args["list-keys"], false)) {
    console.log(`找到 ${keys.length} 个 Kimi Key，可用 --key-index 1..${keys.length} 切换。`);
    return;
  }

  const keyIndex = Math.max(1, Math.floor(toNumber(args["key-index"], 1)));
  const apiKey = keys[keyIndex - 1];
  if (!apiKey) {
    throw new Error(`key-index 超出范围: ${keyIndex}，当前只有 ${keys.length} 个 key`);
  }

  const { mode, model, stream, requestBody } = buildRequestFromArgs(args);
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });
  const elapsedMs = Date.now() - started;

  const rawText = stream ? await readStreamResponse(response) : await response.text();
  const rawPath = path.join(runtimeRoot, `last-${mode}-${stream ? "stream" : "nonstream"}-response.txt`);
  fs.writeFileSync(rawPath, rawText, "utf8");

  let summary;
  if (stream) {
    const parsed = parseStreamText(rawText);
    summary = {
      ok: response.ok,
      status: response.status,
      mode,
      model,
      stream: true,
      elapsedMs,
      finishReason: parsed.finishReason || "",
      contentLength: parsed.content.length,
      contentPreview: parsed.content.slice(0, 400),
      rawPath,
      startedAt,
    };
  } else {
    let parsed = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = null;
    }
    const choice = parsed?.choices?.[0] || {};
    const message = choice.message || {};
    const content =
      typeof message.content === "string"
        ? message.content
        : Array.isArray(message.content)
          ? JSON.stringify(message.content)
          : "";
    const reasoning =
      typeof message.reasoning_content === "string"
        ? message.reasoning_content
        : "";
    summary = {
      ok: response.ok,
      status: response.status,
      mode,
      model,
      stream: false,
      elapsedMs,
      finishReason: String(choice.finish_reason || ""),
      contentLength: content.length,
      contentPreview: content.slice(0, 400),
      reasoningLength: reasoning.length,
      usage: parsed?.usage || null,
      error: parsed?.error || null,
      rawPath,
      startedAt,
    };
  }

  const summaryPath = path.join(runtimeRoot, "last-summary.json");
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(summary, null, 2));
  console.log("");
  console.log(`Summary saved to: ${summaryPath}`);
  console.log(`Raw response saved to: ${rawPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
