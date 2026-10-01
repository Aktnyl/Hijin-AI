# Installation Guide for Windows 10/11 x64

Hijin is distributed as a lightweight 6.58 MB NSIS installer that sets up the native desktop workstation on your machine.

## Prerequisites
* **Operating System:** Windows 10 (64-bit, Build 19041 or higher) or Windows 11.
* **RAM:** Minimum 8 GB (16 GB recommended for concurrent multi-model inference).
* **Storage:** 25 GB free disk space (SSD recommended) for the ~12 GB Dual-Core Neural Pack and local database cache.

## Step-by-Step Installation
1. Download `Hijin_Setup_1.0.0.exe`.
2. Double-click to run. If Windows SmartScreen displays an alert ("Unknown Publisher"), click **More info** ➔ **Run anyway**.
3. Choose the destination folder (default: `%LOCALAPPDATA%\Hijin`).
4. The installer completes in approximately 5 seconds.
5. On initial launch, Hijin connects to the verified model resolver to stream the ~12 GB neural pack directly into `%LOCALAPPDATA%\Hijin\models\`.
