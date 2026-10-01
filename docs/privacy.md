# Zero-Data Leakage Privacy Architecture

Hijin was built specifically for accountants, auditors, and financial analysts who cannot upload confidential financial records to third-party cloud servers.

## Our Architectural Guarantees
1. **100% Local Inference:** All document parsing, OCR reconciliation, and neural completions occur strictly within your machine's CPU/GPU memory.
2. **Zero Cloud Telemetry:** Hijin does not track what files you open, what ledgers you reconcile, or what questions you ask.
3. **Recognition Account Model:** User accounts created on our website store only your registration email and license entitlement status (`ACTIVE`/`EXPIRED`). No personal documents or financial records ever leave your machine.
4. **Air-Gap Capability:** After initial model acquisition and license activation, Hijin operates indefinitely with zero internet connection for up to 30 days.
