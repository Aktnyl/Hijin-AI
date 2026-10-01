# Troubleshooting & FAQ

## 1. Windows SmartScreen Alert on Install
**Symptom:** Windows displays "Windows protected your PC".  
**Resolution:** This occurs because the initial v1.0.0 installer is newly released and does not yet have Microsoft SmartScreen reputation. Click **More info** ➔ **Run anyway**. You can verify the installer's integrity by comparing its SHA-256 hash against `distribution/checksums/SHA256SUMS.txt`.

## 2. In-App Model Download Pauses or Fails
**Symptom:** The progress bar pauses at a percentage during initial model streaming.  
**Resolution:** The downloader supports chunked HTTP resume. Simply click "Retry Download" in the Model Hub. It will automatically continue from the exact byte where it paused.

## 3. High RAM Usage
**Symptom:** Task Manager reports 6-8 GB RAM utilized by `hijin_daemon.exe`.  
**Resolution:** This is expected. The GGUF models are loaded into RAM to ensure fast local response times. If your machine has 8 GB total RAM, Hijin automatically unloads inactive models from memory when idle.
