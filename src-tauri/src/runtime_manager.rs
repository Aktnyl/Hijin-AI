use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use std::time::Duration;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Clone, serde::Serialize)]
pub struct RuntimeStatusInfo {
    pub is_ready: bool,
    pub port: u16,
    pub message: String,
}

pub struct RuntimeManager {
    port: u16,
    child: Arc<Mutex<Option<Child>>>,
}

impl RuntimeManager {
    pub fn new(port: u16) -> Self {
        Self {
            port,
            child: Arc::new(Mutex::new(None)),
        }
    }

    /// Checks if the daemon is currently responding to TCP / HTTP probes on localhost.
    pub fn is_healthy(&self) -> bool {
        let addr = SocketAddr::from(([127, 0, 0, 1], self.port));
        if let Ok(mut stream) = TcpStream::connect_timeout(&addr, Duration::from_millis(500)) {
            let _ = stream.set_read_timeout(Some(Duration::from_millis(800)));
            let _ = stream.set_write_timeout(Some(Duration::from_millis(800)));
            let request = format!(
                "GET /api/health HTTP/1.1\r\nHost: 127.0.0.1:{}\r\nConnection: close\r\n\r\n",
                self.port
            );
            if stream.write_all(request.as_bytes()).is_ok() {
                let mut buf = [0u8; 256];
                if let Ok(n) = stream.read(&mut buf) {
                    let response = String::from_utf8_lossy(&buf[..n]);
                    return response.contains("200 OK") || response.contains("HEALTHY");
                }
            }
        }
        false
    }

    /// Finds the python interpreter or bundled sidecar.
    fn resolve_runtime_executable() -> Option<(PathBuf, Vec<String>)> {
        // 1. Check for bundled sidecar in the current exe dir or resources
        if let Ok(current_exe) = std::env::current_exe() {
            if let Some(exe_dir) = current_exe.parent() {
                let sidecar = exe_dir.join("hijin_daemon.exe");
                if sidecar.exists() {
                    return Some((sidecar, vec![]));
                }
            }
        }

        // 2. Development fallback: locate scripts/desktop_daemon.py
        let candidates = [
            Path::new("scripts/desktop_daemon.py").to_path_buf(),
            Path::new("../scripts/desktop_daemon.py").to_path_buf(),
            PathBuf::from(r"c:\Agent_Alpha\scripts\desktop_daemon.py"),
        ];

        for script in &candidates {
            if script.exists() {
                // Determine python executable
                let python_cmds = if cfg!(target_os = "windows") {
                    vec!["python", "py", "python3"]
                } else {
                    vec!["python3", "python"]
                };

                for py in python_cmds {
                    let mut probe = Command::new(py);
                    probe.arg("--version");
                    #[cfg(target_os = "windows")]
                    probe.creation_flags(CREATE_NO_WINDOW);

                    if probe.output().is_ok() {
                        return Some((
                            PathBuf::from(py),
                            vec![script.to_string_lossy().to_string()],
                        ));
                    }
                }
            }
        }

        None
    }

    /// Spawns the local daemon silently if not already running.
    pub fn start_daemon(&self) -> Result<(), String> {
        if self.is_healthy() {
            println!("[RuntimeManager] Hijin daemon already healthy on port {}", self.port);
            return Ok(());
        }

        let (exe, args) = match Self::resolve_runtime_executable() {
            Some(res) => res,
            None => {
                return Err("Failed to resolve Python interpreter or Hijin daemon executable".into());
            }
        };

        println!(
            "[RuntimeManager] Spawning daemon: {:?} with args {:?}",
            exe, args
        );

        let mut cmd = Command::new(&exe);
        for arg in args {
            cmd.arg(arg);
        }
        cmd.arg("127.0.0.1");
        cmd.arg(self.port.to_string());

        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);

        match cmd.spawn() {
            Ok(child) => {
                let mut lock = self.child.lock().unwrap();
                *lock = Some(child);
                println!("[RuntimeManager] Daemon spawned successfully.");
                Ok(())
            }
            Err(e) => Err(format!("Failed to spawn daemon: {}", e)),
        }
    }

    /// Sends a graceful loopback shutdown request and ensures child process termination.
    pub fn stop_daemon(&self) {
        println!("[RuntimeManager] Stopping Hijin runtime...");

        // 1. Send graceful shutdown request via loopback HTTP POST
        let addr = SocketAddr::from(([127, 0, 0, 1], self.port));
        if let Ok(mut stream) = TcpStream::connect_timeout(&addr, Duration::from_millis(500)) {
            let _ = stream.set_write_timeout(Some(Duration::from_millis(500)));
            let req = format!(
                "POST /api/shutdown HTTP/1.1\r\nHost: 127.0.0.1:{}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
                self.port
            );
            let _ = stream.write_all(req.as_bytes());
        }

        // 2. Wait up to 1.5s for graceful child exit
        std::thread::sleep(Duration::from_millis(500));

        let mut lock = self.child.lock().unwrap();
        if let Some(mut child) = lock.take() {
            for _ in 0..10 {
                match child.try_wait() {
                    Ok(Some(status)) => {
                        println!("[RuntimeManager] Child daemon exited cleanly with status: {:?}", status);
                        return;
                    }
                    Ok(None) => {
                        std::thread::sleep(Duration::from_millis(100));
                    }
                    Err(_) => break,
                }
            }
            // If still running after wait, forcibly terminate to prevent orphan
            println!("[RuntimeManager] Child daemon did not exit within timeout, killing process.");
            let _ = child.kill();
        }
    }

    pub fn get_status_info(&self) -> RuntimeStatusInfo {
        let ready = self.is_healthy();
        RuntimeStatusInfo {
            is_ready: ready,
            port: self.port,
            message: if ready {
                "Hijin local runtime is ready and verified".into()
            } else {
                "Hijin local runtime is initializing or offline".into()
            },
        }
    }
}
