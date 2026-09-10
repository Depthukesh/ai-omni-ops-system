"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addOpenClawCreatorMatchesToTracking,
  createOpenClawCreatorTrackingWork,
  deleteOpenClawCreatorTrackingRecord,
  deleteOpenClawCreatorTrackingWork,
  getOpenClawCreatorTrackingWorkWorkspace,
  type OpenClawCreatorWorkNextAction,
  type OpenClawCreatorMatchRecord,
  type OpenClawCreatorMatchWorkspace,
  type OpenClawCreatorTrackingRecord,
  type OpenClawCreatorTrackingWorkRecord,
  type OpenClawCreatorTrackingWorkWorkspace,
  type OpenClawCreatorTrackingWorkspace,
  updateOpenClawCreatorTrackingWork,
  deleteOpenClawCreatorMatches,
} from "../../../services/openclaw";

const PAGE_SIZE = 20;
const WORK_ACTION_OPTIONS: Array<{ value: OpenClawCreatorWorkNextAction; label: string }> = [
  { value: "复投", label: "复投" },
  { value: "调整", label: "调整" },
  { value: "暂停", label: "暂停" },
];

type CreatorCooperationSectionKey = "creatorMatching" | "creatorTracking";
type OptionalDateFormatter = (value?: string) => string;

export interface OpenClawCreatorCooperationWorkspaceProps {
  brandId: string;
  activeSection: CreatorCooperationSectionKey;
  onChangeSection: (section: CreatorCooperationSectionKey) => void;
  matchingWorkspace: OpenClawCreatorMatchWorkspace;
  trackingWorkspace: OpenClawCreatorTrackingWorkspace;
  isLoadingMatching: boolean;
  isLoadingTracking: boolean;
  onRefreshMatching: () => void | Promise<void>;
  onRefreshTracking: () => void | Promise<void>;
  formatDateTime: OptionalDateFormatter;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}

export function OpenClawCreatorCooperationWorkspace(props: OpenClawCreatorCooperationWorkspaceProps) {
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [matchingPage, setMatchingPage] = useState(1);
  const [trackingPage, setTrackingPage] = useState(1);
  const [isDeletingMatches, setIsDeletingMatches] = useState(false);
  const [isMovingMatches, setIsMovingMatches] = useState(false);
  const [deletingTrackingId, setDeletingTrackingId] = useState("");
  const [selectedTracking, setSelectedTracking] = useState<OpenClawCreatorTrackingRecord | null>(null);
  const [worksWorkspace, setWorksWorkspace] = useState<OpenClawCreatorTrackingWorkWorkspace>({
    trackingId: "",
    items: [],
    total: 0,
  });
  const [isLoadingWorks, setIsLoadingWorks] = useState(false);
  const [savingWorkId, setSavingWorkId] = useState("");
  const [creatingWork, setCreatingWork] = useState(false);
  const [newWorkUrl, setNewWorkUrl] = useState("");
  const [newWorkRefreshDays, setNewWorkRefreshDays] = useState("7");
  const [newWorkEvaluation, setNewWorkEvaluation] = useState("");
  const [newWorkAction, setNewWorkAction] = useState<OpenClawCreatorWorkNextAction | "">("");
  const [workDrafts, setWorkDrafts] = useState<Record<string, { resultEvaluation: string; nextAction: OpenClawCreatorWorkNextAction | ""; refreshIntervalDays: string }>>({});

  const matchingItems = useMemo(
    () => [...props.matchingWorkspace.items].sort((left, right) => `${right.createdAt}${right.updatedAt}`.localeCompare(`${left.createdAt}${left.updatedAt}`)),
    [props.matchingWorkspace.items],
  );
  const trackingItems = useMemo(
    () => [...props.trackingWorkspace.items].sort((left, right) => `${right.createdAt}${right.updatedAt}`.localeCompare(`${left.createdAt}${left.updatedAt}`)),
    [props.trackingWorkspace.items],
  );

  const matchingTotalPages = Math.max(1, Math.ceil(matchingItems.length / PAGE_SIZE));
  const trackingTotalPages = Math.max(1, Math.ceil(trackingItems.length / PAGE_SIZE));

  const pagedMatchingItems = useMemo(() => {
    const start = (matchingPage - 1) * PAGE_SIZE;
    return matchingItems.slice(start, start + PAGE_SIZE);
  }, [matchingItems, matchingPage]);
  const pagedTrackingItems = useMemo(() => {
    const start = (trackingPage - 1) * PAGE_SIZE;
    return trackingItems.slice(start, start + PAGE_SIZE);
  }, [trackingItems, trackingPage]);

  useEffect(() => {
    if (matchingPage > matchingTotalPages) {
      setMatchingPage(matchingTotalPages);
    }
  }, [matchingPage, matchingTotalPages]);

  useEffect(() => {
    if (trackingPage > trackingTotalPages) {
      setTrackingPage(trackingTotalPages);
    }
  }, [trackingPage, trackingTotalPages]);

  useEffect(() => {
    setSelectedMatchIds((current) => current.filter((item) => matchingItems.some((match) => match.id === item)));
  }, [matchingItems]);

  useEffect(() => {
    const drafts: Record<string, { resultEvaluation: string; nextAction: OpenClawCreatorWorkNextAction | ""; refreshIntervalDays: string }> = {};
    for (const item of worksWorkspace.items) {
      drafts[item.id] = {
        resultEvaluation: item.resultEvaluation || "",
        nextAction: item.nextAction || "",
        refreshIntervalDays: String(item.refreshIntervalDays || 7),
      };
    }
    setWorkDrafts(drafts);
  }, [worksWorkspace.items]);

  const selectedAllOnPage = pagedMatchingItems.length > 0 && pagedMatchingItems.every((item) => selectedMatchIds.includes(item.id));

  const loadWorks = async (tracking: OpenClawCreatorTrackingRecord) => {
    setSelectedTracking(tracking);
    setIsLoadingWorks(true);
    try {
      const workspace = await getOpenClawCreatorTrackingWorkWorkspace(props.brandId, "paid_acquisition", tracking.id, 200);
      setWorksWorkspace(workspace);
    } catch (error) {
      props.onError(error instanceof Error ? error.message : "加载合作作品失败。");
    } finally {
      setIsLoadingWorks(false);
    }
  };

  const toggleMatchSelection = (recordId: string) => {
    setSelectedMatchIds((current) => (
      current.includes(recordId)
        ? current.filter((item) => item !== recordId)
        : [...current, recordId]
    ));
  };

  const handleToggleSelectAllOnPage = () => {
    if (!pagedMatchingItems.length) {
      return;
    }
    if (selectedAllOnPage) {
      setSelectedMatchIds((current) => current.filter((item) => !pagedMatchingItems.some((match) => match.id === item)));
      return;
    }
    const next = new Set(selectedMatchIds);
    for (const item of pagedMatchingItems) {
      next.add(item.id);
    }
    setSelectedMatchIds([...next]);
  };

  const handleDeleteMatches = async () => {
    if (!selectedMatchIds.length) {
      props.onError("请先勾选要删除的达人匹配记录。");
      return;
    }
    if (typeof window !== "undefined" && !window.confirm(`确认删除已选中的 ${selectedMatchIds.length} 条达人匹配记录吗？`)) {
      return;
    }
    setIsDeletingMatches(true);
    try {
      const response = await deleteOpenClawCreatorMatches(props.brandId, "paid_acquisition", selectedMatchIds);
      setSelectedMatchIds([]);
      props.onNotice(`已删除 ${response.deletedCount} 条达人匹配记录。`);
      await props.onRefreshMatching();
    } catch (error) {
      props.onError(error instanceof Error ? error.message : "删除达人匹配记录失败。");
    } finally {
      setIsDeletingMatches(false);
    }
  };

  const handleAddToTracking = async () => {
    if (!selectedMatchIds.length) {
      props.onError("请先勾选要加入合作清单的达人。");
      return;
    }
    setIsMovingMatches(true);
    try {
      const response = await addOpenClawCreatorMatchesToTracking(props.brandId, "paid_acquisition", selectedMatchIds);
      setSelectedMatchIds([]);
      props.onNotice(`已把 ${response.items.length} 位达人加入达人跟踪。`);
      await props.onRefreshMatching();
      await props.onRefreshTracking();
    } catch (error) {
      props.onError(error instanceof Error ? error.message : "加入合作清单失败。");
    } finally {
      setIsMovingMatches(false);
    }
  };

  const handleDeleteTracking = async (trackingId: string) => {
    if (typeof window !== "undefined" && !window.confirm("确认删除这位达人以及其合作作品记录吗？")) {
      return;
    }
    setDeletingTrackingId(trackingId);
    try {
      await deleteOpenClawCreatorTrackingRecord(props.brandId, "paid_acquisition", trackingId);
      if (selectedTracking?.id === trackingId) {
        setSelectedTracking(null);
      }
      props.onNotice("达人跟踪记录已删除。");
      await props.onRefreshMatching();
      await props.onRefreshTracking();
    } catch (error) {
      props.onError(error instanceof Error ? error.message : "删除达人跟踪记录失败。");
    } finally {
      setDeletingTrackingId("");
    }
  };

  const handleCreateWork = async () => {
    if (!selectedTracking) {
      return;
    }
    setCreatingWork(true);
    try {
      const response = await createOpenClawCreatorTrackingWork(props.brandId, "paid_acquisition", selectedTracking.id, {
        douyinWorkUrl: newWorkUrl,
        refreshIntervalDays: Number(newWorkRefreshDays) || 7,
        resultEvaluation: newWorkEvaluation,
        nextAction: newWorkAction,
      });
      setWorksWorkspace(response.workspace);
      setNewWorkUrl("");
      setNewWorkRefreshDays("7");
      setNewWorkEvaluation("");
      setNewWorkAction("");
      props.onNotice("合作作品已创建，并已抓取首轮数据。");
      await props.onRefreshTracking();
    } catch (error) {
      props.onError(error instanceof Error ? error.message : "创建合作作品失败。");
    } finally {
      setCreatingWork(false);
    }
  };

  const handleSaveWork = async (work: OpenClawCreatorTrackingWorkRecord, refreshNow?: boolean) => {
    if (!selectedTracking) {
      return;
    }
    const draft = workDrafts[work.id];
    if (!draft) {
      return;
    }
    setSavingWorkId(work.id);
    try {
      const response = await updateOpenClawCreatorTrackingWork(props.brandId, "paid_acquisition", selectedTracking.id, work.id, {
        resultEvaluation: draft.resultEvaluation,
        nextAction: draft.nextAction,
        refreshIntervalDays: Number(draft.refreshIntervalDays) || 7,
        refreshNow,
      });
      setWorksWorkspace(response.workspace);
      props.onNotice(refreshNow ? "作品数据已刷新。" : "作品评估已保存。");
      await props.onRefreshTracking();
    } catch (error) {
      props.onError(error instanceof Error ? error.message : "保存作品数据失败。");
    } finally {
      setSavingWorkId("");
    }
  };

  const handleDeleteWork = async (workId: string) => {
    if (!selectedTracking) {
      return;
    }
    if (typeof window !== "undefined" && !window.confirm("确认删除这条合作作品记录吗？")) {
      return;
    }
    setSavingWorkId(workId);
    try {
      const response = await deleteOpenClawCreatorTrackingWork(props.brandId, "paid_acquisition", selectedTracking.id, workId);
      setWorksWorkspace(response.workspace);
      props.onNotice("合作作品记录已删除。");
      await props.onRefreshTracking();
    } catch (error) {
      props.onError(error instanceof Error ? error.message : "删除合作作品失败。");
    } finally {
      setSavingWorkId("");
    }
  };

  return (
    <section className="strategy-layout">
      <aside className="strategy-level-panel strategy-level-panel--directory">
        <div className="strategy-directory-group">
          <div className="strategy-directory-group__title">达人合作板块</div>
          <div className="strategy-level-button-list strategy-level-button-list--nested">
            <button
              type="button"
              className={`strategy-level-button strategy-level-button--nested ${props.activeSection === "creatorMatching" ? "is-active" : ""}`}
              onClick={() => props.onChangeSection("creatorMatching")}
            >
              达人匹配
            </button>
            <button
              type="button"
              className={`strategy-level-button strategy-level-button--nested ${props.activeSection === "creatorTracking" ? "is-active" : ""}`}
              onClick={() => props.onChangeSection("creatorTracking")}
            >
              达人跟踪
            </button>
          </div>
        </div>
      </aside>

      <div className="strategy-content-panel">
        {props.activeSection === "creatorMatching" ? (
          <article className="workspace-panel strategy-page-card">
            <div className="strategy-card-toolbar">
              <div>
                <strong>达人匹配列表</strong>
                <p className="panel-subtext">由 OpenClaw 基于达人结果池筛出候选达人，并补充推荐理由与合作清单状态。</p>
              </div>
              <div className="strategy-inline-actions">
                <button type="button" className="secondary-button" onClick={() => void props.onRefreshMatching()} disabled={props.isLoadingMatching}>
                  刷新列表
                </button>
                <button type="button" className="secondary-button" onClick={() => void handleDeleteMatches()} disabled={isDeletingMatches || !selectedMatchIds.length}>
                  {isDeletingMatches ? "删除中..." : `批量删除${selectedMatchIds.length ? `（${selectedMatchIds.length}）` : ""}`}
                </button>
                <button type="button" className="primary-button" onClick={() => void handleAddToTracking()} disabled={isMovingMatches || !selectedMatchIds.length}>
                  {isMovingMatches ? "加入中..." : `加入合作清单${selectedMatchIds.length ? `（${selectedMatchIds.length}）` : ""}`}
                </button>
              </div>
            </div>

            {!matchingItems.length ? (
              <div className="note-empty-state">当前还没有达人匹配记录。OpenClaw 从达人结果池筛选后会把候选达人写到这里。</div>
            ) : (
              <>
                <PaginationBar
                  currentPage={matchingPage}
                  totalPages={matchingTotalPages}
                  totalItems={matchingItems.length}
                  onChangePage={setMatchingPage}
                />
                <div className="table-scroll-shell openclaw-record-table-shell">
                  <table className="soft-table openclaw-record-table">
                    <thead>
                      <tr>
                        <th>
                          <input type="checkbox" checked={selectedAllOnPage} onChange={handleToggleSelectAllOnPage} />
                        </th>
                        <th>达人昵称</th>
                        <th>达人主页</th>
                        <th>地区</th>
                        <th>分类标签</th>
                        <th>粉丝数</th>
                        <th>预估播放</th>
                        <th>互动率</th>
                        <th>报价</th>
                        <th>联系电话</th>
                        <th>微信号</th>
                        <th>邮箱</th>
                        <th>推荐理由</th>
                        <th>是否加入合作清单</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedMatchingItems.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedMatchIds.includes(item.id)}
                              onChange={() => toggleMatchSelection(item.id)}
                            />
                          </td>
                          <td>{item.nickname || "-"}</td>
                          <td>{item.profileUrl ? <a href={item.profileUrl} target="_blank" rel="noreferrer" className="note-data-link">打开主页</a> : "-"}</td>
                          <td>{item.region || "-"}</td>
                          <td>{joinText(item.categoryLabels)}</td>
                          <td>{formatNumber(item.fansCount)}</td>
                          <td>{formatNumber(item.expectedPlayCount)}</td>
                          <td>{formatPercent(item.interactRate)}</td>
                          <td>{formatPrice(item.price, item.priceType)}</td>
                          <td><CopyableCell value={item.contactPhone} /></td>
                          <td><CopyableCell value={item.contactWechat} /></td>
                          <td><CopyableCell value={item.contactEmail} /></td>
                          <td className="openclaw-record-table__text-cell">
                            <span className="openclaw-record-table__text" title={item.recommendedReason}>{item.recommendedReason || "-"}</span>
                          </td>
                          <td>{item.isInTrackingList ? "已加入" : "未加入"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </article>
        ) : (
          <article className="workspace-panel strategy-page-card">
            <div className="strategy-card-toolbar">
              <div>
                <strong>达人跟踪列表</strong>
                <p className="panel-subtext">按达人维度建档，统一跟踪合作作品数量、作品数据表现、结果评估与再次选择。</p>
              </div>
              <div className="strategy-inline-actions">
                <button type="button" className="secondary-button" onClick={() => void props.onRefreshTracking()} disabled={props.isLoadingTracking}>
                  刷新列表
                </button>
              </div>
            </div>

            {!trackingItems.length ? (
              <div className="note-empty-state">当前还没有达人跟踪记录。请先从达人匹配把达人加入合作清单。</div>
            ) : (
              <>
                <PaginationBar
                  currentPage={trackingPage}
                  totalPages={trackingTotalPages}
                  totalItems={trackingItems.length}
                  onChangePage={setTrackingPage}
                />
                <div className="table-scroll-shell openclaw-record-table-shell">
                  <table className="soft-table openclaw-record-table">
                    <thead>
                      <tr>
                        <th>达人昵称</th>
                        <th>达人主页</th>
                        <th>地区</th>
                        <th>分类标签</th>
                        <th>粉丝数</th>
                        <th>报价</th>
                        <th>联系电话</th>
                        <th>微信号</th>
                        <th>邮箱</th>
                        <th>合作作品数量</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedTrackingItems.map((item) => (
                        <tr key={item.id}>
                          <td>{item.nickname || "-"}</td>
                          <td>{item.profileUrl ? <a href={item.profileUrl} target="_blank" rel="noreferrer" className="note-data-link">打开主页</a> : "-"}</td>
                          <td>{item.region || "-"}</td>
                          <td>{joinText(item.categoryLabels)}</td>
                          <td>{formatNumber(item.fansCount)}</td>
                          <td>{formatPrice(item.price, item.priceType)}</td>
                          <td><CopyableCell value={item.contactPhone} /></td>
                          <td><CopyableCell value={item.contactWechat} /></td>
                          <td><CopyableCell value={item.contactEmail} /></td>
                          <td>{item.cooperationWorkCount}</td>
                          <td className="openclaw-record-table__action-cell">
                            <div className="openclaw-record-table__actions">
                              <button type="button" className="secondary-button" onClick={() => void loadWorks(item)}>
                                查看
                              </button>
                              <button
                                type="button"
                                className="note-inline-button"
                                onClick={() => void handleDeleteTracking(item.id)}
                                disabled={deletingTrackingId === item.id}
                              >
                                {deletingTrackingId === item.id ? "删除中..." : "删除"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </article>
        )}
      </div>

      {selectedTracking ? (
        <div className="openclaw-diary-dialog-backdrop" onClick={() => setSelectedTracking(null)}>
          <div className="openclaw-diary-dialog" onClick={(event) => event.stopPropagation()} style={{ width: "min(1240px, 96vw)" }}>
            <div className="openclaw-diary-dialog__head">
              <div>
                <strong>{selectedTracking.nickname || "达人合作详情"}</strong>
                <p>合作作品数 {selectedTracking.cooperationWorkCount}，可继续新建作品数据并设置自动更新周期。</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setSelectedTracking(null)}>
                关闭
              </button>
            </div>

            <div className="openclaw-diary-dialog__meta">
              <span>达人主页：{selectedTracking.profileUrl ? <a href={selectedTracking.profileUrl} target="_blank" rel="noreferrer" className="note-data-link">打开主页</a> : "-"}</span>
              <span>联系电话：{selectedTracking.contactPhone || "-"}</span>
              <span>微信号：{selectedTracking.contactWechat || "-"}</span>
              <span>邮箱：{selectedTracking.contactEmail || "-"}</span>
            </div>

            <div className="openclaw-diary-dialog__content" style={{ display: "grid", gap: 12 }}>
              <strong>新建作品数据</strong>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(320px, 2fr) minmax(120px, 160px) minmax(180px, 1fr) minmax(160px, 1fr) auto" }}>
                <input
                  value={newWorkUrl}
                  onChange={(event) => setNewWorkUrl(event.target.value)}
                  placeholder="填写抖音作品链接"
                />
                <input
                  value={newWorkRefreshDays}
                  onChange={(event) => setNewWorkRefreshDays(event.target.value)}
                  placeholder="更新天数"
                />
                <input
                  value={newWorkEvaluation}
                  onChange={(event) => setNewWorkEvaluation(event.target.value)}
                  placeholder="结果评估（可选）"
                />
                <select value={newWorkAction} onChange={(event) => setNewWorkAction(event.target.value as OpenClawCreatorWorkNextAction | "")}>
                  <option value="">再次选择（可选）</option>
                  {WORK_ACTION_OPTIONS.map((option) => (
                    <option key={`new-work-action-${option.value}`} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button type="button" className="primary-button" onClick={() => void handleCreateWork()} disabled={creatingWork || !newWorkUrl.trim()}>
                  {creatingWork ? "创建中..." : "新增作品"}
                </button>
              </div>
            </div>

            <div className="openclaw-diary-dialog__content" style={{ display: "grid", gap: 12 }}>
              <strong>合作作品列表</strong>
              {isLoadingWorks ? (
                <div className="note-empty-state">作品数据加载中...</div>
              ) : !worksWorkspace.items.length ? (
                <div className="note-empty-state">当前还没有合作作品记录。OpenClaw 或你都可以先补第一条作品链接。</div>
              ) : (
                <div className="table-scroll-shell openclaw-record-table-shell">
                  <table className="soft-table openclaw-record-table">
                    <thead>
                      <tr>
                        <th>标题</th>
                        <th>链接</th>
                        <th>播放数</th>
                        <th>点赞数</th>
                        <th>收藏数</th>
                        <th>评论数</th>
                        <th>转发数</th>
                        <th>结果评估</th>
                        <th>再次选择</th>
                        <th>X天更新</th>
                        <th>最近同步</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {worksWorkspace.items.map((work) => {
                        const draft = workDrafts[work.id] || {
                          resultEvaluation: work.resultEvaluation || "",
                          nextAction: work.nextAction || "",
                          refreshIntervalDays: String(work.refreshIntervalDays || 7),
                        };
                        return (
                          <tr key={work.id}>
                            <td className="openclaw-record-table__text-cell">
                              <span className="openclaw-record-table__text" title={work.title}>{work.title || "-"}</span>
                            </td>
                            <td>{work.douyinWorkUrl ? <a href={work.douyinWorkUrl} target="_blank" rel="noreferrer" className="note-data-link">打开链接</a> : "-"}</td>
                            <td>{formatNumber(work.playCount)}</td>
                            <td>{formatNumber(work.likeCount)}</td>
                            <td>{formatNumber(work.collectCount)}</td>
                            <td>{formatNumber(work.commentCount)}</td>
                            <td>{formatNumber(work.shareCount)}</td>
                            <td>
                              <input
                                value={draft.resultEvaluation}
                                onChange={(event) => setWorkDrafts((current) => ({
                                  ...current,
                                  [work.id]: {
                                    ...draft,
                                    resultEvaluation: event.target.value,
                                  },
                                }))}
                                placeholder="结果评估"
                              />
                            </td>
                            <td>
                              <select
                                value={draft.nextAction}
                                onChange={(event) => setWorkDrafts((current) => ({
                                  ...current,
                                  [work.id]: {
                                    ...draft,
                                    nextAction: event.target.value as OpenClawCreatorWorkNextAction | "",
                                  },
                                }))}
                              >
                                <option value="">未设置</option>
                                {WORK_ACTION_OPTIONS.map((option) => (
                                  <option key={`${work.id}-${option.value}`} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                value={draft.refreshIntervalDays}
                                onChange={(event) => setWorkDrafts((current) => ({
                                  ...current,
                                  [work.id]: {
                                    ...draft,
                                    refreshIntervalDays: event.target.value,
                                  },
                                }))}
                                placeholder="7"
                              />
                            </td>
                            <td>
                              <div>{props.formatDateTime(work.lastSyncedAt)}</div>
                              {work.lastSyncError ? <div className="status-text error-text" style={{ maxWidth: 180 }}>{work.lastSyncError}</div> : null}
                            </td>
                            <td className="openclaw-record-table__action-cell">
                              <div className="openclaw-record-table__actions">
                                <button type="button" className="secondary-button" onClick={() => void handleSaveWork(work)} disabled={savingWorkId === work.id}>
                                  {savingWorkId === work.id ? "保存中..." : "保存"}
                                </button>
                                <button type="button" className="note-inline-button" onClick={() => void handleSaveWork(work, true)} disabled={savingWorkId === work.id}>
                                  刷新
                                </button>
                                <button type="button" className="note-inline-button" onClick={() => void handleDeleteWork(work.id)} disabled={savingWorkId === work.id}>
                                  删除
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PaginationBar(props: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onChangePage: (page: number) => void;
}) {
  return (
    <div className="note-pagination-bar" style={{ marginBottom: 12 }}>
      <div className="note-pagination-summary">
        共 {props.totalItems} 条，第 {props.currentPage}/{props.totalPages} 页，每页 {PAGE_SIZE} 条
      </div>
      <div className="note-pagination-actions">
        <button type="button" className="note-page-button" disabled={props.currentPage <= 1} onClick={() => props.onChangePage(Math.max(1, props.currentPage - 1))}>
          上一页
        </button>
        {Array.from({ length: props.totalPages }, (_, index) => index + 1)
          .slice(Math.max(0, props.currentPage - 3), Math.max(0, props.currentPage - 3) + 5)
          .map((pageNumber) => (
            <button
              key={`page-${pageNumber}`}
              type="button"
              className={`note-page-button ${pageNumber === props.currentPage ? "is-active" : ""}`}
              onClick={() => props.onChangePage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
        <button type="button" className="note-page-button" disabled={props.currentPage >= props.totalPages} onClick={() => props.onChangePage(Math.min(props.totalPages, props.currentPage + 1))}>
          下一页
        </button>
      </div>
    </div>
  );
}

function CopyableCell(props: { value?: string | number }) {
  const text = String(props.value ?? "").trim();
  if (!text) {
    return <span className="table-cell-empty">-</span>;
  }
  return (
    <div className="table-text-shell table-text-shell--copyable" data-rows="1">
      <button
        type="button"
        className="table-text-cell"
        data-rows={1}
        title="点击复制"
        onClick={() => void navigator.clipboard.writeText(text).catch(() => window.alert("复制失败，请手动复制。"))}
      >
        {text}
      </button>
    </div>
  );
}

function joinText(values?: string[]) {
  return values && values.length ? values.join(" / ") : "-";
}

function formatNumber(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }
  return value.toLocaleString("zh-CN");
}

function formatPercent(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }
  return `${value}%`;
}

function formatPrice(value?: number, priceType?: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }
  return `${value.toLocaleString("zh-CN")}${priceType ? ` / ${priceType}` : ""}`;
}
