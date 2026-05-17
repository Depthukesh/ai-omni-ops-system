# 小红书二创笔记与视频笔记补齐账号角色

## 1. 变更背景

- 用户反馈当前只有原创笔记支持“账号角色”，二创笔记和视频笔记没有同样的创建入口与作品标识。
- 用户同时明确要求：后续所有作品创作都需要设置账号角色，不能再只覆盖单一作品类型。

## 2. 变更目标

- 为二创笔记创建弹窗补充“账号角色”选择。
- 为视频笔记创建弹窗补充“账号角色”选择。
- 让管理员 / 员工 / 达人的可选范围继续沿用原创笔记既有规则。
- 将账号角色写入二创笔记、视频笔记的 `MediaAsset.metadataJson`，并回传给前端作品列表。
- 让二创文案、二创配图提示词、视频文案、视频提示词也感知账号角色。
- 将“所有作品创作默认都要设置账号角色”固化为工程规范。

## 3. 修改内容

### 3.1 前端

- `apps/web/src/services/works.ts`
  - 二创笔记、视频笔记返回结构新增 `accountRole`。
  - 二创生成接口与视频生成接口新增 `accountRole` 入参。
- `apps/web/src/app/(dashboard)/xiaohongshu/use-note-composer-forms.ts`
  - 新增二创笔记、视频笔记的账号角色表单状态。
  - 当当前品牌角色变化导致原选择不合法时，会自动回落到当前允许的默认选项。
- `apps/web/src/app/(dashboard)/xiaohongshu/use-work-composer-actions.ts`
  - 二创笔记、视频笔记提交时都会把 `accountRole` 透传给后端。
- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
  - 二创笔记、视频笔记创建弹窗新增“账号角色”下拉。
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
  - 二创工作区、视频工作区把账号角色当前值与可选项继续向下透传到创建弹窗。
- `apps/web/src/app/(dashboard)/xiaohongshu/work-card-grids.tsx`
  - 二创作品卡片、视频作品卡片左上角新增 `品牌号 / 员工号 / 达人号` 徽标。
- `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
  - 当前品牌角色对应的账号角色可选项不再只服务原创，也同步复用到二创和视频。

### 3.2 后端

- `apps/server/src/modules/works/works.controller.ts`
  - 二创笔记与视频笔记生成接口在权限校验后，改为把当前品牌协作角色透传给 `WorksService`。
- `apps/server/src/modules/works/works.service.ts`
  - 二创、视频生成 payload 新增 `accountRole`。
  - 二创主记录 `XHS_REWRITE_NOTE` 与视频主记录 `XHS_VIDEO_NOTE` 的元数据结构新增 `accountRole`。
  - 二创与视频沿用原创既有服务端收口规则：
    - 管理员默认 `品牌号`，也可显式选择员工号或达人号。
    - 员工若传入非员工号会直接报错。
    - 达人若传入非达人号会直接报错。
  - 二创文案 / 二创配图提示词 / 视频文案 / 视频提示词输入中新增账号角色上下文，生成结果会跟随发布主体调整语气、人设、镜头关系与可信度。
  - 历史未带 `accountRole` 的二创作品与视频作品，当前读取时统一回落为 `品牌号`，避免旧数据读失败。

## 4. 影响范围

- 影响页面
  - `/xiaohongshu`
- 影响接口
  - `POST /api/works/brands/:brandId/xiaohongshu/rewrite/generate`
  - `GET /api/works/brands/:brandId/xiaohongshu/rewrite`
  - `POST /api/works/brands/:brandId/xiaohongshu/video/generate`
  - `GET /api/works/brands/:brandId/xiaohongshu/video`
- 影响持久化
  - 二创作品 `MediaAsset.metadataJson.kind = XHS_REWRITE_NOTE` 结构新增 `accountRole`
  - 视频作品 `MediaAsset.metadataJson.kind = XHS_VIDEO_NOTE` 结构新增 `accountRole`

## 5. 验证方式

- 诊断验证
  - `GetDiagnostics` 已检查本次核心前后端文件，无新增诊断错误。
- 编译验证
  - `npm --workspace apps/web run build` 通过。
  - `npm --workspace apps/server run build` 通过。
- 手工链路
  - 当前已完成代码链路接入与构建验证。
  - 后续本地/线上人工复测重点：
    - 管理员打开二创笔记、视频笔记弹窗时可选择品牌号、员工号、达人号。
    - 员工打开二创笔记、视频笔记弹窗时只可选择员工号。
    - 达人打开二创笔记、视频笔记弹窗时只可选择达人号。
    - 创作完成后二创作品卡片、视频作品卡片左上角显示对应账号角色标记。

## 6. 风险与后续

- 当前“账号角色”已覆盖原创、二创、视频三条小红书作品创作链路；其它未来新增作品类型也应继续沿用同一规则，不再允许漏配。
- 旧二创作品和旧视频作品缺少账号角色字段，当前读取时统一回落为 `品牌号`；若后续需要精确追溯历史发布主体，需要另行补历史数据回填方案。

## 7. 相关文件

- `apps/web/src/services/works.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/use-note-composer-forms.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/use-work-composer-actions.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/work-card-grids.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
- `apps/server/src/modules/works/works.controller.ts`
- `apps/server/src/modules/works/works.service.ts`
