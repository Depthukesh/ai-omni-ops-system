"use client";

import { useEffect, useMemo, useState } from "react";
import {
  apiProviderSeed,
  archiveApiProvider,
  archiveKnowledgeBase,
  adminUserSeed,
  adminOrderSeed,
  billingRulesSeed,
  createApiProvider,
  createKnowledgeBase,
  createKnowledgeBaseFile,
  deleteApiProvider,
  deleteKnowledgeBase,
  deleteKnowledgeBaseFile,
  completeKnowledgeBaseSyncRun,
  getAdminOrders,
  getApiProviders,
  getKnowledgeBases,
  getKnowledgeBaseFiles,
  getKnowledgeBaseSyncRuns,
  getPromptTemplates,
  getAdminUsers,
  getBillingRules,
  getModelUsage,
  getSkillConfigs,
  knowledgeBaseFileSeed,
  knowledgeBaseSyncRunSeed,
  knowledgeBaseSeed,
  modelUsageSeed,
  promptTemplateSeed,
  skillConfigSeed,
  startKnowledgeBaseSync,
  syncKnowledgeBaseFile,
  updateAdminUser,
  updateApiProvider,
  updateKnowledgeBaseFile,
  updateKnowledgeBase,
  updatePromptTemplate,
  updateSkillConfig,
  updateBillingRules,
  type ApiProviderRecord,
  type AdminUserRecord,
  type BillingRules,
  type KnowledgeBaseFileMutationResult,
  type KnowledgeBaseFileRecord,
  type KnowledgeBaseRecord,
  type KnowledgeBaseSyncMutationResult,
  type KnowledgeBaseRunMutationResult,
  type KnowledgeBaseSyncRunRecord,
  type MembershipLevel,
  type MembershipPlanRule,
  type ModelUsageRecord,
  type PointsPackageRule,
  type PromptTemplateRecord,
  type SkillConfigRecord,
} from "../../../services/admin";
import { cancelOrder, payOrder, type OrderRecord } from "../../../services/personal-center";

type AdminTab = "orders" | "rules" | "users" | "usage" | "assets" | "knowledge" | "providers";
type UserEditDraft = {
  membership: MembershipLevel;
  pointsDelta: string;
};
type SkillEditDraft = {
  status: SkillConfigRecord["status"];
  defaultModel: string;
  pointsCost: string;
  description: string;
};
type PromptEditDraft = {
  status: PromptTemplateRecord["status"];
  modelName: string;
  temperature: string;
  maxTokens: string;
  content: string;
};
type KnowledgeBaseEditDraft = {
  status: KnowledgeBaseRecord["status"];
  syncStatus: KnowledgeBaseRecord["syncStatus"];
  sourceType: KnowledgeBaseRecord["sourceType"];
  description: string;
};
type ApiProviderEditDraft = {
  status: ApiProviderRecord["status"];
  baseUrl: string;
  modelWhitelist: string;
  maskedApiKey: string;
};
type CreateKnowledgeBaseDraft = {
  name: string;
  slug: string;
  sourceType: KnowledgeBaseRecord["sourceType"];
  description: string;
};
type CreateApiProviderDraft = {
  name: string;
  providerType: ApiProviderRecord["providerType"];
  baseUrl: string;
  modelWhitelist: string;
  maskedApiKey: string;
};
type CreateKnowledgeBaseFileDraft = {
  fileName: string;
  fileType: KnowledgeBaseFileRecord["fileType"];
  sourceName: string;
  chunkCount: string;
};
type SyncRunEditDraft = {
  summary: string;
  errorDetail: string;
};

const tabs: Array<{ key: AdminTab; label: string; description: string }> = [
  { key: "orders", label: "订单管理", description: "查看会员购买和点数充值订单，支持后台支付与取消。" },
  { key: "rules", label: "会员/积分规则", description: "维护会员方案、点数包与价格规则。" },
  { key: "users", label: "用户管理", description: "调整会员等级、增减点数，并查看用户规模与活跃情况。" },
  { key: "usage", label: "API/模型消耗", description: "查看模型任务量、点数成本、估算金额与最近调用时间。" },
  { key: "assets", label: "技能/提示词", description: "维护技能默认模型、点数成本和核心提示词模板。" },
  { key: "knowledge", label: "知识库管理", description: "维护知识库启停状态、数据源类型、同步状态与文档规模。" },
  { key: "providers", label: "API Providers", description: "维护模型供应商状态、Base URL、模型白名单与密钥占位信息。" },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("orders");
  const [orders, setOrders] = useState<OrderRecord[]>(adminOrderSeed);
  const [rules, setRules] = useState<BillingRules>(billingRulesSeed);
  const [users, setUsers] = useState<AdminUserRecord[]>(adminUserSeed);
  const [usage, setUsage] = useState<ModelUsageRecord[]>(modelUsageSeed);
  const [skills, setSkills] = useState<SkillConfigRecord[]>(skillConfigSeed);
  const [prompts, setPrompts] = useState<PromptTemplateRecord[]>(promptTemplateSeed);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseRecord[]>(knowledgeBaseSeed);
  const [knowledgeBaseFiles, setKnowledgeBaseFiles] = useState<KnowledgeBaseFileRecord[]>(knowledgeBaseFileSeed);
  const [knowledgeBaseSyncRuns, setKnowledgeBaseSyncRuns] = useState<KnowledgeBaseSyncRunRecord[]>(knowledgeBaseSyncRunSeed);
  const [knowledgeBaseSyncRunDrafts, setKnowledgeBaseSyncRunDrafts] = useState<Record<string, SyncRunEditDraft>>(
    buildSyncRunDrafts(knowledgeBaseSyncRunSeed),
  );
  const [providers, setProviders] = useState<ApiProviderRecord[]>(apiProviderSeed);
  const [userDrafts, setUserDrafts] = useState<Record<string, UserEditDraft>>(buildUserDrafts(adminUserSeed));
  const [skillDrafts, setSkillDrafts] = useState<Record<string, SkillEditDraft>>(buildSkillDrafts(skillConfigSeed));
  const [promptDrafts, setPromptDrafts] = useState<Record<string, PromptEditDraft>>(buildPromptDrafts(promptTemplateSeed));
  const [knowledgeBaseDrafts, setKnowledgeBaseDrafts] = useState<Record<string, KnowledgeBaseEditDraft>>(
    buildKnowledgeBaseDrafts(knowledgeBaseSeed),
  );
  const [providerDrafts, setProviderDrafts] = useState<Record<string, ApiProviderEditDraft>>(buildProviderDrafts(apiProviderSeed));
  const [newKnowledgeBase, setNewKnowledgeBase] = useState<CreateKnowledgeBaseDraft>(buildCreateKnowledgeBaseDraft());
  const [newKnowledgeBaseFileDrafts, setNewKnowledgeBaseFileDrafts] = useState<Record<string, CreateKnowledgeBaseFileDraft>>(
    buildKnowledgeBaseFileCreateDrafts(knowledgeBaseSeed),
  );
  const [newProvider, setNewProvider] = useState<CreateApiProviderDraft>(buildCreateApiProviderDraft());
  const [dataSource, setDataSource] = useState<"api" | "seed">("api");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState("");
  const [updatingSkillId, setUpdatingSkillId] = useState("");
  const [updatingPromptId, setUpdatingPromptId] = useState("");
  const [updatingKnowledgeBaseId, setUpdatingKnowledgeBaseId] = useState("");
  const [updatingKnowledgeBaseFileId, setUpdatingKnowledgeBaseFileId] = useState("");
  const [updatingKnowledgeBaseSyncRunId, setUpdatingKnowledgeBaseSyncRunId] = useState("");
  const [updatingProviderId, setUpdatingProviderId] = useState("");
  const [isCreatingKnowledgeBase, setIsCreatingKnowledgeBase] = useState(false);
  const [isCreatingProvider, setIsCreatingProvider] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void loadAdminData();
  }, []);

  async function loadAdminData() {
    setIsLoading(true);
    setNotice("");
    setErrorMessage("");

    const [
      orderResult,
      rulesResult,
      userResult,
      usageResult,
      skillResult,
      promptResult,
      knowledgeBaseResult,
      knowledgeBaseFilesResult,
      knowledgeBaseSyncRunsResult,
      providerResult,
    ] =
      await Promise.allSettled([
      getAdminOrders(),
      getBillingRules(),
      getAdminUsers(),
      getModelUsage(),
      getSkillConfigs(),
      getPromptTemplates(),
      getKnowledgeBases(),
      getKnowledgeBaseFiles(),
      getKnowledgeBaseSyncRuns(),
      getApiProviders(),
    ]);
    let usingSeed = false;

    if (orderResult.status === "fulfilled") {
      setOrders(orderResult.value);
    } else {
      setOrders(adminOrderSeed);
      usingSeed = true;
    }

    if (rulesResult.status === "fulfilled") {
      setRules(rulesResult.value);
    } else {
      setRules(billingRulesSeed);
      usingSeed = true;
    }

    if (userResult.status === "fulfilled") {
      setUsers(userResult.value);
      setUserDrafts(buildUserDrafts(userResult.value));
    } else {
      setUsers(adminUserSeed);
      setUserDrafts(buildUserDrafts(adminUserSeed));
      usingSeed = true;
    }

    if (usageResult.status === "fulfilled") {
      setUsage(usageResult.value);
    } else {
      setUsage(modelUsageSeed);
      usingSeed = true;
    }

    if (skillResult.status === "fulfilled") {
      setSkills(skillResult.value);
      setSkillDrafts(buildSkillDrafts(skillResult.value));
    } else {
      setSkills(skillConfigSeed);
      setSkillDrafts(buildSkillDrafts(skillConfigSeed));
      usingSeed = true;
    }

    if (promptResult.status === "fulfilled") {
      setPrompts(promptResult.value);
      setPromptDrafts(buildPromptDrafts(promptResult.value));
    } else {
      setPrompts(promptTemplateSeed);
      setPromptDrafts(buildPromptDrafts(promptTemplateSeed));
      usingSeed = true;
    }

    if (knowledgeBaseResult.status === "fulfilled") {
      setKnowledgeBases(knowledgeBaseResult.value);
      setKnowledgeBaseDrafts(buildKnowledgeBaseDrafts(knowledgeBaseResult.value));
      setNewKnowledgeBaseFileDrafts(buildKnowledgeBaseFileCreateDrafts(knowledgeBaseResult.value));
    } else {
      setKnowledgeBases(knowledgeBaseSeed);
      setKnowledgeBaseDrafts(buildKnowledgeBaseDrafts(knowledgeBaseSeed));
      setNewKnowledgeBaseFileDrafts(buildKnowledgeBaseFileCreateDrafts(knowledgeBaseSeed));
      usingSeed = true;
    }

    if (knowledgeBaseFilesResult.status === "fulfilled") {
      setKnowledgeBaseFiles(knowledgeBaseFilesResult.value);
    } else {
      setKnowledgeBaseFiles(knowledgeBaseFileSeed);
      usingSeed = true;
    }

    if (knowledgeBaseSyncRunsResult.status === "fulfilled") {
      setKnowledgeBaseSyncRuns(knowledgeBaseSyncRunsResult.value);
      setKnowledgeBaseSyncRunDrafts(buildSyncRunDrafts(knowledgeBaseSyncRunsResult.value));
    } else {
      setKnowledgeBaseSyncRuns(knowledgeBaseSyncRunSeed);
      setKnowledgeBaseSyncRunDrafts(buildSyncRunDrafts(knowledgeBaseSyncRunSeed));
      usingSeed = true;
    }

    if (providerResult.status === "fulfilled") {
      setProviders(providerResult.value);
      setProviderDrafts(buildProviderDrafts(providerResult.value));
    } else {
      setProviders(apiProviderSeed);
      setProviderDrafts(buildProviderDrafts(apiProviderSeed));
      usingSeed = true;
    }

    if (usingSeed) {
      setDataSource("seed");
      setErrorMessage("部分后台接口暂不可用，当前已回退到本地演示数据。");
    } else {
      setDataSource("api");
    }

    setIsLoading(false);
  }

  async function handleOrderAction(orderId: string, action: "pay" | "cancel") {
    setNotice("");
    setErrorMessage("");

    try {
      const updated = action === "pay" ? await payOrder(orderId) : await cancelOrder(orderId);
      setOrders((current) =>
        current.map((item) => (item.id === orderId ? { ...item, ...updated } : item)),
      );
      setNotice(action === "pay" ? `订单已支付：${updated.orderNo}` : `订单已取消：${updated.orderNo}`);
    } catch (error) {
      if (dataSource === "seed") {
        setOrders((current) =>
          current.map((item) => {
            if (item.id !== orderId || item.orderStatus !== "PENDING") {
              return item;
            }

            const now = new Date().toISOString();
            return {
              ...item,
              orderStatus: action === "pay" ? "PAID" : "CANCELLED",
              paidAt: action === "pay" ? now : item.paidAt,
              updatedAt: now,
            };
          }),
        );
        setNotice(action === "pay" ? "已更新演示订单为已支付状态。" : "已更新演示订单为已取消状态。");
        return;
      }

      const message = error instanceof Error ? error.message : "订单操作失败";
      setErrorMessage(`订单操作失败：${message}`);
    }
  }

  async function handleSaveRules() {
    setIsSavingRules(true);
    setNotice("");
    setErrorMessage("");

    try {
      const nextRules = await updateBillingRules(rules);
      setRules(nextRules);
      setNotice("会员与积分规则已保存。");
    } catch (error) {
      if (dataSource === "seed") {
        setNotice("后台接口暂不可用，当前已保存为本地演示规则。");
        return;
      }

      const message = error instanceof Error ? error.message : "规则保存失败";
      setErrorMessage(`规则保存失败：${message}`);
    } finally {
      setIsSavingRules(false);
    }
  }

  async function handleSaveUser(userId: string) {
    const draft = userDrafts[userId];
    if (!draft) {
      return;
    }

    setUpdatingUserId(userId);
    setNotice("");
    setErrorMessage("");

    const pointsDelta = Number(draft.pointsDelta || 0);

    try {
      const updated = await updateAdminUser(userId, {
        membership: draft.membership,
        pointsDelta,
      });

      setUsers((current) => current.map((item) => (item.id === userId ? updated : item)));
      setUserDrafts((current) => ({
        ...current,
        [userId]: {
          membership: updated.membership,
          pointsDelta: "0",
        },
      }));
      setNotice(`用户信息已更新：${updated.nickname || updated.mobile}`);
    } catch (error) {
      if (dataSource === "seed") {
        setUsers((current) =>
          current.map((item) =>
            item.id === userId
              ? {
                  ...item,
                  membership: draft.membership,
                  pointsBalance: item.pointsBalance + pointsDelta,
                  updatedAt: new Date().toISOString(),
                }
              : item,
          ),
        );
        setUserDrafts((current) => ({
          ...current,
          [userId]: {
            membership: draft.membership,
            pointsDelta: "0",
          },
        }));
        setNotice("用户信息已更新到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "用户更新失败";
      setErrorMessage(`用户更新失败：${message}`);
    } finally {
      setUpdatingUserId("");
    }
  }

  function handleUserDraftChange(userId: string, patch: Partial<UserEditDraft>) {
    setUserDrafts((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] || { membership: "FREE", pointsDelta: "0" }),
        ...patch,
      },
    }));
  }

  async function handleSaveSkill(skillId: string) {
    const draft = skillDrafts[skillId];
    if (!draft) {
      return;
    }

    setUpdatingSkillId(skillId);
    setNotice("");
    setErrorMessage("");

    try {
      const updated = await updateSkillConfig(skillId, {
        status: draft.status,
        defaultModel: draft.defaultModel,
        pointsCost: Number(draft.pointsCost || 0),
        description: draft.description,
      });

      setSkills((current) => current.map((item) => (item.id === skillId ? updated : item)));
      setSkillDrafts((current) => ({
        ...current,
        [skillId]: buildSkillDraft(updated),
      }));
      setNotice(`技能配置已更新：${updated.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const updatedAt = new Date().toISOString();
        setSkills((current) =>
          current.map((item) =>
            item.id === skillId
              ? {
                  ...item,
                  status: draft.status,
                  defaultModel: draft.defaultModel,
                  pointsCost: Number(draft.pointsCost || 0),
                  description: draft.description,
                  updatedAt,
                }
              : item,
          ),
        );
        setNotice("技能配置已更新到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "技能配置保存失败";
      setErrorMessage(`技能配置保存失败：${message}`);
    } finally {
      setUpdatingSkillId("");
    }
  }

  async function handleSavePrompt(promptId: string) {
    const draft = promptDrafts[promptId];
    if (!draft) {
      return;
    }

    setUpdatingPromptId(promptId);
    setNotice("");
    setErrorMessage("");

    try {
      const updated = await updatePromptTemplate(promptId, {
        status: draft.status,
        modelName: draft.modelName,
        temperature: Number(draft.temperature || 0),
        maxTokens: Number(draft.maxTokens || 0),
        content: draft.content,
      });

      setPrompts((current) => current.map((item) => (item.id === promptId ? updated : item)));
      setPromptDrafts((current) => ({
        ...current,
        [promptId]: buildPromptDraft(updated),
      }));
      setNotice(`提示词模板已更新：${updated.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const updatedAt = new Date().toISOString();
        setPrompts((current) =>
          current.map((item) =>
            item.id === promptId
              ? {
                  ...item,
                  status: draft.status,
                  modelName: draft.modelName,
                  temperature: Number(draft.temperature || 0),
                  maxTokens: Number(draft.maxTokens || 0),
                  content: draft.content,
                  updatedAt,
                }
              : item,
          ),
        );
        setNotice("提示词模板已更新到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "提示词模板保存失败";
      setErrorMessage(`提示词模板保存失败：${message}`);
    } finally {
      setUpdatingPromptId("");
    }
  }

  function handleSkillDraftChange(skillId: string, patch: Partial<SkillEditDraft>) {
    setSkillDrafts((current) => ({
      ...current,
      [skillId]: {
        ...(current[skillId] || buildSkillDraft(skillConfigSeed[0])),
        ...patch,
      },
    }));
  }

  function handlePromptDraftChange(promptId: string, patch: Partial<PromptEditDraft>) {
    setPromptDrafts((current) => ({
      ...current,
      [promptId]: {
        ...(current[promptId] || buildPromptDraft(promptTemplateSeed[0])),
        ...patch,
      },
    }));
  }

  async function handleSaveKnowledgeBase(knowledgeBaseId: string) {
    const draft = knowledgeBaseDrafts[knowledgeBaseId];
    if (!draft) {
      return;
    }

    setUpdatingKnowledgeBaseId(knowledgeBaseId);
    setNotice("");
    setErrorMessage("");

    try {
      const updated = await updateKnowledgeBase(knowledgeBaseId, {
        status: draft.status,
        syncStatus: draft.syncStatus,
        sourceType: draft.sourceType,
        description: draft.description,
      });

      setKnowledgeBases((current) => current.map((item) => (item.id === knowledgeBaseId ? updated : item)));
      setKnowledgeBaseDrafts((current) => ({
        ...current,
        [knowledgeBaseId]: buildKnowledgeBaseDraft(updated),
      }));
      setNotice(`知识库已更新：${updated.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const updatedAt = new Date().toISOString();
        setKnowledgeBases((current) =>
          current.map((item) =>
            item.id === knowledgeBaseId
              ? {
                  ...item,
                  status: draft.status,
                  syncStatus: draft.syncStatus,
                  sourceType: draft.sourceType,
                  description: draft.description,
                  updatedAt,
                }
              : item,
          ),
        );
        setNotice("知识库配置已更新到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "知识库保存失败";
      setErrorMessage(`知识库保存失败：${message}`);
    } finally {
      setUpdatingKnowledgeBaseId("");
    }
  }

  function handleKnowledgeBaseDraftChange(knowledgeBaseId: string, patch: Partial<KnowledgeBaseEditDraft>) {
    setKnowledgeBaseDrafts((current) => ({
      ...current,
      [knowledgeBaseId]: {
        ...(current[knowledgeBaseId] || buildKnowledgeBaseDraft(knowledgeBaseSeed[0])),
        ...patch,
      },
    }));
  }

  function handleKnowledgeBaseFileDraftChange(knowledgeBaseId: string, patch: Partial<CreateKnowledgeBaseFileDraft>) {
    setNewKnowledgeBaseFileDrafts((current) => ({
      ...current,
      [knowledgeBaseId]: {
        ...(current[knowledgeBaseId] || buildCreateKnowledgeBaseFileDraft()),
        ...patch,
      },
    }));
  }

  function handleSyncRunDraftChange(runId: string, patch: Partial<SyncRunEditDraft>) {
    setKnowledgeBaseSyncRunDrafts((current) => ({
      ...current,
      [runId]: {
        ...(current[runId] || buildSyncRunDraft()),
        ...patch,
      },
    }));
  }

  async function handleArchiveKnowledgeBase(knowledgeBaseId: string) {
    setUpdatingKnowledgeBaseId(knowledgeBaseId);
    setNotice("");
    setErrorMessage("");

    try {
      const updated = await archiveKnowledgeBase(knowledgeBaseId);
      setKnowledgeBases((current) => current.map((item) => (item.id === knowledgeBaseId ? updated : item)));
      setKnowledgeBaseDrafts((current) => ({
        ...current,
        [knowledgeBaseId]: buildKnowledgeBaseDraft(updated),
      }));
      setNotice(`知识库已归档：${updated.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const updatedAt = new Date().toISOString();
        setKnowledgeBases((current) =>
          current.map((item) =>
            item.id === knowledgeBaseId
              ? {
                  ...item,
                  status: "DISABLED",
                  updatedAt,
                }
              : item,
          ),
        );
        setKnowledgeBaseDrafts((current) => ({
          ...current,
          [knowledgeBaseId]: {
            ...(current[knowledgeBaseId] || buildKnowledgeBaseDraft(knowledgeBaseSeed[0])),
            status: "DISABLED",
          },
        }));
        setNotice("知识库已归档到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "知识库归档失败";
      setErrorMessage(`知识库归档失败：${message}`);
    } finally {
      setUpdatingKnowledgeBaseId("");
    }
  }

  async function handleDeleteKnowledgeBase(knowledgeBaseId: string) {
    setUpdatingKnowledgeBaseId(knowledgeBaseId);
    setNotice("");
    setErrorMessage("");

    try {
      const removed = await deleteKnowledgeBase(knowledgeBaseId);
      setKnowledgeBases((current) => current.filter((item) => item.id !== knowledgeBaseId));
      setKnowledgeBaseFiles((current) => current.filter((item) => item.knowledgeBaseId !== knowledgeBaseId));
      setKnowledgeBaseDrafts((current) => {
        const next = { ...current };
        delete next[knowledgeBaseId];
        return next;
      });
      setNewKnowledgeBaseFileDrafts((current) => {
        const next = { ...current };
        delete next[knowledgeBaseId];
        return next;
      });
      setNotice(`知识库已删除：${removed.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const removed = knowledgeBases.find((item) => item.id === knowledgeBaseId);
        setKnowledgeBases((current) => current.filter((item) => item.id !== knowledgeBaseId));
        setKnowledgeBaseFiles((current) => current.filter((item) => item.knowledgeBaseId !== knowledgeBaseId));
        setKnowledgeBaseDrafts((current) => {
          const next = { ...current };
          delete next[knowledgeBaseId];
          return next;
        });
        setNewKnowledgeBaseFileDrafts((current) => {
          const next = { ...current };
          delete next[knowledgeBaseId];
          return next;
        });
        setNotice(`知识库已从本地演示数据删除：${removed?.name || knowledgeBaseId}`);
        return;
      }

      const message = error instanceof Error ? error.message : "知识库删除失败";
      setErrorMessage(`知识库删除失败：${message}`);
    } finally {
      setUpdatingKnowledgeBaseId("");
    }
  }

  async function handleCreateKnowledgeBase() {
    setIsCreatingKnowledgeBase(true);
    setNotice("");
    setErrorMessage("");

    try {
      const created = await createKnowledgeBase({
        name: newKnowledgeBase.name,
        slug: newKnowledgeBase.slug,
        sourceType: newKnowledgeBase.sourceType,
        description: newKnowledgeBase.description,
      });

      setKnowledgeBases((current) => [created, ...current]);
      setKnowledgeBaseDrafts((current) => ({
        [created.id]: buildKnowledgeBaseDraft(created),
        ...current,
      }));
      setNewKnowledgeBaseFileDrafts((current) => ({
        [created.id]: buildCreateKnowledgeBaseFileDraft(),
        ...current,
      }));
      setNewKnowledgeBase(buildCreateKnowledgeBaseDraft());
      setNotice(`知识库已创建：${created.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const createdAt = new Date().toISOString();
        const created: KnowledgeBaseRecord = {
          id: `kb_local_${Date.now()}`,
          name: newKnowledgeBase.name,
          slug: newKnowledgeBase.slug,
          sourceType: newKnowledgeBase.sourceType,
          status: "DRAFT",
          syncStatus: "IDLE",
          documentCount: 0,
          chunkCount: 0,
          description: newKnowledgeBase.description,
          updatedAt: createdAt,
        };
        setKnowledgeBases((current) => [created, ...current]);
        setKnowledgeBaseDrafts((current) => ({
          [created.id]: buildKnowledgeBaseDraft(created),
          ...current,
        }));
        setNewKnowledgeBaseFileDrafts((current) => ({
          [created.id]: buildCreateKnowledgeBaseFileDraft(),
          ...current,
        }));
        setNewKnowledgeBase(buildCreateKnowledgeBaseDraft());
        setNotice("知识库已创建到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "知识库创建失败";
      setErrorMessage(`知识库创建失败：${message}`);
    } finally {
      setIsCreatingKnowledgeBase(false);
    }
  }

  async function handleCreateKnowledgeBaseFile(knowledgeBaseId: string) {
    const draft = newKnowledgeBaseFileDrafts[knowledgeBaseId];
    if (!draft || !draft.fileName.trim()) {
      return;
    }

    setUpdatingKnowledgeBaseFileId(knowledgeBaseId);
    setNotice("");
    setErrorMessage("");

    const chunkCount = Number(draft.chunkCount || 0);

    try {
      const result = await createKnowledgeBaseFile(knowledgeBaseId, {
        fileName: draft.fileName,
        fileType: draft.fileType,
        sourceName: draft.sourceName,
        chunkCount,
      });
      applyKnowledgeBaseFileMutation(result, "create");
      setNewKnowledgeBaseFileDrafts((current) => ({
        ...current,
        [knowledgeBaseId]: buildCreateKnowledgeBaseFileDraft(),
      }));
      setNotice(`知识库文件已新增：${result.file.fileName}`);
    } catch (error) {
      if (dataSource === "seed") {
        const now = new Date().toISOString();
        const file: KnowledgeBaseFileRecord = {
          id: `kbf_local_${Date.now()}`,
          knowledgeBaseId,
          fileName: draft.fileName,
          fileType: draft.fileType,
          sourceName: draft.sourceName || "后台手动录入",
          chunkCount,
          status: chunkCount > 0 ? "INDEXED" : "PENDING",
          uploadedAt: now,
        };
        const knowledgeBase = knowledgeBases.find((item) => item.id === knowledgeBaseId);
        if (knowledgeBase) {
          applyKnowledgeBaseFileMutation(
            {
              file,
              knowledgeBase: {
                ...knowledgeBase,
                documentCount: knowledgeBase.documentCount + 1,
                chunkCount: knowledgeBase.chunkCount + chunkCount,
                updatedAt: now,
              },
            },
            "create",
          );
        }
        setNewKnowledgeBaseFileDrafts((current) => ({
          ...current,
          [knowledgeBaseId]: buildCreateKnowledgeBaseFileDraft(),
        }));
        setNotice("知识库文件已新增到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "知识库文件新增失败";
      setErrorMessage(`知识库文件新增失败：${message}`);
    } finally {
      setUpdatingKnowledgeBaseFileId("");
    }
  }

  async function handleDeleteKnowledgeBaseFile(fileId: string) {
    setUpdatingKnowledgeBaseFileId(fileId);
    setNotice("");
    setErrorMessage("");

    try {
      const result = await deleteKnowledgeBaseFile(fileId);
      applyKnowledgeBaseFileMutation(result, "delete");
      setKnowledgeBaseSyncRuns((current) => current.filter((item) => item.fileId !== fileId));
      setNotice(`知识库文件已删除：${result.file.fileName}`);
    } catch (error) {
      if (dataSource === "seed") {
        const file = knowledgeBaseFiles.find((item) => item.id === fileId);
        const knowledgeBase = knowledgeBases.find((item) => item.id === file?.knowledgeBaseId);
        if (file && knowledgeBase) {
          applyKnowledgeBaseFileMutation(
            {
              file,
              knowledgeBase: {
                ...knowledgeBase,
                documentCount: Math.max(0, knowledgeBase.documentCount - 1),
                chunkCount: Math.max(0, knowledgeBase.chunkCount - file.chunkCount),
                updatedAt: new Date().toISOString(),
              },
            },
            "delete",
          );
        }
        setKnowledgeBaseSyncRuns((current) => current.filter((item) => item.fileId !== fileId));
        setNotice(`知识库文件已从本地演示数据删除：${file?.fileName || fileId}`);
        return;
      }

      const message = error instanceof Error ? error.message : "知识库文件删除失败";
      setErrorMessage(`知识库文件删除失败：${message}`);
    } finally {
      setUpdatingKnowledgeBaseFileId("");
    }
  }

  async function handleUpdateKnowledgeBaseFileStatus(
    fileId: string,
    status: KnowledgeBaseFileRecord["status"],
  ) {
    setUpdatingKnowledgeBaseFileId(fileId);
    setNotice("");
    setErrorMessage("");

    try {
      const result = await updateKnowledgeBaseFile(fileId, { status });
      applyKnowledgeBaseFileMutation(result, "update");
      setNotice(`知识库文件状态已更新：${result.file.fileName}`);
    } catch (error) {
      if (dataSource === "seed") {
        const file = knowledgeBaseFiles.find((item) => item.id === fileId);
        const knowledgeBase = knowledgeBases.find((item) => item.id === file?.knowledgeBaseId);
        if (file && knowledgeBase) {
          const nextFile = { ...file, status };
          const relatedFiles = knowledgeBaseFiles
            .filter((item) => item.knowledgeBaseId === file.knowledgeBaseId)
            .map((item) => (item.id === fileId ? nextFile : item));
          applyKnowledgeBaseFileMutation(
            {
              file: nextFile,
              knowledgeBase: buildKnowledgeBaseSummary(knowledgeBase, relatedFiles),
            },
            "update",
          );
        }
        setNotice("知识库文件状态已更新到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "知识库文件状态更新失败";
      setErrorMessage(`知识库文件状态更新失败：${message}`);
    } finally {
      setUpdatingKnowledgeBaseFileId("");
    }
  }

  async function handleSyncKnowledgeBaseFile(fileId: string) {
    setUpdatingKnowledgeBaseFileId(fileId);
    setNotice("");
    setErrorMessage("");

    try {
      const result = await syncKnowledgeBaseFile(fileId);
      applyKnowledgeBaseFileMutation(result, "update");
      applyKnowledgeBaseSyncRun(result);
      setNotice(`知识库文件同步任务已创建：${result.file.fileName}`);
    } catch (error) {
      if (dataSource === "seed") {
        const file = knowledgeBaseFiles.find((item) => item.id === fileId);
        const knowledgeBase = knowledgeBases.find((item) => item.id === file?.knowledgeBaseId);
        if (file && knowledgeBase) {
          const nextFile = { ...file, status: "PENDING" as const };
          const relatedFiles = knowledgeBaseFiles
            .filter((item) => item.knowledgeBaseId === file.knowledgeBaseId)
            .map((item) => (item.id === fileId ? nextFile : item));
          const startedAt = new Date().toISOString();
          const result: KnowledgeBaseSyncMutationResult = {
            file: nextFile,
            knowledgeBase: {
              ...buildKnowledgeBaseSummary(knowledgeBase, relatedFiles, startedAt),
              syncStatus: "SYNCING",
            },
            run: {
              id: `kbsr_local_${Date.now()}`,
              knowledgeBaseId: knowledgeBase.id,
              scope: "FILE",
              operator: "后台管理员",
              fileId: nextFile.id,
              fileName: nextFile.fileName,
              result: "RUNNING",
              summary: "文件同步任务已创建，等待索引完成。",
              startedAt,
            },
          };
          applyKnowledgeBaseFileMutation(result, "update");
          applyKnowledgeBaseSyncRun(result);
        }
        setNotice("知识库文件同步任务已创建到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "知识库文件同步失败";
      setErrorMessage(`知识库文件同步失败：${message}`);
    } finally {
      setUpdatingKnowledgeBaseFileId("");
    }
  }

  async function handleStartKnowledgeBaseSync(knowledgeBaseId: string) {
    setUpdatingKnowledgeBaseId(knowledgeBaseId);
    setNotice("");
    setErrorMessage("");

    try {
      const result = await startKnowledgeBaseSync(knowledgeBaseId);
      applyKnowledgeBaseRunMutation(result);
      setNotice(`知识库全量同步任务已创建：${result.knowledgeBase.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const knowledgeBase = knowledgeBases.find((item) => item.id === knowledgeBaseId);
        if (knowledgeBase) {
          const startedAt = new Date().toISOString();
          applyKnowledgeBaseRunMutation({
            knowledgeBase: {
              ...knowledgeBase,
              syncStatus: "SYNCING",
              updatedAt: startedAt,
            },
            run: {
              id: `kbsr_local_full_${Date.now()}`,
              knowledgeBaseId,
              scope: "FULL",
              operator: "后台管理员",
              result: "RUNNING",
              summary: "全量同步任务已创建，正在扫描知识库文件。",
              startedAt,
            },
          });
        }
        setNotice("知识库全量同步任务已创建到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "知识库全量同步创建失败";
      setErrorMessage(`知识库全量同步创建失败：${message}`);
    } finally {
      setUpdatingKnowledgeBaseId("");
    }
  }

  async function handleCompleteKnowledgeBaseSyncRun(runId: string, result: "SUCCESS" | "FAILED") {
    const draft = knowledgeBaseSyncRunDrafts[runId] || buildSyncRunDraft();
    setUpdatingKnowledgeBaseSyncRunId(runId);
    setNotice("");
    setErrorMessage("");

    try {
      const updated = await completeKnowledgeBaseSyncRun(runId, {
        result,
        summary: draft.summary,
        errorDetail: result === "FAILED" ? draft.errorDetail : undefined,
      });
      if (!updated.file && updated.run.scope === "FULL" && result === "SUCCESS") {
        setKnowledgeBaseFiles((current) =>
          current.map((item) =>
            item.knowledgeBaseId === updated.knowledgeBase.id && item.status !== "FAILED"
              ? {
                  ...item,
                  status: "INDEXED",
                }
              : item,
          ),
        );
      }
      applyKnowledgeBaseRunMutation(updated);
      setNotice(`同步记录已更新为 ${result}。`);
    } catch (error) {
      if (dataSource === "seed") {
        const currentRun = knowledgeBaseSyncRuns.find((item) => item.id === runId);
        const knowledgeBase = knowledgeBases.find((item) => item.id === currentRun?.knowledgeBaseId);
        if (currentRun && knowledgeBase) {
          const completedAt = new Date().toISOString();
          const updatedRun: KnowledgeBaseSyncRunRecord = {
            ...currentRun,
            result,
            summary: draft.summary || (result === "SUCCESS" ? "同步任务执行成功。" : "同步任务执行失败，请查看失败原因。"),
            errorDetail: result === "FAILED" ? draft.errorDetail || "未提供失败原因。" : undefined,
            completedAt,
          };

          let updatedFile = currentRun.fileId
            ? knowledgeBaseFiles.find((item) => item.id === currentRun.fileId)
            : undefined;
          if (updatedFile) {
            updatedFile = {
              ...updatedFile,
              status: result === "SUCCESS" ? "INDEXED" : "FAILED",
            };
          }

          const relatedFiles = knowledgeBaseFiles
            .filter((item) => item.knowledgeBaseId === knowledgeBase.id)
            .map((item) =>
              updatedFile && item.id === updatedFile.id
                ? updatedFile
                : currentRun.scope === "FULL" && result === "SUCCESS" && item.status !== "FAILED"
                  ? { ...item, status: "INDEXED" as const }
                  : item,
            );

          applyKnowledgeBaseRunMutation({
            knowledgeBase: buildKnowledgeBaseSummary(knowledgeBase, relatedFiles, completedAt),
            run: updatedRun,
            file: updatedFile,
          });
        }
        setNotice(`同步记录已更新到本地演示数据：${result}`);
        return;
      }

      const message = error instanceof Error ? error.message : "同步记录更新失败";
      setErrorMessage(`同步记录更新失败：${message}`);
    } finally {
      setUpdatingKnowledgeBaseSyncRunId("");
    }
  }

  function applyKnowledgeBaseFileMutation(result: KnowledgeBaseFileMutationResult, mode: "create" | "delete" | "update") {
    setKnowledgeBases((current) => current.map((item) => (item.id === result.knowledgeBase.id ? result.knowledgeBase : item)));
    setKnowledgeBaseDrafts((current) => ({
      ...current,
      [result.knowledgeBase.id]: buildKnowledgeBaseDraft(result.knowledgeBase),
    }));
    if (mode === "create") {
      setKnowledgeBaseFiles((current) => [result.file, ...current]);
    } else if (mode === "update") {
      setKnowledgeBaseFiles((current) => current.map((item) => (item.id === result.file.id ? result.file : item)));
    } else {
      setKnowledgeBaseFiles((current) => current.filter((item) => item.id !== result.file.id));
    }
  }

  function applyKnowledgeBaseSyncRun(result: KnowledgeBaseSyncMutationResult) {
    setKnowledgeBaseSyncRuns((current) => [result.run, ...current]);
    setKnowledgeBaseSyncRunDrafts((current) => ({
      ...current,
      [result.run.id]: buildSyncRunDraft(result.run),
    }));
  }

  function applyKnowledgeBaseRunMutation(result: KnowledgeBaseRunMutationResult) {
    setKnowledgeBases((current) => current.map((item) => (item.id === result.knowledgeBase.id ? result.knowledgeBase : item)));
    setKnowledgeBaseDrafts((current) => ({
      ...current,
      [result.knowledgeBase.id]: buildKnowledgeBaseDraft(result.knowledgeBase),
    }));
    if (result.file) {
      setKnowledgeBaseFiles((current) => current.map((item) => (item.id === result.file?.id ? result.file : item)));
    }
    setKnowledgeBaseSyncRuns((current) => {
      const exists = current.some((item) => item.id === result.run.id);
      return exists ? current.map((item) => (item.id === result.run.id ? result.run : item)) : [result.run, ...current];
    });
    setKnowledgeBaseSyncRunDrafts((current) => ({
      ...current,
      [result.run.id]: buildSyncRunDraft(result.run),
    }));
  }

  async function handleSaveProvider(providerId: string) {
    const draft = providerDrafts[providerId];
    if (!draft) {
      return;
    }

    setUpdatingProviderId(providerId);
    setNotice("");
    setErrorMessage("");

    try {
      const updated = await updateApiProvider(providerId, {
        status: draft.status,
        baseUrl: draft.baseUrl,
        modelWhitelist: draft.modelWhitelist
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        maskedApiKey: draft.maskedApiKey,
      });

      setProviders((current) => current.map((item) => (item.id === providerId ? updated : item)));
      setProviderDrafts((current) => ({
        ...current,
        [providerId]: buildProviderDraft(updated),
      }));
      setNotice(`API Provider 已更新：${updated.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const updatedAt = new Date().toISOString();
        setProviders((current) =>
          current.map((item) =>
            item.id === providerId
              ? {
                  ...item,
                  status: draft.status,
                  baseUrl: draft.baseUrl,
                  modelWhitelist: draft.modelWhitelist
                    .split(",")
                    .map((entry) => entry.trim())
                    .filter(Boolean),
                  maskedApiKey: draft.maskedApiKey,
                  updatedAt,
                }
              : item,
          ),
        );
        setNotice("API Provider 配置已更新到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "API Provider 保存失败";
      setErrorMessage(`API Provider 保存失败：${message}`);
    } finally {
      setUpdatingProviderId("");
    }
  }

  function handleProviderDraftChange(providerId: string, patch: Partial<ApiProviderEditDraft>) {
    setProviderDrafts((current) => ({
      ...current,
      [providerId]: {
        ...(current[providerId] || buildProviderDraft(apiProviderSeed[0])),
        ...patch,
      },
    }));
  }

  async function handleArchiveProvider(providerId: string) {
    setUpdatingProviderId(providerId);
    setNotice("");
    setErrorMessage("");

    try {
      const updated = await archiveApiProvider(providerId);
      setProviders((current) => current.map((item) => (item.id === providerId ? updated : item)));
      setProviderDrafts((current) => ({
        ...current,
        [providerId]: buildProviderDraft(updated),
      }));
      setNotice(`API Provider 已归档：${updated.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const updatedAt = new Date().toISOString();
        setProviders((current) =>
          current.map((item) =>
            item.id === providerId
              ? {
                  ...item,
                  status: "DISABLED",
                  updatedAt,
                }
              : item,
          ),
        );
        setProviderDrafts((current) => ({
          ...current,
          [providerId]: {
            ...(current[providerId] || buildProviderDraft(apiProviderSeed[0])),
            status: "DISABLED",
          },
        }));
        setNotice("API Provider 已归档到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "API Provider 归档失败";
      setErrorMessage(`API Provider 归档失败：${message}`);
    } finally {
      setUpdatingProviderId("");
    }
  }

  async function handleDeleteProvider(providerId: string) {
    setUpdatingProviderId(providerId);
    setNotice("");
    setErrorMessage("");

    try {
      const removed = await deleteApiProvider(providerId);
      setProviders((current) => current.filter((item) => item.id !== providerId));
      setProviderDrafts((current) => {
        const next = { ...current };
        delete next[providerId];
        return next;
      });
      setNotice(`API Provider 已删除：${removed.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const removed = providers.find((item) => item.id === providerId);
        setProviders((current) => current.filter((item) => item.id !== providerId));
        setProviderDrafts((current) => {
          const next = { ...current };
          delete next[providerId];
          return next;
        });
        setNotice(`API Provider 已从本地演示数据删除：${removed?.name || providerId}`);
        return;
      }

      const message = error instanceof Error ? error.message : "API Provider 删除失败";
      setErrorMessage(`API Provider 删除失败：${message}`);
    } finally {
      setUpdatingProviderId("");
    }
  }

  async function handleCreateProvider() {
    setIsCreatingProvider(true);
    setNotice("");
    setErrorMessage("");

    try {
      const created = await createApiProvider({
        name: newProvider.name,
        providerType: newProvider.providerType,
        baseUrl: newProvider.baseUrl,
        maskedApiKey: newProvider.maskedApiKey,
        modelWhitelist: newProvider.modelWhitelist
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });

      setProviders((current) => [created, ...current]);
      setProviderDrafts((current) => ({
        [created.id]: buildProviderDraft(created),
        ...current,
      }));
      setNewProvider(buildCreateApiProviderDraft());
      setNotice(`API Provider 已创建：${created.name}`);
    } catch (error) {
      if (dataSource === "seed") {
        const createdAt = new Date().toISOString();
        const created: ApiProviderRecord = {
          id: `provider_local_${Date.now()}`,
          name: newProvider.name,
          providerType: newProvider.providerType,
          status: "DRAFT",
          baseUrl: newProvider.baseUrl,
          modelWhitelist: newProvider.modelWhitelist
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          maskedApiKey: newProvider.maskedApiKey || "未配置",
          successRate: 0,
          requestCount24h: 0,
          totalCostYuan: 0,
          lastCalledAt: createdAt,
          updatedAt: createdAt,
        };
        setProviders((current) => [created, ...current]);
        setProviderDrafts((current) => ({
          [created.id]: buildProviderDraft(created),
          ...current,
        }));
        setNewProvider(buildCreateApiProviderDraft());
        setNotice("API Provider 已创建到本地演示数据。");
        return;
      }

      const message = error instanceof Error ? error.message : "API Provider 创建失败";
      setErrorMessage(`API Provider 创建失败：${message}`);
    } finally {
      setIsCreatingProvider(false);
    }
  }

  const summary = useMemo(
    () => ({
      orderCount: orders.length,
      pendingCount: orders.filter((item) => item.orderStatus === "PENDING").length,
      paidCount: orders.filter((item) => item.orderStatus === "PAID").length,
      userCount: users.length,
      planCount: rules.membershipPlans.length,
      packageCount: rules.pointsPackages.length,
      modelCount: usage.length,
      usagePoints: usage.reduce((total, item) => total + item.totalPointsCost, 0),
      skillCount: skills.length,
      promptCount: prompts.length,
      knowledgeBaseCount: knowledgeBases.length,
      providerCount: providers.length,
    }),
    [
      orders,
      rules.membershipPlans.length,
      rules.pointsPackages.length,
      users.length,
      usage,
      skills.length,
      prompts.length,
      knowledgeBases.length,
      providers.length,
    ],
  );

  return (
    <main className="dashboard-shell">
      <section className="dashboard-hero">
        <div>
          <span className="hero-badge">管理后台</span>
          <h1>后台运营管理台</h1>
          <p>当前后台已经扩展到七块核心运营能力：订单、计费规则、用户管理、API/模型消耗、技能与提示词、知识库管理、API Provider 管理，方便继续往真实产品形态推进。</p>
          <div className="workspace-toolbar top-toolbar">
            <div className="workspace-status">
              <span className="status-pill">{dataSource === "api" ? "接口数据" : "演示数据"}</span>
              {notice ? <span className="status-text success-text">{notice}</span> : null}
              {errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
            </div>
            <button type="button" className="secondary-button" onClick={() => void loadAdminData()}>
              {isLoading ? "刷新中..." : "刷新数据"}
            </button>
          </div>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span>订单总数</span>
          <strong>{summary.orderCount}</strong>
          <p>包含会员购买与点数充值订单。</p>
        </article>
        <article className="metric-card">
          <span>用户总数</span>
          <strong>{summary.userCount}</strong>
          <p>覆盖后台可管理的账户数量。</p>
        </article>
        <article className="metric-card">
          <span>待支付订单</span>
          <strong>{summary.pendingCount}</strong>
          <p>当前仍处于 `PENDING` 的订单数量。</p>
        </article>
        <article className="metric-card">
          <span>已支付订单</span>
          <strong>{summary.paidCount}</strong>
          <p>已经完成支付的订单数量。</p>
        </article>
        <article className="metric-card">
          <span>会员方案数</span>
          <strong>{summary.planCount}</strong>
          <p>当前配置中的会员方案数量。</p>
        </article>
        <article className="metric-card">
          <span>点数包数</span>
          <strong>{summary.packageCount}</strong>
          <p>当前配置中的点数包数量。</p>
        </article>
        <article className="metric-card">
          <span>模型数</span>
          <strong>{summary.modelCount}</strong>
          <p>当前纳入统计的模型与接口项。</p>
        </article>
        <article className="metric-card">
          <span>累计模型点数</span>
          <strong>{summary.usagePoints}</strong>
          <p>用于估算 API 调用的总消耗规模。</p>
        </article>
        <article className="metric-card">
          <span>技能数</span>
          <strong>{summary.skillCount}</strong>
          <p>当前已纳入后台配置的技能数量。</p>
        </article>
        <article className="metric-card">
          <span>提示词数</span>
          <strong>{summary.promptCount}</strong>
          <p>当前可维护的核心提示词模板数量。</p>
        </article>
        <article className="metric-card">
          <span>知识库数</span>
          <strong>{summary.knowledgeBaseCount}</strong>
          <p>当前已纳入后台管理的知识库数量。</p>
        </article>
        <article className="metric-card">
          <span>Provider 数</span>
          <strong>{summary.providerCount}</strong>
          <p>当前纳入平台配置的模型供应商数量。</p>
        </article>
      </section>

      <section className="panel personal-center-panel">
        <div className="personal-tabs">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.key}
              className={`personal-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <strong>{tab.label}</strong>
              <span>{tab.description}</span>
            </button>
          ))}
        </div>

        {activeTab === "orders" ? (
          <div className="personal-list">
            {orders.map((item) => (
              <article className="entity-card personal-card" key={item.id}>
                <div className="entity-card-head">
                  <div>
                    <strong>{item.orderNo}</strong>
                    <p className="personal-meta">
                      {(item.user?.nickname || "未知用户")} · {(item.user?.mobile || "无手机号")} · {item.amountYuan} 元
                    </p>
                  </div>
                  <span className={`archive-pill ${item.orderStatus === "PAID" ? "status-ready" : item.orderStatus === "CANCELLED" ? "status-paused" : "status-in_progress"}`}>
                    {item.orderStatus}
                  </span>
                </div>
                <div className="personal-grid">
                  <div>
                    <span>订单类型</span>
                    <strong>{item.orderType}</strong>
                  </div>
                  <div>
                    <span>会员/点数</span>
                    <strong>{item.orderType === "MEMBERSHIP_PURCHASE" ? item.membership || "-" : `${item.pointsAmount || 0} 点`}</strong>
                  </div>
                  <div>
                    <span>创建时间</span>
                    <strong>{formatDateTime(item.createdAt)}</strong>
                  </div>
                  <div>
                    <span>支付时间</span>
                    <strong>{item.paidAt ? formatDateTime(item.paidAt) : "未支付"}</strong>
                  </div>
                </div>
                <div className="personal-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void handleOrderAction(item.id, "pay")}
                    disabled={item.orderStatus !== "PENDING"}
                  >
                    后台标记支付
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => void handleOrderAction(item.id, "cancel")}
                    disabled={item.orderStatus !== "PENDING"}
                  >
                    取消订单
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : activeTab === "users" ? (
          <div className="personal-list">
            {users.map((item) => {
              const draft = userDrafts[item.id] || {
                membership: item.membership,
                pointsDelta: "0",
              };

              return (
                <article className="entity-card personal-card" key={item.id}>
                  <div className="entity-card-head">
                    <div>
                      <strong>{item.nickname || item.mobile}</strong>
                      <p className="personal-meta">
                        {item.mobile} · {item.email || "未填写邮箱"} · 会员 {item.membership}
                      </p>
                    </div>
                    <span className={`archive-pill ${item.status === "ACTIVE" ? "status-ready" : "status-paused"}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="personal-grid">
                    <div>
                      <span>点数余额</span>
                      <strong>{item.pointsBalance}</strong>
                    </div>
                    <div>
                      <span>品牌数</span>
                      <strong>{item.brandCount}</strong>
                    </div>
                    <div>
                      <span>任务数</span>
                      <strong>{item.taskCount}</strong>
                    </div>
                    <div>
                      <span>订单数</span>
                      <strong>{item.orderCount}</strong>
                    </div>
                    <div>
                      <span>创建时间</span>
                      <strong>{formatDateTime(item.createdAt)}</strong>
                    </div>
                    <div>
                      <span>更新时间</span>
                      <strong>{formatDateTime(item.updatedAt)}</strong>
                    </div>
                  </div>

                  <div className="admin-rules-stack">
                    <div className="admin-rule-grid">
                      <label>
                        <span>会员等级</span>
                        <select
                          value={draft.membership}
                          onChange={(event) =>
                            handleUserDraftChange(item.id, {
                              membership: event.target.value as MembershipLevel,
                            })
                          }
                        >
                          <option value="FREE">FREE</option>
                          <option value="BASIC">BASIC</option>
                          <option value="PRO">PRO</option>
                          <option value="ENTERPRISE">ENTERPRISE</option>
                        </select>
                      </label>
                      <label>
                        <span>点数调整</span>
                        <input
                          type="number"
                          value={draft.pointsDelta}
                          onChange={(event) =>
                            handleUserDraftChange(item.id, {
                              pointsDelta: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <div className="personal-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void handleSaveUser(item.id)}
                      disabled={updatingUserId === item.id}
                    >
                      {updatingUserId === item.id ? "保存中..." : "保存用户设置"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : activeTab === "usage" ? (
          <div className="personal-list">
            {usage.map((item) => (
              <article className="entity-card personal-card" key={item.id}>
                <div className="entity-card-head">
                  <div>
                    <strong>{item.modelName}</strong>
                    <p className="personal-meta">
                      {item.provider} · 最近调用 {formatDateTime(item.lastCalledAt)}
                    </p>
                  </div>
                  <span className="archive-pill status-ready">{item.taskCount} 次任务</span>
                </div>
                <div className="personal-grid">
                  <div>
                    <span>成功任务</span>
                    <strong>{item.successCount}</strong>
                  </div>
                  <div>
                    <span>失败任务</span>
                    <strong>{item.failedCount}</strong>
                  </div>
                  <div>
                    <span>总点数消耗</span>
                    <strong>{item.totalPointsCost}</strong>
                  </div>
                  <div>
                    <span>估算金额</span>
                    <strong>{item.estimatedAmountYuan} 元</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : activeTab === "assets" ? (
          <div className="admin-rules-layout">
            <section className="panel personal-center-panel">
              <div className="panel-header">
                <h2>技能配置</h2>
                <span>Skills</span>
              </div>
              <div className="admin-rules-stack">
                {skills.map((item) => {
                  const draft = skillDrafts[item.id] || buildSkillDraft(item);

                  return (
                    <article className="entity-card admin-rule-card" key={item.id}>
                      <div className="entity-card-head">
                        <div>
                          <strong>{item.name}</strong>
                          <p className="personal-meta">
                            {item.slug} · {item.category} · {item.provider}
                          </p>
                        </div>
                        <span className={`archive-pill ${getStatusClassName(item.status)}`}>{item.status}</span>
                      </div>
                      <div className="admin-rule-grid">
                        <label>
                          <span>状态</span>
                          <select
                            value={draft.status}
                            onChange={(event) =>
                              handleSkillDraftChange(item.id, {
                                status: event.target.value as SkillConfigRecord["status"],
                              })
                            }
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="DRAFT">DRAFT</option>
                            <option value="DISABLED">DISABLED</option>
                          </select>
                        </label>
                        <label>
                          <span>默认模型</span>
                          <input
                            value={draft.defaultModel}
                            onChange={(event) =>
                              handleSkillDraftChange(item.id, {
                                defaultModel: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          <span>点数成本</span>
                          <input
                            type="number"
                            value={draft.pointsCost}
                            onChange={(event) =>
                              handleSkillDraftChange(item.id, {
                                pointsCost: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          <span>更新时间</span>
                          <input value={formatDateTime(item.updatedAt)} readOnly />
                        </label>
                      </div>
                      <label className="admin-rule-description">
                        <span>技能说明</span>
                        <textarea
                          value={draft.description}
                          onChange={(event) =>
                            handleSkillDraftChange(item.id, {
                              description: event.target.value,
                            })
                          }
                        />
                      </label>
                      <div className="personal-actions">
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => void handleSaveSkill(item.id)}
                          disabled={updatingSkillId === item.id}
                        >
                          {updatingSkillId === item.id ? "保存中..." : "保存技能配置"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="panel personal-center-panel">
              <div className="panel-header">
                <h2>提示词模板</h2>
                <span>Prompts</span>
              </div>
              <div className="admin-rules-stack">
                {prompts.map((item) => {
                  const draft = promptDrafts[item.id] || buildPromptDraft(item);

                  return (
                    <article className="entity-card admin-rule-card" key={item.id}>
                      <div className="entity-card-head">
                        <div>
                          <strong>{item.name}</strong>
                          <p className="personal-meta">
                            {item.scene} · {item.version} · {item.modelName}
                          </p>
                        </div>
                        <span className={`archive-pill ${getStatusClassName(item.status)}`}>{item.status}</span>
                      </div>
                      <div className="admin-rule-grid">
                        <label>
                          <span>状态</span>
                          <select
                            value={draft.status}
                            onChange={(event) =>
                              handlePromptDraftChange(item.id, {
                                status: event.target.value as PromptTemplateRecord["status"],
                              })
                            }
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="DRAFT">DRAFT</option>
                            <option value="DISABLED">DISABLED</option>
                          </select>
                        </label>
                        <label>
                          <span>模型</span>
                          <input
                            value={draft.modelName}
                            onChange={(event) =>
                              handlePromptDraftChange(item.id, {
                                modelName: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          <span>Temperature</span>
                          <input
                            type="number"
                            step="0.1"
                            value={draft.temperature}
                            onChange={(event) =>
                              handlePromptDraftChange(item.id, {
                                temperature: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          <span>Max Tokens</span>
                          <input
                            type="number"
                            value={draft.maxTokens}
                            onChange={(event) =>
                              handlePromptDraftChange(item.id, {
                                maxTokens: event.target.value,
                              })
                            }
                          />
                        </label>
                      </div>
                      <label className="admin-rule-description">
                        <span>提示词内容</span>
                        <textarea
                          value={draft.content}
                          onChange={(event) =>
                            handlePromptDraftChange(item.id, {
                              content: event.target.value,
                            })
                          }
                        />
                      </label>
                      <div className="personal-actions">
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => void handleSavePrompt(item.id)}
                          disabled={updatingPromptId === item.id}
                        >
                          {updatingPromptId === item.id ? "保存中..." : "保存提示词"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        ) : activeTab === "knowledge" ? (
          <div className="personal-list">
            <article className="entity-card personal-card">
              <div className="entity-card-head">
                <div>
                  <strong>新建知识库</strong>
                  <p className="personal-meta">先创建知识库基础信息，后续再继续上传文件和配置同步。</p>
                </div>
                <span className="archive-pill status-in_progress">CREATE</span>
              </div>
              <div className="admin-rule-grid">
                <label>
                  <span>知识库名称</span>
                  <input
                    value={newKnowledgeBase.name}
                    onChange={(event) =>
                      setNewKnowledgeBase((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Slug</span>
                  <input
                    value={newKnowledgeBase.slug}
                    onChange={(event) =>
                      setNewKnowledgeBase((current) => ({
                        ...current,
                        slug: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  <span>数据源类型</span>
                  <select
                    value={newKnowledgeBase.sourceType}
                    onChange={(event) =>
                      setNewKnowledgeBase((current) => ({
                        ...current,
                        sourceType: event.target.value as KnowledgeBaseRecord["sourceType"],
                      }))
                    }
                  >
                    <option value="MANUAL">MANUAL</option>
                    <option value="FEISHU">FEISHU</option>
                    <option value="NOTION">NOTION</option>
                    <option value="OSS">OSS</option>
                  </select>
                </label>
              </div>
              <label className="admin-rule-description">
                <span>知识库说明</span>
                <textarea
                  value={newKnowledgeBase.description}
                  onChange={(event) =>
                    setNewKnowledgeBase((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="personal-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void handleCreateKnowledgeBase()}
                  disabled={isCreatingKnowledgeBase || !newKnowledgeBase.name.trim() || !newKnowledgeBase.slug.trim()}
                >
                  {isCreatingKnowledgeBase ? "创建中..." : "新建知识库"}
                </button>
              </div>
            </article>
            {knowledgeBases.map((item) => {
              const draft = knowledgeBaseDrafts[item.id] || buildKnowledgeBaseDraft(item);
              const fileDraft = newKnowledgeBaseFileDrafts[item.id] || buildCreateKnowledgeBaseFileDraft();
              const files = knowledgeBaseFiles.filter((file) => file.knowledgeBaseId === item.id);
              const syncRuns = knowledgeBaseSyncRuns.filter((run) => run.knowledgeBaseId === item.id);
              const latestSyncRun = syncRuns[0];
              const hasRunningSyncRun = syncRuns.some((run) => run.result === "RUNNING");

              return (
                <article className="entity-card personal-card" key={item.id}>
                  <div className="entity-card-head">
                    <div>
                      <strong>{item.name}</strong>
                      <p className="personal-meta">
                        {item.slug} · {item.sourceType} · 文档 {item.documentCount} 篇 · 分片 {item.chunkCount}
                      </p>
                    </div>
                    <span className={`archive-pill ${getStatusClassName(item.status)}`}>{item.status}</span>
                  </div>

                  <div className="personal-grid">
                    <div>
                      <span>同步状态</span>
                      <strong>{item.syncStatus}</strong>
                    </div>
                    <div>
                      <span>数据源类型</span>
                      <strong>{item.sourceType}</strong>
                    </div>
                    <div>
                      <span>文档数</span>
                      <strong>{item.documentCount}</strong>
                    </div>
                    <div>
                      <span>分片数</span>
                      <strong>{item.chunkCount}</strong>
                    </div>
                    <div>
                      <span>更新时间</span>
                      <strong>{formatDateTime(item.updatedAt)}</strong>
                    </div>
                    <div>
                      <span>最近同步结果</span>
                      <strong>{latestSyncRun ? latestSyncRun.result : "NO_RUNS"}</strong>
                    </div>
                  </div>

                  <div className="admin-rules-stack">
                    <div className="panel-header">
                      <h2>最近一次同步</h2>
                      <span>{latestSyncRun ? formatDateTime(latestSyncRun.startedAt) : "暂无记录"}</span>
                    </div>
                    {latestSyncRun ? (
                      <article className="entity-card admin-rule-card">
                        <div className="entity-card-head">
                          <div>
                            <strong>{getSyncRunTitle(latestSyncRun)}</strong>
                            <p className="personal-meta">{latestSyncRun.summary}</p>
                          </div>
                          <span
                            className={`archive-pill ${
                              latestSyncRun.result === "SUCCESS"
                                ? "status-ready"
                                : latestSyncRun.result === "FAILED"
                                  ? "status-paused"
                                  : "status-in_progress"
                            }`}
                          >
                            {latestSyncRun.result}
                          </span>
                        </div>
                        <div className="personal-grid">
                          <div>
                            <span>开始时间</span>
                            <strong>{formatDateTime(latestSyncRun.startedAt)}</strong>
                          </div>
                          <div>
                            <span>完成时间</span>
                            <strong>{latestSyncRun.completedAt ? formatDateTime(latestSyncRun.completedAt) : "进行中"}</strong>
                          </div>
                          <div>
                            <span>执行人</span>
                            <strong>{latestSyncRun.operator}</strong>
                          </div>
                        </div>
                        {latestSyncRun.errorDetail ? (
                          <p className="personal-meta">失败详情：{latestSyncRun.errorDetail}</p>
                        ) : null}
                      </article>
                    ) : (
                      <p className="personal-meta">当前还没有同步记录，先触发一次文件同步。</p>
                    )}
                  </div>

                  <div className="admin-rules-stack">
                    <div className="admin-rule-grid">
                      <label>
                        <span>启用状态</span>
                        <select
                          value={draft.status}
                          onChange={(event) =>
                            handleKnowledgeBaseDraftChange(item.id, {
                              status: event.target.value as KnowledgeBaseRecord["status"],
                            })
                          }
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="DRAFT">DRAFT</option>
                          <option value="DISABLED">DISABLED</option>
                        </select>
                      </label>
                      <label>
                        <span>同步状态</span>
                        <select
                          value={draft.syncStatus}
                          onChange={(event) =>
                            handleKnowledgeBaseDraftChange(item.id, {
                              syncStatus: event.target.value as KnowledgeBaseRecord["syncStatus"],
                            })
                          }
                        >
                          <option value="IDLE">IDLE</option>
                          <option value="SYNCING">SYNCING</option>
                          <option value="FAILED">FAILED</option>
                          <option value="SUCCESS">SUCCESS</option>
                        </select>
                      </label>
                      <label>
                        <span>数据源类型</span>
                        <select
                          value={draft.sourceType}
                          onChange={(event) =>
                            handleKnowledgeBaseDraftChange(item.id, {
                              sourceType: event.target.value as KnowledgeBaseRecord["sourceType"],
                            })
                          }
                        >
                          <option value="MANUAL">MANUAL</option>
                          <option value="FEISHU">FEISHU</option>
                          <option value="NOTION">NOTION</option>
                          <option value="OSS">OSS</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <label className="admin-rule-description">
                    <span>知识库说明</span>
                    <textarea
                      value={draft.description}
                      onChange={(event) =>
                        handleKnowledgeBaseDraftChange(item.id, {
                          description: event.target.value,
                        })
                      }
                    />
                  </label>

                  <div className="admin-rules-stack">
                    <div className="panel-header">
                      <h2>知识库文件</h2>
                      <span>{files.length} Files</span>
                    </div>
                    <div className="personal-actions">
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => void handleStartKnowledgeBaseSync(item.id)}
                        disabled={updatingKnowledgeBaseId === item.id || hasRunningSyncRun}
                      >
                        {updatingKnowledgeBaseId === item.id ? "同步中..." : "触发全量同步"}
                      </button>
                    </div>
                    <div className="admin-rule-grid">
                      <label>
                        <span>文件名</span>
                        <input
                          value={fileDraft.fileName}
                          onChange={(event) =>
                            handleKnowledgeBaseFileDraftChange(item.id, {
                              fileName: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>文件类型</span>
                        <select
                          value={fileDraft.fileType}
                          onChange={(event) =>
                            handleKnowledgeBaseFileDraftChange(item.id, {
                              fileType: event.target.value as KnowledgeBaseFileRecord["fileType"],
                            })
                          }
                        >
                          <option value="PDF">PDF</option>
                          <option value="DOCX">DOCX</option>
                          <option value="XLSX">XLSX</option>
                          <option value="MD">MD</option>
                          <option value="LINK">LINK</option>
                        </select>
                      </label>
                      <label>
                        <span>来源</span>
                        <input
                          value={fileDraft.sourceName}
                          onChange={(event) =>
                            handleKnowledgeBaseFileDraftChange(item.id, {
                              sourceName: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>分片数</span>
                        <input
                          type="number"
                          value={fileDraft.chunkCount}
                          onChange={(event) =>
                            handleKnowledgeBaseFileDraftChange(item.id, {
                              chunkCount: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className="personal-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleCreateKnowledgeBaseFile(item.id)}
                        disabled={updatingKnowledgeBaseFileId === item.id || !fileDraft.fileName.trim()}
                      >
                        {updatingKnowledgeBaseFileId === item.id ? "新增中..." : "新增文件"}
                      </button>
                    </div>
                    <div className="admin-rules-stack">
                      {files.length ? (
                        files.map((file) => (
                          <article className="entity-card admin-rule-card" key={file.id}>
                            <div className="entity-card-head">
                              <div>
                                <strong>{file.fileName}</strong>
                                <p className="personal-meta">
                                  {file.fileType} · {file.sourceName} · 分片 {file.chunkCount}
                                </p>
                              </div>
                              <span className={`archive-pill ${file.status === "INDEXED" ? "status-ready" : file.status === "FAILED" ? "status-paused" : "status-in_progress"}`}>
                                {file.status}
                              </span>
                            </div>
                            <div className="admin-rule-grid">
                              <label>
                                <span>文件状态</span>
                                <select
                                  value={file.status}
                                  onChange={(event) =>
                                    void handleUpdateKnowledgeBaseFileStatus(
                                      file.id,
                                      event.target.value as KnowledgeBaseFileRecord["status"],
                                    )
                                  }
                                  disabled={updatingKnowledgeBaseFileId === file.id}
                                >
                                  <option value="PENDING">PENDING</option>
                                  <option value="INDEXED">INDEXED</option>
                                  <option value="FAILED">FAILED</option>
                                </select>
                              </label>
                              <label>
                                <span>同步动作</span>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => void handleSyncKnowledgeBaseFile(file.id)}
                                  disabled={updatingKnowledgeBaseFileId === file.id || file.status === "INDEXED"}
                                >
                                  {file.status === "FAILED" ? "重试同步" : "触发同步"}
                                </button>
                              </label>
                            </div>
                            <div className="personal-actions">
                              <span className="personal-meta">上传时间 {formatDateTime(file.uploadedAt)}</span>
                              <button
                                type="button"
                                className="danger-button"
                                onClick={() => void handleDeleteKnowledgeBaseFile(file.id)}
                                disabled={updatingKnowledgeBaseFileId === file.id}
                              >
                                删除文件
                              </button>
                            </div>
                          </article>
                        ))
                      ) : (
                        <p className="personal-meta">暂无知识库文件，先从上方录入一条文件信息。</p>
                      )}
                    </div>
                  </div>

                  <div className="admin-rules-stack">
                    <div className="panel-header">
                      <h2>同步记录</h2>
                      <span>{syncRuns.length} Runs</span>
                    </div>
                    {syncRuns.length ? (
                      syncRuns.slice(0, 5).map((run) => {
                        const runDraft = knowledgeBaseSyncRunDrafts[run.id] || buildSyncRunDraft(run);

                        return (
                          <article className="entity-card admin-rule-card" key={run.id}>
                          <div className="entity-card-head">
                            <div>
                              <strong>{getSyncRunTitle(run)}</strong>
                              <p className="personal-meta">{run.summary}</p>
                            </div>
                            <span
                              className={`archive-pill ${
                                run.result === "SUCCESS"
                                  ? "status-ready"
                                  : run.result === "FAILED"
                                    ? "status-paused"
                                    : "status-in_progress"
                              }`}
                            >
                              {run.result}
                            </span>
                          </div>
                          <div className="personal-grid">
                            <div>
                              <span>开始时间</span>
                              <strong>{formatDateTime(run.startedAt)}</strong>
                            </div>
                            <div>
                              <span>完成时间</span>
                              <strong>{run.completedAt ? formatDateTime(run.completedAt) : "进行中"}</strong>
                            </div>
                            <div>
                              <span>执行人</span>
                              <strong>{run.operator}</strong>
                            </div>
                          </div>
                          {run.result === "RUNNING" ? (
                            <>
                              <div className="admin-rule-grid">
                                <label>
                                  <span>成功摘要</span>
                                  <input
                                    value={runDraft.summary}
                                    onChange={(event) =>
                                      handleSyncRunDraftChange(run.id, {
                                        summary: event.target.value,
                                      })
                                    }
                                  />
                                </label>
                              </div>
                              <label className="admin-rule-description">
                                <span>失败原因详情</span>
                                <textarea
                                  value={runDraft.errorDetail}
                                  onChange={(event) =>
                                    handleSyncRunDraftChange(run.id, {
                                      errorDetail: event.target.value,
                                    })
                                  }
                                />
                              </label>
                              <div className="personal-actions">
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => void handleCompleteKnowledgeBaseSyncRun(run.id, "SUCCESS")}
                                  disabled={updatingKnowledgeBaseSyncRunId === run.id}
                                >
                                  标记成功
                                </button>
                                <button
                                  type="button"
                                  className="danger-button"
                                  onClick={() => void handleCompleteKnowledgeBaseSyncRun(run.id, "FAILED")}
                                  disabled={updatingKnowledgeBaseSyncRunId === run.id}
                                >
                                  标记失败
                                </button>
                              </div>
                            </>
                          ) : run.errorDetail ? (
                            <p className="personal-meta">失败详情：{run.errorDetail}</p>
                          ) : null}
                          </article>
                        );
                      })
                    ) : (
                      <p className="personal-meta">暂无同步记录。</p>
                    )}
                  </div>

                  <div className="personal-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void handleSaveKnowledgeBase(item.id)}
                      disabled={updatingKnowledgeBaseId === item.id}
                    >
                      {updatingKnowledgeBaseId === item.id ? "保存中..." : "保存知识库配置"}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void handleArchiveKnowledgeBase(item.id)}
                      disabled={updatingKnowledgeBaseId === item.id || item.status === "DISABLED"}
                    >
                      归档知识库
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => void handleDeleteKnowledgeBase(item.id)}
                      disabled={updatingKnowledgeBaseId === item.id}
                    >
                      删除知识库
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : activeTab === "providers" ? (
          <div className="personal-list">
            <article className="entity-card personal-card">
              <div className="entity-card-head">
                <div>
                  <strong>新建 API Provider</strong>
                  <p className="personal-meta">先接入供应商基础配置，后续再逐步补密钥托管和高级路由规则。</p>
                </div>
                <span className="archive-pill status-in_progress">CREATE</span>
              </div>
              <div className="admin-rule-grid">
                <label>
                  <span>Provider 名称</span>
                  <input
                    value={newProvider.name}
                    onChange={(event) =>
                      setNewProvider((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Provider 类型</span>
                  <select
                    value={newProvider.providerType}
                    onChange={(event) =>
                      setNewProvider((current) => ({
                        ...current,
                        providerType: event.target.value as ApiProviderRecord["providerType"],
                      }))
                    }
                  >
                    <option value="OPENAI">OPENAI</option>
                    <option value="GEMINI">GEMINI</option>
                    <option value="DOUBAO">DOUBAO</option>
                    <option value="CUSTOM">CUSTOM</option>
                  </select>
                </label>
                <label>
                  <span>Base URL</span>
                  <input
                    value={newProvider.baseUrl}
                    onChange={(event) =>
                      setNewProvider((current) => ({
                        ...current,
                        baseUrl: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  <span>密钥占位</span>
                  <input
                    value={newProvider.maskedApiKey}
                    onChange={(event) =>
                      setNewProvider((current) => ({
                        ...current,
                        maskedApiKey: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <label className="admin-rule-description">
                <span>模型白名单（逗号分隔）</span>
                <textarea
                  value={newProvider.modelWhitelist}
                  onChange={(event) =>
                    setNewProvider((current) => ({
                      ...current,
                      modelWhitelist: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="personal-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void handleCreateProvider()}
                  disabled={isCreatingProvider || !newProvider.name.trim() || !newProvider.baseUrl.trim()}
                >
                  {isCreatingProvider ? "创建中..." : "新建 Provider"}
                </button>
              </div>
            </article>
            {providers.map((item) => {
              const draft = providerDrafts[item.id] || buildProviderDraft(item);

              return (
                <article className="entity-card personal-card" key={item.id}>
                  <div className="entity-card-head">
                    <div>
                      <strong>{item.name}</strong>
                      <p className="personal-meta">
                        {item.providerType} · {item.requestCount24h} 次/24h · 成功率 {item.successRate}%
                      </p>
                    </div>
                    <span className={`archive-pill ${getStatusClassName(item.status)}`}>{item.status}</span>
                  </div>

                  <div className="personal-grid">
                    <div>
                      <span>最近调用</span>
                      <strong>{formatDateTime(item.lastCalledAt)}</strong>
                    </div>
                    <div>
                      <span>累计成本</span>
                      <strong>{item.totalCostYuan} 元</strong>
                    </div>
                    <div>
                      <span>模型白名单</span>
                      <strong>{item.modelWhitelist.length} 个</strong>
                    </div>
                    <div>
                      <span>更新时间</span>
                      <strong>{formatDateTime(item.updatedAt)}</strong>
                    </div>
                  </div>

                  <div className="admin-rules-stack">
                    <div className="admin-rule-grid">
                      <label>
                        <span>状态</span>
                        <select
                          value={draft.status}
                          onChange={(event) =>
                            handleProviderDraftChange(item.id, {
                              status: event.target.value as ApiProviderRecord["status"],
                            })
                          }
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="DRAFT">DRAFT</option>
                          <option value="DISABLED">DISABLED</option>
                        </select>
                      </label>
                      <label>
                        <span>Base URL</span>
                        <input
                          value={draft.baseUrl}
                          onChange={(event) =>
                            handleProviderDraftChange(item.id, {
                              baseUrl: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>密钥占位</span>
                        <input
                          value={draft.maskedApiKey}
                          onChange={(event) =>
                            handleProviderDraftChange(item.id, {
                              maskedApiKey: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <label className="admin-rule-description">
                    <span>模型白名单（逗号分隔）</span>
                    <textarea
                      value={draft.modelWhitelist}
                      onChange={(event) =>
                        handleProviderDraftChange(item.id, {
                          modelWhitelist: event.target.value,
                        })
                      }
                    />
                  </label>

                  <div className="personal-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void handleSaveProvider(item.id)}
                      disabled={updatingProviderId === item.id}
                    >
                      {updatingProviderId === item.id ? "保存中..." : "保存 Provider 配置"}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void handleArchiveProvider(item.id)}
                      disabled={updatingProviderId === item.id || item.status === "DISABLED"}
                    >
                      归档 Provider
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => void handleDeleteProvider(item.id)}
                      disabled={updatingProviderId === item.id}
                    >
                      删除 Provider
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="admin-rules-layout">
            <section className="panel personal-center-panel">
              <div className="panel-header">
                <h2>会员方案</h2>
                <span>Membership Plans</span>
              </div>
              <div className="admin-rules-stack">
                {rules.membershipPlans.map((item, index) => (
                  <article className="entity-card admin-rule-card" key={item.id}>
                    <div className="admin-rule-grid">
                      <label>
                        <span>方案名称</span>
                        <input
                          value={item.title}
                          onChange={(event) =>
                            setRules((current) => ({
                              ...current,
                              membershipPlans: updateMembershipPlan(current.membershipPlans, index, {
                                ...item,
                                title: event.target.value,
                              }),
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>会员等级</span>
                        <select
                          value={item.membership}
                          onChange={(event) =>
                            setRules((current) => ({
                              ...current,
                              membershipPlans: updateMembershipPlan(current.membershipPlans, index, {
                                ...item,
                                membership: event.target.value as MembershipPlanRule["membership"],
                              }),
                            }))
                          }
                        >
                          <option value="FREE">FREE</option>
                          <option value="BASIC">BASIC</option>
                          <option value="PRO">PRO</option>
                          <option value="ENTERPRISE">ENTERPRISE</option>
                        </select>
                      </label>
                      <label>
                        <span>价格</span>
                        <input
                          type="number"
                          value={item.amountYuan}
                          onChange={(event) =>
                            setRules((current) => ({
                              ...current,
                              membershipPlans: updateMembershipPlan(current.membershipPlans, index, {
                                ...item,
                                amountYuan: Number(event.target.value || 0),
                              }),
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>赠送点数</span>
                        <input
                          type="number"
                          value={item.pointsBonus}
                          onChange={(event) =>
                            setRules((current) => ({
                              ...current,
                              membershipPlans: updateMembershipPlan(current.membershipPlans, index, {
                                ...item,
                                pointsBonus: Number(event.target.value || 0),
                              }),
                            }))
                          }
                        />
                      </label>
                    </div>
                    <label className="admin-rule-description">
                      <span>方案说明</span>
                      <textarea
                        value={item.description}
                        onChange={(event) =>
                          setRules((current) => ({
                            ...current,
                            membershipPlans: updateMembershipPlan(current.membershipPlans, index, {
                              ...item,
                              description: event.target.value,
                            }),
                          }))
                        }
                      />
                    </label>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel personal-center-panel">
              <div className="panel-header">
                <h2>点数包</h2>
                <span>Points Packages</span>
              </div>
              <div className="admin-rules-stack">
                {rules.pointsPackages.map((item, index) => (
                  <article className="entity-card admin-rule-card" key={item.id}>
                    <div className="admin-rule-grid">
                      <label>
                        <span>套餐名称</span>
                        <input
                          value={item.title}
                          onChange={(event) =>
                            setRules((current) => ({
                              ...current,
                              pointsPackages: updatePointsPackage(current.pointsPackages, index, {
                                ...item,
                                title: event.target.value,
                              }),
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>点数数量</span>
                        <input
                          type="number"
                          value={item.pointsAmount}
                          onChange={(event) =>
                            setRules((current) => ({
                              ...current,
                              pointsPackages: updatePointsPackage(current.pointsPackages, index, {
                                ...item,
                                pointsAmount: Number(event.target.value || 0),
                              }),
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>价格</span>
                        <input
                          type="number"
                          value={item.amountYuan}
                          onChange={(event) =>
                            setRules((current) => ({
                              ...current,
                              pointsPackages: updatePointsPackage(current.pointsPackages, index, {
                                ...item,
                                amountYuan: Number(event.target.value || 0),
                              }),
                            }))
                          }
                        />
                      </label>
                    </div>
                    <label className="admin-rule-description">
                      <span>套餐说明</span>
                      <textarea
                        value={item.description}
                        onChange={(event) =>
                          setRules((current) => ({
                            ...current,
                            pointsPackages: updatePointsPackage(current.pointsPackages, index, {
                              ...item,
                              description: event.target.value,
                            }),
                          }))
                        }
                      />
                    </label>
                  </article>
                ))}
              </div>
            </section>

            <div className="personal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleSaveRules()}
                disabled={isSavingRules}
              >
                {isSavingRules ? "保存中..." : "保存规则"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function updateMembershipPlan(list: MembershipPlanRule[], index: number, nextItem: MembershipPlanRule) {
  return list.map((item, currentIndex) => (currentIndex === index ? nextItem : item));
}

function updatePointsPackage(list: PointsPackageRule[], index: number, nextItem: PointsPackageRule) {
  return list.map((item, currentIndex) => (currentIndex === index ? nextItem : item));
}

function buildUserDrafts(list: AdminUserRecord[]) {
  return Object.fromEntries(
    list.map((item) => [
      item.id,
      {
        membership: item.membership,
        pointsDelta: "0",
      },
    ]),
  ) as Record<string, UserEditDraft>;
}

function buildSkillDraft(item: SkillConfigRecord): SkillEditDraft {
  return {
    status: item.status,
    defaultModel: item.defaultModel,
    pointsCost: String(item.pointsCost),
    description: item.description,
  };
}

function buildSkillDrafts(list: SkillConfigRecord[]) {
  return Object.fromEntries(list.map((item) => [item.id, buildSkillDraft(item)])) as Record<string, SkillEditDraft>;
}

function buildPromptDraft(item: PromptTemplateRecord): PromptEditDraft {
  return {
    status: item.status,
    modelName: item.modelName,
    temperature: String(item.temperature),
    maxTokens: String(item.maxTokens),
    content: item.content,
  };
}

function buildPromptDrafts(list: PromptTemplateRecord[]) {
  return Object.fromEntries(list.map((item) => [item.id, buildPromptDraft(item)])) as Record<string, PromptEditDraft>;
}

function buildKnowledgeBaseDraft(item: KnowledgeBaseRecord): KnowledgeBaseEditDraft {
  return {
    status: item.status,
    syncStatus: item.syncStatus,
    sourceType: item.sourceType,
    description: item.description,
  };
}

function buildKnowledgeBaseDrafts(list: KnowledgeBaseRecord[]) {
  return Object.fromEntries(list.map((item) => [item.id, buildKnowledgeBaseDraft(item)])) as Record<
    string,
    KnowledgeBaseEditDraft
  >;
}

function buildProviderDraft(item: ApiProviderRecord): ApiProviderEditDraft {
  return {
    status: item.status,
    baseUrl: item.baseUrl,
    modelWhitelist: item.modelWhitelist.join(", "),
    maskedApiKey: item.maskedApiKey,
  };
}

function buildProviderDrafts(list: ApiProviderRecord[]) {
  return Object.fromEntries(list.map((item) => [item.id, buildProviderDraft(item)])) as Record<
    string,
    ApiProviderEditDraft
  >;
}

function buildCreateKnowledgeBaseDraft(): CreateKnowledgeBaseDraft {
  return {
    name: "",
    slug: "",
    sourceType: "MANUAL",
    description: "",
  };
}

function buildCreateApiProviderDraft(): CreateApiProviderDraft {
  return {
    name: "",
    providerType: "OPENAI",
    baseUrl: "",
    modelWhitelist: "",
    maskedApiKey: "",
  };
}

function buildCreateKnowledgeBaseFileDraft(): CreateKnowledgeBaseFileDraft {
  return {
    fileName: "",
    fileType: "PDF",
    sourceName: "",
    chunkCount: "0",
  };
}

function buildKnowledgeBaseFileCreateDrafts(list: KnowledgeBaseRecord[]) {
  return Object.fromEntries(list.map((item) => [item.id, buildCreateKnowledgeBaseFileDraft()])) as Record<
    string,
    CreateKnowledgeBaseFileDraft
  >;
}

function buildSyncRunDraft(run?: KnowledgeBaseSyncRunRecord): SyncRunEditDraft {
  return {
    summary: run?.summary || "",
    errorDetail: run?.errorDetail || "",
  };
}

function buildSyncRunDrafts(list: KnowledgeBaseSyncRunRecord[]) {
  return Object.fromEntries(list.map((item) => [item.id, buildSyncRunDraft(item)])) as Record<string, SyncRunEditDraft>;
}

function getSyncRunTitle(run: KnowledgeBaseSyncRunRecord) {
  if (run.scope === "FULL") {
    return "知识库全量同步";
  }
  return run.fileName || "文件同步任务";
}

function deriveKnowledgeBaseSyncStatus(files: KnowledgeBaseFileRecord[]): KnowledgeBaseRecord["syncStatus"] {
  if (!files.length) {
    return "IDLE";
  }
  if (files.some((item) => item.status === "FAILED")) {
    return "FAILED";
  }
  if (files.every((item) => item.status === "INDEXED")) {
    return "SUCCESS";
  }
  if (files.some((item) => item.status === "PENDING")) {
    return "IDLE";
  }
  return "SYNCING";
}

function buildKnowledgeBaseSummary(
  knowledgeBase: KnowledgeBaseRecord,
  files: KnowledgeBaseFileRecord[],
  updatedAt = new Date().toISOString(),
): KnowledgeBaseRecord {
  return {
    ...knowledgeBase,
    documentCount: files.length,
    chunkCount: files.reduce((sum, item) => sum + item.chunkCount, 0),
    syncStatus: deriveKnowledgeBaseSyncStatus(files),
    updatedAt,
  };
}

function getStatusClassName(status: "ACTIVE" | "DISABLED" | "DRAFT") {
  if (status === "ACTIVE") {
    return "status-ready";
  }
  if (status === "DISABLED") {
    return "status-paused";
  }
  return "status-in_progress";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
