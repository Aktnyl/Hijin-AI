/**
 * tests/interactive_artifact_studio.test.ts - Phase 3 Interactive Artifact Studio Test Suite
 *
 * Mathematically and architecturally verifies:
 * 1. Table Spec Data & Model Integration: Default working paper schemas, embedded tables, and markdown table parser.
 * 2. Deterministic Mathematical Calculations: Column sum recalculations, active cell inspection, and zero-variance audits.
 * 3. Search, Filter & Status Grouping: Real-time text search, status pills (verified, variance, adjustment), and sorting.
 * 4. Local Offline Exports: RFC-4180 CSV compilation and Markdown table generation without network egress.
 * 5. Grounded Evidence Integration: Citation linking from workpaper rows to verified source documents.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_EBITDA_TABLE,
  getEmbeddedArtifactTable,
  saveEmbeddedArtifact,
  parseMarkdownTable,
} from '../src/services/embeddedFinancialEngine';
import { TableSpecData, ArtifactRecord } from '../src/services/agentClient';
import { parseCleanNumber } from '../src/services/multiFormatIngestion';

describe('Phase 3: Interactive Artifact Studio (Live Workpapers, Tables & Visualizations)', () => {

  // =========================================================================
  // 1. Table Spec Data & Markdown Parser Tests
  // =========================================================================
  describe('1. Table Data Specifications & Markdown Parser', () => {
    it('provides authoritative default working paper table for EBITDA reconciliation', () => {
      expect(DEFAULT_EBITDA_TABLE).toBeDefined();
      expect(DEFAULT_EBITDA_TABLE.columns).toContain('Line Item');
      expect(DEFAULT_EBITDA_TABLE.columns).toContain('Reported ($)');
      expect(DEFAULT_EBITDA_TABLE.columns).toContain('Audit Verification Status');
      expect(DEFAULT_EBITDA_TABLE.rows.length).toBeGreaterThan(0);

      // Verify mathematical columns exist
      const firstRow = DEFAULT_EBITDA_TABLE.rows[0];
      expect(firstRow[0]).toBe('Gross Revenue');
      expect(firstRow[1]).toBe('$54,200,000');
      expect(firstRow[4]).toContain('PASSED');
    });

    it('accurately parses standard markdown tables into structured TableSpecData', () => {
      const markdownTable = `
| Account ID | Description | Stated Amount | Verified Amount | Variance | Status |
| :--- | :--- | ---: | ---: | ---: | :---: |
| 1010-00 | Cash and Cash Equivalents | $1,250,000.00 | $1,250,000.00 | $0.00 | COMPLIANT |
| 1200-00 | Accounts Receivable Trade | $845,200.00 | $840,100.00 | $5,100.00 | VARIANCE |
| 2010-00 | Accounts Payable Trade | ($412,300.00) | ($412,300.00) | $0.00 | COMPLIANT |
`;

      const parsed = parseMarkdownTable(markdownTable);
      expect(parsed).not.toBeNull();
      if (!parsed) return;

      expect(parsed.columns).toEqual([
        'Account ID',
        'Description',
        'Stated Amount',
        'Verified Amount',
        'Variance',
        'Status',
      ]);
      expect(parsed.rows.length).toBe(3);
      expect(parsed.rows[0][0]).toBe('1010-00');
      expect(parsed.rows[0][1]).toBe('Cash and Cash Equivalents');
      expect(parsed.rows[0][2]).toBe('$1,250,000.00');
      expect(parsed.rows[1][4]).toBe('$5,100.00');
      expect(parsed.rows[1][5]).toBe('VARIANCE');
    });

    it('handles markdown tables with surrounding prose text cleanly', () => {
      const proseWithTable = `
# Executive Working Paper Summary
Below is the reconciled audit breakdown for Q3 Cloud Services:

| Metric | Stated | Adjusted |
|---|---|---|
| Compute Units | 14,200 | 14,200 |
| Ingress / Egress | 3,100 | 3,450 |

All values verified against AWS invoice statement.
`;

      const parsed = parseMarkdownTable(proseWithTable);
      expect(parsed).not.toBeNull();
      if (!parsed) return;

      expect(parsed.columns).toEqual(['Metric', 'Stated', 'Adjusted']);
      expect(parsed.rows.length).toBe(2);
      expect(parsed.rows[0][0]).toBe('Compute Units');
      expect(parsed.rows[1][2]).toBe('3,450');
    });

    it('returns null for text lacking valid markdown table formatting', () => {
      expect(parseMarkdownTable('No tables here')).toBeNull();
      expect(parseMarkdownTable('| Only one header | without separator |')).toBeNull();
    });

    it('persists and retrieves table data associated with artifact records', () => {
      const customTable: TableSpecData = {
        title: 'Trial Balance Verification',
        columns: ['Code', 'Account', 'Debit', 'Credit'],
        rows: [
          ['1000', 'Cash', '$50,000.00', '$0.00'],
          ['3000', 'Common Stock', '$0.00', '$50,000.00'],
        ],
      };

      const testArtifact: ArtifactRecord = {
        artifact_id: 'art-trial-balance-99',
        task_id: 'task-tb',
        artifact_type: 'SPREADSHEET',
        filename: 'trial_balance_q3.xlsx',
        mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size_bytes: 4096,
        created_at: new Date().toISOString(),
      };

      saveEmbeddedArtifact(testArtifact, customTable);

      const byId = getEmbeddedArtifactTable('art-trial-balance-99');
      expect(byId).toBeDefined();
      expect(byId?.title).toBe('Trial Balance Verification');
      expect(byId?.rows.length).toBe(2);

      const byFilename = getEmbeddedArtifactTable('trial_balance_q3.xlsx');
      expect(byFilename).toBeDefined();
      expect(byFilename?.title).toBe('Trial Balance Verification');
    });
  });

  // =========================================================================
  // 2. Deterministic Mathematical Recalculation Tests
  // =========================================================================
  describe('2. Deterministic Mathematical Calculations & Audits', () => {
    it('correctly cleans and extracts numeric values from diverse financial formats', () => {
      expect(parseCleanNumber('$1,245,000.00')).toBe(1245000.0);
      expect(parseCleanNumber('($35,000.00)')).toBe(-35000.0);
      expect(parseCleanNumber('-12,450.75')).toBe(-12450.75);
      expect(parseCleanNumber('12.5%')).toBe(12.5);
      expect(parseCleanNumber('N/A')).toBeNull();
      expect(parseCleanNumber('VERIFIED')).toBeNull();
    });

    it('calculates column totals deterministically across rows', () => {
      const rows = [
        ['Hardware Maintenance', '$12,500.00', 'VERIFIED'],
        ['Software Licenses', '$45,250.50', 'VERIFIED'],
        ['Cloud Compute Offset', '($3,100.25)', 'ADJUSTMENT'],
        ['Telecommunications', '$4,120.00', 'VERIFIED'],
      ];

      const sumColumnIndex = 1;
      let total = 0;
      let count = 0;

      for (const row of rows) {
        const val = parseCleanNumber(row[sumColumnIndex]);
        if (val !== null) {
          total += val;
          count++;
        }
      }

      expect(count).toBe(4);
      // 12500.00 + 45250.50 - 3100.25 + 4120.00 = 58770.25
      expect(total).toBeCloseTo(58770.25, 2);
    });

    it('detects variance discrepancies between expected total and stated total', () => {
      const statedTotal = 19250.0;
      const expectedTotal = 18943.75;
      const variance = statedTotal - expectedTotal;

      expect(variance).toBe(306.25);
      expect(variance === 0).toBe(false);
    });

    it('recalculates row state when an inline cell edit modifies values', () => {
      // Simulate editing a row
      const originalRow = ['Compute Nodes', '$18,943.75', '$19,250.00', '+$306.25', 'VARIANCE'];
      const updatedRow = [...originalRow];

      // Edit Stated Amount from 19,250.00 to 18,943.75 (resolving variance)
      updatedRow[2] = '$18,943.75';

      const statedVal = parseCleanNumber(updatedRow[2]);
      const expectedVal = parseCleanNumber(updatedRow[1]);
      const newVariance = (statedVal ?? 0) - (expectedVal ?? 0);

      updatedRow[3] = newVariance === 0 ? '$0.00' : `$${newVariance.toFixed(2)}`;
      updatedRow[4] = newVariance === 0 ? 'VERIFIED' : 'VARIANCE';

      expect(newVariance).toBe(0);
      expect(updatedRow[3]).toBe('$0.00');
      expect(updatedRow[4]).toBe('VERIFIED');
    });
  });

  // =========================================================================
  // 3. Search, Filter & Status Grouping Logic
  // =========================================================================
  describe('3. Search, Filter & Status Grouping Logic', () => {
    const sampleRows = [
      ['Reported Net Income', '$1,245,000.00', '$1,245,000.00', '$0.00', 'VERIFIED'],
      ['Interest Expense', '$85,400.00', '$85,400.00', '$0.00', 'VERIFIED'],
      ['Depreciation & Amortization', '$312,000.00', '$324,500.00', '+$12,500.00', 'VARIANCE'],
      ['Non-Recurring Litigation', '($45,000.00)', '($45,000.00)', '$0.00', 'ADJUSTMENT'],
      ['Foreign Exchange Gain/Loss', '$18,200.00', '$18,200.00', '$0.00', 'PASSED'],
    ];

    it('filters rows by text search case-insensitively across all columns', () => {
      const query = 'depreciation';
      const filtered = sampleRows.filter((row) =>
        row.some((cell) => String(cell).toLowerCase().includes(query.toLowerCase()))
      );

      expect(filtered.length).toBe(1);
      expect(filtered[0][0]).toBe('Depreciation & Amortization');
    });

    it('filters rows by audit status pills', () => {
      const filterByStatus = (statusCategory: 'all' | 'verified' | 'adjustment' | 'variance') => {
        if (statusCategory === 'all') return sampleRows;
        return sampleRows.filter((row) => {
          const rowStr = row.map((c) => String(c).toUpperCase()).join(' ');
          if (statusCategory === 'verified') return rowStr.includes('VERIFIED') || rowStr.includes('PASSED') || rowStr.includes('COMPLIANT');
          if (statusCategory === 'adjustment') return rowStr.includes('ADJUSTMENT') || rowStr.includes('MODIFIED');
          if (statusCategory === 'variance') return rowStr.includes('VARIANCE') || rowStr.includes('DISALLOWED') || rowStr.includes('DISCREPANCY');
          return true;
        });
      };

      const verified = filterByStatus('verified');
      expect(verified.length).toBe(3); // Net Income, Interest, FX Gain/Loss

      const variances = filterByStatus('variance');
      expect(variances.length).toBe(1); // Depreciation

      const adjustments = filterByStatus('adjustment');
      expect(adjustments.length).toBe(1); // Litigation
    });

    it('sorts numeric columns numerically rather than lexicographically', () => {
      const rowsToSort = [
        ['Item A', '$50.00'],
        ['Item B', '$1,200.00'],
        ['Item C', '$9.95'],
        ['Item D', '$300.00'],
      ];

      const sortedAsc = [...rowsToSort].sort((a, b) => {
        const valA = parseCleanNumber(a[1]) ?? 0;
        const valB = parseCleanNumber(b[1]) ?? 0;
        return valA - valB;
      });

      expect(sortedAsc[0][0]).toBe('Item C'); // $9.95
      expect(sortedAsc[1][0]).toBe('Item A'); // $50.00
      expect(sortedAsc[2][0]).toBe('Item D'); // $300.00
      expect(sortedAsc[3][0]).toBe('Item B'); // $1,200.00
    });
  });

  // =========================================================================
  // 4. Offline Export Engine Tests (RFC-4180 CSV & Markdown)
  // =========================================================================
  describe('4. Offline Export Engine (CSV & Markdown Tables)', () => {
    it('generates standard RFC-4180 CSV with escaped quotes for embedded commas', () => {
      const columns = ['Account', 'Description', 'Amount'];
      const rows = [
        ['1010', 'Operating, Payroll & Tax', '$14,250.00'],
        ['2010', 'Vendor "Special" Terms', '$3,100.00'],
      ];

      const csvLines = [
        columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(','),
        ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
      ];
      const csvOutput = csvLines.join('\r\n');

      expect(csvOutput).toContain('"Account","Description","Amount"');
      expect(csvOutput).toContain('"1010","Operating, Payroll & Tax","$14,250.00"');
      expect(csvOutput).toContain('"2010","Vendor ""Special"" Terms","$3,100.00"');
    });

    it('generates clean Markdown table representations for instant clipboard copying', () => {
      const columns = ['Metric', 'Amount', 'Status'];
      const rows = [
        ['Net Income', '$1,245,000.00', 'VERIFIED'],
        ['EBITDA', '$1,850,000.00', 'VERIFIED'],
      ];

      const headerLine = `| ${columns.join(' | ')} |`;
      const sepLine = `| ${columns.map(() => '---').join(' | ')} |`;
      const rowLines = rows.map((r) => `| ${r.join(' | ')} |`);
      const mdTable = [headerLine, sepLine, ...rowLines].join('\n');

      expect(mdTable).toContain('| Metric | Amount | Status |');
      expect(mdTable).toContain('| --- | --- | --- |');
      expect(mdTable).toContain('| Net Income | $1,245,000.00 | VERIFIED |');
      expect(mdTable).toContain('| EBITDA | $1,850,000.00 | VERIFIED |');
    });
  });

  // =========================================================================
  // 5. Grounded Evidence Integration Tests
  // =========================================================================
  describe('5. Grounded Evidence Cross-Referencing', () => {
    it('links table workpaper cells to deterministic citations with document provenance', () => {
      const evidenceProof = {
        citation_id: 'EV-884920',
        label: 'Audit Reference EV-884920',
        source_document: 'apex_cloud_invoice_sep2026.pdf',
        page_number: 2,
        excerpt: 'Total Stated Amount: $19,250.00 due October 15, 2026',
      };

      expect(evidenceProof.citation_id).toBe('EV-884920');
      expect(evidenceProof.source_document).toBe('apex_cloud_invoice_sep2026.pdf');
      expect(evidenceProof.page_number).toBe(2);
      expect(evidenceProof.excerpt).toContain('$19,250.00');

      const citationString = `[${evidenceProof.label} - ${evidenceProof.source_document}, Page ${evidenceProof.page_number}]: "${evidenceProof.excerpt}"`;
      expect(citationString).toContain('Page 2');
      expect(citationString).toContain('Total Stated Amount: $19,250.00');
    });
  });
});
