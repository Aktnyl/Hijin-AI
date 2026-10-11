/**
 * Centralized Product Identity Configuration
 *
 * Strictly separates company/platform identity from the client-facing product identity,
 * allowing white-labeling or future commercial product naming without modifying
 * underlying registries, packages, or architecture.
 */

export interface ProductIdentityConfig {
  companyName: string;
  productName: string;
  shortName: string;
  edition: string;
  version: string;
  buildId: string;
  tagline: string;
  airGappedStatement: string;
  copyright: string;
}

export const PRODUCT_IDENTITY: ProductIdentityConfig = {
  companyName: 'Hijin Tech',
  productName: 'Hijin',
  shortName: 'Hijin',
  edition: 'Enterprise Cognitive Edition',
  version: '1.0.0-rc1',
  buildId: '2026.09.28-p29',
  tagline: 'Local-First Cognitive AI Workstation',
  airGappedStatement: 'All model processing and data indexing execute locally on this workstation with zero outbound telemetry.',
  copyright: '© 2026 Hijin Tech. All rights reserved.',
};

export function getProductTitle(viewTitle?: string): string {
  if (!viewTitle) {
    return `${PRODUCT_IDENTITY.productName} — ${PRODUCT_IDENTITY.edition}`;
  }
  return `${viewTitle} — ${PRODUCT_IDENTITY.productName}`;
}
