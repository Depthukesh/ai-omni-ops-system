const fs = require("node:fs");
const path = require("node:path");

function resolveWindowsSystemExecutable(relativeSegments, fallbackExecutableName, env = process.env) {
  const systemRoot = String(env.SystemRoot || "").trim();
  if (systemRoot) {
    const absolutePath = path.join(systemRoot, ...relativeSegments);
    if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }
  }
  return fallbackExecutableName;
}

function resolvePowerShellExecutable(env = process.env) {
  const windowsPowerShell = resolveWindowsSystemExecutable(
    ["System32", "WindowsPowerShell", "v1.0", "powershell.exe"],
    "powershell.exe",
    env,
  );
  if (windowsPowerShell !== "powershell.exe") {
    return windowsPowerShell;
  }

  const programFiles = String(env.ProgramFiles || "").trim();
  if (programFiles) {
    const pwshPath = path.join(programFiles, "PowerShell", "7", "pwsh.exe");
    if (fs.existsSync(pwshPath)) {
      return pwshPath;
    }
  }

  return windowsPowerShell;
}

function resolveCmdExecutable(env = process.env) {
  return resolveWindowsSystemExecutable(["System32", "cmd.exe"], "cmd.exe", env);
}

function resolveTaskkillExecutable(env = process.env) {
  return resolveWindowsSystemExecutable(["System32", "taskkill.exe"], "taskkill", env);
}

module.exports = {
  resolveCmdExecutable,
  resolvePowerShellExecutable,
  resolveTaskkillExecutable,
};
