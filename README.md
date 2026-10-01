# Hijin — Local Cognitive AI Workstation

[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011%20x64-0078D6?style=flat-square&logo=windows)](https://github.com/Aktnyl/Hijin-AI)
[![Architecture](https://img.shields.io/badge/Architecture-Tauri%202%20%2B%20Rust-DEA584?style=flat-square&logo=rust)](https://github.com/Aktnyl/Hijin-AI)
[![Models](https://img.shields.io/badge/Neural%20Pack-Gemma%203%20%2B%20Specialist%20(~12GB)-4285F4?style=flat-square)](https://huggingface.co/Aktnyl/hijin-neural-pack)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Air--Gapped%20Local-10B981?style=flat-square)](docs/privacy.md)
[![License](https://img.shields.io/badge/License-Proprietary%20Commercial-0F172A?style=flat-square)](LICENSE)
[![Discussions](https://img.shields.io/badge/Community-Discussions-orange?style=flat-square&logo=github)](https://github.com/Aktnyl/Hijin-AI/discussions)

> **Hijin** is a private, local-first cognitive AI desktop workstation designed specifically for corporate controllers, CPAs, auditors, and financial analysts. It executes deterministic accounting reconciliation, audit variance analysis, and document intelligence 100% locally on your own machine.

---

## ⚡ Key Highlights

* **100% Air-Gapped Local Inference:** Customer ledgers, invoices, and bank statements never leave your workstation's RAM. Zero cloud API calls.
* **Deterministic Fixed-Point Math:** Unlike vanilla LLMs that hallucinate arithmetic, Hijin pairs conversational reasoning with high-precision fixed-point math verification.
* **Unified Dual-Core Neural Pack (~12 GB):** Combines **Gemma 3 4B IT** for fluid human conversation with the fine-tuned **Hijin Financial Specialist** for accounting reconciliation.
* **Native Lightweight Footprint:** Built with native **Tauri 2 and Rust** (~35 MB unpacked software runtime; 500ms launch time; no Electron bloat).
* **Smart 6.58 MB Installer:** Fast installer that provisions the desktop runtime and manages chunked, resumable downloads of the local AI models.

---

## 💻 System Requirements

| Specification | Minimum Requirement | Recommended Specification |
| :--- | :--- | :--- |
| **Operating System** | Windows 10 (64-bit, 20H2+) or Windows 11 | Windows 11 (64-bit, Latest Build) |
| **Processor** | 4-Core x86_64 CPU (Intel 10th Gen+ / AMD Ryzen 3000+) | 8-Core CPU (Intel 12th Gen+ / AMD Ryzen 5000+) |
| **Memory (RAM)** | 8 GB System RAM | 16 GB or 32 GB High-Speed RAM |
| **Graphics (GPU)** | Integrated Intel Iris Xe / AMD Radeon | NVIDIA RTX 3060+ (6 GB+ VRAM) or equivalent |
| **Disk Storage** | 25 GB free disk space (SSD) | 40 GB free disk space (NVMe SSD) |

See the complete [Hardware Compatibility Guide](docs/hardware.md) for full benchmarks.

---

## 🚀 Quick Start & Installation

1. **Download:** Grab the latest official installer from [Releases](https://github.com/Aktnyl/Hijin-AI/releases) or the [Hijin Website](https://aktnyl.github.io/Hijin-AI/download.html).
2. **Install:** Run `Hijin_Setup_1.0.0.exe` (6.58 MB).
3. **Launch:** Open Hijin from your desktop or start menu.
4. **Provision Models:** The in-app Model Hub streams the verified ~12 GB Dual-Core Pack.
5. **Activate:** Start your complimentary 14-day full-feature trial directly inside the app.

---

## 🛡️ Privacy Guarantee & Security

Financial data sensitivity demands strict technical guarantees. Hijin adheres to four non-negotiable principles:
1. **Zero External Data Transmission:** No customer files, ledgers, or completions are sent to any external server or telemetry service.
2. **Recognition Account Model:** Account registration stores only your email and cryptographic license state. No documents are ever uploaded.
3. **Cryptographic Licensing:** License entitlements are signed using asymmetric Ed25519 cryptography, permitting full offline operation for up to 30 days without network check-ins.

Read our complete [Privacy Architecture Specification](docs/privacy.md).

---

## 💬 Community, Reviews & Support

* **User Reviews & Benchmarks:** Share your experience in [GitHub Discussions: Reviews](https://github.com/Aktnyl/Hijin-AI/discussions/categories/user-reviews-experiences).
* **Feature Requests:** Suggest accounting formats or ERP export connectors in [GitHub Discussions: Feature Requests](https://github.com/Aktnyl/Hijin-AI/discussions/categories/feature-requests).
* **Bug Reports:** Report technical issues using our structured [Issue Template](https://github.com/Aktnyl/Hijin-AI/issues/new/choose).
* **Q&A & Troubleshooting:** Consult our [Troubleshooting Guide](docs/troubleshooting.md) or ask in [Discussions](https://github.com/Aktnyl/Hijin-AI/discussions).

---

## 📜 Legal & Licensing Notices

* **Hijin Workstation Application:** Copyright © 2026 Hijin Tech / Hanging Clock. Distributed under the [Hijin Commercial License](LICENSE).
* **Gemma 3 Model Component:** Gemma is provided by Google LLC under the [Gemma Terms of Use](https://ai.google.dev/gemma/terms). See [GEMMA_NOTICE.txt](distribution/notices/GEMMA_NOTICE.txt).
* **Third-Party Open Source Components:** See [Third-Party Notices](docs/third-party/README.md).
