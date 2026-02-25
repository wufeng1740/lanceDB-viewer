# Data 视图增强计划（可执行版）

## 1. Goal
在 Data 视图中补齐高频分析能力，优先提升“定位目标记录”的效率：
- 可筛选：全局搜索 + 列级筛选
- 可排序：单列三态排序（none -> asc -> desc）
- 可详情查看：按字段展示完整行内容（含对象/长文本）

## 2. Current behavior
- 当前仅展示前 100 行（`getTableData(..., 100)`），支持 row/column 视图、密度切换、列宽拖拽。
- 无筛选、排序、行详情能力。
- 复杂值在单元格内压缩显示，可读性有限。

## 3. Root cause
- `DataTable` 缺少独立的数据处理管道（原始数据与展示数据未分层）。
- 缺少交互规则定义（过滤语义、排序优先级、排序与拖拽冲突规约）。
- 缺少状态可视反馈（命中数、清空入口、详情打开/关闭约定）。

## 4. Proposed solution
以 `row` 视图为第一期目标（`column` 视图本轮不增强筛选/排序/详情），在 `DataTable` 内最小增量实现：
1. 数据管道：`rawRows -> filteredRows -> sortedRows -> renderedRows`（`useMemo`）。
2. 筛选层：
   - 全局筛选：对所有列文本进行大小写不敏感包含匹配。
   - 列筛选：对指定列文本进行叠加匹配。
   - 提供“清空筛选/排序”入口和命中行数反馈。
3. 排序层：
   - 仅“点击列名文本”触发排序；列宽拖拽仅由 resize handle 触发。
   - 排序规则：`null/undefined` 始终最后；数字按数值；其余按归一化字符串。
4. 详情层：
   - 行级“Details”按钮打开面板。
   - 以 `originalIndex` 标识原始行，避免过滤/排序后索引漂移。
   - 支持 `Esc` 关闭详情面板。

## 5. Step-by-step implementation plan (file-level)
本次实现仅改：
- `src/components/DataTable.tsx`
- `src/styles.css`

步骤：
1. 在 `DataTable.tsx` 定义交互状态：
   - `globalFilter: string`
   - `columnFilters: Record<string, string>`
   - `sortBy: { column: string; direction: 'asc' | 'desc' } | null`
   - `selectedRowOriginalIndex: number | null`
2. 增加归一化与比较函数：
   - `toFilterText(value)`：用于筛选（trim + lower-case）
   - `compareValues(a, b)`：用于排序（null-last + number-first + string fallback）
3. 用 `useMemo` 构建展示数据：
   - 给每行包裹 `originalIndex`
   - 先过滤再排序
4. 增加顶部 Data 工具区：
   - 全局搜索输入框
   - 列筛选折叠区
   - `Clear` 按钮
   - 命中数（如 `Showing X of Y rows`）
5. 更新表头：
   - 列名按钮承载排序切换与指示
   - 保持 resize handle 独立可拖拽，避免事件冲突
6. 增加详情面板：
   - 行级按钮打开
   - 字段逐行展示；对象/数组用格式化 JSON
   - `Esc` 关闭
7. 在 `styles.css` 增加对应样式：
   - 筛选栏、排序态、命中信息、详情面板
   - 保持现有主题变量与移动端可读性
8. 验证：
   - `npx tsc --noEmit`
   - 手工回归（见第 7 节）

## 6. Risks and edge cases
- 100 行内前端处理无性能风险；未来扩容需分页/虚拟滚动。
- 混合类型排序语义需在 UI 文案中保持可预期（不追求数据库语义排序）。
- 列筛选控件数量与列数正相关，默认折叠避免拥挤。
- 需确保现有列宽本地持久化键不受影响。

## 7. Verification steps
- 功能：
  - 全局筛选命中任意列文本（大小写不敏感）。
  - 列筛选与全局筛选叠加生效。
  - 排序三态循环正确，且仅点击列名生效。
  - 行详情可展示对象/数组/长文本，并支持 `Esc` 关闭。
  - `Clear` 后筛选与排序状态全部重置。
- 边界：
  - 空表、单列表、全 null 列、超长文本列、对象列。
  - 切换表后状态行为符合预期（本轮建议重置筛选/排序/详情状态）。
- 回归：
  - 列宽拖拽与双击重置正常。
  - row/column 视图切换正常；column 视图保持现状无回归。
  - 现有 viewMode/density/columnWidths 偏好持久化正常。
- 技术：
  - `npx tsc --noEmit`

## 8. Rollback strategy
- 单功能块可回退：
  1. 回退详情面板
  2. 回退列筛选
  3. 保留全局筛选 + 排序作为最小可用
- 若需整体回退，按单提交回滚，不影响现有 Data 浏览主流程。

## 9. What parts of the system should NOT be changed
- 不改后端 Rust、IPC 接口、DB 结构、schemaVersion。
- 不改 `App.tsx` 主流程与数据加载方式（仍为前 100 行）。
- 不引入第三方依赖。
