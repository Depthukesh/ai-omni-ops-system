const fs = require("node:fs");
const path = require("node:path");

const projectRoot = fs.realpathSync.native(path.resolve(__dirname, ".."));
const configRoot = path.resolve(projectRoot, "..");
const runtimeRoot = path.join(projectRoot, ".runtime");
const outputPath = path.join(runtimeRoot, "model-availability-results.json");

const thirdPartyConfigPath = path.join(configRoot, "第三方api接口文生文.txt");
const domesticConfigPath = path.join(configRoot, "第三方api接口文生文国内.txt");

function ensureRuntimeDir() {
  fs.mkdirSync(runtimeRoot, { recursive: true });
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function parseThirdPartyConfig(content) {
  const lines = content.split(/\r?\n/).map((line) => line.trim());
  const modelAnchor = lines.findIndex((line) => line.startsWith("model"));
  const baseUrls = lines
    .slice(0, Math.max(modelAnchor, 0))
    .filter((line) => line.startsWith("https://"));
  const models = modelAnchor >= 0 && lines[modelAnchor + 1]
    ? lines[modelAnchor + 1].split("、").map((item) => item.trim()).filter(Boolean)
    : [];
  const apiKeys = [...content.matchAll(/\bsk-[A-Za-z0-9]+\b/g)].map((match) => match[0]);

  return {
    baseUrls,
    models,
    apiKeys,
  };
}

function collectSection(content, startMarker, endMarker) {
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) {
    return "";
  }
  const tail = content.slice(startIndex);
  if (!endMarker) {
    return tail;
  }
  const endIndex = tail.indexOf(endMarker);
  return endIndex === -1 ? tail : tail.slice(0, endIndex);
}

function parseDomesticConfig(content) {
  const doubaoSection = collectSection(content, "model:", "deepseek：");
  const deepseekSection = collectSection(content, "deepseek：", "kimi:");
  const kimiSection = collectSection(content, "kimi:", "GLM：");
  const glmSection = collectSection(content, "GLM：", "");

  const doubaoModelLine = doubaoSection.match(/model:([^\n]+)/);
  const deepseekModelLine = deepseekSection.match(/deepseek：([^\n]+)/);
  const kimiModelLine = kimiSection.match(/kimi:([^\n]+)/);
  const glmModelLine = glmSection.match(/GLM：([^\n]+)/);

  return {
    doubao: {
      baseUrls: ["https://ark.cn-beijing.volces.com/api/v3"],
      completionPath: "/chat/completions",
      models: doubaoModelLine ? doubaoModelLine[1].split("、").map((item) => item.trim()).filter(Boolean) : [],
      apiKeys: [...doubaoSection.matchAll(/\bark-[A-Za-z0-9-]+\b/g)].map((match) => match[0]),
      temperature: 0.4,
    },
    deepseek: {
      baseUrls: ["https://api.deepseek.com"],
      completionPath: "/chat/completions",
      models: deepseekModelLine ? deepseekModelLine[1].split("、").map((item) => item.trim()).filter(Boolean) : [],
      apiKeys: [...deepseekSection.matchAll(/\bsk-[A-Za-z0-9]+\b/g)].map((match) => match[0]),
      temperature: 0.3,
    },
    kimi: {
      baseUrls: ["https://api.moonshot.cn"],
      completionPath: "/v1/chat/completions",
      models: kimiModelLine ? kimiModelLine[1].split("、").map((item) => item.trim()).filter(Boolean) : [],
      apiKeys: [...kimiSection.matchAll(/\bsk-[A-Za-z0-9]+\b/g)].map((match) => match[0]),
      temperature: 1,
    },
    glm: {
      baseUrls: ["https://open.bigmodel.cn"],
      completionPath: "/api/paas/v4/chat/completions",
      models: glmModelLine ? glmModelLine[1].split("、").map((item) => item.trim()).filter(Boolean) : [],
      apiKeys: [...glmSection.matchAll(/\b[A-Za-z0-9]+\.[A-Za-z0-9]+\b/g)].map((match) => match[0]),
      temperature: 0.3,
    },
  };
}

function normalizeError(error) {
  if (!error) {
    return "unknown";
  }
  if (error.name === "AbortError") {
    return "timeout";
  }
  return error.message || String(error);
}

function buildBody(model, temperature) {
  return {
    model,
    stream: false,
    temperature,
    max_tokens: 192,
    messages: [
      {
        role: "system",
        content: "You are a connectivity checker. Reply with JSON only.",
      },
      {
        role: "user",
        content: 'Return {"ok":true,"model":"<model>"} with the current model name filled in.',
      },
    ],
    response_format: { type: "json_object" },
  };
}

async function callModel({ baseUrl, completionPath, apiKey, model, temperature, providerName, timeoutMs }) {
  const url = `${baseUrl.replace(/\/$/, "")}${completionPath}`;
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(buildBody(model, temperature)),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const elapsedMs = Date.now() - startedAt;
    const rawText = await response.text();
    let parsed;
    try {
      parsed = rawText ? JSON.parse(rawText) : undefined;
    } catch {
      parsed = undefined;
    }

    const content =
      parsed?.choices?.[0]?.message?.content ||
      parsed?.choices?.[0]?.delta?.content ||
      parsed?.error?.message ||
      rawText.slice(0, 300);

    return {
      providerName,
      model,
      baseUrl,
      ok: response.ok,
      status: response.status,
      elapsedMs,
      reason: response.ok ? "ok" : `http_${response.status}`,
      finishReason: parsed?.choices?.[0]?.finish_reason || "",
      sample: String(content || "").trim(),
    };
  } catch (error) {
    return {
      providerName,
      model,
      baseUrl,
      ok: false,
      status: 0,
      elapsedMs: Date.now() - startedAt,
      reason: normalizeError(error),
      finishReason: "",
      sample: "",
    };
  }
}

async function runProviderChecks(providerName, config, options = {}) {
  const results = [];
  const timeoutMs = options.timeoutMs || 45000;

  for (const model of config.models) {
    for (const baseUrl of config.baseUrls) {
      let success = null;
      let lastFailure = null;

      for (const apiKey of config.apiKeys) {
        const result = await callModel({
          baseUrl,
          completionPath: config.completionPath,
          apiKey,
          model,
          temperature: config.temperature,
          providerName,
          timeoutMs,
        });

        if (result.ok) {
          success = result;
          break;
        }

        lastFailure = result;
        if (![401, 403].includes(result.status)) {
          break;
        }
      }

      results.push(success || lastFailure || {
        providerName,
        model,
        baseUrl,
        ok: false,
        status: 0,
        elapsedMs: 0,
        reason: "no_api_key",
        finishReason: "",
        sample: "",
      });
    }
  }

  return results;
}

async function main() {
  ensureRuntimeDir();

  const thirdPartyConfig = parseThirdPartyConfig(readText(thirdPartyConfigPath));
  const domesticConfig = parseDomesticConfig(readText(domesticConfigPath));

  const results = {
    generatedAt: new Date().toISOString(),
    thirdParty: await runProviderChecks(
      "THIRD_PARTY",
      {
        baseUrls: thirdPartyConfig.baseUrls,
        completionPath: "/v1/chat/completions",
        models: thirdPartyConfig.models,
        apiKeys: thirdPartyConfig.apiKeys,
        temperature: 0.3,
      },
      { timeoutMs: 45000 },
    ),
    doubaoArk: await runProviderChecks("ARK", domesticConfig.doubao, { timeoutMs: 60000 }),
    deepseek: await runProviderChecks("DEEPSEEK", domesticConfig.deepseek, { timeoutMs: 45000 }),
    kimi: await runProviderChecks("KIMI", domesticConfig.kimi, { timeoutMs: 45000 }),
    glm: await runProviderChecks("GLM", domesticConfig.glm, { timeoutMs: 45000 }),
  };

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`模型检测完成，结果已写入 ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
