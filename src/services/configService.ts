/**
 * Production Configuration Service (Phase C.1)
 *
 * Provides authoritative environment determination, API endpoints,
 * Firebase public coordinates, and release channels across development,
 * staging, and production environments.
 *
 * Invariant: Never contains privileged credentials or private keys.
 */

export type EnvironmentType = 'development' | 'staging' | 'production';
export type ReleaseChannel = 'stable' | 'beta';

export interface HijinClientConfig {
  environment: EnvironmentType;
  apiEndpoint: string;
  firebaseProjectId: string;
  firebaseAuthDomain: string;
  firebaseApiKey: string;
  releaseChannel: ReleaseChannel;
  modelCatalogEndpoint: string;
  entitlementEndpoint: string;
  downloadEndpoint: string;
}

const PROFILES: Record<EnvironmentType, HijinClientConfig> = {
  development: {
    environment: 'development',
    apiEndpoint: 'http://127.0.0.1:8765',
    firebaseProjectId: 'hijin-ai',
    firebaseAuthDomain: 'hijin-ai.firebaseapp.com',
    firebaseApiKey: 'AIzaSyBNNXFl4GbgsOBp4UeEBWL-7DGKRg9gIKw',
    releaseChannel: 'beta',
    modelCatalogEndpoint: 'http://127.0.0.1:8765/api/v1/models/catalog',
    entitlementEndpoint: 'http://127.0.0.1:8765/api/v1/entitlements',
    downloadEndpoint: 'http://127.0.0.1:8765/downloads',
  },
  staging: {
    environment: 'staging',
    apiEndpoint: 'https://staging-control.hijin.ai',
    firebaseProjectId: 'hijin-ai',
    firebaseAuthDomain: 'hijin-ai.firebaseapp.com',
    firebaseApiKey: 'AIzaSyBNNXFl4GbgsOBp4UeEBWL-7DGKRg9gIKw',
    releaseChannel: 'beta',
    modelCatalogEndpoint: 'https://staging-control.hijin.ai/api/v1/models/catalog',
    entitlementEndpoint: 'https://staging-control.hijin.ai/api/v1/entitlements',
    downloadEndpoint: 'https://staging-releases.hijin.ai',
  },
  production: {
    environment: 'production',
    apiEndpoint: 'https://control.hijin.ai',
    firebaseProjectId: 'hijin-ai',
    firebaseAuthDomain: 'hijin-ai.firebaseapp.com',
    firebaseApiKey: 'AIzaSyBNNXFl4GbgsOBp4UeEBWL-7DGKRg9gIKw',
    releaseChannel: 'stable',
    modelCatalogEndpoint: 'https://control.hijin.ai/api/v1/models/catalog',
    entitlementEndpoint: 'https://control.hijin.ai/api/v1/entitlements',
    downloadEndpoint: 'https://releases.hijin.ai',
  },
};

class ConfigService {
  private activeConfig: HijinClientConfig;

  constructor() {
    this.activeConfig = this.resolveConfig();
  }

  private resolveConfig(): HijinClientConfig {
    // 1. Check window global override (e.g. injected at boot or in web portal)
    const win = typeof window !== 'undefined' ? (window as any) : {};
    const envOverride = win.__HIJIN_ENV__ || (import.meta as any).env?.VITE_HIJIN_ENV;

    let env: EnvironmentType = 'production';
    if (envOverride === 'development' || (import.meta as any).env?.DEV) {
      env = 'development';
    } else if (envOverride === 'staging') {
      env = 'staging';
    } else if (envOverride === 'production') {
      env = 'production';
    }

    const base = PROFILES[env];

    return {
      environment: env,
      apiEndpoint: win.__HIJIN_API_ENDPOINT__ || (import.meta as any).env?.VITE_API_ENDPOINT || base.apiEndpoint,
      firebaseProjectId: base.firebaseProjectId,
      firebaseAuthDomain: base.firebaseAuthDomain,
      firebaseApiKey: base.firebaseApiKey,
      releaseChannel: (win.__HIJIN_RELEASE_CHANNEL__ || base.releaseChannel) as ReleaseChannel,
      modelCatalogEndpoint: base.modelCatalogEndpoint,
      entitlementEndpoint: base.entitlementEndpoint,
      downloadEndpoint: base.downloadEndpoint,
    };
  }

  public getConfig(): HijinClientConfig {
    return this.activeConfig;
  }

  public isProduction(): boolean {
    return this.activeConfig.environment === 'production';
  }

  public isDevelopment(): boolean {
    return this.activeConfig.environment === 'development';
  }

  public getReleaseChannel(): ReleaseChannel {
    return this.activeConfig.releaseChannel;
  }
}

export const configService = new ConfigService();
