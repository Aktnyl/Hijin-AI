# Hijin Desktop Application — Build & Packaging Guide

This guide outlines how to build, run, and package the **Hijin Local Cognitive AI Workstation** desktop application from source.

---

## 🏗️ Architecture Overview

The Hijin desktop application is architected around a high-performance, low-memory native runtime:

```
┌────────────────────────────────────────────────────────┐
│               Hijin Frontend UI (React 18)             │
│  - Vite + TypeScript + Tailwind CSS                    │
│  - Luxury Obsidian & Slate design system               │
│  - Composer Dock, Slide Studio & Artifact Viewer       │
└──────────────────────────┬─────────────────────────────┘
                           │ IPC Bridge (invoke / listen)
┌──────────────────────────▼─────────────────────────────┐
│             Native Desktop Engine (Tauri 2 / Rust)     │
│  - System window controls & OS notifications           │
│  - Hardware-accelerated WebView2 container (~118MB RSS)│
│  - Embedded SQLite FTS5 search engine                  │
│  - Local loopback supervisor daemon bridge             │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│            Operating System (Windows 10 / 11 x64)      │
│  - Direct File Explorer integration (Open / Reveal)    │
│  - Local CUDA / GPU detection                          │
└────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites

To build Hijin locally on **Windows 10 / 11 (64-bit)**:

1. **Node.js**:
   * Version: Node.js 18+ (Node.js 20 or 22 LTS recommended)
   * Verify:
     ```bash
     node --version
     npm --version
     ```

2. **Rust & Cargo**:
   * Install via [rustup.rs](https://rustup.rs/):
     ```bash
     curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
     ```
   * Default host target: `x86_64-pc-windows-msvc`
   * Verify:
     ```bash
     rustc --version
     cargo --version
     ```

3. **Microsoft C++ Build Tools**:
   * Required by Rust on Windows: [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
   * Select **"Desktop development with C++"** during installation.

4. **WebView2**:
   * Pre-installed on Windows 10 (recent updates) and Windows 11.

---

## 🚀 Development Workflow

### 1. Install Node Dependencies

From the repository root:
```bash
npm install
```

### 2. Run Web Frontend in Browser (Fast Iteration)

To develop UI components with Hot Module Replacement (HMR):
```bash
npm run dev
```
Access the application at `http://127.0.0.1:1420`.

### 3. Run Native Desktop Application in Development Mode

To launch the full native desktop window with Rust IPC bridges active:
```bash
npm run tauri:dev
```
* Compiles the Rust backend in debug mode.
* Launches the native desktop window connected to Vite's local dev server.

---

## 📦 Production Builds & Packaging

### 1. Compile Frontend Assets
```bash
npm run build
```
Builds optimized production assets into `dist/`.

### 2. Compile Native Windows Installer (`.exe` / `.msi`)
```bash
npm run tauri build
```

This compiles:
1. **Rust Binary**: Optimized release binary `hijin.exe`.
2. **NSIS Installer**: 
   * Path: `src-tauri/target/release/bundle/nsis/Hijin_1.0.0_x64-setup.exe`
3. **MSI Installer**:
   * Path: `src-tauri/target/release/bundle/msi/Hijin_1.0.0_x64_en-US.msi`

The compiled installer is lightweight (~6.58 MB), bundling the native application shell, desktop icons, embedded search indexes, and Model Hub bootstrapper.

---

## ⚙️ Configuration Reference

The desktop application build configuration is defined in [`src-tauri/tauri.conf.json`](file:///c:/Agent_Alpha/src-tauri/tauri.conf.json):

* **Product Name**: `Hijin`
* **Version**: `1.0.0`
* **Bundle Identifier**: `com.hijintech.hijin`
* **Window Specifications**: 1280x850 (resizable, minimum 900x600)
* **Packaging Targets**: NSIS (`.exe`) and MSI (`.msi`)
* **Content Security Policy (CSP)**: Strict loopback and authorized Cloudflare/Firebase endpoints only.

---

## 🧪 Testing Frontend & IPC

To run unit and component tests:
```bash
npm test
```

To run type checking:
```bash
npx tsc --noEmit
```
