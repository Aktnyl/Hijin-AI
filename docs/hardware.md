# Hardware Compatibility Guide

Hijin is an edge-native application. All neural inference runs directly on your machine's CPU, GPU, or NPU.

## Minimum vs Recommended Specs

| Component | Minimum Specification | Recommended Specification |
| :--- | :--- | :--- |
| **Processor** | 4-Core x86_64 CPU (Intel 10th Gen+ / AMD Ryzen 3000+) | 8-Core CPU (Intel 12th Gen+ / AMD Ryzen 5000+) |
| **Memory (RAM)** | 8 GB System RAM | 16 GB or 32 GB High-Speed RAM |
| **Graphics (GPU)** | Integrated Intel Iris Xe / AMD Radeon Graphics | Dedicated NVIDIA RTX 3060+ (6 GB+ VRAM) or Apple M-series |
| **Disk Storage** | 25 GB available space (Standard SSD) | 40 GB available space (NVMe SSD) |
| **Operating System**| Windows 10 64-bit (20H2+) | Windows 11 64-bit (Latest Build) |

## Performance Notes
* **With 8 GB RAM:** Gemma 3 and the Specialist model run sequentially via CPU offloading. Tokens stream at ~8-14 tokens/sec.
* **With 16 GB+ RAM / Dedicated GPU:** Both models stay resident in VRAM/RAM simultaneously. Tokens stream at 25-45+ tokens/sec.
