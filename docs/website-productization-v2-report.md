# Hijin Public Website & Model Distribution Productization Report (v2)

**Product:** Hijin  
**Document:** `docs/website-productization-v2-report.md`  
**Execution Date:** October 1, 2026  
**Branch:** `website-productization-v2`  
**Auditor:** Hijin Product Engineering  

---

## 1. Audit Findings Summary

A forensic audit of the previous website iteration (`docs/website-audit.md`) identified significant productization defects:
* Inaccurate commercial pricing ($79/mo and $65/mo annual options instead of the mandatory $99/mo rate).
* A fake client-side JavaScript trial key generator creating synthetic keys (`HJN-TRL-...`).
* An unverified customer testimonial (Sarah Jenkins).
* Unverified empirical hardware benchmark claims (Ryzen 5 5600X, RTX 3060, 32.8 tokens/sec).
* Missing standalone pages for Capabilities, Models Catalog, Security Architecture, and Support.

All identified deficiencies were systematically remediated under the **Absolute Source-of-Truth Rule**.

---

## 2. Pages Created & Redesigned

| Page Route | File Path | Status | Key Highlights |
| :--- | :--- | :--- | :--- |
| `/` | `index.html` | **REDESIGNED** | Clear hero ("Private Intelligence. On Your Machine."), Core workflow (Understand → Reason → Verify → Create), visual data pipeline, pricing card, download CTA. |
| `/capabilities` | `capabilities.html` | **CREATED** | Categorized validated capabilities: General Intelligence, Document Intelligence, Financial Intelligence, Evidence & Grounding, Artifacts. Explicit section on what Hijin does NOT claim. |
| `/models` | `models.html` | **CREATED** | Curated catalog of official models: `Hijin Financial Specialist v1.0.0` and `Gemma 3 4B IT`. Exact manifests, format (GGUF Q4_K_M), sizes (~6.0 GB), hardware targets, and clear notice that models are installed in-app. |
| `/pricing` | `pricing.html` | **REDESIGNED** | Authoritative $99/month commercial plan. 14-day free trial (no credit card required). Factual onboarding guide. Removed fake generator, discounts, and unverified tiers. |
| `/downloads` | `downloads.html` & `download.html` | **REDESIGNED** | Direct download button for `Hijin_Setup_1.0.0.exe` (6.58 MB), SHA-256 hash, PowerShell command, transparent 3-column system requirements table. |
| `/releases` | `releases.html` | **REDESIGNED** | Release v1.0.0 GA, release notes, binary size, SHA-256 verification, and permanent release archive timeline. |
| `/docs` | `docs.html` | **REDESIGNED** | 9 task-oriented chapters (Getting Started, Installation, First Launch, Model Hub, Documents, Reconciliation, Evidence, Offline Licensing, Troubleshooting). |
| `/privacy` | `privacy.html` | **REDESIGNED** | Zero-Data Privacy Guarantee. Discloses local-only workspace and exact network boundaries (7-day license check & Model Hub downloads). |
| `/security` | `security.html` | **CREATED** | Defense-in-depth principles: local isolation, least privilege execution, package checksum verification, Ed25519 licensing, fail-closed validation. |
| `/support` | `support.html` | **CREATED** | Direct community links: GitHub Discussions, issue reporting, troubleshooting checklist. |
| `/terms` | `terms.html` | **REDESIGNED** | Commercial software license agreement, $99/mo subscription terms, single-user 2-workstation policy, and audit/CPA disclaimers. |

---

## 3. Branding Harmonization

* Public product identity is strictly: **HIJIN**.
* Core positioning: *"Private intelligence, running on your machine."*
* Removed all public references to "Hanging Clock", legacy corporate names, and obsolete slogans.
* Standardized copyright notice: `© 2026 Hijin`.

---

## 4. Pricing & Commercial Correction

* Base subscription price set strictly to: **$99/month**.
* Removed $79/mo and $65/mo annual pricing.
* Removed fake client-side random key generation script.
* Accurate trial representation: 14-day free trial activated in the desktop application First-Launch Wizard with no credit card required.
* Commercial tier includes: Full local AI inference, financial intelligence, document understanding, deterministic 28-digit verification, evidence citations, Model Hub access, and eligible supported model updates.

---

## 5. Hardware Specification & Benchmark Truth

* Removed speculative and unverified lab benchmark speeds (32.8 tokens/sec, 14.2 tokens/sec, specific CPU/GPU models).
* Real validated hardware environment documented:
  * Operating System: Windows 11 Pro 64-bit (23H2) / Windows 10 64-bit (1903+)
  * Architecture: x86_64
  * Memory: 8 GB RAM Minimum / 16 GB Recommended
  * Storage: 15 GB Free Space Minimum / 25 GB+ Recommended for models
  * Graphics: Dedicated NVIDIA CUDA GPU recommended (CPU fallback supported)

---

## 6. Model Hub Architecture & Status

* **Status:** `PARTIALLY IMPLEMENTED / CONTRACT DEFINED`.
* **Public Catalog (`models.html`):** Published with authentic metadata for `Hijin Financial Specialist` and `Gemma 3 4B IT`.
* **Desktop Application Reality:**
  * Backend model provisioning (`ProductionModelRuntime`), cryptographic packaging, resource budgeting, and license verification are **IMPLEMENTED**.
  * Current desktop runtime delegates to external Ollama on `127.0.0.1:11434` for AI chat (Finding FIND-01).
  * Direct GGUF in-app HTTP streaming and bundled llama.cpp engine are active milestones in P29 Stage 3B.
* Contract documented in `docs/model-hub-integration.md`.

---

## 7. Distribution & Installer Truth

* Installer binary: `Hijin_Setup_1.0.0.exe` (6,579,864 bytes / 6.58 MB).
* Accurately described as a bootstrap setup installer for the desktop shell and daemon.
* Models are not bundled inside the 6.58 MB setup; they are distributed through the Model Hub or external local runtime.

---

## 8. Verification & Test Execution

1. **Automated Commercial Website Tests (`test_c6_website.py`):**
   * `test_required_pages_exist`: **PASSED**
   * `test_pricing_config_valid`: **PASSED**
   * `test_no_forbidden_marketing_claims`: **PASSED**
   * `test_no_third_party_trackers`: **PASSED**
   * `test_no_secret_leakage`: **PASSED**
   * `test_internal_navigation_links`: **PASSED**
   * Result: **6 of 6 Tests Passed (100%)**.

2. **Link Integrity Audit (`verify_website_links.py`):**
   * Scanned all 12 HTML pages.
   * **100% of internal links, anchors, and CSS/JS assets resolve cleanly.**

3. **Security Preflight Scanner (`security_preflight_scanner.py`):**
   * Total files scanned: 50
   * **0 private keys, 0 API secrets, 0 proprietary source files detected.**

---

## 9. Comprehensive Feature Classification Matrix

| Feature / Capability | Classification | Technical Reality & Notes |
| :--- | :--- | :--- |
| **Static Website Presentation** | `IMPLEMENTED` | Complete 11-page responsive technical site using Design System v4.5. |
| **Zero Surveillance Analytics** | `IMPLEMENTED` | 0 third-party trackers, 0 surveillance pixels, 100% static hosting. |
| **Public Model Catalog** | `IMPLEMENTED` | Live `/models` catalog showing official manifests, formats, sizes, licenses. |
| **Windows Desktop Installer** | `IMPLEMENTED` | NSIS setup binary (6.58 MB) deploying Tauri 2 shell and Rust daemon. |
| **Ed25519 License Verification** | `IMPLEMENTED` | Asymmetric cryptographic licensing engine with 7-day offline grace. |
| **Deterministic Decimal Engine** | `IMPLEMENTED` | Fixed 28-digit arithmetic compiled in backend runtime (0.000% drift). |
| **Evidence & Provenance Grounding** | `IMPLEMENTED` | Spatial bounding boxes and coordinate extraction on source documents. |
| **In-App Desktop Model Hub GUI** | `PARTIALLY IMPLEMENTED` | Backend provisioning and manifests implemented; GUI integration in progress. |
| **Self-Contained llama.cpp Engine** | `DESIGNED / NOT YET IMPLEMENTED` | P29 Stage 3B roadmap item to eliminate external Ollama prerequisite. |
| **Production Merchant Live Charges** | `BLOCKED` | Sandbox complete; live charges blocked pending merchant store key. |
| **Autonomous Bank Wire Transfers** | `NOT SUPPORTED` | Explicitly outside product scope; human verification required. |
| **Unrestricted Zero-Hallucination Claims** | `NOT SUPPORTED` | Explicitly unsupported; domain reasoning is bounded by verification rules. |

---

## 10. Exact Next Phase

1. **Phase P29 Stage 3B:** Bundle native llama.cpp execution engine inside `hijin_daemon.exe` to enable direct GGUF model execution without requiring external Ollama.
2. **Production Merchant Credential Provisioning:** Connect live production Lemon Squeezy API keys and configure store webhook endpoints.
3. **Authenticode EV Code Signing:** Procure Extended Validation certificate to eliminate Windows SmartScreen informational alerts.
