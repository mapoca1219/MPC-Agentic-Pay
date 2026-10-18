import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPrivacySafeReport,
  serializePrivacySafeReportCsv,
} from './privacySafeReport.ts';

test('privacy-safe reports contain only aggregate decision counts', () => {
  const report = buildPrivacySafeReport(
    ['PAID', 'REJECTED', 'ESCALATED', 'PAID'],
    '2026-10-18T12:00:00.000Z'
  );

  assert.deepEqual(report, {
    generatedAt: '2026-10-18T12:00:00.000Z',
    totalDocuments: 4,
    decisions: {
      approved: 2,
      rejected: 1,
      requiresHumanReview: 1,
    },
  });
  assert.doesNotMatch(JSON.stringify(report), /vendor|account|invoice|amount|hash|email|taxId/i);
});

test('privacy-safe CSV contains no per-document fields', () => {
  const csv = serializePrivacySafeReportCsv(
    buildPrivacySafeReport(['ESCALATED'], '2026-10-18T12:00:00.000Z')
  );

  assert.match(csv, /Requieren revisión humana/);
  assert.doesNotMatch(csv, /Proveedor|Factura|Cuenta|Monto|Hash|Banco|Beneficiario/i);
});
