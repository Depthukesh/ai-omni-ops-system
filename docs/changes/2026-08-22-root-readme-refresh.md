# 根目录 README 更新为当前系统真实入口

## 1. 背景

- 仓库根目录 `README.md` 仍停留在较早阶段，内容明显偏旧
- 旧文案把仓库描述成较早期结构，且把说明重点过度压在单机安装链路上
- 对外展示时，容易让新部署者误判：
  - 当前系统还是骨架
  - 主要交付方式仍是单机安装包
  - OpenClaw / MCP / Skill 仍是后续规划，而不是已落地能力

## 2. 本次调整

- 重写根目录 `README.md`
- 把仓库首页改成当前系统总览，而不是旧阶段说明
- 明确写清：
  - 当前已落地的主要业务能力
  - Docker 标准运行态是当前推荐部署方式
  - `local-single-user` 仍保留，但属于另一条交付链
  - OpenClaw / MCP / Skill 已经接通，并给出文档入口
  - 当前 compose 文件、主要端口、常用命令和文档索引

## 3. 影响范围

- `README.md`
- `docs/README.md`

## 4. 验证

- 人工校对根目录 README 中的：
  - 当前能力描述
  - 启动命令
  - compose 文件路径
  - OpenClaw 文档入口
- 核对 `package.json` 当前脚本与 `docker/docker-compose.local-postgres-mixedcut.yml` 当前文件名、端口和服务名，确保 README 不再引用旧命令

## 5. 后续建议

- 后续如果标准运行态入口、安装态命令或 OpenClaw 对接说明再次调整，优先同步根目录 `README.md`
- 根目录 README 应始终只承担“仓库首页入口”职责；更细的结构与链路细节继续以 `docs/site-map.md` 和 `docs/openclaw/README.md` 为准
