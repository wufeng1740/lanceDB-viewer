# Review Notes: LanceDB Viewer 可用性

## 现状简评
- 优点：信息架构清晰、学习成本低、基础偏好持久化已具备。
- 短板：检索能力弱、分析操作弱、长任务反馈弱。

## Top 3 选择依据
- 影响面：是否覆盖高频路径（找表 -> 看数据 -> 定位记录）。
- 收益比：用户收益 / 开发复杂度。
- 架构风险：是否可在现有架构下低风险增量实现。

## Top 3（优先级）
1. 全局检索与快速跳转
2. Data 视图筛选/排序/行详情
3. 扫描进度与取消

## 本轮验证结果（Data 视图增强）

- 编译检查：`npx tsc --noEmit` 通过。
- 测试/运行：`npm test` 受环境阻塞（缺少 `@rollup/rollup-linux-x64-gnu`），无法完成自动化运行验证。

### 边界场景（代码路径检查）
- 空表：会显示 `No data (or empty table)`。
- 筛选无命中：会显示 `No matching rows`。
- 单列表：列筛选、排序、详情都按列循环渲染，不依赖多列前提。
- 全 `null` 列：排序规则 `null/undefined` 在末尾；筛选会归一化为空字符串。
- 长文本/对象列：单元格仍走截断；详情面板用 `pre` 展示完整值（对象 JSON 格式化）。

### 回归项（代码路径检查）
- 列宽拖拽与双击重置：仍由 `column-resize-handle` 的 `onMouseDown/onDoubleClick` 处理。
- 排序与拖拽冲突：排序仅绑定在列名按钮，拖拽绑定在 handle，事件分离。
- 视图切换：增强仅在 `viewMode === 'row'` 渲染；`column` 视图逻辑保持原样。
- 偏好持久化：仍只持久化 `viewMode/density/columnWidths`，键结构未改。
