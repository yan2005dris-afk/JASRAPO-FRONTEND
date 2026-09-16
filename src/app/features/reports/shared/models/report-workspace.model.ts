export type ReportFormat = 'table' | 'pdf';

export type ReportStatus = 'idle' | 'loading' | 'empty' | 'error';

export interface IReportContextItem {
  label: string;
  value: string;
}

export interface IReportResultColumn {
  key: string;
  label: string;
  align?: 'start' | 'center' | 'end';
}

export interface IReportResultRow {
  id: string;
  cells: Readonly<Record<string, string>>;
}

export interface IReportEmailRequest {
  destinatario: string;
  subject?: string;
}

export interface IReportNavigationItem {
  title: string;
  description: string;
  route: string;
  icon: string;
}

export interface IReportNavigationGroup {
  title: string;
  reports: readonly IReportNavigationItem[];
}
