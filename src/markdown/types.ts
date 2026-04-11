export type InlineRichText = {
  type: "text";
  text: { content: string };
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
