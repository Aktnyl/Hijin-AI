# Hijin Distribution Architecture & Large-File Delivery Blueprint

**Specification Version:** 1.0.0  
**Effective Date:** October 1, 2026  
**Audience:** Public Engineering & Infrastructure Documentation  
**Component Package Payload:** ~12.04 GB (Runtime: 35 MB, Models: ~12.0 GB)  

---

## 1. Executive Mandate: The Single-Download Customer Experience

The customer expectation for Hijin is friction-free:

```text
Customer visits Website (hijin.ai)
        ↓
Clicks "Download for Windows" (ONE download action)
        ↓
Runs Hijin_Setup_1.0.0.exe
        ↓
Installer provisions Native Runtime & Model Engine
        ↓
Hijin desktop workstation initializes
        ↓
Customer activates 14-day trial or enters license
        ↓
Workstation is 100% operational offline
```

### Critical Non-Negotiables:
* The user must **NOT** be forced to install Ollama manually.
* The user must **NOT** be forced to download raw GGUF files in browser tabs.
* The user must **NOT** configure model directories, PATH variables, or terminal scripts.
* The user must **NOT** manage separate model servers or port bindings.

---

## 2. Technical Constraint: Why GitHub Releases Cannot Host a Monolithic 12 GB Exe

GitHub Releases enforces a strict hard limit: **maximum 2.0 GiB (2,147,483,648 bytes) per release asset**.

Attempting to compile a monolithic 12 GB `Hijin_Setup_1.0.0.exe` causes immediate failures:
1. **GitHub API Rejection:** Uploads exceeding 2 GiB are terminated with HTTP 422 Unprocessable Entity.
2. **Browser Failure Rates:** Monolithic 12 GB browser downloads over residential or corporate Wi-Fi have an 80%+ dropoff/corruption rate due to transient connection drops.
3. **Bandwidth Inefficiency:** Distributing a full 12 GB binary whenever a minor 2 MB frontend UI fix is deployed requires users to re-download 12 GB unnecessarily.

Therefore, the customer-facing "single download" is achieved via a **Two-Tier Smart Bootstrapper Architecture**.

---

## 3. Architecture Comparison: $0 Launch vs. Commercial-Scale

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                       HIJIN INFRASTRUCTURE PROGRESSION                         │
├───────────────────────────────────┬────────────────────────────────────────────┤
│ INITIAL $0 LAUNCH ARCHITECTURE     │ FUTURE COMMERCIAL ARCHITECTURE ($1M+ ARR)  │
├───────────────────────────────────┼────────────────────────────────────────────┤
│ • Website: GitHub Pages ($0)      │ • Website: Cloudflare Enterprise CDN       │
│ • Installer: GitHub Releases ($0) │ • Installer: Cloudflare R2 / AWS S3        │
│ • Models: Hugging Face Git LFS($0)│ • Models: Signed Token-Gated S3 Edge CDN   │
│ • Licensing: Lemon Squeezy (5%)   │ • Licensing: Enterprise Multi-Seat Portal  │
│ • Operating Burn: $0.00 / month   │ • Operating Burn: Scale-proportional       │
└───────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 4. In-Depth Evaluation: Hugging Face Hub as the Initial $0 Model Host

Hugging Face Hub is the premier candidate for hosting Hijin's ~12 GB model payload during the initial launch phase.

### 4.1 Storage & File Size Limits
* **Git LFS Support:** Hugging Face natively supports large files via Git LFS. Individual files up to 50 GB are permitted in public model repositories at zero cost.
* **Our Payload:**
  * `gemma-3-4b-it-q4_k_m.gguf`: ~6.0 GB (fits easily within 50 GB limit).
  * `hijin-financial-specialist-q4_k_m.gguf`: ~6.0 GB (fits easily within 50 GB limit).
* **Total Storage Required:** ~12 GB in repository `Aktnyl/hijin-neural-pack`.

### 4.2 Resolver Behavior & Streaming Downloads
Hugging Face exposes direct, resumable HTTP download endpoints:
```text
https://huggingface.co/Aktnyl/hijin-neural-pack/resolve/main/gemma-3-4b-it-q4_k_m.gguf
https://huggingface.co/Aktnyl/hijin-neural-pack/resolve/main/hijin-financial-specialist-q4_k_m.gguf
```
* **HTTP Range Header Support:** Fully supported. The Hijin desktop application and the NSIS installer bootstrapper can perform chunked, parallel, and resumable downloads.
* **Network Interruption Recovery:** If a user's connection drops at 4.2 GB, the downloader resumes at 4.2 GB rather than restarting from zero.

### 4.3 Terms of Service & Commercial Viability
* **Public Weights:** Hugging Face permits hosting open-weights models and fine-tuned derivatives under free public accounts.
* **Commercial Restrictions:** Hugging Face does not charge egress fees for downloads of public models.
* **Model Licensing Compliance:**
  * Gemma 3 is distributed under the Google Gemma Terms of Use.
  * Hijin Financial Specialist is distributed as an exported quantized binary artifact. The underlying proprietary training dataset, LoRA recipes, and proprietary Python code remain 100% private in `Agent_Alpha`.

### 4.4 Realistic Limitations (What Free Tier Is NOT)
* Hugging Face free tier does **NOT** offer guaranteed SLAs or dedicated enterprise bandwidth.
* If download traffic spikes aggressively (e.g., >10,000 downloads in 24 hours), Hugging Face may apply transient rate limiting or CDN throttling.
* **Mitigation:** When paid subscriptions reach 50 seats ($4,000/mo MRR), model distribution will migrate to Cloudflare R2 (zero egress fees, $0.015/GB storage = ~$0.18/month for 12 GB storage).

---

## 5. Detailed Packaging & Installation Workflow

### Flow A: The Primary Customer Experience (Smart Web Installer)
1. **Customer Download:** Downloads `Hijin_Setup_1.0.0.exe` (6.58 MB) from `https://github.com/Aktnyl/Hijin-AI/releases`.
2. **Local Extraction:** Installs the native Tauri 2 runtime and Rust daemon to `%LOCALAPPDATA%\Hijin` (~35 MB).
3. **Model Provisioning:**
   * The installer's integrated downloader connects to the Hugging Face Hub LFS resolver.
   * Downloads the Unified Dual-Core Pack into `%LOCALAPPDATA%\Hijin\models\`.
   * Displays a unified progress bar with download speed, ETA, and SHA-256 verification.
4. **First Launch:** Launches `hijin.exe`. The internal Ollama/llama.cpp bridge connects to the verified local GGUF models.
5. **Customer Verification:** Customer activates their 14-day trial or enters an Ed25519 license key.

### Flow B: The Enterprise Air-Gap Package (Intranet Distribution)
For corporate accounting departments, hedge funds, and auditors with zero internet access on target workstations:
* Distributed as a single archive or split archive via internal IT drive:
  * `Hijin_Setup_1.0.0.exe`
  * `models/gemma-3-4b-it-q4_k_m.gguf`
  * `models/hijin-financial-specialist-q4_k_m.gguf`
  * `hijin-distribution-v1.json`
* Installer detects co-located model files and skips the network download entirely.
