export interface TableRow {
  [key: string]: string | number;
}

export interface ExtractionConfig {
  startPage: number;
  endPage: number;
  columnCount?: number;
  headerNames?: string;
}

export interface ExtractionResponse {
  data: TableRow[];
  error?: string;
}
