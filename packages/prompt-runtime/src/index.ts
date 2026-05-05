export type PromptRenderInput = Record<string, string | number | boolean | null | undefined>;

export function renderPrompt(template: string, input: PromptRenderInput): string {
  return Object.entries(input).reduce((result, [key, value]) => {
    return result.replaceAll(`{{${key}}}`, String(value ?? ""));
  }, template);
}
