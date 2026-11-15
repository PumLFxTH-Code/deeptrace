use serde::Serialize;
use std::net::{SocketAddr, TcpStream};
use std::path::Path;
use std::process::Command;
use std::time::Duration;

#[derive(Serialize)]
pub struct WorkspaceEntry {
    pub name: String,
    pub is_dir: bool,
}

#[derive(Serialize)]
pub struct WorkspaceInfo {
    pub root: String,
    pub entries: Vec<WorkspaceEntry>,
}

#[derive(Serialize)]
pub struct CliCommandResult {
    pub program: String,
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
}

#[derive(Serialize)]
pub struct BackendStatus {
    pub host: String,
    pub port: u16,
    pub reachable: bool,
}

#[tauri::command]
fn get_workspace_info(workspace_path: Option<String>) -> Result<WorkspaceInfo, String> {
    let root_path = match workspace_path {
        Some(path) if !path.trim().is_empty() => path,
        _ => std::env::current_dir()
            .map_err(|e| format!("Failed to read current directory: {e}"))?
            .to_string_lossy()
            .to_string(),
    };

    let mut entries = Vec::new();
    let dir = std::fs::read_dir(Path::new(&root_path))
        .map_err(|e| format!("Failed to inspect workspace '{root_path}': {e}"))?;

    for item in dir.flatten() {
        let name = item.file_name().to_string_lossy().to_string();
        let is_dir = item.file_type().map(|t| t.is_dir()).unwrap_or(false);
        entries.push(WorkspaceEntry { name, is_dir });
    }

    entries.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then_with(|| a.name.cmp(&b.name)));

    Ok(WorkspaceInfo {
        root: root_path,
        entries,
    })
}

#[tauri::command]
fn run_cli_command(program: String, args: Vec<String>) -> Result<CliCommandResult, String> {
    let allowed = ["adb", "frida", "frida-ps", "jadx", "python"];
    if !allowed.contains(&program.as_str()) {
        return Err(format!(
            "Program '{program}' is not in the RE tool allowlist ({})",
            allowed.join(", ")
        ));
    }

    let output = Command::new(&program)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to spawn '{program}': {e}"))?;

    Ok(CliCommandResult {
        program,
        exit_code: output.status.code().unwrap_or(-1),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

#[tauri::command]
fn check_backend_status(host: Option<String>, port: Option<u16>) -> BackendStatus {
    let target_host = host.unwrap_or_else(|| "127.0.0.1".to_string());
    let target_port = port.unwrap_or(8765);
    let addr_str = format!("{target_host}:{target_port}");

    let reachable = addr_str
        .parse::<SocketAddr>()
        .ok()
        .and_then(|addr| TcpStream::connect_timeout(&addr, Duration::from_millis(400)).ok())
        .is_some();

    BackendStatus {
        host: target_host,
        port: target_port,
        reachable,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_workspace_info,
            run_cli_command,
            check_backend_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running DeepTrace Tauri application");
}
