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

## 发版

```bash
npm version patch
npm publish --registry=https://registry.npmjs.org
```

## 安全

- 不要把 `FLOWUS_TOKEN` 提交到仓库
- token 泄露后先在 FlowUS 后台重置
