/**
 * HIJIN — Stage 11 Verification Suite: Pricing Harmonization, Zero-Lockout & License Modal
 *
 * Validates:
 * 1. DEC-8.6-01 / DEC-8.6-04: Pricing harmonization in pricing-config.json & website HTML (Blinkpay retirement, $79/$790/$1990 tiers).
 * 2. DEC-8.6-03 / DEC-8.6-05: Zero-Lockout Data Policy assurances across website and UI.
 * 3. DEC-8.6-06: 2-workstation seat limit in account management.
 * 4. UX-P2-03: LicenseModal accessibility, installation ID binding, and certificate import workflow.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { LicenseModal } from '../src/components/workbench/LicenseModal';

describe('Stage 11 — Pricing Catalog & Website Harmonization (WEB-P0-01)', () => {
  const rootDir = path.resolve(__dirname, '..');
  const pricingConfigPath = path.join(rootDir, 'website', 'pricing-config.json');
  const pricingHtmlPath = path.join(rootDir, 'website', 'pricing.html');
  const indexHtmlPath = path.join(rootDir, 'website', 'index.html');
  const accountHtmlPath = path.join(rootDir, 'website', 'account.html');

  it('pricing-config.json contains harmonized $79, $790, and $1990 tiers and retires $349 lifetime offer', () => {
    const raw = fs.readFileSync(pricingConfigPath, 'utf-8');
    const config = JSON.parse(raw);

    const pro = config.tiers.find((t: any) => t.id === 'specialist_monthly');
    expect(pro).toBeDefined();
    expect(pro.price).toBe(79);
    expect(config.currency).toBe('USD');
    expect(pro.period).toContain('month');

    const forensic = config.tiers.find((t: any) => t.id === 'forensic_annual');
    expect(forensic).toBeDefined();
    expect(forensic.price).toBe(790);
    expect(forensic.period).toContain('year');

    const inst = config.tiers.find((t: any) => t.id === 'institutional_annual');
    expect(inst).toBeDefined();
    expect(inst.price).toBe(1990);
    expect(inst.period).toContain('year');

    // Retired offer check
    const lifetime = config.tiers.find((t: any) => t.price === 349 || t.id === 'lifetime');
    expect(lifetime).toBeUndefined();

    // No Blinkpay checkout references in pricing config
    expect(raw).not.toContain('blinkpay.com');
  });

  it('website HTML files have 0 active checkout.blinkpay.com URLs', () => {
    const pricingHtml = fs.readFileSync(pricingHtmlPath, 'utf-8');
    const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
    const accountHtml = fs.readFileSync(accountHtmlPath, 'utf-8');

    expect(pricingHtml).not.toContain('checkout.blinkpay.com');
    expect(indexHtml).not.toContain('checkout.blinkpay.com');
    expect(accountHtml).not.toContain('checkout.blinkpay.com');
  });

  it('website pricing and index reflect harmonized pricing and Zero-Lockout Data Policy', () => {
    const pricingHtml = fs.readFileSync(pricingHtmlPath, 'utf-8');
    const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

    expect(pricingHtml).toContain('$79');
    expect(pricingHtml).toContain('$790');
    expect(pricingHtml).toContain('Zero-Lockout');

    expect(indexHtml).toContain('$79');
    expect(indexHtml).toContain('Zero-Lockout');
  });

  it('account.html implements 2-seat workstation management tab and deactivation flow (WEB-P2-01)', () => {
    const accountHtml = fs.readFileSync(accountHtmlPath, 'utf-8');

    expect(accountHtml).toContain('tab-devices');
    expect(accountHtml).toContain('Workstations');
    expect(accountHtml).toContain('2 Max');
    expect(accountHtml).toContain('/api/commercial/devices/deactivate');
    expect(accountHtml).toContain('handleDeactivateDevice');
  });
});

describe('Stage 11 — Air-Gapped License Modal (UX-P2-03)', () => {
  it('renders closed modal as empty string', () => {
    const html = renderToString(
      React.createElement(LicenseModal, {
        isOpen: false,
        onClose: () => {},
        installationId: 'INST-TEST-999',
      })
    );
    expect(html).toBe('');
  });

  it('renders open modal with Installation ID, import controls, and Zero-Lockout assurance', () => {
    const testInstId = 'INST-TEST-STAGE11-BOUND-42';
    const html = renderToString(
      React.createElement(LicenseModal, {
        isOpen: true,
        onClose: () => {},
        installationId: testInstId,
      })
    );

    // Dialog accessibility attributes
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="license-modal-title"');

    // Installation ID binding display
    expect(html).toContain(testInstId);
    expect(html).toContain('Installation ID');
    expect(html).toContain('Copy ID');

    // File import and certificate text
    expect(html).toContain('Import Signed License Certificate (.lic / JSON)');
    expect(html).toContain('.lic,.json');
    expect(html).toContain('Import &amp; Activate Certificate');

    // Zero-Lockout Data Policy callout
    expect(html).toContain('Zero-Lockout Data Policy Invariant');
    expect(html).toContain('perpetual offline access to read, search, and export');
  });
});
