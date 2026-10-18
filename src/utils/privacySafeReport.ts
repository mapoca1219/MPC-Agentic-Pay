export type AuditDecisionCode = 'PAID' | 'REJECTED' | 'ESCALATED';

export interface PrivacySafeReport {
  generatedAt: string;
  totalDocuments: number;
  decisions: {
    approved: number;
    rejected: number;
    requiresHumanReview: number;
  };
}

export function buildPrivacySafeReport(
  decisionCodes: AuditDecisionCode[],
  generatedAt = new Date().toISOString()
): PrivacySafeReport {
  return {
    generatedAt,
    totalDocuments: decisionCodes.length,
    decisions: {
      approved: decisionCodes.filter((code) => code === 'PAID').length,
      rejected: decisionCodes.filter((code) => code === 'REJECTED').length,
      requiresHumanReview: decisionCodes.filter((code) => code === 'ESCALATED').length,
    },
  };
}

export function serializePrivacySafeReportCsv(report: PrivacySafeReport): string {
  const rows = [
    ['Fecha de generación', report.generatedAt],
    ['Documentos procesados', report.totalDocuments],
    ['Decisiones aprobadas', report.decisions.approved],
    ['Decisiones rechazadas', report.decisions.rejected],
    ['Requieren revisión humana', report.decisions.requiresHumanReview],
  ];

  return `\uFEFF${rows.map((row) => row.map(escapeCsvValue).join(',')).join('\r\n')}`;
}

function escapeCsvValue(value: string | number): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}
