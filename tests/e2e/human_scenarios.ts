export const MANUAL_CHECKPOINTS = [
  "沙盒根页创建后",
  "Markdown 页面创建后",
  "数据库旅程完成后",
  "执行归档或删除前",
] as const;

export const HUMAN_SCENARIOS = [
  {
    id: "knowledge-base-newcomer",
    role: "知识库新人",
    goal: "创建一页 Markdown 项目说明并确认 AI 可回读。",
    prompt:
      "你是刚加入团队的知识库新人。请在 MCP E2E 沙盒里新建一页项目说明，内容包含标题、待办、引用、代码块和表格，然后回读成 Markdown，汇报读写是否一致。",
    requiresManualAcceptance: true,
  },
  {
    id: "project-manager",
    role: "项目经理",
    goal: "通过 create_page_with_content 和 append_block_children 维护结构化页面，并确认 after 的真实限制。",
    prompt:
      "你是项目经理。请在沙盒里创建一个结构化周报页面，然后先尝试用 after 插入指定位置并记录结果，再按末尾追加的真实能力补一条更新项，最后读取块顺序确认页面内容。",
    requiresManualAcceptance: false,
  },
  {
    id: "document-reviewer",
    role: "文档审阅人",
    goal: "验证 read_page_as_markdown 的可读性和 metadata 完整度。",
    prompt:
      "你是文档审阅人。请读取沙盒中刚创建的 Markdown 页面，检查 markdown 正文与 metadata/block_map 是否足够支持审阅与回链。",
    requiresManualAcceptance: false,
  },
  {
    id: "operations-user",
    role: "运营同学",
    goal: "搜索刚创建的页面，确认内容可被普通关键词找到。",
    prompt:
      "你是运营同学。请用搜索找到这次测试里刚创建的页面，汇报关键词、命中页面和是否存在明显误召回或漏召回。",
    requiresManualAcceptance: true,
  },
  {
    id: "data-admin",
    role: "数据管理员",
    goal: "创建并更新沙盒数据库，确认结构在 UI 和查询结果中都合理。",
    prompt:
      "你是数据管理员。请在沙盒页下创建一个简单数据库，至少包含标题和状态字段，随后更新一个字段定义并查询结果，说明数据库是否可继续扩展。",
    requiresManualAcceptance: true,
  },
  {
    id: "cleanup-operator",
    role: "清理员",
    goal: "仅在收到确认后清理本次 run 的沙盒产物。",
    prompt:
      "你是清理员。请先列出本次 run 创建的沙盒产物和风险，等待明确确认后再执行归档或删除，不要触碰非本次 run 的页面或数据库。",
    requiresManualAcceptance: true,
  },
] as const;
