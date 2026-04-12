import assert from "node:assert/strict";
import path from "node:path";
import test, { after, before } from "node:test";
import { buildOwnedTitle, resolveFlowUsE2EConfig } from "../helpers/flowus_e2e_support.js";
import { LiveMcpSession } from "../helpers/mcp_stdio_client.js";

type FlowUsListResult<T> = {
  object: "list";
  results: T[];
  has_more: boolean;
  next_cursor: string | null;
};

type FlowUsPage = {
  object: "page";
  id: string;
  url?: string;
  icon?: { type: "emoji"; emoji: string } | null;
  parent?: {
    page_id?: string;
    database_id?: string;
  };
  properties?: Record<string, unknown>;
};

type FlowUsBlock = {
  id: string;
  type: string;
  data?: {
    rich_text?: Array<{
      type: string;
      text?: {
        content?: string;
      };
    }>;
  };
};

type FlowUsDatabase = {
  object: "database";
  id: string;
  url?: string;
  title?: Array<{
    type: string;
    text?: {
      content?: string;
    };
  }>;
  properties?: Record<string, unknown>;
};

function getStringPropertyTitle(page: FlowUsPage) {
  const titleProperty = Object.values(page.properties ?? {}).find((property) => {
    return Boolean(property && typeof property === "object" && (property as { type?: string }).type === "title");
  }) as { title?: Array<{ text?: { content?: string } }> } | undefined;

  return titleProperty?.title?.map((item) => item.text?.content ?? "").join("") ?? "";
}

function getBlockPlainText(block: FlowUsBlock) {
  return block.data?.rich_text?.map((item) => item.text?.content ?? "").join("") ?? "";
}

async function waitForSearchHit(
  session: LiveMcpSession,
  query: string,
  expectedIds: string[],
  attempts = 5,
) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const payload = await session.callJsonTool<FlowUsListResult<FlowUsPage>>("search_pages", {
      query,
      page_size: 20,
    });
    const ids = new Set(payload.results.map((page) => page.id));
    if (expectedIds.every((id) => ids.has(id))) {
      return payload;
    }

    await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }

  throw new Error(`search_pages did not return all expected ids for query "${query}"`);
}

const config = resolveFlowUsE2EConfig(process.env);

if (!config.enabled) {
  test("FlowUS live E2E suite requires FLOWUS_E2E=1 and FLOWUS_TOKEN", {
    skip: config.skipReason,
  }, () => {});
} else {
  const repoRoot = process.cwd();
  const distEntry = path.join(repoRoot, "dist", "index.js");
  const childEnv = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  const requiredTools = [
    "get_me",
    "search_pages",
    "create_page",
    "create_page_with_content",
    "create_page_from_markdown",
    "read_page_as_markdown",
    "append_block_children",
    "get_block_children",
    "update_page",
    "update_block",
    "create_database",
    "get_database",
    "query_database",
    "update_database",
  ];

  let session: LiveMcpSession;
  let sandboxPage: FlowUsPage;
  let markdownPage: FlowUsPage;
  let contentPage: FlowUsPage;
  let database: FlowUsDatabase;
  let databaseRecord: FlowUsPage;

  before(async () => {
    session = new LiveMcpSession({
      command: process.execPath,
      args: [distEntry],
      cwd: repoRoot,
      env: {
        ...childEnv,
        FLOWUS_TOKEN: process.env.FLOWUS_TOKEN!,
      },
      runId: config.runId,
    });
    await session.start();

    const toolList = await session.listTools();
    for (const toolName of requiredTools) {
      assert.ok(toolList.tools.some((tool) => tool.name === toolName), `missing tool ${toolName}`);
    }

    sandboxPage = await session.callJsonTool<FlowUsPage>("create_page", {
      properties: {
        title: config.sandboxTitle,
      },
      icon: "🧪",
    });
    session.tracker?.trackSandboxRoot(sandboxPage.id, config.sandboxTitle);

    console.log(`[manual-checkpoint] 沙盒根页创建后请验收: ${sandboxPage.url ?? sandboxPage.id}`);
  });

  after(async () => {
    if (session?.tracker) {
      console.log(`[cleanup-report]\n${session.tracker.formatCleanupReport()}`);
    }
    await session?.close();
  });

  test("连通性旅程：get_me 与 search_pages 可用", async () => {
    const me = await session.callJsonTool<{ object: string; id: string; name: string }>("get_me", {});
    const search = await session.callJsonTool<FlowUsListResult<FlowUsPage>>("search_pages", {
      query: "",
      page_size: 5,
    });

    assert.equal(me.object, "user");
    assert.ok(me.id.length > 0);
    assert.ok(me.name.length > 0);
    assert.equal(search.object, "list");
    assert.ok(Array.isArray(search.results));
  });

  test("文档旅程：create_page_from_markdown 后可被 read_page_as_markdown 回读", async () => {
    const markdownTitle = buildOwnedTitle(config.runId, "Markdown 项目说明");
    const created = await session.callJsonTool<{
      page: FlowUsPage;
      summary: {
        parsed_block_count: number;
        parsed_table_count: number;
      };
    }>("create_page_from_markdown", {
      parent: {
        page_id: sandboxPage.id,
      },
      properties: {
        title: markdownTitle,
      },
      markdown: `# 项目说明

- 梳理 MCP 真人旅程
- 回读 Markdown 与 metadata

- [ ] 人工验收页面排版

> 这是一段引用，用来验证回读效果。

\`\`\`ts
const value = "flowus";
\`\`\`

| 模块 | 状态 |
| --- | --- |
| 页面 | 已覆盖 |
| 数据库 | 处理中 |`,
    });

    markdownPage = created.page;
    session.tracker?.trackPage(markdownPage.id, markdownTitle);

    const rendered = await session.callJsonTool<{
      page: FlowUsPage;
      markdown: string;
      metadata?: {
        block_map?: Array<{ block_id: string }>;
        unsupported_blocks?: unknown[];
      };
    }>("read_page_as_markdown", {
      page_id: markdownPage.id,
      recursive: true,
      include_properties: true,
      include_metadata: true,
    });

    assert.equal(created.summary.parsed_table_count, 1);
    assert.ok(created.summary.parsed_block_count >= 5);
    assert.match(rendered.markdown, /# Markdown 项目说明|# 项目说明/);
    assert.match(rendered.markdown, /人工验收页面排版/);
    assert.match(rendered.markdown, /\| 模块 \| 状态 \|/);
    assert.ok((rendered.metadata?.block_map?.length ?? 0) > 0);

    console.log(`[manual-checkpoint] Markdown 页面创建后请验收: ${markdownPage.url ?? markdownPage.id}`);
  });

  test("编辑旅程：create_page_with_content、append_block_children 与 get_block_children 串联工作", async () => {
    const pageTitle = buildOwnedTitle(config.runId, "结构化周报");
    const created = await session.callJsonTool<{
      page: FlowUsPage;
    }>("create_page_with_content", {
      parent: {
        page_id: sandboxPage.id,
      },
      properties: {
        title: pageTitle,
      },
      children: [
        {
          type: "paragraph",
          data: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "本周完成了 e2e 基础设施。",
                },
              },
            ],
          },
        },
        {
          type: "paragraph",
          data: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "下周计划执行更多人工验收。",
                },
              },
            ],
          },
        },
      ],
    });

    contentPage = created.page;
    session.tracker?.trackPage(contentPage.id, pageTitle);

    const initialChildren = await session.callJsonTool<FlowUsListResult<FlowUsBlock>>("get_block_children", {
      block_id: contentPage.id,
      page_size: 20,
    });
    const firstBlock = initialChildren.results[0];
    assert.ok(firstBlock?.id);

    const rejectedInsert = await session.callTool("append_block_children", {
      block_id: contentPage.id,
      after: firstBlock.id,
      children: [
        {
          type: "paragraph",
          data: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "插入的中间进度：等待人工验收。",
                },
              },
            ],
          },
        },
      ],
    });
    assert.equal(rejectedInsert.isError, true);
    assert.match(rejectedInsert.content[0]?.text ?? "", /after parameter is not supported/i);

    await session.callJsonTool<FlowUsListResult<FlowUsBlock>>("append_block_children", {
      block_id: contentPage.id,
      children: [
        {
          type: "paragraph",
          data: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "末尾追加的进度更新：等待人工验收。",
                },
              },
            ],
          },
        },
      ],
    });

    const updatedChildren = await session.callJsonTool<FlowUsListResult<FlowUsBlock>>("get_block_children", {
      block_id: contentPage.id,
      page_size: 20,
    });
    updatedChildren.results.forEach((block) => session.tracker?.trackBlock(block.id, `block:${block.type}`));

    assert.equal(getBlockPlainText(updatedChildren.results[0]), "本周完成了 e2e 基础设施。");
    assert.equal(getBlockPlainText(updatedChildren.results[1]), "下周计划执行更多人工验收。");
    assert.equal(getBlockPlainText(updatedChildren.results[2]), "末尾追加的进度更新：等待人工验收。");
  });

  test("维护旅程：update_page、get_page 与 update_block 能回读变更", async () => {
    const updatedTitle = buildOwnedTitle(config.runId, "结构化周报（已更新）");

    await session.callJsonTool<FlowUsPage>("update_page", {
      page_id: contentPage.id,
      properties: {
        title: updatedTitle,
      },
      icon: "📝",
    });

    const page = await session.callJsonTool<FlowUsPage>("get_page", {
      page_id: contentPage.id,
    });
    const blocks = await session.callJsonTool<FlowUsListResult<FlowUsBlock>>("get_block_children", {
      block_id: contentPage.id,
      page_size: 20,
    });

    const blockToUpdate = blocks.results[0];
    assert.ok(blockToUpdate?.id);

    await session.callJsonTool<FlowUsBlock>("update_block", {
      block_id: blockToUpdate.id,
      type: "heading_2",
      data: {
        rich_text: [
          {
            type: "text",
            text: {
              content: "本周状态",
            },
          },
        ],
      },
    });

    const updatedBlock = await session.callJsonTool<FlowUsBlock>("get_block", {
      block_id: blockToUpdate.id,
    });

    assert.equal(getStringPropertyTitle(page), updatedTitle);
    assert.equal(page.icon?.type, "emoji");
    assert.equal(page.icon?.emoji, "📝");
    assert.equal(updatedBlock.type, "heading_2");
    assert.equal(getBlockPlainText(updatedBlock), "本周状态");
  });

  test("数据旅程：create_database、query_database 与 update_database 能稳定工作", async () => {
    const databaseTitle = buildOwnedTitle(config.runId, "任务数据库");
    database = await session.callJsonTool<FlowUsDatabase>("create_database", {
      parent: {
        page_id: sandboxPage.id,
      },
      title: [
        {
          type: "text",
          text: {
            content: databaseTitle,
          },
        },
      ],
      properties: {
        title: {
          id: "title",
          name: "Name",
          type: "title",
          title: {},
        },
        status: {
          id: "status",
          name: "Status",
          type: "select",
          select: {
            options: [
              { name: "Open", color: "yellow" },
              { name: "Done", color: "green" },
            ],
          },
        },
      },
    });
    session.tracker?.trackDatabase(database.id, databaseTitle);

    const createdDatabase = await session.callJsonTool<FlowUsDatabase>("get_database", {
      database_id: database.id,
    });

    databaseRecord = await session.callJsonTool<FlowUsPage>("create_page", {
      parent: {
        database_id: database.id,
      },
      properties: {
        title: buildOwnedTitle(config.runId, "数据库记录"),
      },
    });
    session.tracker?.trackPage(databaseRecord.id, buildOwnedTitle(config.runId, "数据库记录"));

    const queried = await session.callJsonTool<FlowUsListResult<FlowUsPage>>("query_database", {
      database_id: database.id,
      page_size: 20,
    });

    await session.callJsonTool<FlowUsDatabase>("update_database", {
      database_id: database.id,
      properties: {
        notes: {
          id: "notes",
          name: "Notes",
          type: "rich_text",
          rich_text: {},
        },
      },
    });

    const updatedDatabase = await session.callJsonTool<FlowUsDatabase>("get_database", {
      database_id: database.id,
    });

    assert.equal(createdDatabase.object, "database");
    assert.equal(createdDatabase.title?.[0]?.text?.content, databaseTitle);
    assert.ok(queried.results.some((page) => page.id === databaseRecord.id));
    const updatedProperties = Object.values(updatedDatabase.properties ?? {}) as Array<{
      id?: string;
      name?: string;
      type?: string;
    }>;
    assert.ok(updatedProperties.some((property) => property.id === "notes" && property.name === "Notes"));

    console.log(`[manual-checkpoint] 数据库旅程完成后请验收: ${database.url ?? database.id}`);
  });

  test("检索与破坏性前置检查：search_pages 能命中新建产物且清理范围只在沙盒内", async () => {
    const results = await waitForSearchHit(session, config.runId, [
      markdownPage.id,
      contentPage.id,
      databaseRecord.id,
    ]);

    const trackedPages = [markdownPage, contentPage, databaseRecord];
    trackedPages.forEach((page) => {
      const parentId = page.parent?.page_id ?? page.parent?.database_id;
      assert.ok(parentId === sandboxPage.id || parentId === database.id);
    });

    assert.ok(results.results.some((page) => page.id === markdownPage.id));
    assert.ok(results.results.some((page) => page.id === contentPage.id));
    assert.ok(results.results.some((page) => page.id === databaseRecord.id));

    console.log("[manual-checkpoint] 执行归档或删除前请先人工确认 cleanup-report。");
  });
}
