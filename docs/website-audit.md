# Phase A: Public Website & Distribution Architecture Audit

**Product:** Hijin  
**Audit Target:** Public Website & Distribution Portal (`website/` in `Agent_Alpha` and `Hijin-AI`)  
**Audit Date:** October 1, 2026  
**Auditor:** Hijin Product Engineering  
**Branch:** `website-productization-v2`  

---

## 1. Executive Summary

A comprehensive forensic audit of the existing public website reveals that while the visual presentation was recently updated to a dark aesthetic, the website currently contains several critical productization defects, inaccurate commercial pricing, unverified hardware benchmarks, an invented customer testimonial, fake client-side key generation, and missing core product pages.

This audit establishes the baseline of what exists, what is inaccurate, and what must be corrected according to the **Absolute Source-of-Truth Rule**.

---

## 2. Inventory of Current Pages

| Existing File | Current Purpose | Status & Deficiencies |
| :--- | :--- | :--- |
| `index.html` | Homepage / Overview | **Requires Major Revision.** Contains unverified benchmark numbers (Ryzen 5 5600X, RTX 3060, 32.8 tokens/sec), an invented customer pilot testimonial (Sarah Jenkins), and lacks dedicated navigation to key standalone pages. |
| `pricing.html` | Pricing Plans | **Requires Major Revision.** Violates commercial pricing requirements: advertises $79/mo and $65/mo annual tiers instead of the mandatory $99/mo rate; includes an invented seat calculator and a fake client-side trial key generator (`HJN-TRL-...`). |
| `download.html` | Download Installer | **Requires Revision.** Uses single filename `download.html` instead of standard `/downloads` routing; contains unverified hardware diagnostic calculator promising speculative token/sec speeds. |
| `releases.html` | Release Archive | **Functional Baseline.** Lists v1.0.0 GA and SHA-256 hash, but needs alignment with the official model catalog and long-term release metadata. |
| `docs.html` | Technical Documentation | **Requires Refinement.** 8 chapters present, but needs restructuring into customer task-oriented workflows (Getting Started, Installation, First Launch, Model Hub, Documents, Financial Intelligence, Artifacts, Hardware, Troubleshooting, Updates, Licensing). |
| `privacy.html` | Privacy Policy | **Good Foundation.** Clear on zero document uploads, but must accurately explain licensing, updates, and model downloads without saying "nothing ever connects to the internet." |
| `terms.html` | Terms of Service | **Requires Pricing Correction.** Mentions outdated pricing tiers; needs alignment with $99/month commercial desktop license and single-user 2-workstation policy. |
| `pricing-config.json` | Pricing metadata schema | **Requires Correction.** Currently defines $79/$65 pricing; must be updated to $99/mo base subscription. |

---

## 3. Inventory of Missing Pages (Hard Requirements)

Per the Master Productization Task (Sections 8, 12, 15, 17, 34), the following first-class pages are currently missing from the site structure:

1. **`/capabilities` (`capabilities.html`):** Dedicated page categorizing actual validated capabilities:
   * General Intelligence (local conversation, task planning, workspace context)
   * Document Intelligence (supported document types)
   * Financial Intelligence (reconciliation, discrepancy detection, normalization, deterministic arithmetic)
   * Evidence (evidence-backed responses, coordinates, provenance)
   * Artifact Generation (audited outputs)
   * Local AI (local model execution and storage)
2. **`/models` (`models.html`):** Major new product surface. Curated catalog of official Hijin models (`Hijin Financial Specialist v1.0`, `Gemma 3 4B IT Conversation Core`), displaying exact manifests, VRAM/RAM requirements, formats (GGUF Q4_K_M), and clear instruction that models are installed/managed via the desktop app.
3. **`/security` (`security.html`):** Dedicated security architecture page explaining local-first isolation, least privilege, signed packages, checksum verification, fail-closed licensing, and zero surveillance.
4. **`/support` (`support.html`):** Task-oriented support page with links to GitHub Discussions, bug reporting, documentation, system requirements, and troubleshooting.
5. **`/downloads` (`downloads.html`):** Standard plural route alongside `download.html` for clean navigation.

---

## 4. Inaccurate Claims & Fabricated Elements to Remove

### A. Pricing Violations
* **Current Issue:** The site currently advertises:
  * 14-Day Free Trial: $0
  * Financial Specialist: $79/mo (or $65/mo billed annually)
  * Institutional & Firm: Custom / $84-$99 volume calculator
* **Hard Correction:** The base Hijin subscription is **$99/month**.
  * Remove $79/month.
  * Remove $65/month annual pricing.
  * Remove seat pricing and volume sliders.
  * Remove invented enterprise tiers.
  * Present the clean, authoritative offer:
    ```text
    Hijin
    $99 / month

    14-day free trial
    No credit card required

    [Start Free Trial]
    [Get Hijin]
    ```

### B. Fake Client-Side Trial Generator
* **Current Issue:** `pricing.html` contains an email form that executes client-side JavaScript to output a pseudo-random key (`HJN-TRL-XXXX-XXXX-XXXX`).
* **Hard Correction:** Remove this fake generator. The actual validated Hijin trial architecture (`agent_alpha/commercial/trial.py`) is server-authoritative and device-fingerprinted. The website must accurately instruct users to download the application and select "Start 14-Day Free Trial" in the desktop First-Launch Wizard.

### C. Invented Customer Testimonial
* **Current Issue:** Homepage displays a quote from "Sarah Jenkins, Senior Financial Controller at Apex Heritage Capital". While Sarah Jenkins was the scenario profile in the C11 single-participant stranger pilot validation report, displaying her quote on the public website as social proof violates Section 36 ("Do NOT add fake testimonials. ... When genuine users provide feedback later, create a real testimonials section.").
* **Hard Correction:** Remove all testimonials, fake client logos, and unverified social proof from all public pages.

### D. Unverified Hardware Benchmarks
* **Current Issue:** The website claims specific empirical test figures for "AMD Ryzen 5 5600X", "RTX 3060 6GB", "32.8 tokens/sec", and "14.2 tokens/sec". While these appeared in planning notes, they are not verified in the authoritative production validation report (`VALIDATION_REPORT.md`).
* **Hard Correction:**
  * Remove specific unverified CPU/GPU benchmark speeds.
  * State the actual validated operating environment: Windows 11 / Windows 10 64-bit (x86_64), 8 GB RAM minimum / 16 GB recommended, 15 GB free disk space, optional NVIDIA CUDA GPU acceleration.
  * Clarify that external Ollama or local runtime is supported.

### E. Residual Branding
* **Current Issue:** Past iterations contained references to "Hanging Clock" or "Hijin Tech".
* **Hard Correction:** Harmonize all public branding strictly to **HIJIN** ("Private intelligence, running on your machine.", "© 2026 Hijin").

---

## 5. Model Distribution & Model Hub Truth

### A. Current Desktop Reality
* The current desktop application binary is **6.58 MB** (`Hijin_Setup_1.0.0.exe`).
* It does NOT bundle the ~12 GB model weights.
* In the current validation baseline (Wave 3 / FIND-01), the local AI provider communicates over loopback IPC (`127.0.0.1:11434`) to an external Ollama engine.
* In-app GGUF streaming and internal model management are active development milestones (P29 Stage 3B).

### B. Public Model Catalog Strategy
* On `/models`: Present the official **Hijin Model Catalog** with real manifests for:
  1. **Hijin Financial Specialist v1.0.0:** 6.0 GB GGUF Q4_K_M, proprietary fine-tuned model for reconciliation and ledger verification.
  2. **Gemma 3 4B IT (Conversation Core):** 6.0 GB GGUF Q4_K_M, foundational reasoning core under Google Gemma Terms of Use.
* Clarify that models are installed and managed within the Hijin desktop environment or local runtime.
* Do NOT implement fake in-browser model downloading buttons.

---

## 6. Audit Action Plan

1. **Phase B:** Draft and commit `docs/hijin-web-design-system.md` establishing color tokens, typography, component rules, and accessibility standards.
2. **Phase C & D:** Re-architect and write all 11 required static pages (`index.html`, `capabilities.html`, `models.html`, `pricing.html`, `downloads.html`, `download.html`, `releases.html`, `docs.html`, `privacy.html`, `security.html`, `support.html`, `terms.html`).
3. **Phase E & F:** Inspect desktop code, write `docs/model-hub-integration.md`, and verify package contracts.
4. **Phase G:** Perform grep audit for forbidden terms ($79, $65, Ryzen 5 5600X, RTX 3060, 32.8 tokens/sec, Hanging Clock).
5. **Phase H:** Issue the comprehensive final report in `docs/website-productization-v2-report.md`.
