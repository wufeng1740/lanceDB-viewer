# Plan: LanceDB Viewer 可用性提升（Top 3）

## 1. Goal
在不改变现有架构（Tauri + React + 只读浏览）的前提下，给出最能提升日常使用效率的 3 个改进方向（功能/UI/UX），并明确优先级与落地路径。

## 2. Current behavior
- 应用支持：扫描目录、展示数据库/表、查看 schema、查看前 100 行 data。
- 已有偏好：主题、默认 tab、部分视图偏好（含数据表列宽）。
- 当前缺口：
  - 发现目标表成本高（数据库/表数量大时）。
  - Data 视图缺少筛选/排序，定位目标记录效率低。
  - 长操作（扫描、数据加载）反馈较弱，缺少进度和可中断能力。

## 3. Root cause
- MVP 以“可读”为主，未覆盖“可快速定位 + 可连续分析 + 可控等待体验”。
- 交互路径依赖手动点击浏览，缺少检索入口和任务态反馈。
- 数据视图目前是静态展示导向，分析操作（过滤/排序/钻取）能力不足。

## 4. Proposed solution
聚焦以下 Top 3（按优先级）：
1. 全局检索与快速跳转（功能+UX）
2. Data 视图分析能力升级：筛选/排序/行详情（功能+UI）
3. 长任务反馈升级：扫描进度与取消（UX）

## 5. Step-by-step implementation plan (file-level)
本轮仅产出建议，不改业务代码。若下一轮实施，建议分三期：

- Phase 1: 全局检索与快速跳转
  - `src/App.tsx`: 增加全局搜索输入、结果列表、键盘快捷键（如 `Ctrl/Cmd+K`）与选中跳转。
  - `src/styles.css`: 搜索框与结果面板样式。
  - `src/lib/types.ts`: 如需新增前端检索结果类型。

- Phase 2: Data 分析交互
  - `src/components/DataTable.tsx`: 列排序、列级过滤、全局行过滤、行详情抽屉。
  - `src/styles.css`: 过滤条、排序状态、详情抽屉样式。

- Phase 3: 扫描任务体验
  - `src/lib/api.ts`: 增加 progress/cancel 接口绑定。
  - `src/App.tsx`: 展示扫描进度条与取消按钮、错误重试入口。
  - `src-tauri/` 对应命令实现（保持现有 IPC 风格，最小增量）。

## 6. Risks and edge cases
- 大数据集下前端本地过滤/排序性能下降，需要分页或服务端处理策略。
- 键盘快捷键与输入法、系统快捷键冲突。
- 扫描取消需要后端可中断支持；若仅前端取消，需清晰说明“停止接收结果”语义。
- JSON/对象列在筛选时需统一序列化策略，避免结果不一致。

## 7. Verification steps
- 可用性验证：
  - 10+ 数据库、100+ 表时，搜索到目标表时间显著下降。
  - Data 视图可在 3 次操作内定位目标记录（筛选/排序/详情）。
  - 扫描过程中用户可看到进度并可中断。
- 工程验证：
  - `npm test`
  - `npx tsc --noEmit`
  - `npm run dev` 手动回归（表切换、data/schema 切换、设置项持久化）。

## 8. Rollback strategy
- 每个 phase 独立提交。
- 若某 phase 影响稳定性，按 feature flag 或单提交回滚，不影响既有浏览主流程。

## 9. What parts of the system should NOT be changed
- LanceDB 数据结构与 schemaVersion 机制。
- 读写边界（保持只读浏览，不引入写操作）。
- 现有 IPC 契约语义（仅增量扩展，避免破坏兼容）。
- 已有配置键（theme/defaultTab 等）兼容性。
