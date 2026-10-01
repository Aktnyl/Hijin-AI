# ⬡ Hijin — Local Cognitive AI Workstation

[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011%20x64-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/Aktnyl/Hijin-AI)
[![Download Installer](https://img.shields.io/badge/Download_Installer-v1.0.0_(6.58_MB)-10B981?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Aktnyl/Hijin-AI/releases/download/v1.0.0/Hijin_Setup_1.0.0.exe)
[![Official Website](https://img.shields.io/badge/Official_Website-aktnyl.github.io%2FHijin--AI-6366F1?style=for-the-badge&logo=google-chrome&logoColor=white)](https://aktnyl.github.io/Hijin-AI/)
[![Community](https://img.shields.io/badge/GitHub-Discussions-orange?style=for-the-badge&logo=github)](https://github.com/Aktnyl/Hijin-AI/discussions)

> **Hijin** is an enterprise-grade, local-first cognitive AI desktop workstation engineered specifically for **corporate controllers, CPAs, auditors, and financial analysts**.  
> It performs deterministic general ledger reconciliation, audit variance detection, and financial statement verification **100% locally on your machine with zero cloud data transmission**.

---

## 📥 Direct Download & Quick Installation

### Windows Desktop Installer (Primary)

| Release | Platform | Installer Size | Direct Download Link | SHA-256 Hash |
| :--- | :---: | :---: | :---: | :--- |
| **v1.0.0 (Latest Stable)** | Windows 10 / 11 (64-bit) | **6.58 MB** | [**⬇️ Download Hijin_Setup_1.0.0.exe**](https://github.com/Aktnyl/Hijin-AI/releases/download/v1.0.0/Hijin_Setup_1.0.0.exe) | `4b68e9102c98d63d0473919ad7783fe1f7a07ceef77800742f9b8c0352ef2e55` |

👉 **[View All Releases & Version Archive](https://aktnyl.github.io/Hijin-AI/releases.html)** or browse [GitHub Releases](https://github.com/Aktnyl/Hijin-AI/releases).

---

### Instant PowerShell One-Liner (Automated Download & Run)
Open Windows PowerShell and run:

```powershell
curl.exe -L -o "$HOME\Downloads\Hijin_Setup_1.0.0.exe" "https://github.com/Aktnyl/Hijin-AI/releases/download/v1.0.0/Hijin_Setup_1.0.0.exe"; Start-Process "$HOME\Downloads\Hijin_Setup_1.0.0.exe"
```

---

## ⚡ How It Works (The 3-Step Flow)

```text
┌─────────────────────────────────┐
│ 1. Download Installer (6.58 MB) │ ➔ Lightweight NSIS setup from GitHub Releases CDN
└────────────────┬────────────────┘
                 ▼
┌─────────────────────────────────┐
│ 2. Rapid Installation (~5 secs) │ ➔ Provisions native Tauri 2 runtime to %LOCALAPPDATA%\Hijin
└────────────────┬────────────────┘
                 ▼
┌─────────────────────────────────┐
│ 3. In-App Model Stream (~12 GB) │ ➔ Model Hub streams verified Dual-Core Neural Pack in background
└────────────────┬────────────────┘
                 ▼
┌─────────────────────────────────┐
│ 4. 100% Offline Operation       │ ➔ Activate 14-day trial; all audit math runs offline in RAM
└─────────────────────────────────┘
```

---

## 💻 System & Hardware Requirements

| Component | Minimum Requirement | Recommended Specification |
| :--- | :--- | :--- |
| **Operating System** | Windows 10 (64-bit, Build 19041+) or Windows 11 | Windows 11 (64-bit, Latest Build) |
| **Processor** | 4-Core x86_64 CPU (Intel 10th Gen+ / AMD Ryzen 3000+) | 8-Core CPU (Intel 12th Gen+ / AMD Ryzen 5000+) |
| **Memory (RAM)** | 8 GB System RAM | 16 GB or 32 GB High-Speed RAM |
| **Graphics (GPU)** | Integrated Intel Iris Xe / AMD Radeon Vega | NVIDIA RTX 3060+ (6 GB+ VRAM) or Apple M-series equivalent |
| **Disk Storage** | 25 GB available space (Standard SSD) | 40 GB available space (NVMe SSD) |

See the complete [Hardware Compatibility Guide](docs/hardware.md) for full benchmarks.

---

## 🛡️ Zero-Data Leakage Architecture

* **100% Local Inference:** All document parsing, OCR table extraction, and neural reasoning happen strictly in your workstation's RAM. No data is sent to OpenAI, Anthropic, or external servers.
* **Deterministic Fixed-Point Arithmetic:** Hijin uses fixed-point Decimal arithmetic to eliminate floating-point hallucinations across general ledgers and trial balances.
* **Recognition Account Model:** Account registration stores only your email and cryptographic license state. No customer documents are ever uploaded.
* **Asymmetric Ed25519 Licensing:** Entitlements are signed cryptographically, allowing full offline operation for up to 30 days without internet check-ins.

Read our complete [Privacy Architecture Specification](docs/privacy.md).

---

## 🗺️ Version Roadmap

| Version | Status | Highlights |
| :--- | :---: | :--- |
| **v1.0.0** | **Released** | Native Tauri 2 Workstation, Dual-Core Neural Pack (~12 GB), In-App Model Hub, Ed25519 Licensing. |
| **v1.1.0** | *In Development* | One-Click QuickBooks & Xero CSV connectors, automated mismatch heatmaps. |
| **v1.2.0** | *Planned* | Upgraded higher-parameter financial specialist model (included at zero extra cost for active subscribers). |

---

## 💬 Community & Feedback

* **User Reviews & Benchmarks:** [Share your experience in GitHub Discussions](https://github.com/Aktnyl/Hijin-AI/discussions/categories/user-reviews-experiences).
* **Feature Requests:** [Suggest new accounting export formats](https://github.com/Aktnyl/Hijin-AI/discussions/categories/feature-requests).
* **Bug Reports:** [Submit an issue](https://github.com/Aktnyl/Hijin-AI/issues/new/choose).
* **Community Q&A:** [Troubleshooting & Help](https://github.com/Aktnyl/Hijin-AI/discussions/categories/q-a-troubleshooting).

---

## 📜 Legal & Licensing Notices

* **Hijin Workstation Application:** Copyright © 2026 Hijin Tech. Distributed under the [Hijin Commercial License](LICENSE).
* **Gemma 3 Model Component:** Gemma is provided by Google LLC under the [Gemma Terms of Use](https://ai.google.dev/gemma/terms). See [GEMMA_NOTICE.txt](distribution/notices/GEMMA_NOTICE.txt).
* **Third-Party Open Source Components:** See [Third-Party Notices](docs/third-party/README.md).
