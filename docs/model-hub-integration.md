# Desktop Model Hub Integration Contract & Architecture

**Product:** Hijin  
**Document:** `docs/model-hub-integration.md`  
**Purpose:** Technical specification for desktop Model Hub lifecycle, package manifest contracts, download states, integrity verification, activation, rollback, and commercial entitlement gating.

---

## 1. Existing Desktop Application Reality

A code-level audit of the existing Hijin desktop runtime reveals the following baseline:

1. **Existing Verification Infrastructure (COMPLETE):**
   * `agent_alpha/production/model_provisioning.py` implements `ProductionModelRuntime`, enforcing the strict multi-stage validation chain:
     ```text
     Package → Signature → Identity → Compatibility → License Entitlement → Resource Budget → Load → Health Check → ACTIVE
     ```
   * `agent_alpha/commercial/updates.py` implements `UpdatePackageManifest` and `UpdateEntitlementGuard`, providing Ed25519 cryptographic signature verification and channel policies.
   * `agent_alpha/licensing/engine.py` and `agent_alpha/commercial/state_machine.py` provide license validation and offline grace checking.

2. **Current Model Execution Runtime (EXTERNAL OLLAMA):**
   * As documented in `docs/commercial/c9-c11/VALIDATION_REPORT.md` (Finding FIND-01), the current production desktop runtime connects over loopback HTTP (`127.0.0.1:11434`) to an external Ollama instance.
   * A standalone in-app GGUF streaming downloader and bundled llama.cpp engine is currently being productized under P29 Stage 3B.

3. **Status of Desktop Model Hub:**
   * **State:** `PARTIALLY IMPLEMENTED / CONTRACT DEFINED`.
   * Model provisioning, cryptographic packaging, resource budgeting, and license gating exist in the core backend.
   * In-app GUI streaming and direct weight extraction must reuse these existing core components rather than creating parallel mechanisms.

---

## 2. Model Package Manifest Contract

All models distributed through the official Hijin Model Hub must provide a signed canonical manifest conforming to the existing Phase 25 / C5 schema:

```json
{
  "model_id": "hijin-financial-specialist-4b",
  "version": "1.0.0",
  "name": "Hijin Financial Specialist",
  "target_channel": "stable",
  "release_timestamp": 1790851200.0,
  "archive_sha256": "4b68e9102c98d63d0473919ad7783fe1f7a07ceef77800742f9b8c0352ef2e55",
  "file_format": "gguf",
  "quantization": "Q4_K_M",
  "payload_size_bytes": 6442450944,
  "context_length": 16384,
  "min_system_version": "1.0.0",
  "hardware_requirements": {
    "min_ram_bytes": 8589934592,
    "recommended_vram_bytes": 8589934592,
    "supports_cpu_fallback": true
  },
  "license": "Hijin Commercial License",
  "signature": "base64_encoded_ed25519_signature",
  "key_id": "auth-key-ed25519-v1"
}
```

---

## 3. Storage Hierarchy & Local Lifecycle

Model packages reside strictly within the local user profile:

```text
%LOCALAPPDATA%\Hijin\models\
├── manifests\
│   ├── hijin-financial-specialist-4b-1.0.0.json
│   └── gemma-3-4b-it-1.0.json
├── staging\
│   └── .download_hijin-specialist-4b.part
├── active\
│   ├── hijin-financial-specialist-4b-1.0.0.gguf
│   └── gemma-3-4b-it-1.0.gguf
└── backup\
    └── hijin-financial-specialist-4b-0.9.4.gguf
```

---

## 4. Lifecycle States (Section 22)

The desktop Model Hub UI must transition through the following explicit, mutually exclusive states:

1. `AVAILABLE`: Manifest discovered; compatible with workstation and license; not yet downloaded.
2. `DOWNLOADING`: HTTP range streaming active; displaying byte progress and ETA.
3. `PAUSED`: Streaming paused by user or network loss; offset cached for resumption.
4. `VERIFYING`: SHA-256 payload digest and Ed25519 manifest signature currently computing.
5. `READY`: Verification succeeded; package staged in `%LOCALAPPDATA%\Hijin\models\active`.
6. `INSTALLED`: Model verified and linked to the local inference executor.
7. `ACTIVE`: Model currently mapped into VRAM/RAM with an active allocation ticket.
8. `UPDATE_AVAILABLE`: Newer manifest detected with higher semver on current channel.
9. `INCOMPATIBLE`: Workstation RAM/VRAM below minimum, or app version below `min_system_version`.
10. `FAILED`: Network timeout, disk full, or write failure. Previous active model preserved.
11. `CORRUPTED`: SHA-256 digest does not match manifest. Package deleted immediately.
12. `ROLLED_BACK`: Staged update failed runtime health check; reverted to previous verified backup.

---

## 5. Security & Verification Sequence

Before any downloaded model can be activated:

```text
Download Complete in Staging
       ↓
Compute SHA-256 of staged file
       ↓
Compare SHA-256 against signed manifest (Match?)
   ├── NO → Delete corrupt file → State: CORRUPTED → Alert user
   └── YES → Verify Ed25519 signature of manifest (Valid?)
         ├── NO → Reject unsigned package → State: FAILED
         └── YES → Check commercial entitlement active (Valid?)
               ├── NO → Fail closed → State: INCOMPATIBLE
               └── YES → Move to active/ → Backup previous → Activate
```

---

## 6. Model Rollback & Anti-Destruction Guarantee

Under no circumstances may the application overwrite or delete a working active model before the replacement model has:
1. Completed full download in `staging/`.
2. Passed SHA-256 digest validation.
3. Passed Ed25519 signature verification.
4. Passed runtime allocation and health check in memory.

If any stage fails, the staged file is discarded, the previous verified version remains active, and the user is notified.

---

## 7. Commercial Entitlement Integration

The Model Hub queries the authoritative commercial licensing engine (`agent_alpha.commercial.state_machine`):
* **Trial Entitlement:** Authorized for baseline models during the 14-day evaluation window.
* **Active Commercial Subscription:** Authorized for all official models and future eligible architecture updates.
* **Expired Subscription:** Transitioned to read-only; model inference disabled until renewal.
