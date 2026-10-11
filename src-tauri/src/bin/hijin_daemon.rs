// Native Windows Background Sidecar Daemon for Hijin Workstation.
// Compiled in Rust to guarantee zero terminal windows, watchdog supervision, and clean lifecycle.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

fn is_health_ok(port: u16) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    if let Ok(mut stream) = TcpStream::connect_timeout(&addr, Duration::from_millis(400)) {
        let _ = stream.set_read_timeout(Some(Duration::from_millis(600)));
        let _ = stream.set_write_timeout(Some(Duration::from_millis(600)));
        let req = format!(
            "GET /api/health HTTP/1.1\r\nHost: 127.0.0.1:{}\r\nConnection: close\r\n\r\n",
            port
        );
        if stream.write_all(req.as_bytes()).is_ok() {
            let mut buf = [0u8; 512];
            if let Ok(n) = stream.read(&mut buf) {
                let resp = String::from_utf8_lossy(&buf[..n]);
                return resp.contains("200 OK") && resp.contains("HEALTHY");
            }
        }
    }
    false
}

fn find_runtime_python(app_dir: &Path) -> Option<PathBuf> {
    // 1. Embedded python in runtime/ subdirectory
    let embedded = app_dir.join("runtime").join("python.exe");
    if embedded.exists() {
        return Some(embedded);
    }

    // 2. Local virtual environment in .venv
    let venv = app_dir.join(".venv").join("Scripts").join("python.exe");
    if venv.exists() {
        return Some(venv);
    }
    let parent_venv = app_dir.join("..").join(".venv").join("Scripts").join("python.exe");
    if parent_venv.exists() {
        return Some(parent_venv);
    }

    // 3. System python candidates
    let candidates = ["python", "py", "python3"];
    for candidate in &candidates {
        let mut cmd = Command::new(candidate);
        cmd.arg("--version");
        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);

        if cmd.output().is_ok() {
            return Some(PathBuf::from(candidate));
        }
    }

    None
}

fn find_daemon_script(app_dir: &Path) -> Option<PathBuf> {
    let candidates = [
        app_dir.join("scripts").join("desktop_daemon.py"),
        app_dir.join("desktop_daemon.py"),
        app_dir.join("..").join("scripts").join("desktop_daemon.py"),
        PathBuf::from(r"C:\Agent_Alpha\scripts\desktop_daemon.py"),
    ];

    for c in &candidates {
        if c.exists() {
            return Some(c.clone());
        }
    }
    None
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let host = if args.len() > 1 { args[1].clone() } else { "127.0.0.1".into() };
    let port: u16 = if args.len() > 2 {
        args[2].parse().unwrap_or(8765)
    } else {
        8765
    };

    // If daemon is already running and healthy, we are done
    if is_health_ok(port) {
        return;
    }

    let current_exe = env::current_exe().unwrap_or_else(|_| PathBuf::from("."));
    let app_dir = current_exe.parent().unwrap_or_else(|| Path::new("."));

    let python_exe = match find_runtime_python(app_dir) {
        Some(p) => p,
        None => {
            eprintln!("[HijinDaemon] Error: Python runtime executable not found.");
            return;
        }
    };

    let script = match find_daemon_script(app_dir) {
        Some(s) => s,
        None => {
            eprintln!("[HijinDaemon] Error: desktop_daemon.py script not found.");
            return;
        }
    };

    // Spawn Python daemon
    let mut cmd = Command::new(&python_exe);
    cmd.arg(&script);
    cmd.arg(&host);
    cmd.arg(port.to_string());

    // Working directory
    if let Some(proj_root) = script.parent().and_then(|p| p.parent()) {
        cmd.current_dir(proj_root);
        cmd.env("PYTHONPATH", proj_root);
    }
    cmd.env("HIJIN_PRODUCT_NAME", "Hijin");
    cmd.env("HIJIN_COMMERCIAL_MODE", "1");

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[HijinDaemon] Failed to spawn child process: {}", e);
            return;
        }
    };

    // Watchdog loop: probe for readiness
    let mut is_ready = false;
    for _ in 0..80 {
        std::thread::sleep(Duration::from_millis(500));
        if is_health_ok(port) {
            is_ready = true;
            break;
        }
        if let Ok(Some(status)) = child.try_wait() {
            eprintln!("[HijinDaemon] Daemon exited unexpectedly: {:?}", status);
            return;
        }
    }

    if !is_ready {
        eprintln!("[HijinDaemon] Timeout waiting for daemon health check.");
        return;
    }

    // Monitor child process until termination
    let _ = child.wait();
}
