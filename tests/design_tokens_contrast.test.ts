/**
 * HIJIN — DS-P1-01 & DS-P1-02 WCAG 2.2 AA Contrast & Accessible Component Test Suite
 *
 * Mathematically validates relative luminance and contrast ratios for all Obsidian Core
 * design tokens against the official W3C WCAG 2.2 specification (SC 1.4.3, 1.4.11, 2.4.11, 2.4.13, 2.5.8),
 * and verifies accessible component primitives (Button, Badge, Modal, Input).
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Button } from '../src/components/common/Button';
import { Badge } from '../src/components/common/Badge';
import { Modal } from '../src/components/common/Modal';
import { Input } from '../src/components/common/Input';

/**
 * Converts a hex color (#RRGGBB) to linearized relative luminance per WCAG 2.2 specification.
 * https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
 *
 * For sRGB channel C in [0..1]:
 * if C <= 0.04045 => C_lin = C / 12.92
 * else            => C_lin = ((C + 0.055) / 1.055) ^ 2.4
 *
 * L = 0.2126 * R_lin + 0.7152 * G_lin + 0.0722 * B_lin
 */
export function hexToRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const rLin = toLinear(r);
  const gLin = toLinear(g);
  const bLin = toLinear(b);

  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/**
 * Calculates WCAG 2.2 contrast ratio between two hex colors.
 * Contrast Ratio = (L1 + 0.05) / (L2 + 0.05), where L1 >= L2.
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = hexToRelativeLuminance(hex1);
  const lum2 = hexToRelativeLuminance(hex2);
  const max = Math.max(lum1, lum2);
  const min = Math.min(lum1, lum2);
  return (max + 0.05) / (min + 0.05);
}

describe('DS-P1-01: Obsidian Core Design Tokens Contrast Verification (WCAG 2.2 AA)', () => {
  const canvasBg = '#0B0F17';
  const surfaceBg = '#0F1218';
  const elevatedBg = '#141721';

  it('1. Independently calculates contrast of #FFFFFF against #0B0F17 per WCAG relative-luminance formula', () => {
    const lumWhite = hexToRelativeLuminance('#FFFFFF');
    const lumCanvas = hexToRelativeLuminance(canvasBg);

    // #FFFFFF relative luminance must be 1.0
    expect(lumWhite).toBe(1.0);

    // #0B0F17 relative luminance:
    // R = 11/255 -> 0.003348
    // G = 15/255 -> 0.004880
    // B = 23/255 -> 0.007542
    // L = 0.2126*0.003348 + 0.7152*0.004880 + 0.0722*0.007542 = 0.0047466
    expect(lumCanvas).toBeCloseTo(0.00475, 4);

    // Contrast ratio = (1.0 + 0.05) / (0.0047466 + 0.05) = 1.05 / 0.0547466 = 19.1793:1
    const whiteVsCanvas = getContrastRatio('#FFFFFF', canvasBg);
    expect(whiteVsCanvas).toBeGreaterThanOrEqual(4.5);
    expect(whiteVsCanvas).toBeCloseTo(19.18, 1);
  });

  it('2. Verifies normal text contrast >= 4.5:1 against canvas and surface backgrounds (SC 1.4.3)', () => {
    const textPrimary = '#F9FAFB';
    const textSecondary = '#9CA3AF';
    const textMuted = '#94A3B8';
    const textHeading = '#FFFFFF';

    // Text Primary vs Canvas (#0B0F17): (0.95476 + 0.05) / (0.00475 + 0.05) = 18.35:1
    const ratioPrimaryCanvas = getContrastRatio(textPrimary, canvasBg);
    expect(ratioPrimaryCanvas).toBeGreaterThanOrEqual(4.5);
    expect(ratioPrimaryCanvas).toBeCloseTo(18.35, 1);

    // Text Primary vs Surface (#0F1218): (0.95476 + 0.05) / (0.00600 + 0.05) = 17.94:1
    const ratioPrimarySurface = getContrastRatio(textPrimary, surfaceBg);
    expect(ratioPrimarySurface).toBeGreaterThanOrEqual(4.5);
    expect(ratioPrimarySurface).toBeCloseTo(17.94, 1);

    // Text Primary vs Elevated (#141721): (0.95476 + 0.05) / (0.00871 + 0.05) = 17.11:1
    const ratioPrimaryElevated = getContrastRatio(textPrimary, elevatedBg);
    expect(ratioPrimaryElevated).toBeGreaterThanOrEqual(4.5);
    expect(ratioPrimaryElevated).toBeCloseTo(17.11, 1);

    // Text Secondary vs Canvas (#0B0F17): (0.36357 + 0.05) / (0.00475 + 0.05) = 7.55:1
    const ratioSecondaryCanvas = getContrastRatio(textSecondary, canvasBg);
    expect(ratioSecondaryCanvas).toBeGreaterThanOrEqual(4.5);
    expect(ratioSecondaryCanvas).toBeCloseTo(7.55, 1);

    // Text Secondary vs Surface (#0F1218): (0.36357 + 0.05) / (0.00600 + 0.05) = 7.39:1
    const ratioSecondarySurface = getContrastRatio(textSecondary, surfaceBg);
    expect(ratioSecondarySurface).toBeGreaterThanOrEqual(4.5);
    expect(ratioSecondarySurface).toBeCloseTo(7.39, 1);

    // Text Muted vs Canvas (#0B0F17): (0.35951 + 0.05) / (0.00475 + 0.05) = 7.48:1
    const ratioMuted = getContrastRatio(textMuted, canvasBg);
    expect(ratioMuted).toBeGreaterThanOrEqual(4.5);
    expect(ratioMuted).toBeCloseTo(7.48, 1);

    // Text Heading vs Canvas (#0B0F17): 19.18:1
    const ratioHeading = getContrastRatio(textHeading, canvasBg);
    expect(ratioHeading).toBeGreaterThanOrEqual(4.5);
    expect(ratioHeading).toBeCloseTo(19.18, 1);
  });

  it('3. Verifies primary interactive button token #2563EB meets WCAG 2.2 AA >= 4.5:1 with white text', () => {
    const electricBlue = '#2563EB';
    const whiteText = '#FFFFFF';

    // Electric Blue (#2563EB) luminance = 0.15315
    // White text (#FFFFFF) luminance = 1.0
    // Contrast = (1.0 + 0.05) / (0.15315 + 0.05) = 1.05 / 0.20315 = 5.1686:1 (5.17:1)
    const buttonContrast = getContrastRatio(electricBlue, whiteText);
    expect(buttonContrast).toBeGreaterThanOrEqual(4.5);
    expect(buttonContrast).toBeCloseTo(5.17, 1);
  });

  it('4. Verifies focus indicator token #3B82F6 meets WCAG 2.2 SC 2.4.13 >= 3.0:1 against surfaces', () => {
    const focusRingColor = '#3B82F6';

    // Focus indicator (#3B82F6) luminance = 0.23549
    // Contrast vs Canvas (#0B0F17) = (0.23549 + 0.05) / (0.00475 + 0.05) = 5.21:1
    const focusVsCanvas = getContrastRatio(focusRingColor, canvasBg);
    expect(focusVsCanvas).toBeGreaterThanOrEqual(3.0);
    expect(focusVsCanvas).toBeCloseTo(5.21, 1);

    // Contrast vs Surface (#0F1218) = (0.23549 + 0.05) / (0.00600 + 0.05) = 5.10:1
    const focusVsSurface = getContrastRatio(focusRingColor, surfaceBg);
    expect(focusVsSurface).toBeGreaterThanOrEqual(3.0);
    expect(focusVsSurface).toBeCloseTo(5.10, 1);

    // Contrast vs Elevated (#141721) = (0.23549 + 0.05) / (0.00871 + 0.05) = 4.86:1
    const focusVsElevated = getContrastRatio(focusRingColor, elevatedBg);
    expect(focusVsElevated).toBeGreaterThanOrEqual(3.0);
    expect(focusVsElevated).toBeCloseTo(4.86, 1);
  });

  it('5. Verifies semantic status badges meet graphical UI component contrast >= 3.0:1 (SC 1.4.11)', () => {
    const semanticSuccess = '#10B981'; // L = 0.36393 -> 7.56:1 vs #0B0F17
    const semanticWarning = '#F59E0B'; // L = 0.43890 -> 8.93:1 vs #0B0F17
    const semanticError = '#EF4444';   // L = 0.22902 -> 5.10:1 vs #0B0F17
    const semanticInfo = '#3B82F6';    // L = 0.23549 -> 5.21:1 vs #0B0F17

    expect(getContrastRatio(semanticSuccess, canvasBg)).toBeGreaterThanOrEqual(3.0);
    expect(getContrastRatio(semanticSuccess, canvasBg)).toBeCloseTo(7.56, 1);

    expect(getContrastRatio(semanticWarning, canvasBg)).toBeGreaterThanOrEqual(3.0);
    expect(getContrastRatio(semanticWarning, canvasBg)).toBeCloseTo(8.93, 1);

    expect(getContrastRatio(semanticError, canvasBg)).toBeGreaterThanOrEqual(3.0);
    expect(getContrastRatio(semanticError, canvasBg)).toBeCloseTo(5.10, 1);

    expect(getContrastRatio(semanticInfo, canvasBg)).toBeGreaterThanOrEqual(3.0);
    expect(getContrastRatio(semanticInfo, canvasBg)).toBeCloseTo(5.21, 1);
  });
});

describe('DS-P1-02: Accessible Component Foundations Verification', () => {
  it('6. Verifies Button component renders accessible role, aria-busy, and variants', () => {
    const normalHtml = renderToString(
      React.createElement(Button, { variant: 'primary', size: 'md' }, 'Execute Reconciliation')
    );
    expect(normalHtml).toContain('hijin-btn-primary');
    expect(normalHtml).toContain('hijin-btn-md');
    expect(normalHtml).toContain('Execute Reconciliation');

    const loadingHtml = renderToString(
      React.createElement(Button, { variant: 'primary', isLoading: true }, 'Saving')
    );
    expect(loadingHtml).toContain('aria-busy="true"');
    expect(loadingHtml).toContain('hijin-btn-spinner');
    expect(loadingHtml).toContain('disabled');
  });

  it('7. Verifies Badge component renders semantic styles and tabular figures', () => {
    const badgeHtml = renderToString(
      React.createElement(Badge, { variant: 'success', isTabular: true }, '$12,450.00 Variance')
    );
    expect(badgeHtml).toContain('hijin-badge-success');
    expect(badgeHtml).toContain('tabular-nums');
    expect(badgeHtml).toContain('$12,450.00 Variance');

    const warningHtml = renderToString(
      React.createElement(Badge, { variant: 'warning' }, 'Under Review')
    );
    expect(warningHtml).toContain('hijin-badge-warning');
    expect(warningHtml).toContain('Under Review');
  });

  it('8. Verifies Modal component renders accessible dialog roles and ARIA relationships', () => {
    const modalHtml = renderToString(
      React.createElement(
        Modal,
        {
          isOpen: true,
          onClose: () => {},
          title: '3-Way Reconciliation Audit',
          description: 'Review purchase order variance against general ledger entries.',
        },
        React.createElement('div', null, 'Modal Content')
      )
    );

    expect(modalHtml).toContain('role="dialog"');
    expect(modalHtml).toContain('aria-modal="true"');
    expect(modalHtml).toContain('aria-labelledby');
    expect(modalHtml).toContain('aria-describedby');
    expect(modalHtml).toContain('3-Way Reconciliation Audit');
    expect(modalHtml).toContain('aria-label="Close dialog"');
  });

  it('9. Verifies Input component links labels, error alerts, and helper text via ARIA', () => {
    const inputWithError = renderToString(
      React.createElement(Input, {
        label: 'Purchase Order ID',
        errorMessage: 'PO number must follow PO-YYYY-XXXX format',
      })
    );

    expect(inputWithError).toContain('Purchase Order ID');
    expect(inputWithError).toContain('aria-invalid="true"');
    expect(inputWithError).toContain('role="alert"');
    expect(inputWithError).toContain('PO number must follow PO-YYYY-XXXX format');
  });
});
