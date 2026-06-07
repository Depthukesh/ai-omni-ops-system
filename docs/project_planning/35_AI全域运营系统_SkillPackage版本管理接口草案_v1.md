# AI全域运营系统 SkillPackage 版本管理接口草案 v1

## 1. 文档目的

本文档用于把《统一技能中心详情接口草案 v1》中的版本部分继续下钻成独立接口草案，用于：

- 指导版本创建、激活、查看和对比接口设计
- 支撑统一技能中心版本页签
- 支撑第一阶段的回滚能力

## 2. 版本管理定位

版本管理建议拆成独立接口组，不与详情接口混合。

建议覆盖四类动作：

- 查看版本列表
- 创建新版本
- 激活指定版本
- 对比两个版本

第一阶段先不做复杂合并和多人协同编辑锁。

## 3. 接口清单建议

### 3.1 查询版本列表

```http
GET /api/admin/skill-packages/:packageId/versions
```

### 3.2 创建版本

```http
POST /api/admin/skill-packages/:packageId/versions
```

### 3.3 激活版本

```http
POST /api/admin/skill-packages/:packageId/activate-version
```

### 3.4 版本对比

```http
GET /api/admin/skill-packages/:packageId/version-diff
```

## 4. 查询版本列表接口草案

### 返回结构

```ts
export interface SkillPackageVersionListResponse {
  items: SkillPackageVersionItemDTO[];
}
```

```ts
export interface SkillPackageVersionItemDTO {
  id: string;
  versionNumber: string;
  changeLog?: string;
  isActive: boolean;
  createdAt: string;
  createdBy?: string;
  snapshotSummary?: {
    promptCount: number;
    referenceCount: number;
    scriptCount: number;
    knowledgeBindingCount: number;
    providerBindingCount: number;
  };
}
```

## 5. 创建版本接口草案

### 5.1 请求路径

```http
POST /api/admin/skill-packages/:packageId/versions
```

### 5.2 请求体建议

```ts
export interface CreateSkillPackageVersionRequest {
  versionNumber: string;
  changeLog?: string;
  sourceMode: "CURRENT_STATE" | "CLONE_FROM_VERSION";
  sourceVersionId?: string;
}
```

### 5.3 规则建议

- `versionNumber` 在同一能力包下必须唯一
- `CURRENT_STATE` 表示用当前已保存状态生成新版本
- `CLONE_FROM_VERSION` 表示以历史版本快照为基础创建
- 第一阶段创建版本时建议自动写入完整 `snapshot_json`

## 6. 激活版本接口草案

### 6.1 请求路径

```http
POST /api/admin/skill-packages/:packageId/activate-version
```

### 6.2 请求体建议

```ts
export interface ActivateSkillPackageVersionRequest {
  versionId: string;
}
```

### 6.3 规则建议

- 同一能力包同一时刻只能有一个激活版本
- 激活新版本时，应自动把旧激活版本改成非激活
- `skill_packages.current_version_id` 应同步更新

## 7. 版本对比接口草案

### 7.1 请求路径

```http
GET /api/admin/skill-packages/:packageId/version-diff?leftVersionId=xxx&rightVersionId=yyy
```

### 7.2 返回结构建议

```ts
export interface SkillPackageVersionDiffResponse {
  leftVersion: VersionMetaDTO;
  rightVersion: VersionMetaDTO;
  promptDiffs: VersionDiffItemDTO[];
  referenceDiffs: VersionDiffItemDTO[];
  scriptDiffs: VersionDiffItemDTO[];
  knowledgeDiffs: VersionDiffItemDTO[];
  providerDiffs: VersionDiffItemDTO[];
}
```

```ts
export interface VersionMetaDTO {
  id: string;
  versionNumber: string;
  createdAt: string;
  createdBy?: string;
}

export interface VersionDiffItemDTO {
  itemKey: string;
  changeType: "ADDED" | "REMOVED" | "UPDATED" | "UNCHANGED";
  summary?: string;
}
```

### 7.3 第一阶段建议

第一阶段不需要做逐字段可视化富 diff。

先做到：

- 哪个对象变了
- 是新增、删除还是更新
- 简单摘要说明

就足够支撑版本管理页。

## 8. 错误码建议

| 错误码 | 场景 |
|---|---|
| `VERSION_NOT_FOUND` | 指定版本不存在 |
| `VERSION_NUMBER_DUPLICATED` | 版本号重复 |
| `INVALID_SOURCE_VERSION` | 克隆来源版本不合法 |
| `INVALID_ACTIVATE_TARGET` | 激活目标版本不合法 |
| `INVALID_DIFF_PARAM` | diff 参数缺失或错误 |
| `FORBIDDEN` | 当前用户无权限操作 |

## 9. 第一阶段最小实现集合

第一阶段建议优先做：

- 查询版本列表
- 创建版本
- 激活版本

版本对比可以作为 P1。

## 10. 与数据库设计的对应关系

建议主要落在：

- `skill_package_versions`
- `skill_packages.current_version_id`

其中：

- 版本主记录放在 `skill_package_versions`
- 当前激活指针放在 `skill_packages`
- 快照建议直接存 `snapshot_json`

## 11. 与页面的映射关系

### 版本页签

- 版本列表接口 -> 版本表格
- 创建版本接口 -> “发布新版本”动作
- 激活版本接口 -> “激活”按钮
- 版本对比接口 -> “对比”入口

## 12. 最终结论

第一阶段版本管理最关键的，不是把 diff 做得多复杂，而是先把：

- 可发布版本
- 可切换版本
- 可回看版本

这三件事稳定做出来。

只要这三件事跑通，统一技能中心就已经具备真正可运营的版本能力。
