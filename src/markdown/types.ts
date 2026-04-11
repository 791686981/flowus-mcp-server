export type InlineRichText = {
  type: "text";
  text: { content: string };
};

export type ParagraphLikeType =
  | "paragraph"
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "bulleted_list_item"
  | "numbered_list_item"
  | "quote";

export type ParagraphLikeNode = {
  type: ParagraphLikeType;
  rich_text: InlineRichText[];
};

export type ToDoNode = {
  type: "to_do";
  rich_text: InlineRichText[];
  checked: boolean;
};

export type CodeBlockNode = {
  type: "code";
  language?: string;
  rich_text: InlineRichText[];
};

export type DividerNode = {
  type: "divider";
};

export type TableCell = {
  rich_text: InlineRichText[];
};

export type TableRow = TableCell[];

export type TableNode = {
  type: "table";
  rows: Array<Array<string | { type: string; text?: string }>>;
  hasHeaderRow: boolean;
};

export type NormalizedTable = {
  width: number;
  hasHeaderRow: boolean;
  rows: TableRow[];
};

export type BlockNode =
  | ParagraphLikeNode
  | ToDoNode
  | CodeBlockNode
  | DividerNode
  | TableNode;

export type RenderedBlockMapEntry = {
  block_id: string;
  type: string;
  line_start: number;
  line_end: number;
  path: string;
};

export type UnsupportedBlockEntry = {
  block_id: string;
  type: string;
  reason: string;
};

export type FlowUsTableRow = {
  id: string;
  type: "table_row";
  data: {
    cells: Array<Array<{ type: string; text?: { content: string } }>>;
  };
};

export type FlowUsTableBlock = {
  id: string;
  type: "table";
  data: {
    table_width: number;
    has_column_header?: boolean;
    has_row_header?: boolean;
  };
  children?: FlowUsTableRow[];
};
