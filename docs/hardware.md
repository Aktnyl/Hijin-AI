# Hardware Requirements & Compatibility

Hijin is an edge-native desktop application. All neural inference runs directly on your workstation's local hardware (CPU, GPU, or NPU).

## Validated & Recommended Specifications

| Component | Minimum Specification | Recommended Specification |
| :--- | :--- | :--- |
| **Operating System** | Windows 10 64-bit (1903+) | Windows 11 Pro 64-bit (23H2+) |
| **Processor** | 64-bit x86_64 Dual-Core CPU | 64-bit Multi-Core Processor |
| **System Memory (RAM)** | 8 GB System RAM | 16 GB or 32 GB RAM |
| **Graphics (GPU)** | Integrated Graphics (CPU fallback) | Dedicated NVIDIA GPU with CUDA support (6 GB+ VRAM) |
| **Disk Storage** | 15 GB available disk space | 25 GB+ available space (NVMe SSD recommended for models) |

## Operational Modes

* **Standard Memory (8 GB RAM):** Models execute sequentially with CPU multi-threaded offloading. Suitable for batch document processing.
* **Dedicated GPU / High Memory (16 GB+ RAM / Dedicated VRAM):** Models remain resident in memory for low-latency interactive reconciliation and real-time document analysis.
