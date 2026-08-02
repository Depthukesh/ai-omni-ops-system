const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const childProcess = require("node:child_process");

function resolveDefaultLocalAppRoot(env = process.env) {
  if (process.platform === "win32" && env.APPDATA) {
    return path.resolve(env.APPDATA, "AiOmniOps");
  }
  if (process.platform === "darwin") {
    return path.resolve(os.homedir(), "Library", "Application Support", "AiOmniOps");
  }
  return path.resolve(os.homedir(), ".local", "share", "ai-omni-ops");
}

function resolveLauncherSettingsPath(env = process.env) {
  return path.join(resolveDefaultLocalAppRoot(env), "launcher-settings.json");
}

function readLauncherSettings(env = process.env) {
  const settingsPath = resolveLauncherSettingsPath(env);
  try {
    const parsed = JSON.parse(fs.readFileSync(settingsPath, "utf8").replace(/^\uFEFF/, ""));
    return {
      settingsPath,
      settings: {
        localAppDataRoot: typeof parsed.localAppDataRoot === "string" ? parsed.localAppDataRoot.trim() : "",
        pendingMigrationFrom: typeof parsed.pendingMigrationFrom === "string" ? parsed.pendingMigrationFrom.trim() : "",
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
      },
    };
  } catch {
    return {
      settingsPath,
      settings: {},
    };
  }
}

function writeLauncherSettings(nextSettings, env = process.env) {
  const settingsPath = resolveLauncherSettingsPath(env);
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, `${JSON.stringify(nextSettings, null, 2)}\n`, "utf8");
}

function migrateLocalRoot(sourceRoot, targetRoot) {
  if (!sourceRoot || !targetRoot || sourceRoot === targetRoot || !fs.existsSync(sourceRoot)) {
    return;
  }
  fs.mkdirSync(targetRoot, { recursive: true });

  if (process.platform === "win32") {
    const result = childProcess.spawnSync("robocopy", [sourceRoot, targetRoot, "/E", "/R:2", "/W:1", "/NFL", "/NDL", "/NJH", "/NJS", "/NP"], {
      stdio: "ignore",
      windowsHide: true,
    });
    const code = Number(result.status ?? 0);
    if (code > 7) {
      throw new Error(`robocopy 迁移失败，退出码 ${code}`);
    }
    return;
  }

  fs.cpSync(sourceRoot, targetRoot, { recursive: true, force: true });
}

function resolveEffectiveLocalRoot(env = process.env) {
  const defaultRoot = resolveDefaultLocalAppRoot(env);
  const { settings } = readLauncherSettings(env);
  const configuredRoot = settings.localAppDataRoot ? path.resolve(settings.localAppDataRoot) : defaultRoot;
  const pendingMigrationFrom = settings.pendingMigrationFrom ? path.resolve(settings.pendingMigrationFrom) : "";

  if (pendingMigrationFrom && pendingMigrationFrom !== configuredRoot) {
    try {
      migrateLocalRoot(pendingMigrationFrom, configuredRoot);
      writeLauncherSettings({
        localAppDataRoot: configuredRoot === defaultRoot ? "" : configuredRoot,
        pendingMigrationFrom: "",
        updatedAt: new Date().toISOString(),
      }, env);
    } catch {
      return pendingMigrationFrom;
    }
  }

  return configuredRoot;
}

if (require.main === module) {
  const command = process.argv[2] || "resolve-root";
  if (command === "resolve-root") {
    process.stdout.write(resolveEffectiveLocalRoot());
  } else if (command === "settings-path") {
    process.stdout.write(resolveLauncherSettingsPath());
  } else {
    process.stderr.write(`Unknown command: ${command}`);
    process.exit(1);
  }
}

module.exports = {
  readLauncherSettings,
  resolveDefaultLocalAppRoot,
  resolveEffectiveLocalRoot,
  resolveLauncherSettingsPath,
  writeLauncherSettings,
};
