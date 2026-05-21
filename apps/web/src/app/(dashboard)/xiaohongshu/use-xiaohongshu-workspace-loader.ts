"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import { getMe } from "../../../services/auth";
import { getStoredCurrentBrandId } from "../../../services/auth-session";
import {
  getBrandPermissionSettings,
  type BrandPermissionSettingsRecord,
} from "../../../services/brand-growth";
import {
  annualMarketingPlanSeed,
  getAnnualMarketingPlanWorkspace,
  getGrowthReportWorkspace,
  getXiaohongshuMarketingCalendarWorkspace,
  getXiaohongshuMarketingPlanWorkspace,
  growthReportSeed,
  type XiaohongshuMarketingCalendarWorkspace,
  xiaohongshuMarketingPlanSeed,
} from "../../../services/reports";
import {
  buildXiaohongshuPlan,
  getDefaultProduct,
  getDefaultXiaohongshuAccount,
  getXiaohongshuWorkspace,
  type XiaohongshuGoal,
  type XiaohongshuNoteDraft,
  type XiaohongshuTone,
  type XiaohongshuTopicIdea,
  type XiaohongshuWorkspaceData,
} from "../../../services/xiaohongshu";
import {
  getXiaohongshuVideoProviders,
  getXiaohongshuOriginalReferenceTemplates,
  getXiaohongshuOriginalWorks,
  getXiaohongshuRewriteWorks,
  getXiaohongshuVideoWorks,
  type VideoProviderOptionRecord,
  type XhsOriginalReferenceTemplateCategoryRecord,
  type XhsOriginalReferenceTemplateRecord,
  type XiaohongshuOriginalWorkRecord,
  type XiaohongshuRewriteWorkRecord,
  type XiaohongshuVideoWorkRecord,
} from "../../../services/works";

type StateSetter<T> = Dispatch<SetStateAction<T>>;
type WorkspaceDataSource = "api" | "seed" | "error" | "loading";

function formatWorkspaceReadFailure(label: string, reason: unknown) {
  const message = reason instanceof Error ? reason.message : "";
  if (message.includes("当前账号没有该板块的查看权限")) {
    return `${label}无查看权限。`;
  }
  if (message.includes("当前账号无权访问该品牌")) {
    return `${label}所属品牌无访问权限。`;
  }
  if (message.trim()) {
    return `${label}读取失败：${message}`;
  }
  return `${label}读取失败。`;
}

interface UseXiaohongshuWorkspaceLoaderOptions {
  fallbackBrandId: string;
  goal: XiaohongshuGoal;
  tone: XiaohongshuTone;
  setWorkspace: StateSetter<XiaohongshuWorkspaceData>;
  setGrowthReportWorkspace: StateSetter<typeof growthReportSeed>;
  setAnnualPlanWorkspace: StateSetter<typeof annualMarketingPlanSeed>;
  setMarketingPlanWorkspace: StateSetter<typeof xiaohongshuMarketingPlanSeed>;
  setCalendarWorkspace: StateSetter<XiaohongshuMarketingCalendarWorkspace>;
  setSelectedProductId: StateSetter<string>;
  setSelectedAccountId: StateSetter<string>;
  setTopicIdeas: StateSetter<XiaohongshuTopicIdea[]>;
  setNoteDrafts: StateSetter<XiaohongshuNoteDraft[]>;
  setSelectedNoteId: StateSetter<string>;
  setOriginalWorks: StateSetter<XiaohongshuOriginalWorkRecord[]>;
  setRewriteWorks: StateSetter<XiaohongshuRewriteWorkRecord[]>;
  setVideoWorks: StateSetter<XiaohongshuVideoWorkRecord[]>;
  setVideoProviderOptions: StateSetter<VideoProviderOptionRecord[]>;
  setOriginalReferenceTemplateCategories: StateSetter<XhsOriginalReferenceTemplateCategoryRecord[]>;
  setOriginalReferenceTemplateItems: StateSetter<XhsOriginalReferenceTemplateRecord[]>;
  setIsLoadingOriginalReferenceTemplates: StateSetter<boolean>;
  setOriginalReferenceTemplatesError: StateSetter<string>;
  setIsLoading: StateSetter<boolean>;
  setBrandPermissionSettings: StateSetter<BrandPermissionSettingsRecord | null>;
  setCurrentBrandRole: StateSetter<string>;
  setHasWorkspaceAccess: StateSetter<boolean>;
  setNotice: StateSetter<string>;
  setErrorMessage: StateSetter<string>;
  setDataSource: StateSetter<WorkspaceDataSource>;
}

export function useXiaohongshuWorkspaceLoader(options: UseXiaohongshuWorkspaceLoaderOptions) {
  const resolveActiveBrandId = useCallback(async (fallbackBrandId: string) => {
    const me = await getMe().catch(() => null);
    return me?.currentBrandId || me?.brands?.[0]?.id || getStoredCurrentBrandId(fallbackBrandId) || fallbackBrandId;
  }, []);

  const loadWorkspace = useCallback(
    async (loadOptions?: { preserveMessages?: boolean }) => {
      const activeBrandId = await resolveActiveBrandId(options.fallbackBrandId);
      options.setIsLoading(true);
      options.setDataSource("loading");
      options.setIsLoadingOriginalReferenceTemplates(true);
      options.setOriginalReferenceTemplatesError("");
      if (!loadOptions?.preserveMessages) {
        options.setNotice("");
        options.setErrorMessage("");
      }

      const permissionSettingsResult = await getBrandPermissionSettings(activeBrandId);
      const permissionMap = permissionSettingsResult.currentUserPermissions;
      const hasAnyXiaohongshuViewPermission = Object.entries(permissionMap).some(
        ([key, flags]) => key.startsWith("xiaohongshu.") && Boolean(flags.view),
      );
      options.setBrandPermissionSettings(permissionSettingsResult);
      options.setCurrentBrandRole(permissionSettingsResult.currentUserRole);

      if (!hasAnyXiaohongshuViewPermission) {
        options.setHasWorkspaceAccess(false);
        options.setDataSource("api");
        options.setIsLoading(false);
        options.setIsLoadingOriginalReferenceTemplates(false);
        options.setErrorMessage("当前账号没有小红书板块的查看权限，请联系管理员在团队权限设置中开启对应板块后再进入。");
        return;
      }

      options.setHasWorkspaceAccess(true);
      const canViewPlan = Boolean(permissionMap["xiaohongshu.plan"]?.view);
      const canViewCalendar = Boolean(permissionMap["xiaohongshu.calendar"]?.view);
      const canViewOriginal = Boolean(permissionMap["xiaohongshu.original"]?.view);
      const canViewRemix = Boolean(permissionMap["xiaohongshu.remix"]?.view);
      const canViewVideo = Boolean(permissionMap["xiaohongshu.video"]?.view);
      const shouldFetchMarketingPlan = canViewPlan || canViewCalendar || canViewOriginal || canViewRemix || canViewVideo;
      const shouldFetchCalendar = canViewCalendar || canViewOriginal || canViewVideo;

      const [
        workspaceResult,
        growthReportResult,
        annualPlanResult,
        marketingPlanResult,
        calendarResult,
        originalWorksResult,
        rewriteWorksResult,
        videoWorksResult,
        videoProvidersResult,
        referenceTemplatesResult,
      ] = await Promise.allSettled([
        getXiaohongshuWorkspace(),
        getGrowthReportWorkspace(),
        getAnnualMarketingPlanWorkspace(),
        shouldFetchMarketingPlan ? getXiaohongshuMarketingPlanWorkspace() : Promise.resolve(xiaohongshuMarketingPlanSeed),
        shouldFetchCalendar
          ? getXiaohongshuMarketingCalendarWorkspace()
          : Promise.resolve({ history: [] } as XiaohongshuMarketingCalendarWorkspace),
        canViewOriginal ? getXiaohongshuOriginalWorks(activeBrandId) : Promise.resolve({ items: [] as XiaohongshuOriginalWorkRecord[] }),
        canViewRemix ? getXiaohongshuRewriteWorks(activeBrandId) : Promise.resolve({ items: [] as XiaohongshuRewriteWorkRecord[] }),
        canViewVideo ? getXiaohongshuVideoWorks(activeBrandId) : Promise.resolve({ items: [] as XiaohongshuVideoWorkRecord[] }),
        canViewVideo ? getXiaohongshuVideoProviders(activeBrandId) : Promise.resolve({ items: [] as VideoProviderOptionRecord[] }),
        canViewOriginal
          ? getXiaohongshuOriginalReferenceTemplates()
          : Promise.resolve({
              categories: [] as XhsOriginalReferenceTemplateCategoryRecord[],
              items: [] as XhsOriginalReferenceTemplateRecord[],
            }),
      ]);

      const messages: string[] = [];

      if (workspaceResult.status === "fulfilled") {
        const data = workspaceResult.value;
        options.setWorkspace(data);
        options.setDataSource("api");
        const nextProduct = getDefaultProduct(data.archive.products);
        const nextAccount = getDefaultXiaohongshuAccount(data.archive.platformAccounts);
        options.setSelectedProductId(nextProduct?.id || "");
        options.setSelectedAccountId(nextAccount?.id || "");

        const nextPlan = buildXiaohongshuPlan({
          brandName: data.archive.brand.brandName,
          productName: nextProduct?.productName || "主推产品",
          usageScenario: nextProduct?.usageScenario || "日常消费",
          goal: options.goal,
          tone: options.tone,
        });
        options.setTopicIdeas(nextPlan.topicIdeas);
        options.setNoteDrafts(nextPlan.noteDrafts);
        options.setSelectedNoteId(nextPlan.noteDrafts[0]?.id || "");
      } else {
        messages.push("小红书工作台接口暂不可用。页面保留当前数据，不再回退到演示数据。");
      }

      if (growthReportResult.status === "fulfilled") {
        options.setGrowthReportWorkspace(growthReportResult.value);
      } else {
        messages.push(formatWorkspaceReadFailure("品牌增长报告", growthReportResult.reason));
      }

      if (annualPlanResult.status === "fulfilled") {
        options.setAnnualPlanWorkspace(annualPlanResult.value);
      } else {
        messages.push(formatWorkspaceReadFailure("半年营销规划", annualPlanResult.reason));
      }

      if (marketingPlanResult.status === "fulfilled") {
        options.setMarketingPlanWorkspace(marketingPlanResult.value);
        if (marketingPlanResult.value.latestTask?.taskStatus === "FAILED" && marketingPlanResult.value.latestTask.errorMessage) {
          messages.push(`小红书营销策划方案生成失败：${marketingPlanResult.value.latestTask.errorMessage}`);
        }
      } else {
        messages.push(formatWorkspaceReadFailure("小红书营销策划方案", marketingPlanResult.reason));
      }

      if (calendarResult.status === "fulfilled") {
        options.setCalendarWorkspace(calendarResult.value);
        if (calendarResult.value.latestTask?.taskStatus === "FAILED" && calendarResult.value.latestTask.errorMessage) {
          messages.push(`营销日历生成失败：${calendarResult.value.latestTask.errorMessage}`);
        }
      } else {
        messages.push(formatWorkspaceReadFailure("营销日历", calendarResult.reason));
      }

      if (originalWorksResult.status === "fulfilled") {
        options.setOriginalWorks(originalWorksResult.value.items);
      } else {
        messages.push("原创笔记作品读取失败。");
      }

      if (rewriteWorksResult.status === "fulfilled") {
        options.setRewriteWorks(rewriteWorksResult.value.items);
      } else {
        messages.push("二创笔记作品读取失败。");
      }

      if (videoWorksResult.status === "fulfilled") {
        options.setVideoWorks(videoWorksResult.value.items);
      } else {
        messages.push("视频笔记作品读取失败。");
      }

      if (videoProvidersResult.status === "fulfilled" && videoProvidersResult.value.items.length) {
        options.setVideoProviderOptions(videoProvidersResult.value.items);
      } else if (videoProvidersResult.status === "rejected") {
        messages.push("视频模型选项读取失败，已保留当前默认配置。");
      }

      if (referenceTemplatesResult.status === "fulfilled") {
        options.setOriginalReferenceTemplateCategories(referenceTemplatesResult.value.categories);
        options.setOriginalReferenceTemplateItems(referenceTemplatesResult.value.items);
      } else {
        options.setOriginalReferenceTemplatesError("原创参考模板读取失败，请稍后重试。");
        messages.push("原创参考模板读取失败。");
      }

      if (workspaceResult.status === "fulfilled") {
        options.setDataSource("api");
      } else if (messages.length) {
        options.setDataSource("error");
      }

      if (messages.length) {
        options.setErrorMessage(messages.join(" "));
      }
      options.setIsLoading(false);
      options.setIsLoadingOriginalReferenceTemplates(false);
    },
    [options, resolveActiveBrandId],
  );

  const reloadOriginalReferenceTemplates = useCallback(async () => {
    options.setIsLoadingOriginalReferenceTemplates(true);
    options.setOriginalReferenceTemplatesError("");
    try {
      const result = await getXiaohongshuOriginalReferenceTemplates();
      options.setOriginalReferenceTemplateCategories(result.categories);
      options.setOriginalReferenceTemplateItems(result.items);
    } catch (error) {
      const message = error instanceof Error ? error.message : "原创参考模板读取失败";
      options.setOriginalReferenceTemplatesError(message);
    } finally {
      options.setIsLoadingOriginalReferenceTemplates(false);
    }
  }, [options]);

  const refreshMarketingPlanWorkspace = useCallback(
    async (silent = false) => {
      try {
        const nextWorkspace = await getXiaohongshuMarketingPlanWorkspace();
        options.setMarketingPlanWorkspace(nextWorkspace);
        if (nextWorkspace.latestTask?.taskStatus === "FAILED" && nextWorkspace.latestTask.errorMessage) {
          options.setErrorMessage(`小红书营销策划方案生成失败：${nextWorkspace.latestTask.errorMessage}`);
        }
        if (nextWorkspace.latestTask?.taskStatus === "SUCCESS") {
          options.setNotice("小红书营销策划方案已生成完成，可继续编辑和保存。");
        }
      } catch (error) {
        if (!silent) {
          const message = error instanceof Error ? error.message : "刷新失败";
          options.setErrorMessage(`刷新小红书营销策划方案失败：${message}`);
        }
      }
    },
    [options],
  );

  const refreshCalendarWorkspace = useCallback(
    async (silent = false) => {
      try {
        const nextWorkspace = await getXiaohongshuMarketingCalendarWorkspace();
        options.setCalendarWorkspace(nextWorkspace);
        if (nextWorkspace.latestTask?.taskStatus === "FAILED" && nextWorkspace.latestTask.errorMessage) {
          options.setErrorMessage(`营销日历生成失败：${nextWorkspace.latestTask.errorMessage}`);
        }
        if (nextWorkspace.latestTask?.taskStatus === "SUCCESS") {
          options.setNotice("营销日历已生成完成，可按月份翻页查看，并继续生成接下来 7 天内容安排。");
        }
      } catch (error) {
        if (!silent) {
          const message = error instanceof Error ? error.message : "刷新失败";
          options.setErrorMessage(`刷新营销日历失败：${message}`);
        }
      }
    },
    [options],
  );

  return {
    loadWorkspace,
    reloadOriginalReferenceTemplates,
    refreshMarketingPlanWorkspace,
    refreshCalendarWorkspace,
  };
}
