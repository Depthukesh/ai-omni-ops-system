export type SkillProviderSelectionRule = {
  preferredModelName?: string;
  preferredProviderIds?: string[];
};

export type SkillProviderSelectionCandidate = {
  providerId?: string;
  models: string[];
};

export function applySkillProviderSelectionRule<T extends SkillProviderSelectionCandidate>(
  providers: T[],
  selection?: SkillProviderSelectionRule,
): T[] {
  const preferredProviderIds = Array.from(new Set((selection?.preferredProviderIds || []).map((item) => String(item || "").trim()).filter(Boolean)));
  const preferredModelName = String(selection?.preferredModelName || "").trim();

  if (preferredProviderIds.length) {
    const scopedProviders = providers.filter((item) => item.providerId && preferredProviderIds.includes(item.providerId));
    if (scopedProviders.length) {
      return scopedProviders;
    }
  }

  if (preferredModelName) {
    const exactModelProviders = providers.filter((item) => item.models.includes(preferredModelName));
    if (exactModelProviders.length) {
      return exactModelProviders;
    }
  }

  return providers;
}
