import { BadRequestException } from "@nestjs/common";

type PromptInjectionGuardOptions = {
  fieldLabel?: string;
  strict?: boolean;
};

const BASE_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all|any|the)?\s*(previous|prior|above)\s+(instructions?|prompts?|rules?|messages?)/i,
  /忽略(所有|任何|以上|之前|前面).*(指令|提示词|规则|消息)/i,
  /(reveal|show|print|dump|expose|leak).*(system prompt|developer message|hidden prompt|secret|api key|token|cookie|authorization)/i,
  /(输出|展示|打印|泄露|暴露).*(系统提示词|开发者消息|隐藏提示词|密钥|令牌|cookie|授权)/i,
  /(bypass|disable|override|evade).*(safety|guardrail|policy|restriction|rule|filter)/i,
  /(绕过|关闭|禁用|覆盖|突破).*(安全|护栏|策略|限制|规则|过滤)/i,
  /(?:system prompt|developer message|tool call|function call|internal instruction)/i,
  /(?:<\s*system\s*>|<\s*developer\s*>|BEGIN[\s_-]*SYSTEM[\s_-]*PROMPT|END[\s_-]*SYSTEM[\s_-]*PROMPT)/i,
];

const STRICT_ONLY_PATTERNS: RegExp[] = [
  /(read|browse|list|dump|upload|send).*(local files?|filesystem|env|environment variables?|secrets?)/i,
  /(读取|浏览|列出|导出|上传|发送).*(本地文件|文件系统|环境变量|密钥|机密)/i,
];

function matchesPromptInjection(text: string, strict: boolean) {
  const patterns = strict ? [...BASE_INJECTION_PATTERNS, ...STRICT_ONLY_PATTERNS] : BASE_INJECTION_PATTERNS;
  return patterns.some((pattern) => pattern.test(text));
}

export function assertNoPromptInjection(value: unknown, options: PromptInjectionGuardOptions = {}) {
  if (typeof value !== "string") {
    return;
  }
  const normalized = value.trim();
  if (!normalized) {
    return;
  }
  if (!matchesPromptInjection(normalized, Boolean(options.strict))) {
    return;
  }
  throw new BadRequestException(`${options.fieldLabel || "文本内容"}疑似包含提示词注入或越权指令，请移除“忽略上文/泄露系统提示词/绕过安全规则”等内容后重试`);
}

export function normalizeSafeText(value: unknown, options: PromptInjectionGuardOptions = {}) {
  if (typeof value !== "string") {
    return value === null ? null : undefined;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  assertNoPromptInjection(normalized, options);
  return normalized;
}
