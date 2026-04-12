import type { FlowUsClient } from "../client.js";

export type CanonicalBlock = {
  id?: string;
  type: string;
  data?: Record<string, unknown>;
  children?: CanonicalBlock[];
  [key: string]: unknown;
};

type AppendChildrenResponse = {
  object?: string;
  results?: CanonicalBlock[];
  next_cursor?: string | null;
  has_more?: boolean;
  [key: string]: unknown;
};

type DeferredTableRows = {
  index: number;
  rows: CanonicalBlock[];
  tableWidth?: unknown;
  hasRowHeader?: unknown;
};

function splitDeferredTableRows(children: CanonicalBlock[]) {
  const deferred: DeferredTableRows[] = [];

  const topLevelChildren = children.map((child, index) => {
    if (child.type !== "table" || !Array.isArray(child.children) || child.children.length === 0) {
      return child;
    }

    deferred.push({
      index,
      rows: child.children,
      tableWidth: child.data?.table_width,
      hasRowHeader: child.data?.has_row_header,
    });

    const { children: _children, ...tableWithoutRows } = child;

    return {
      ...tableWithoutRows,
    };
  });

  return { topLevelChildren, deferred };
}

function resolveCreatedTableBlock(
  results: CanonicalBlock[] | undefined,
  item: DeferredTableRows,
  usedResultIndexes: Set<number>,
) {
  if (!results) {
    return undefined;
  }

  const matchedIndex = results.findIndex((block, index) => {
    if (usedResultIndexes.has(index) || block.type !== "table") {
      return false;
    }

    const blockData = block.data ?? {};
    return (
      blockData.table_width === item.tableWidth &&
      blockData.has_row_header === item.hasRowHeader
    );
  });

  if (matchedIndex >= 0) {
    usedResultIndexes.add(matchedIndex);
    return results[matchedIndex];
  }

  const fallbackIndex = results.findIndex((block, index) => {
    return !usedResultIndexes.has(index) && block.type === "table";
  });

  if (fallbackIndex >= 0) {
    usedResultIndexes.add(fallbackIndex);
    return results[fallbackIndex];
  }

  return undefined;
}

export async function appendChildrenWithDeferredTableRows(
  client: FlowUsClient,
  parentBlockId: string,
  children: CanonicalBlock[],
) {
  const { topLevelChildren, deferred } = splitDeferredTableRows(children);
  const topLevelResult = await client.patch<AppendChildrenResponse>(`/blocks/${parentBlockId}/children`, {
    children: topLevelChildren,
  });

  if (deferred.length === 0) {
    return topLevelResult;
  }

  const usedResultIndexes = new Set<number>();
  for (const item of deferred) {
    const targetBlock = resolveCreatedTableBlock(topLevelResult.results, item, usedResultIndexes);
    if (!targetBlock?.id) {
      throw new Error(`Unable to append table rows because the created table block at index ${item.index} has no id.`);
    }

    await client.patch(`/blocks/${targetBlock.id}/children`, {
      children: item.rows,
    });
  }

  return topLevelResult;
}
