# FlowUS MCP Server

用于 FlowUS API 的 MCP Server，基于 `stdio` 运行。

## 安装

```bash
npx -y flowus-mcp-server@latest
```

国内网络不稳定时：

```bash
NPM_CONFIG_REGISTRY=https://registry.npmmirror.com npx -y flowus-mcp-server@latest
```

## MCP 配置示例

```json
{
  "command": "npx",
  "args": ["-y", "flowus-mcp-server@latest"],
  "env": {
    "FLOWUS_TOKEN": "your_flowus_token",
    "NPM_CONFIG_REGISTRY": "https://registry.npmmirror.com"
  },
  "type": "stdio"
}
```

## Markdown 工具

当前新增了两类面向 AI 的 Markdown 能力：

- `read_page_as_markdown`
  读取页面并返回：
  - `page`
  - `markdown`
  - 可选 `metadata`

- `create_page_from_markdown`
  显式传入页面属性与 Markdown 正文，服务器会先本地解析 Markdown，再转换成 FlowUS blocks 后创建页面。

## 目录树工具

- `read_page_tree`
  读取某个页面下的子页面目录树，返回：
  - `page`
  - `summary`
  - `tree`

适合这些场景：

- 统计某篇文档下面有多少个直接子页面
- 查看当前页面的目录结构
- 让 AI 在继续读内容前，先理解知识库层级

`summary` 里当前会返回：

- `direct_child_page_count`
- `direct_child_database_count`
- `descendant_page_count`
- `descendant_database_count`
- `max_depth_applied`

`tree` 里的每个节点都会带编号路径，例如：

- 根页面：`1`
- 第一个子页面：`1.1`
- 第一个子页面下的第二个子页面：`1.1.2`

可选传入 `max_depth` 控制遍历深度：

- `1` 表示只看直接子页面
- 不传则递归读取整棵可见子树

### 支持的 Markdown 子集

- `#` `##` `###` 标题
- 段落
- 无序列表
- 有序列表
- 待办列表
- 引用
- 围栏代码块
- 分隔线
- 简单 Markdown 表格

### 表格限制

- 只支持简单 GFM 风格表格
- 每一行列数必须一致
- 单元格只支持 inline 文本内容
- malformed table 会在本地直接报错，不会发请求到 FlowUS

## 本地开发

```bash
npm install
npm test
npm run build
```

## Live E2E 测试

这套真人场景测试默认不会触发写入，只有显式开启时才会连接真实 FlowUS：

```bash
FLOWUS_E2E=1 FLOWUS_TOKEN=your_flowus_token npm run test:e2e
```

可选地指定一次测试的唯一前缀，方便搜索和后续清理：

```bash
FLOWUS_E2E=1 FLOWUS_TOKEN=your_flowus_token FLOWUS_E2E_RUN_ID=demo-001 npm run test:e2e
```

测试产物会统一写到顶层沙盒页 `MCP E2E Sandbox <runId>` 下，并在日志里输出 cleanup report，默认保留到人工验收结束后再清理。

## 发版

```bash
npm version patch
npm publish --registry=https://registry.npmjs.org
```

## 安全

- 不要把 `FLOWUS_TOKEN` 提交到仓库
- token 泄露后先在 FlowUS 后台重置
