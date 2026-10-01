# Third-Party Models & Licensing Disclosures

**Document Version:** 1.0.0  
**Effective Date:** October 1, 2026  
**Audience:** Public Licensing & Compliance Documentation  

Hijin uses a **Unified Dual-Core Neural Architecture** combining open foundational language models with proprietary domain-specific financial models. This document details the provenance, licensing, and attribution for all model components.

---

## 1. Component Model Inventory

| Attribute | Component 1: Conversation Core | Component 2: Financial Specialist | Component 3: Local Engine |
| :--- | :--- | :--- | :--- |
| **Model Name** | **Gemma 3 4B IT** | **Hijin Financial Specialist v1.0** | **llama.cpp / Local Runtime** |
| **Provider / Author** | Google DeepMind | Hijin Tech / Hijin Tech | Georgi Gerganov & Contributors |
| **Model Version** | Gemma 3 (4B Parameters, Instruction-Tuned) | 1.0.0 (Wave 3 Production Baseline) | Native Embedded Runtime |
| **File Format** | GGUF (Quantization: Q4_K_M) | GGUF (Quantization: Q4_K_M) | Native Executable / Dynamic Library |
| **Payload Size** | ~6.0 GB (6,442,450,944 bytes) | ~6.0 GB (6,442,450,944 bytes) | ~1.2 MB |
| **Source** | Google DeepMind / Hugging Face | Proprietary Fine-Tuning Pipeline | llama.cpp Open-Source Project |
| **License / Terms** | **Google Gemma Terms of Use** | **Hijin Proprietary Commercial License** | **MIT License** |
| **Classification** | Third-Party Model Component [E] | Proprietary Binary Artifact [C/F] | Third-Party Runtime [E] |
| **Redistribution Status** | Allowed with Attribution & Notice | Restricted to Authorized Hijin Workstations | Allowed under MIT Permissive License |
| **Modification Status** | 4-bit Quantization via llama.cpp | Fine-tuned domain weights | Compiled for Windows x64 |

---

## 2. Google Gemma Licensing & Attribution Compliance

Gemma is provided by Google LLC under the **Gemma Terms of Use**. Hijin Tech distributes the quantized weights of Gemma 3 4B IT in strict compliance with the following requirements:

1. **Non-Endorsement:** Gemma is a trademark of Google LLC. Hijin Tech is not affiliated with, endorsed by, or sponsored by Google.
2. **Attribution:** All distributions include the complete text of the Gemma notice in `distribution/notices/GEMMA_NOTICE.txt`.
3. **Responsible Use:** Users of Hijin must comply with the Google Responsible AI Use Policy when interacting with the conversational core.

---

## 3. Proprietary Hijin Financial Specialist Disclosure

The **Hijin Financial Specialist** model is proprietary intellectual property.

* **What is Distributed:** The final quantized GGUF binary weights required for local offline arithmetic and reconciliation inference.
* **What is Retained (Private):**
  * The proprietary financial training datasets and transaction corpora.
  * The synthetic math verification benchmarks.
  * The LoRA adaptation recipes and hyperparameters.
  * The private evaluation test harnesses.
* **Commercial Restrictions:** The Specialist model is licensed solely for execution within the Hijin desktop workstation. Reverse engineering, extraction of weights for competitive foundation model training, or unauthenticated extraction is prohibited.
