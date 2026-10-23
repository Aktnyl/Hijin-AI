import { describe, it, expect } from 'vitest';
import {
  MultiInvoiceProcessor,
  compileMultiInvoiceBatchToPdf,
  compileMultiInvoiceBatchToPdfBlob,
} from '../src/services/multiInvoiceService';
import { IngestedDocumentRecord } from '../src/services/multiFormatIngestion';
import { PureBinaryPdfCompiler, PdfReportSpec } from '../src/services/pdfGenerator';

function createMockDoc(opts: {
  id: string;
  fileName: string;
  rawText: string;
}): IngestedDocumentRecord {
  return {
    id: opts.id,
    fileName: opts.fileName,
    fileType: 'pdf',
    mimeType: 'application/pdf',
    sizeBytes: 15420,
    summary: {
      totalPages: 1,
      wordCount: opts.rawText.split(/\s+/).length,
      detectedTables: 1,
      preview: opts.rawText.slice(0, 100),
    },
    sections: [
      {
        pageNumber: 1,
        content: opts.rawText,
        charCount: opts.rawText.length,
      },
    ],
    citations: [
      {
        id: `cit-${opts.id}`,
        documentId: opts.id,
        documentName: opts.fileName,
        pageNumber: 1,
        snippet: opts.rawText.slice(0, 80),
      },
    ],
    previewText: opts.rawText.slice(0, 100),
    rawText: opts.rawText,
  };
}

describe('End-to-End Multi-PDF Invoice Processing & Quality Overhaul', () => {
  const processor = new MultiInvoiceProcessor();

  it('1. Ingests and deterministically extracts clean, multi-line invoices with matching math', () => {
    const rawDoc1 = createMockDoc({
      id: 'doc-inv-001',
      fileName: 'Apex_Logistics_Inv_1001.pdf',
      rawText: `
INVOICE
Apex Logistics Solutions
Invoice Number: INV-1001
Date: 2026-03-15
Due Date: 2026-04-15
PO Number: PO-89211
Currency: USD

Description                Qty    Unit Price    Total
Freight Shipping Q1        2      $500.00       $1,000.00
Fuel Surcharge             1      $150.00       $150.00

Subtotal: $1,150.00
Tax: $115.00
Discount: $0.00
Total: $1,265.00
Payment Terms: Net 30
      `.trim(),
    });

    const batch = processor.processBatch([rawDoc1]);
    expect(batch.submittedFilesCount).toBe(1);
    expect(batch.successfullyProcessedCount).toBe(1);
    expect(batch.failedCount).toBe(0);
    expect(batch.duplicateCount).toBe(0);
    expect(batch.invoices.length).toBe(1);

    const inv = batch.invoices[0];
    expect(inv.vendorName).toContain('Apex Logistics');
    expect(inv.invoiceNumber).toBe('INV-1001');
    expect(inv.currency).toBe('USD');
    expect(inv.subtotal).toBe(1150);
    expect(inv.taxAmount).toBe(115);
    expect(inv.statedTotal).toBe(1265);
    expect(inv.expectedTotal).toBe(1265);
    expect(inv.validationStatus).toBe('RECONCILED');
    expect(inv.discrepancy).toBe(0);
    expect(inv.lineItems.length).toBe(2);
    expect(inv.lineItems[0].amount).toBe(1000);
    expect(inv.lineItems[1].amount).toBe(150);
  });

  it('2. Detects calculation discrepancies when stated total does not match computed sum', () => {
    const rawDocDiscrepant = createMockDoc({
      id: 'doc-inv-disc',
      fileName: 'Faulty_Hardware_Inv_2002.pdf',
      rawText: `
INVOICE
Vendor: CloudTech Hardware Corp
Invoice #: INV-2002
Date: 2026-03-20
PO Reference: PO-99120

Line Items:
Server Rack Units          4      $500.00       $2,000.00
Patch Cables Pack          10     $20.00        $200.00

Subtotal: $2,200.00
Tax: $200.00
Total Due: $2,500.00
      `.trim(), // Stated total 2500 != expected (2200 + 200 = 2400). Discrepancy = 100!
    });

    const batch = processor.processBatch([rawDocDiscrepant]);
    expect(batch.invoices.length).toBe(1);
    const inv = batch.invoices[0];
    expect(inv.validationStatus).toBe('DISCREPANCY');
    expect(inv.statedTotal).toBe(2500);
    expect(inv.expectedTotal).toBe(2400);
    expect(inv.discrepancy).toBe(100);
    expect(inv.discrepancyReasons.length).toBeGreaterThan(0);
    expect(batch.requiresReviewCount).toBe(1);
  });

  it('3. Multi-currency aggregation isolates USD, EUR, GBP without illegal blending', () => {
    const docUSD = createMockDoc({
      id: 'doc-usd',
      fileName: 'US_Supplier_01.pdf',
      rawText: `
INVOICE
Acme Americas LLC
Invoice: AC-801
Date: 2026-02-10
Subtotal: $1,000.00
Tax: $100.00
Total: $1,100.00
      `,
    });

    const docEUR = createMockDoc({
      id: 'doc-eur',
      fileName: 'EU_Supplier_02.pdf',
      rawText: `
FACTURE / INVOICE
Berlin Cloud Services GmbH
Invoice: BC-902
Date: 2026-02-12
Currency: EUR
Subtotal: €2,000.00
VAT: €380.00
Total: €2,380.00
      `,
    });

    const docGBP = createMockDoc({
      id: 'doc-gbp',
      fileName: 'UK_Supplier_03.pdf',
      rawText: `
INVOICE
London Consulting Group Ltd
Invoice Number: LCG-400
Date: 2026-02-14
Currency: GBP
Subtotal: £5,000.00
VAT: £1,000.00
Total: £6,000.00
      `,
    });

    const batch = processor.processBatch([docUSD, docEUR, docGBP]);
    expect(batch.submittedFilesCount).toBe(3);
    expect(batch.currencyAggregates.length).toBe(3);

    const usdAgg = batch.currencyAggregates.find((c) => c.currency === 'USD');
    const eurAgg = batch.currencyAggregates.find((c) => c.currency === 'EUR');
    const gbpAgg = batch.currencyAggregates.find((c) => c.currency === 'GBP');

    expect(usdAgg).toBeDefined();
    expect(usdAgg!.statedTotal).toBe(1100);

    expect(eurAgg).toBeDefined();
    expect(eurAgg!.statedTotal).toBe(2380);

    expect(gbpAgg).toBeDefined();
    expect(gbpAgg!.statedTotal).toBe(6000);
  });

  it('4. Identifies duplicate invoices and does not double-count in aggregates', () => {
    const originalDoc = createMockDoc({
      id: 'doc-orig',
      fileName: 'Original_Invoice_550.pdf',
      rawText: `
INVOICE
Global Network Inc
Invoice: GNI-550
Date: 2026-01-15
Total: $5,000.00
      `,
    });

    const duplicateDoc = createMockDoc({
      id: 'doc-dup',
      fileName: 'Copy_Of_Invoice_550.pdf',
      rawText: `
INVOICE
Global Network Inc
Invoice: GNI-550
Date: 2026-01-15
Total: $5,000.00
      `,
    });

    const batch = processor.processBatch([originalDoc, duplicateDoc]);
    expect(batch.submittedFilesCount).toBe(2);
    expect(batch.duplicateCount).toBe(1);
    expect(batch.uniqueInvoicesCount).toBe(1);

    const dupRecord = batch.invoices.find((i) => i.isDuplicate);
    expect(dupRecord).toBeDefined();
    expect(dupRecord?.validationStatus).toBe('SKIPPED_DUPLICATE');

    // Ensure aggregate amount counts $5,000 only once, not $10,000
    const usdAgg = batch.currencyAggregates.find((c) => c.currency === 'USD');
    expect(usdAgg?.statedTotal).toBe(5000);
  });

  it('5. Marks missing fields as UNVERIFIED without hallucinating data', () => {
    const sparseDoc = createMockDoc({
      id: 'doc-sparse',
      fileName: 'Handwritten_Receipt.pdf',
      rawText: `
RECEIPT
Acme Supplies
Paid Total: $45.50
      `, // No invoice number, no line items, no subtotal/tax breakdown
    });

    const batch = processor.processBatch([sparseDoc]);
    const inv = batch.invoices[0];
    expect(inv.statedTotal).toBe(45.5);
    expect(inv.subtotal).toBeNull();
    expect(inv.taxAmount).toBeNull();
    expect(inv.invoiceNumber).toBe('UNVERIFIED');
    expect(inv.validationStatus).toBe('UNVERIFIED');
    expect(inv.missingFields).toContain('Invoice Number');
    expect(inv.missingFields).toContain('Subtotal Breakdown');
  });

  it('6. Generates full 6-Section structured audit report in Markdown and Register Table', () => {
    const doc1 = createMockDoc({
      id: 'd-1',
      fileName: 'Inv_A.pdf',
      rawText: 'Vendor: Corp A\nInvoice: INV-A1\nTotal: $100.00',
    });

    const batch = processor.processBatch([doc1]);
    const md = batch.markdownReport;

    expect(md).toContain('Executive Summary');
    expect(md).toContain('Invoice Register');
    expect(md).toContain('Financial Summary');
    expect(md).toContain('Detailed Invoice Analysis');
    expect(md).toContain('Exceptions and Data Quality');
    expect(md).toContain('Methodology and Limitations');

    // Register table verification
    expect(batch.registerTable.columns.length).toBeGreaterThan(5);
    expect(batch.registerTable.rows.length).toBe(1);
    expect(batch.registerTable.rows[0]).toContain('INV-A1');
  });

  it('7. Compiles authoritative, genuine Adobe PDF binary (%PDF-1.4) with multi-page support', async () => {
    const doc1 = createMockDoc({
      id: 'd-1',
      fileName: 'VendorA_101.pdf',
      rawText: `
INVOICE
Vendor: Alpha Industrial Corp
Invoice Number: AIC-101
Date: 2026-03-01
Subtotal: $2,000.00
Tax: $200.00
Total: $2,200.00

Widgets Model A    10    $100.00   $1,000.00
Widgets Model B    10    $100.00   $1,000.00
      `,
    });

    const batch = processor.processBatch([doc1]);
    const pdfBytes = compileMultiInvoiceBatchToPdf(batch, 'Engineering Audit Vault');
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1500);

    const pdfBlob = compileMultiInvoiceBatchToPdfBlob(batch, 'Engineering Audit Vault');
    expect(pdfBlob).toBeInstanceOf(Blob);
    expect(pdfBlob.type).toBe('application/pdf');
    expect(pdfBlob.size).toBeGreaterThan(1500);

    // Verify binary headers and structure by reading buffer
    const buf = await pdfBlob.arrayBuffer();
    const decoder = new TextDecoder('latin1');
    const text = decoder.decode(buf);

    // Standard Adobe PDF magic signature
    expect(text.startsWith('%PDF-1.4')).toBe(true);

    // Critical PDF objects
    expect(text).toContain('/Type /Catalog');
    expect(text).toContain('/Type /Pages');
    expect(text).toContain('/Type /Page');
    expect(text).toContain('/Type /Font');
    expect(text).toContain('/BaseFont /Helvetica');
    expect(text).toContain('xref');
    expect(text).toContain('trailer');
    expect(text).toContain('%%EOF');

    // Check contents
    expect(text).toContain('Alpha Industrial Corp');
    expect(text).toContain('AIC-101');
    expect(text).toContain('Page 1 of');
  });

  it('8. PureBinaryPdfCompiler handles large multi-page reports with page overflow and table pagination', async () => {
    const compiler = new PureBinaryPdfCompiler();

    const spec: PdfReportSpec = {
      title: 'Enterprise Multi-Page Volume Audit',
      subtitle: 'Deterministic Automated Stress Test',
      metadata: {
        workspace: 'Audit-Large-Scale',
        generatedAt: '2026-03-23',
      },
      sections: [
        {
          heading: '1. Executive Summary',
          paragraphs: [
            'This is a multi-page stress test report verifying that repeated page breaks, table headers, and layout pagination work seamlessly without truncation.',
          ],
        },
        {
          heading: '2. High-Volume Transaction Register',
          table: {
            title: 'Audit Transactions (50 Rows)',
            columns: [
              { header: 'ID', width: 60, align: 'left' },
              { header: 'Description', width: 250, align: 'left' },
              { header: 'Qty', width: 60, align: 'center' },
              { header: 'Amount', width: 160, align: 'right' },
            ],
            rows: Array.from({ length: 50 }, (_, i) => [
              `TX-${1000 + i}`,
              `High-volume transaction ledger item entry number ${i + 1}`,
              String((i % 5) + 1),
              `$${((i + 1) * 125.5).toFixed(2)}`,
            ]),
          },
        },
      ],
    };

    const blob = compiler.compileReportToBlob(spec);
    expect(blob.type).toBe('application/pdf');

    const buf = await blob.arrayBuffer();
    const decoder = new TextDecoder('latin1');
    const text = decoder.decode(buf);

    expect(text.startsWith('%PDF-1.4')).toBe(true);
    // Multi-page document check: /Count 2 or /Count 3
    expect(text).toMatch(/\/Type \/Pages[\s\S]*?\/Count [234]/);
    expect(text).toContain('%%EOF');
  });
});
