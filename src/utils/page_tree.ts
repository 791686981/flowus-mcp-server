import type { FlowUsClient } from "../client.js";
import { fetchAllBlockChildren } from "./block_children.js";

type FlowUsPage = {
  id: string;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
};

type FlowUsChildBlock = {
  id: string;
  type: string;
  data?: Record<string, unknown>;
};

export type PageTreeNode = {
  id: string;
  type: "page" | "child_page" | "child_database";
  title: string;
  number: string;
  direct_child_page_count: number;
  direct_child_database_count: number;
  children: PageTreeNode[];
};

type PageTreeResult = {
  page: FlowUsPage;
  summary: {
    direct_child_page_count: number;
    direct_child_database_count: number;
    descendant_page_count: number;
    descendant_database_count: number;
    max_depth_applied: number | null;
  };
  tree: PageTreeNode;
};

function extractPageTitle(properties: Record<string, unknown> | undefined): string {
  if (!properties) {
    return "(Untitled)";
  }

  for (const value of Object.values(properties)) {
    if (
      value &&
      typeof value === "object" &&
      (value as { type?: unknown }).type === "title" &&
      Array.isArray((value as { title?: unknown[] }).title)
    ) {
      const first = (value as { title: Array<{ text?: { content?: string } }> }).title[0];
      if (typeof first?.text?.content === "string" && first.text.content.length > 0) {
        return first.text.content;
      }
    }
  }

  return "(Untitled)";
}

function extractChildTitle(block: FlowUsChildBlock): string {
  if (typeof block.data?.title === "string" && block.data.title.length > 0) {
    return block.data.title;
  }
  return "(Untitled)";
}

function toTreeBlocks(blocks: Array<Record<string, unknown>>): FlowUsChildBlock[] {
  return blocks.filter((block) => block.type === "child_page" || block.type === "child_database") as FlowUsChildBlock[];
}

function countDescendantsByType(node: PageTreeNode, type: "child_page" | "child_database"): number {
  return node.children.reduce((total, child) => {
    const own = child.type === type ? 1 : 0;
    return total + own + countDescendantsByType(child, type);
  }, 0);
}

async function buildChildNodes(
  client: FlowUsClient,
  parentId: string,
  parentNumber: string,
  depth: number,
  maxDepth?: number,
): Promise<PageTreeNode[]> {
  const childBlocks = toTreeBlocks(
    await fetchAllBlockChildren(client, parentId, false) as Array<Record<string, unknown>>,
  );

  return Promise.all(childBlocks.map(async (block, index) => {
    const number = `${parentNumber}.${index + 1}`;
    const shouldRecurse =
      block.type === "child_page" && (maxDepth === undefined || depth < maxDepth);
    const children = shouldRecurse
      ? await buildChildNodes(client, block.id, number, depth + 1, maxDepth)
      : [];

    const directChildPageCount = children.filter((child) => child.type === "child_page").length;
    const directChildDatabaseCount = children.filter((child) => child.type === "child_database").length;

    return {
      id: block.id,
      type: block.type as "child_page" | "child_database",
      title: extractChildTitle(block),
      number,
      direct_child_page_count: directChildPageCount,
      direct_child_database_count: directChildDatabaseCount,
      children,
    };
  }));
}

export async function readPageTree(
  client: FlowUsClient,
  pageId: string,
  maxDepth?: number,
): Promise<PageTreeResult> {
  const page = await client.get<FlowUsPage>(`/pages/${pageId}`);
  const children = await buildChildNodes(client, pageId, "1", 1, maxDepth);

  const tree: PageTreeNode = {
    id: page.id,
    type: "page",
    title: extractPageTitle(page.properties),
    number: "1",
    direct_child_page_count: children.filter((child) => child.type === "child_page").length,
    direct_child_database_count: children.filter((child) => child.type === "child_database").length,
    children,
  };

  return {
    page,
    summary: {
      direct_child_page_count: tree.direct_child_page_count,
      direct_child_database_count: tree.direct_child_database_count,
      descendant_page_count: countDescendantsByType(tree, "child_page"),
      descendant_database_count: countDescendantsByType(tree, "child_database"),
      max_depth_applied: maxDepth ?? null,
    },
    tree,
  };
}
