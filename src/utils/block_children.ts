import type { FlowUsClient } from "../client.js";

export type FlowUsBlockListItem = {
  id: string;
  has_children?: boolean;
  children?: FlowUsBlockListItem[];
  [key: string]: unknown;
};

type FlowUsBlockChildrenResponse = {
  results: FlowUsBlockListItem[];
  has_more: boolean;
  next_cursor: string | null;
  [key: string]: unknown;
};

async function hydrateNestedChildren(
  client: FlowUsClient,
  block: FlowUsBlockListItem,
  pageSize: number,
): Promise<FlowUsBlockListItem> {
  if (!block.has_children) {
    return block;
  }

  return {
    ...block,
    children: await fetchAllBlockChildren(client, block.id, true, pageSize),
  };
}

export async function fetchPagedBlockChildren(
  client: FlowUsClient,
  blockId: string,
  options: {
    pageSize?: number;
    startCursor?: string;
    recursive?: boolean;
  } = {},
): Promise<FlowUsBlockChildrenResponse> {
  const pageSize = options.pageSize ?? 100;
  const params: Record<string, string> = {
    page_size: String(pageSize),
  };
  if (options.startCursor) {
    params.start_cursor = options.startCursor;
  }

  const response = await client.get<FlowUsBlockChildrenResponse>(
    `/blocks/${blockId}/children`,
    params,
  );

  if (!options.recursive) {
    return response;
  }

  return {
    ...response,
    results: await Promise.all(
      response.results.map((block) => hydrateNestedChildren(client, block, pageSize)),
    ),
  };
}

export async function fetchAllBlockChildren(
  client: FlowUsClient,
  blockId: string,
  recursive: boolean,
  pageSize = 100,
): Promise<FlowUsBlockListItem[]> {
  const allResults: FlowUsBlockListItem[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchPagedBlockChildren(client, blockId, {
      pageSize,
      startCursor: cursor,
      recursive,
    });
    allResults.push(...response.results);
    hasMore = response.has_more;
    cursor = response.next_cursor ?? undefined;
  }

  return allResults;
}

export function countBlocksDeep(blocks: FlowUsBlockListItem[]): number {
  return blocks.reduce((total, block) => {
    const childCount = Array.isArray(block.children)
      ? countBlocksDeep(block.children)
      : 0;
    return total + 1 + childCount;
  }, 0);
}
