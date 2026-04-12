# FlowUS MCP 真人场景测试发现

> 测试时间：2026-04-12
> 
> 测试 runId：`20260411T182453Z`
> 
> 测试方式：仓库内 live e2e 套件 + subagent 真人场景回放 + 人工验收

## 摘要

本轮测试完成了 6 类真人场景：

- 沙盒根页创建
- Markdown 页面创建与回读
- 结构化页面创建与块插入
- 搜索命中验证
- 数据库创建、查询、字段更新
- 清理范围盘点

整体结论：

- 页面、数据库、搜索等主链路大体可用。
- 发现 2 个已确认功能缺陷。
- 发现 1 个接口语义/文档一致性问题。
- 发现 1 个数据库属性输入校验缺失问题，已在真实数据中体现为 UI 元数据名称缺失。

## 已确认缺陷

### 1. `read_page_as_markdown` 无法回读带表格的页面

**优先级**：P1

**当前状态**：已在本地代码修复，待 live 复核

**现象**

- 对页面 `c74b3eaa-dfab-43f8-a33f-d893d0b53e9c`
  `[20260411T182453Z] Markdown 项目说明`
  调用 `read_page_as_markdown` 时失败。
- 返回错误：
  `Unexpected error: Error: Table must contain column width and at least one row`

**复现路径**

1. 用 `create_page_from_markdown` 在沙盒页下创建包含标题、列表、待办、引用、代码块、表格的页面。
2. 再调用 `read_page_as_markdown` 回读。
3. 调用失败并抛出上述错误。

**影响**

- AI 无法把带表格的 FlowUS 页面稳定回读成 Markdown。
- 文档审阅、页面回链、内容导出等场景被阻断。

**证据**

- 真人场景：知识库新人、文档审阅人
- 真实页面：
  `https://flowus.cn/docs/c74b3eaa-dfab-43f8-a33f-d893d0b53e9c`
- 用户人工验收结果：页面 UI 中其它内容正常，表格存在显示异常迹象

**初步判断**

- 很可能是 `create_page_from_markdown` 产出的表格结构，与 `read_page_as_markdown` 的表格渲染逻辑不兼容。
- 需要同时检查：
  [src/markdown/blocks_from_markdown.ts](/Users/majianhang/.config/superpowers/worktrees/flowus-mcp-serve/codex/flowus-e2e-tests/src/markdown/blocks_from_markdown.ts)
  [src/markdown/render_blocks.ts](/Users/majianhang/.config/superpowers/worktrees/flowus-mcp-serve/codex/flowus-e2e-tests/src/markdown/render_blocks.ts)
  [src/markdown/tables.ts](/Users/majianhang/.config/superpowers/worktrees/flowus-mcp-serve/codex/flowus-e2e-tests/src/markdown/tables.ts)

**已修复内容**

- 不再依赖 FlowUS 未文档化的 `recursive=true` 参数。
- 改为在 MCP 内部按 `has_children` 递归抓取子块，确保 table 会继续拉取 `table_row`。
- `table` / `table_row` 不再走 generic block schema，Markdown 生成的表格行现在会保留在请求体里，不会在本地 parse 时被静默剥掉。
- 已补回归测试，覆盖“页面块含 table，table 行需要二次拉取后再渲染 Markdown”。
- 已补回归测试，覆盖“create_page_from_markdown` 发送表格时必须保留 `table_row` 子块”。

### 2. `append_block_children(after=...)` 没有按预期插入到目标块后

**优先级**：P1

**当前状态**：已在本地代码收口为显式拒绝，待 live 复核

**现象**

- 对页面 `97664c45-d0b2-443e-ae0c-8b43da558aa9`
  `[20260411T182453Z] 结构化周报`
  调用 `append_block_children` 时显式传入 `after`。
- 但无论 API 回读还是用户人工查看，新增块都出现在最后，而不是目标块之后。

**复现路径**

1. 用 `create_page_with_content` 创建一个包含段落、待办、代码块的页面。
2. 记录第一页内容块 id：`f618eb2a-6843-4b86-8b3c-742409e425da`
3. 调用 `append_block_children`，传入 `after=f618...`
4. 再调用 `get_block_children` 读取块顺序。

**实际顺序**

- 本周进展
- 待办
- 代码块
- 中间进度更新

**预期顺序**

- 本周进展
- 中间进度更新
- 待办
- 代码块

**影响**

- 任何依赖“插入到指定位置”的编辑场景都会失真。
- 对 AI 增量编辑来说，这会直接影响页面结构控制能力。

**证据**

- 真人场景：项目经理
- 真实页面：
  `https://flowus.cn/docs/97664c45-d0b2-443e-ae0c-8b43da558aa9`
- 用户人工验收截图确认：新增块显示在末尾

**初步判断**

- 需要确认是 FlowUS API 自身忽略 `after`，还是 MCP 请求体结构与 FlowUS 预期不一致。
- 首先排查：
  [src/tools/blocks.ts](/Users/majianhang/.config/superpowers/worktrees/flowus-mcp-serve/codex/flowus-e2e-tests/src/tools/blocks.ts)

**已修复内容**

- 根据 FlowUS Blocks API 现状，MCP 不再假装支持 `after`。
- 现在如果传入 `after`，会在本地直接返回清晰错误，避免“看起来成功、实际被追加到末尾”的假阳性。
- 真人场景和回归测试已经同步改成：
  - 验证 `after` 被拒绝
  - 验证普通追加仍然追加到末尾

## 接口/文档一致性问题

### 3. `search_pages` 实际返回不止 page，还可能返回 database

**优先级**：P2

**当前状态**：已在本地代码修复，待 live 复核

**现象**

- 调用 `search_pages("20260411T182453Z")` 时，结果里包含：
  - page
  - database
- 当前工具描述写的是“Search for pages”。

**影响**

- 调用方如果假定结果全是 page，可能在解析时出错。
- 文档与实际行为不一致，会让上层 agent 误判返回类型。

**证据**

- 本次 run 中返回了数据库：
  `e10b3f0e-f2b4-4dd0-babd-3e36ea0f53b5`
  `[20260411T182453Z] 任务数据库`

**建议**

- 二选一：
  - 在 MCP 层过滤，只返回 page
  - 保留原始搜索结果，但更新工具描述和测试预期，明确可能返回 database

**已修复内容**

- MCP 现在会过滤掉 FlowUS 搜索结果中的非 `page` 对象。
- 为了尽量保持 `page_size` 语义，若当前批次里混入了 database，MCP 会继续向后翻页，直到收集到目标数量的 page，或远端结果耗尽。
- 已补回归测试，覆盖：
  - 混合结果里只返回 page
  - 遇到 database 混入时会继续翻页补足目标 page 数量

## 输入校验缺失问题

### 4. 数据库属性 schema 没有强制要求 `name`，导致 UI 元数据名称为空

**优先级**：P1

**当前状态**：已在本地代码修复，待 live 复核

**现象**

- 数据库记录页左侧属性标签显示为空。
- 真实 `get_database` 返回中，部分属性对象缺少 `name` 字段，例如：
  - `Notes: { id: "Notes", type: "rich_text", rich_text: {} }`
  - `9247...: { id: "9247...", type: "select", select: {...} }`

**为什么会发生**

- 文档要求数据库属性对象应包含 `name`。
- 当前实现中：
  [src/schemas/properties.ts](/Users/majianhang/.config/superpowers/worktrees/flowus-mcp-serve/codex/flowus-e2e-tests/src/schemas/properties.ts)
  的 `DatabasePropertiesSchema` 实际是：
  `z.record(z.string(), z.unknown())`
- 也就是说，虽然描述文本写了“必须包含 name 和 type”，但代码没有真正校验。
- `create_database` / `update_database` 又直接透传 payload，没有 normalize。

**影响**

- 数据库 UI 中属性元数据名称为空，影响可读性和可用性。
- 容易生成“表面成功、实际 schema 不规范”的数据库。

**建议**

- 为数据库属性建立严格 schema，而不是 `unknown` 透传。
- 在 MCP 层增加 normalize/validation，至少强制：
  - `id`
  - `name`
  - `type`
- 为 `create_database` 和 `update_database` 增加失败测试与回归测试。

**已修复内容**

- `create_database` 现在要求属性定义必须至少带 `id/name/type`。
- `update_database` 现在同样要求属性定义完整，或显式传 `null` 删除列。
- 已补回归测试，覆盖：
  - 缺少 `name` 时本地直接失败
  - `update_database` 允许 `null` 删除列

## 观察项

### 5. 数据库属性 key 的返回形态不稳定

**现象**

- `get_database` 的 `properties` 里同时出现：
  - 可读 key，如 `Notes`
  - 中文 key，如 `标题`
  - UUID key，如 `9247a55f-760a-4428-94ec-ffb634665949`

**说明**

- 这不一定是 bug，可能是 FlowUS API 本身的行为。
- 但如果上层逻辑把 `properties` 的 key 当成稳定字段名来用，会踩坑。

**建议**

- 后续文档里明确：
  - `properties` 的外层 key 不应作为业务稳定标识
  - 应优先依赖属性对象内部的 `id` / `type` / `name`

## 同类问题排查结果

本节记录的是“和本轮已暴露问题同一种模式”的风险点。分为两类：

- **结构性缺口**：从代码上已经能确认，当前本地校验明显过松或语义不完整
- **高概率风险**：代码模式与已暴露问题高度相似，但本轮还没做 live 复现

### A. 结构性缺口

#### A1. `PageParentSchema` 允许同时传 `page_id` 和 `database_id`

**当前状态**：已在本地代码修复

**位置**

- [src/utils/validation.ts](/Users/majianhang/.config/superpowers/worktrees/flowus-mcp-serve/codex/flowus-e2e-tests/src/utils/validation.ts)

**现状**

- `PageParentSchema` 当前是：
  - `page_id?: string`
  - `database_id?: string`
- 但没有约束“二者必须且只能出现一个”。

**为什么这和本轮问题同类**

- 这和数据库属性 `name` 漏校验是同一种模式：
  - 工具描述/语义上要求更严格
  - 代码里实际放得很松

**风险**

- 调用方如果同时传入两个 parent，当前会直接通过本地校验。
- 结果要么由远端报错，要么出现不明确行为。

**建议**

- 增加 XOR 校验：
  - 只能传 `page_id`
  - 或只能传 `database_id`

**已修复内容**

- `PageParentSchema` 现在强制要求 `page_id` 和 `database_id` 二选一。
- 已补回归测试，覆盖：
  - 同时传两者会在本地直接失败
  - 只传 `database_id` 的数据库记录创建仍然正常

#### A2. 非 title 页面属性的本地校验同样偏松

**当前状态**：已修复

**位置**

- [src/schemas/input/properties.ts](/Users/majianhang/.config/superpowers/worktrees/flowus-mcp-serve/codex/flowus-e2e-tests/src/schemas/input/properties.ts)
- [src/normalizers/properties.ts](/Users/majianhang/.config/superpowers/worktrees/flowus-mcp-serve/codex/flowus-e2e-tests/src/normalizers/properties.ts)
- [src/schemas/api/properties.ts](/Users/majianhang/.config/superpowers/worktrees/flowus-mcp-serve/codex/flowus-e2e-tests/src/schemas/api/properties.ts)

**现状**

- 原先 `InputPagePropertiesSchema` 对非 `title` 字段是 `.catchall(z.unknown())`
- 原先 `normalizeGenericProperty()` 只要求：
  - 是对象
  - 不是数组
  - 里面有 `type`
- 原先 `ApiGenericPagePropertySchema` 也只是：
  - `type` 必须存在
  - 不能是 `title`
  - 其余字段直接 `.passthrough()`

**为什么这和本轮问题同类**

- 数据库属性是 `unknown` 透传，页面属性这里虽然比数据库多了一点约束，但本质上还是“只要有个 type 就行”。
- 如果后续给数据库记录或页面写复杂属性值，极容易出现“本地没拦住，远端或 UI 出异常”的情况。

**风险**

- `select/date/checkbox/people/files` 这类页面属性若 payload 不完整，本地可能不报错。

**建议**

- 至少补关键属性类型的最小合法结构校验。
- 先从 `select` / `date` / `checkbox` / `rich_text` 开始。

**已修复内容**

- 现在已经为以下页面属性增加最小 canonical 结构校验：
  - `rich_text`
  - `checkbox`
  - `select`
  - `multi_select`
  - `date`
  - `number`
  - `people`
  - `files`
  - `relation`
  - `url`
  - `email`
  - `phone_number`
- 已补回归测试，覆盖：
  - 缺少 `select` 负载时本地直接失败
  - 缺少 `relation[].id` 时本地直接失败
  - 合法的上述 canonical 属性仍可正常透传
- 目前页面属性层面剩余的主要观察项不再是“结构缺失”，而是：
  - 是否需要支持“清空值”的 `null` 语义
  - 是否要对更多远端返回类型继续做专门 schema

#### A3. 通用 block data 对很多非文本块也是 `unknown` 透传

**当前状态**：已修复

**位置**

- [src/schemas/input/blocks.ts](/Users/majianhang/.config/superpowers/worktrees/flowus-mcp-serve/codex/flowus-e2e-tests/src/schemas/input/blocks.ts)
- [src/schemas/api/blocks.ts](/Users/majianhang/.config/superpowers/worktrees/flowus-mcp-serve/codex/flowus-e2e-tests/src/schemas/api/blocks.ts)

**现状**

- 原先 `InputGenericBlockDataSchema = z.record(z.string(), z.unknown())`
- 原先 `ApiGenericBlockDataSchema = z.record(z.string(), z.unknown())`
- 原先 generic 透传覆盖了多种复杂块，既没有最小字段校验，也会在部分类型上静默剥掉 `children`

**为什么这和本轮问题同类**

- 这和数据库属性 `unknown` 透传是完全同一模式。
- 本轮已经在表格块上踩到了 live 问题，所以这类块很值得继续排。

**风险**

- 只要 payload 结构稍微不标准，就可能出现：
  - 请求成功但 UI 不对
  - 回读失败
  - 局部块异常

**建议**

- 优先把 `table` / `table_row` 从 generic schema 里拆出来做严格校验。
- 其次再看 `image/file/bookmark/embed`。

**已修复内容**

- `table` / `table_row` 已经从 generic block schema 里拆出，增加了最小结构校验。
- `image` / `file` / `bookmark` / `embed` 已拆出，增加最小结构校验。
- `equation` / `link_to_page` / `divider` 已拆出，增加最小结构校验。
- `column_list` / `column` 已拆出，并补上递归子块结构约束：
  - `column_list` 只能包含 `column`
  - `column` 可以继续包含其他合法 block
- `template` 已拆出，要求 `data.rich_text` 合法，并支持在本地规范化 rich text shorthand。
- `synced_block` 已拆出，要求 `data.synced_from` 合法；原始同步块可携带 `children`，引用型同步块会拒绝本地可编辑子块。
- `table` 在真实 FlowUS API 下不能通过“单次创建时内联 children”稳定保留 `table_row`，现已改为两段式写入：
  - 先 append 顶层 `table`
  - 再根据真实返回的 `table` block id 单独 append `table_row`
- 已修正对 FlowUS `append_block_children` 返回顺序的错误假设：
  - 真实 API 返回的 `results` 顺序不保证与请求顺序一致
  - 现在不再按数组下标回填新建 `table`，而是按返回块特征匹配目标表格
- 子块型文本块现在会保留并递归规范化 `children`，不再只处理顶层。
- 已补回归测试，覆盖：
  - `append_block_children` 传入表格时不会丢失 `table_row`
  - `create_page_from_markdown` 生成表格时不会丢失 `table_row`
  - `append_block_children` 传入嵌套 paragraph 时不会丢失子块
  - `append_block_children` 传入 column layout 时不会丢失子块
  - 缺少 `expression` 的 `equation` 会本地失败
  - 缺少 `page_id` 的 `link_to_page` 会本地失败
  - `column_list` 直接包含非 `column` 子块会本地失败
  - `template` rich text 会被规范化
  - 缺少 `template.data.rich_text` 会本地失败
  - 原始 `synced_block` 的 `children` 不会再静默丢失
  - 引用型 `synced_block` 不能直接携带可编辑子块
- 目前 block schema 层剩余的主要观察项不再是“generic 透传”，而是：
  - 这些约束是否和真实 FlowUS live 行为完全一致
  - `synced_block` 在 live API 下的创建/更新边界是否还需要再细化

**最新 live 复测结论**

- 已使用真实 FlowUS token 复跑 live E2E。
- 文档旅程、编辑旅程、维护旅程、数据旅程、检索旅程均已通过。
- 表格 Markdown round-trip 在真环境下已恢复正常。

### B. 高概率风险

#### B1. `read_page_as_markdown` 对表格采用“硬失败”，没有降级策略

**位置**

- [src/markdown/render_blocks.ts](/Users/majianhang/.config/superpowers/worktrees/flowus-mcp-serve/codex/flowus-e2e-tests/src/markdown/render_blocks.ts)
- [src/markdown/tables.ts](/Users/majianhang/.config/superpowers/worktrees/flowus-mcp-serve/codex/flowus-e2e-tests/src/markdown/tables.ts)

**现状**

- 遇到不合法表格时，当前直接抛异常，中断整个页面 Markdown 回读。
- 没有像 unsupported block 那样降级成 placeholder 或 metadata 告警。

**为什么这和本轮问题同类**

- 这和 `append_block_children(after)` 的问题一样，都属于：
  - 单元测试 happy path 没问题
  - 一旦遇到真实返回结构的边角差异，整个真人场景就断掉

**建议**

- 即使表格解析失败，也考虑：
  - 保留页面其他 Markdown
  - 在表格位置输出 placeholder
  - 把问题记录到 metadata

#### B2. `search_pages` 的工具命名和真实结果类型可能持续误导上层调用

**位置**

- [src/tools/search.ts](/Users/majianhang/.config/superpowers/worktrees/flowus-mcp-serve/codex/flowus-e2e-tests/src/tools/search.ts)
- [docs/flowus-api-docs/08-搜索API文档.md](/Users/majianhang/.config/superpowers/worktrees/flowus-mcp-serve/codex/flowus-e2e-tests/docs/flowus-api-docs/08-搜索API文档.md)

**现状**

- 工具名/描述都在强调 page。
- 本轮 live 返回里已包含 database。
- 本地没有任何类型层或结果层过滤。

**为什么这和本轮问题同类**

- 这和“文档说一套、代码放一套”的模式一致。

**建议**

- 要么过滤结果
- 要么明确文档与测试契约：
  - `search_pages` 只是历史名字
  - 实际返回是“搜索结果对象”，可能含多种 object

#### B3. `update_block` 对复杂块类型可能也存在“成功写入但结构不完整”的风险

**位置**

- [src/tools/blocks.ts](/Users/majianhang/.config/superpowers/worktrees/flowus-mcp-serve/codex/flowus-e2e-tests/src/tools/blocks.ts)
- [src/schemas/api/blocks.ts](/Users/majianhang/.config/superpowers/worktrees/flowus-mcp-serve/codex/flowus-e2e-tests/src/schemas/api/blocks.ts)

**现状**

- `update_block` 直接接受 `BlockDataSchema`
- 而 `BlockDataSchema` 的 generic 分支依然很松

**风险**

- 对 `table/table_row/image/file/embed` 等复杂块做更新时，可能出现和本轮数据库元数据类似的问题：
  - 请求能发出去
  - 但结果结构不完整
  - 最终 UI 或回读表现异常

**建议**

- 后续优先为复杂块类型补 live 测试，而不是只靠 schema 直觉判断。

## 本次测试产物

本轮测试保留了以下对象，便于后续继续复现和修复：

- 沙盒根页：`0d74967f-dce7-489c-a2be-f74454dd3bcb`
- Markdown 页面：`c74b3eaa-dfab-43f8-a33f-d893d0b53e9c`
- 周报页面：`97664c45-d0b2-443e-ae0c-8b43da558aa9`
- 表格验证页：`4747e7b6-e7b5-4cf9-ae4a-291e4808672a`
- 数据库：`e10b3f0e-f2b4-4dd0-babd-3e36ea0f53b5`
- 数据库记录：`2a1bf8c0-2395-4589-9bed-c0f5cd747dfa`

## 补充复杂边界探针

> 补充测试时间：2026-04-12
>
> 补充测试 runId：`20260412TCPLX01Z`
>
> 测试方式：真实 FlowUS live 探针，重点覆盖多表格 Markdown、复杂块、数据库多字段、搜索索引边界

本节记录的是在主链路修复完成后，额外执行的一次“复杂项目启动包”探针。目标不是再验证基础 CRUD，而是刻意撞边界：

- 同一页内 3 张表格，其中 2 张列数相同
- 结构页包含 `column_list`、`template`、`bookmark`、`embed`、`image`、`file`、`synced_block`
- 数据库包含多种属性类型和 2 条关联记录
- 搜索同时验证标题、代码块、引用、表格单元格、模板文本、同步块文本、数据库富文本

### C1. 多表格 Markdown round-trip 在真环境里已稳定可用

**结论**

- 复杂 Markdown 页创建成功。
- 同页 3 张表格全部成功写入。
- `read_page_as_markdown` 回读成功，未出现 unsupported block。

**证据**

- 页面：
  `https://flowus.cn/docs/cd41d1d4-c58c-4c42-9149-3507c49d49bf`
  `[20260412TCPLX01Z] 项目启动总览`
- 探针结果：
  - `parsedTableCount = 3`
  - `topLevelTables = 3`
  - `renderedHasTableA = true`
  - `renderedHasTableB = true`
  - `renderedHasTableC = true`
  - `unsupportedBlocks = []`

**意义**

- 这说明前面修复的两段式表格写入、按返回块特征匹配 table id、递归 table_row 拉取这条链路，在真实 FlowUS 环境下已经能覆盖更复杂的多表格场景。

### C1b. 表格标题行标记在真环境里仍不稳定

**优先级**：P1

**当前状态**：新确认缺陷，待修复

**现象**

- Markdown 表格虽然能正确创建、回读、渲染成 Markdown。
- 但真实 FlowUS 页面里的 table 元数据没有稳定保留标题行标记。
- 复核复杂探针页面时，3 张表的 block 数据分别显示：
  - 1 张表：`has_column_header = false`，`has_row_header = true`
  - 2 张表：`has_column_header = false`

**为什么这是异常**

- 本地 Markdown 解析阶段对合法 Markdown 表格会固定产出 `hasHeaderRow = true`。
- 转换成 FlowUS table block 时，也会明确发送：
  - `has_column_header = true`
  - `has_row_header = false`
- 因此当前真实页面表现说明：
  - 要么 FlowUS API 在落库时忽略或重写了表头标记
  - 要么 MCP 的真实写入链路在某一步没有把该标记稳定保留下来

**影响**

- 用户在 UI 中仍需要手工打开“标题行”。
- AI 生成的表格虽可用，但展示语义不够完整。
- `read_page_as_markdown` 目前仍能正常回读，是因为它只依赖行数据和 `table_width`，不依赖 UI 是否真的展示标题行。

**建议**

- 增加一个最小 live 用例，专门只创建 1 张带 header 的 2 列表格，再立即回读其 block 元数据。
- 单独判断这是：
  - FlowUS API 产品边界
  - 还是 MCP 在 table 创建/二次 append row 过程中的兼容问题

### C2. 复杂块创建可用，但 Markdown 回读仍只覆盖有限 block 类型

**结论**

- 复杂结构页中的 `column_list`、`template`、`bookmark`、`embed`、`image`、`file`、`synced_block` 都能成功创建。
- 但 `read_page_as_markdown` 目前仍会把这些块统一记为 unsupported block，而不会渲染成 Markdown。

**证据**

- 页面：
  `https://flowus.cn/docs/40990819-d7f4-4fc9-a12e-89860256bdde`
  `[20260412TCPLX01Z] 复杂结构页`
- 探针结果：
  - `appendResults.template.ok = true`
  - `appendResults.media-pack.ok = true`
  - `appendResults.synced-block-origin.ok = true`
  - `blockTypes` 包含：
    - `column_list`
    - `template`
    - `bookmark`
    - `embed`
    - `image`
    - `file`
    - `synced_block`
  - `unsupportedBlocks` 共 7 项，对应上述 7 类 block

**影响**

- 这不算“写入失败”，但属于明确的能力边界：
  - FlowUS 页面可以创建并展示这些复杂块
  - MCP 当前还不能把它们稳定导出成 Markdown

**建议**

- 如果后续希望 AI 做“复杂页面导出/审阅/迁移”，应继续补这几类 block 的 Markdown 渲染策略。
- 如果短期内不做，至少应在工具文档里明确：
  - `read_page_as_markdown` 当前主要面向文本型 block 和表格，不承诺完整覆盖复杂媒体/布局类 block

### C3. 搜索当前主要命中标题和 runId，对正文内容命中很弱

**优先级**：P1

**当前状态**：已确认边界，待决定是否作为 MCP 缺陷处理

**结论**

- 标题和 runId 搜索表现正常。
- 但代码块、引用、表格单元格、模板文本、同步块文本、数据库富文本字段，在 8 轮轮询后仍全部未命中。

**证据**

- `search_pages("20260412TCPLX01Z")`
  - `attempts = 1`
  - 命中 5 个对象：
    - 沙盒页
    - Markdown 页
    - 结构页
    - 数据库记录 Alpha
    - 数据库记录 Beta
- `search_pages("边界记录Alpha")`
  - `attempts = 1`
  - 命中记录标题页
- 以下查询在 `attempts = 8` 后仍 `hits = []`
  - `bootstrapProbeAlpha`（代码块内容）
  - `预算燃尽率88%`（表格单元格）
  - `边界巡检引述Beta`（引用内容）
  - `创建跟进项`（template 文本）
  - `同步源内容Gamma`（synced block 文本）
  - `需要人工复核的长文本字段`（数据库 rich_text）

**影响**

- 目前 `search_pages` 更像“标题/显性页面名检索”，不适合被上层 agent 当成“全文搜索”使用。
- 如果 agent 依赖搜索去召回：
  - 代码片段
  - 表格里的业务数据
  - 数据库富文本说明
  现在会明显漏召回。

**需要判断的地方**

- 这可能是 FlowUS 搜索索引本身的产品边界，不一定是 MCP 实现 bug。
- 但对 MCP 调用方来说，这是非常重要的能力边界，应该明确记录。

**建议**

- 在工具描述或测试文档里明确：
  - `search_pages` 当前只验证标题级发现性，不承诺正文全文检索
- 后续若要继续深挖，可再测：
  - 更长时间的索引延迟
  - 不同 workspace/权限下的一致性
  - 是否存在只索引部分 block 类型的规则

### C4. 数据库多字段写入与关系字段主链路可用，但“字段值可被搜索召回”尚不成立

**结论**

- 复杂数据库创建成功。
- 关系字段、富文本、复选框、选择、多选、日期、数字、URL、邮箱、电话、人员、附件等字段主链路可写、可查。
- 但数据库字段值目前不能假设能通过页面搜索被稳定召回。

**证据**

- 数据库：
  `https://flowus.cn/docs/81074db8-2336-4113-8285-b67d7fba60a8`
  `[20260412TCPLX01Z] 边界数据库`
- 探针结果：
  - `recordCount = 2`
  - `propertyKeys` 包含：
    - `Related`
    - `Summary`
    - `Done`
    - `Status`
    - `Tags`
    - `Due Date`
    - `Score`
    - `Website`
    - `Contact Email`
    - `Contact Phone`
    - `Owner`
    - `Attachments`
- 记录标题可搜到，但 `Summary` 里的长文本搜不到

**建议**

- 以后若 agent 需要“按数据库字段值检索记录”，不应只依赖 `search_pages`。
- 更稳的做法仍是：
  - 先定位数据库
  - 再走 `query_database`
  - 或后续补专门的数据库过滤/查询工具

## 建议修复顺序

1. 修复数据库属性校验缺失，避免继续写出“无 name”字段。
2. 修复 `read_page_as_markdown` 的表格回读问题，并补回归测试。
3. 修复或澄清 `append_block_children(after)` 的实际插入语义。
4. 明确 `search_pages` 的返回契约，是只返 page 还是返回 page/database 混合结果。

## 后续建议补充的测试

为了避免后面继续靠人工撞出问题，建议把后续测试补充成下面 3 层。

### 一层：必须尽快补的回归测试

#### 1. 表格往返一致性测试

**目标**

- 覆盖 `create_page_from_markdown -> read_page_as_markdown` 的 round-trip。
- 断言带表格的 Markdown 页面：
  - 创建后不报错
  - 回读后不报错
  - 表格不丢行
  - 表格不变空

**价值**

- 直接覆盖本轮已确认的 P1。
- 修复后可作为长期回归保护。

#### 2. `append_block_children(after)` 插入语义测试

**目标**

- 创建一个至少 3 个块的页面。
- 记录第一个块 id。
- 调用 `append_block_children(after=<first_block_id>)` 插入新块。
- 断言回读顺序与预期一致。

**价值**

- 直接覆盖本轮已确认的 P1。
- 能快速区分“FlowUS API 行为变化”和“MCP 请求体不正确”。

#### 3. 数据库属性 `name` 强校验测试

**目标**

- `create_database` 和 `update_database` 在属性缺少 `id/name/type` 时必须本地失败。
- 合法属性创建后，`get_database` 回读的属性 `name` 不应为空。

**价值**

- 直接覆盖“数据库元数据名字为空”的真实问题。
- 能阻止继续写出不规范 schema。

#### 4. 数据库记录真实写值与回读测试

**目标**

- 不只测试“能建库”和“能建记录”。
- 还要覆盖：
  - `select`
  - `rich_text`
  - `checkbox`
  - `date`
- 再通过 `query_database` / `get_page` 回读这些值。

**价值**

- 能验证数据库不只是结构可用，而是真的可写、可查、可读。

#### 5. 搜索返回契约测试

**目标**

- 明确 `search_pages` 的返回到底允许什么对象类型。
- 如果决定“只返回 page”，测试里要断言过滤 database。
- 如果决定“保留原始结果”，测试里要断言可能包含 `page/database` 混合结果。

**价值**

- 避免上层 agent 把返回值错误地当成全是 page。

### 二层：高价值稳定性测试

#### 6. 部分失败恢复测试

**目标**

- 覆盖“前半段成功、后半段失败”的场景，比如：
  - `create_page_with_content` 已建页但 append 失败
  - `create_page_from_markdown` 已建页但 markdown block 写入失败
- 断言错误返回必须带：
  - 已创建对象的 id
  - 明确的恢复提示

**价值**

- 很贴近真实 AI/agent 使用方式。
- 能显著降低“半成功状态”下的数据丢失和误操作风险。

#### 7. 权限与错误文案测试

**目标**

- 覆盖 401 / 403 / 404 / 429 / 5xx 的错误映射。
- 断言错误文案对 AI 足够可执行，而不是只有原始 HTTP 报错。

**价值**

- 能提高 agent 的自恢复能力。

#### 8. 空内容与边界内容测试

**目标**

- 覆盖：
  - 空 rich_text
  - 空 paragraph
  - 空 todo
  - 单列表格
  - 空表格
  - 超长标题
  - 中英混合标题

**价值**

- 成本低，但很容易提前拦住线上奇怪问题。

### 三层：可选但很有帮助的 live destructive 测试

#### 9. 清理与归档测试

**目标**

- 在显式环境变量开启时，覆盖：
  - 页面归档
  - block 删除
  - 数据库记录清理
- 断言只影响带当前 `runId` 的对象。

**价值**

- 防止测试数据长期堆积。
- 也能验证 destructive tool 的边界是否安全。

**注意**

- 这一层应默认关闭，只在专门验收时开启。

## 推荐的后续测试结构

建议把测试长期固定成 3 层，而不是把所有东西都塞到 live e2e：

- `unit`
  - 测 schema、normalize、markdown 解析/渲染
- `contract`
  - 用 fake client 测请求体、错误分层、局部恢复语义
- `live-e2e`
  - 只测 6 到 10 条真人旅程，不追求全工具枚举

这样能保持：

- 回归速度快
- 真实覆盖够深
- 维护成本可控

## 如果只补 5 个测试，优先顺序如下

1. 表格 round-trip 回归测试
2. `append_block_children(after)` 插入位置回归测试
3. 数据库属性 `name` 强校验测试
4. 数据库记录真实写值与回读测试
5. 搜索返回契约测试
