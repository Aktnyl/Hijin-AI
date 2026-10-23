/**
 * tests/model_hub_progress.test.ts - UX-P1-04 Model Hub Progress, Speed, ETA & GGUF Verification
 *
 * Verifies:
 * 1. Live speed formatting (KB/s and MB/s).
 * 2. ETA remaining time formatting across seconds, minutes, and hours.
 * 3. ModelHubStatusView includes GGUF container validation and quarantine tracking.
 * 4. Offline truthful fallback includes zero-trust verification defaults.
 */

import { describe, it, expect } from 'vitest';
import { formatSpeed, formatETA } from '../src/components/workbench/ModelHubModal';
import { ModelHubStatusView, modelHubService } from '../src/services/modelHubService';

describe('UX-P1-04: Model Hub Progress, Speed & ETA Formatting', () => {
  describe('formatSpeed', () => {
    it('1. Formats zero or negative speed as 0.0 MB/s', () => {
      expect(formatSpeed(0)).toBe('0.0 MB/s');
      expect(formatSpeed(-100)).toBe('0.0 MB/s');
    });

    it('2. Formats speeds below 0.1 MB/s in KB/s', () => {
      // 50 KB/s = 50 * 1024 = 51200 bytes/sec (~0.048 MB/s)
      expect(formatSpeed(51200)).toBe('50.0 KB/s');
      // 80 KB/s = 81920 bytes/sec
      expect(formatSpeed(81920)).toBe('80.0 KB/s');
    });

    it('3. Formats speeds >= 0.1 MB/s in MB/s', () => {
      // 1 MB/s = 1048576 bytes/sec
      expect(formatSpeed(1048576)).toBe('1.0 MB/s');
      // 12.5 MB/s = 13107200 bytes/sec
      expect(formatSpeed(13107200)).toBe('12.5 MB/s');
      // 24.87 MB/s = 26078105 bytes/sec
      expect(formatSpeed(26078105)).toBe('24.9 MB/s');
    });
  });

  describe('formatETA', () => {
    it('1. Returns "ETA: --" when not downloading or when speed is zero', () => {
      expect(formatETA(1000000, 500000, 0, true)).toBe('ETA: --');
      expect(formatETA(1000000, 500000, 100000, false)).toBe('ETA: --');
      expect(formatETA(1000000, 500000, -500, true)).toBe('ETA: --');
    });

    it('2. Returns "Complete" when remaining bytes is 0', () => {
      expect(formatETA(1000000, 1000000, 500000, true)).toBe('Complete');
      expect(formatETA(1000000, 1500000, 500000, true)).toBe('Complete');
    });

    it('3. Formats short durations in seconds (<60s)', () => {
      // 10 MB remaining at 2 MB/s = 5s
      const total = 20 * 1024 * 1024;
      const downloaded = 10 * 1024 * 1024;
      const speed = 2 * 1024 * 1024;
      expect(formatETA(total, downloaded, speed, true)).toBe('ETA: 5s');
    });

    it('4. Formats intermediate durations in minutes and seconds (60s to 3599s)', () => {
      // 125 MB remaining at 1 MB/s = 125s = 2m 5s
      const total = 200 * 1024 * 1024;
      const downloaded = 75 * 1024 * 1024;
      const speed = 1 * 1024 * 1024;
      expect(formatETA(total, downloaded, speed, true)).toBe('ETA: 2m 5s');
    });

    it('5. Formats long durations in hours and minutes (>= 3600s)', () => {
      // 7200 MB remaining at 1 MB/s = 7200s = 2h 0m
      const total = 7200 * 1024 * 1024;
      const downloaded = 0;
      const speed = 1 * 1024 * 1024;
      expect(formatETA(total, downloaded, speed, true)).toBe('ETA: 2h 0m');
    });
  });

  describe('ModelHubStatusView GGUF and Quarantine Verification', () => {
    it('1. Offline truthful fallback status contains gguf_header_valid: false and quarantine_count: 0', async () => {
      // When daemon is unreachable, getStatus returns the truthful offline state
      const status = await modelHubService.getStatus();
      expect(status.state).toBe('OFFLINE');
      expect(status.verification_checks.sha256_match).toBe(false);
      expect(status.verification_checks.gguf_header_valid).toBe(false);
      expect(status.quarantine_count).toBe(0);
    });

    it('2. ModelHubStatusView accepts verified GGUF container state', () => {
      const verifiedStatus: ModelHubStatusView = {
        package_id: 'hijin-financial-specialist',
        active_version: '1.0.0',
        available_version: '1.0.0',
        state: 'INSTALLED',
        current_component: null,
        total_downloaded_bytes: 3353169408,
        total_package_bytes: 3353169408,
        overall_percentage: 100.0,
        speed_bps: 0,
        verification_checks: {
          sha256_match: true,
          signature_valid: true,
          compatibility_pass: true,
          evaluation_pass: true,
          gguf_header_valid: true,
        },
        components_progress: {},
        error_message: null,
        last_updated: Date.now() / 1000,
        quarantine_count: 0,
      };

      expect(verifiedStatus.verification_checks.gguf_header_valid).toBe(true);
      expect(verifiedStatus.verification_checks.sha256_match).toBe(true);
      expect(verifiedStatus.state).toBe('INSTALLED');
    });
  });
});
