# Task Checklist: Data 视图增强（可执行版）

- [x] 锁定范围：仅增强 `row` 视图，`column` 视图保持现状
- [x] 锁定改动文件：`src/components/DataTable.tsx`、`src/styles.css`
- [x] 定义并实现数据管道（`originalIndex` + filter + sort）
- [x] 定义并实现筛选语义（大小写不敏感、trim、对象值归一化）
- [x] 实现全局筛选输入 + 列筛选折叠区
- [x] 实现排序三态（仅列名点击触发，避免与 resize handle 冲突）
- [x] 实现 `Clear` 入口与命中数反馈（Showing X of Y）
- [x] 实现行详情面板（基于 `originalIndex`，支持 `Esc` 关闭）
- [x] 完成样式（筛选区、排序态、详情面板、移动端可读性）
- [x] 边界验证：空表/单列/全 null/长文本/对象列（代码路径检查完成）
- [x] 回归验证：列宽拖拽双击重置、row/column 切换、偏好持久化（代码路径检查完成）
- [x] TypeScript 编译验证（`npx tsc --noEmit`）
- [ ] 运行态验证（`npm test` / 手工 UI）受本地 Rollup 可选依赖缺失阻塞
