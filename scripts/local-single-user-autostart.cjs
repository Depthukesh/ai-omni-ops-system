const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const projectRoot = fs.realpathSync.native(path.resolve(__dirname, ".."));
const helperScriptPath = path.join(projectRoot, "scripts", "local-single-user-autostart.ps1");
const taskName = "AiOmniOps Local Single User";
const startupDir = process.env.APPDATA
  ? path.join(process.env.APPDATA, "Microsoft", "Windows", "Start Menu", "Programs", "Startup")
  : "";
const startupCmdPath = startupDir ? path.join(startupDir, "AiOmniOps Local Single User.cmd") : "";
const powershellExe = process.env.SystemRoot
  ? path.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
  : "powershell.exe";

function assertWindows() {
  if (process.platform !== "win32") {
    throw new Error("local-single-user autostart helpers are only supported on Windows.");
  }
}

function assertHelperExists() {
  if (!fs.existsSync(helperScriptPath)) {
    throw new Error(`Autostart helper script not found: ${helperScriptPath}`);
  }
}

function buildTaskActionArgs() {
  return `-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "${helperScriptPath}"`;
}

function buildStartupCommand() {
  return `@"${powershellExe}" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "${helperScriptPath}"`;
}

function runPowerShellScript(script, options = {}) {
  const result = spawnSync(powershellExe, [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    script,
  ], {
    cwd: projectRoot,
    windowsHide: true,
    encoding: "utf8",
  });
  if (result.error) {
    throw result.error;
  }
  const allowedExitCodes = options.allowedExitCodes || [0];
  if (!allowedExitCodes.includes(result.status)) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(detail || `powershell exited with code ${result.status}`);
  }
  return result;
}

function installTask() {
  assertWindows();
  assertHelperExists();
  const script = `
$taskName = '${taskName.replace(/'/g, "''")}'
$action = New-ScheduledTaskAction -Execute '${powershellExe.replace(/'/g, "''")}' -Argument '${buildTaskActionArgs().replace(/'/g, "''")}'
$trigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -RunLevel Limited -Force | Out-Null
`;
  runPowerShellScript(script);
  console.log(`Installed scheduled task: ${taskName}`);
  console.log(`Action: "${powershellExe}" ${buildTaskActionArgs()}`);
}

function ensureStartupDir() {
  if (!startupDir || !startupCmdPath) {
    throw new Error("APPDATA is unavailable; cannot resolve Windows Startup folder.");
  }
  fs.mkdirSync(startupDir, { recursive: true });
}

function installStartupShortcut() {
  assertWindows();
  assertHelperExists();
  ensureStartupDir();
  const content = [
    "@echo off",
    buildStartupCommand(),
    "",
  ].join("\r\n");
  fs.writeFileSync(startupCmdPath, content, "utf8");
  console.log(`Installed startup shortcut: ${startupCmdPath}`);
}

function removeStartupShortcut() {
  if (startupCmdPath && fs.existsSync(startupCmdPath)) {
    fs.unlinkSync(startupCmdPath);
    console.log(`Removed startup shortcut: ${startupCmdPath}`);
    return true;
  }
  return false;
}

function hasPermissionDenied(detail) {
  const normalized = String(detail || "").toLowerCase();
  return normalized.includes("permissiondenied")
    || normalized.includes("0x80070005")
    || normalized.includes("拒绝访问");
}

function removeTask() {
  assertWindows();
  const script = `
$task = Get-ScheduledTask -TaskName '${taskName.replace(/'/g, "''")}' -ErrorAction SilentlyContinue
if ($null -eq $task) {
  exit 3
}
Unregister-ScheduledTask -TaskName '${taskName.replace(/'/g, "''")}' -Confirm:$false
`;
  const result = runPowerShellScript(script, { allowedExitCodes: [0, 3] });
  if (result.status === 3) {
    const removedStartup = removeStartupShortcut();
    if (!removedStartup) {
      console.log(`Scheduled task not installed: ${taskName}`);
    }
    return;
  }
  console.log(`Removed scheduled task: ${taskName}`);
  removeStartupShortcut();
}

function showStatus() {
  assertWindows();
  const script = `
$task = Get-ScheduledTask -TaskName '${taskName.replace(/'/g, "''")}' -ErrorAction SilentlyContinue
if ($null -eq $task) {
  exit 3
}
$task | Select-Object TaskName, State, Author, Description | Format-List
"Action:"
$task.Actions | Select-Object Execute, Arguments | Format-List
"Trigger:"
$task.Triggers | Format-List
`;
  const result = runPowerShellScript(script, { allowedExitCodes: [0, 3] });
  if (result.status === 3) {
    if (startupCmdPath && fs.existsSync(startupCmdPath)) {
      console.log(`Startup shortcut installed: ${startupCmdPath}`);
      return;
    }
    console.log(`Scheduled task not installed: ${taskName}`);
    return;
  }
  process.stdout.write(result.stdout || "");
}

function printUsage() {
  console.log("Usage: node scripts/local-single-user-autostart.cjs <install|remove|status>");
}

function main() {
  const action = String(process.argv[2] || "").trim().toLowerCase();
  if (!action || action === "help" || action === "--help" || action === "-h") {
    printUsage();
    return;
  }
  if (action === "install") {
    try {
      installTask();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      if (!hasPermissionDenied(detail)) {
        throw error;
      }
      console.warn("Scheduled task install denied; falling back to current-user Startup shortcut.");
      installStartupShortcut();
    }
    return;
  }
  if (action === "remove" || action === "uninstall") {
    removeTask();
    return;
  }
  if (action === "status") {
    showStatus();
    return;
  }
  printUsage();
  process.exitCode = 1;
}

main();
