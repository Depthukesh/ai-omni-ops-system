import { execFile } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { BadRequestException, Injectable } from "@nestjs/common";
import { promisify } from "node:util";
import { AppConfigService } from "../../config/app-config.service";

type LauncherSettingsRecord = {
  localAppDataRoot?: string;
  pendingMigrationFrom?: string;
  materialLibraryBaseRoot?: string;
  updatedAt?: string;
};

export type LocalRuntimeSettingsPayload = {
  localAppDataRoot?: string | null;
  materialLibraryBaseRoot?: string | null;
};

const execFileAsync = promisify(execFile);

@Injectable()
export class LocalRuntimeService {
  constructor(private readonly appConfigService: AppConfigService) {}

  getSettings() {
    const runtimeMode = this.appConfigService.getRuntimeMode();
    const defaultLocalAppRoot = this.appConfigService.getDefaultLocalAppRoot();
    const currentLocalAppRoot = this.appConfigService.getLocalAppRoot();
    const settingsFilePath = this.appConfigService.getLocalLauncherSettingsPath();
    const settings = this.readLauncherSettings();
    const configuredLocalAppRoot = settings.localAppDataRoot || currentLocalAppRoot;
    const effectivePaths = this.appConfigService.getLocalPathsForRoot(configuredLocalAppRoot);
    const defaultMaterialLibraryBaseRoot = this.appConfigService.getDefaultMaterialLibraryBaseRoot();
    const configuredMaterialLibraryBaseRoot = settings.materialLibraryBaseRoot || defaultMaterialLibraryBaseRoot;
    const materialLibraryRoot = resolve(configuredMaterialLibraryBaseRoot, this.appConfigService.getLocalMaterialLibraryFolderName());
    const managedStorageRoot = this.appConfigService.getConfiguredLocalManagedStorageRoot();

    return {
      supported: runtimeMode === "local-single-user",
      runtimeMode,
      inviteCodeRequired: true,
      currentLocalAppRoot,
      configuredLocalAppRoot,
      defaultLocalAppRoot,
      settingsFilePath,
      pendingMigrationFrom: settings.pendingMigrationFrom || null,
      restartRequired: currentLocalAppRoot !== configuredLocalAppRoot || Boolean(settings.pendingMigrationFrom),
      materialLibrary: {
        folderName: this.appConfigService.getLocalMaterialLibraryFolderName(),
        currentBaseRoot: this.appConfigService.getConfiguredMaterialLibraryBaseRoot(),
        configuredBaseRoot: configuredMaterialLibraryBaseRoot,
        defaultBaseRoot: defaultMaterialLibraryBaseRoot,
        libraryRoot: materialLibraryRoot,
        managedStorageFolderName: this.appConfigService.getLocalManagedStorageFolderName(),
        managedStorageRoot,
        categoryDirectories: {
          text: this.appConfigService.getLocalMaterialLibraryCategoryRoot("text"),
          image: this.appConfigService.getLocalMaterialLibraryCategoryRoot("image"),
          audio: this.appConfigService.getLocalMaterialLibraryCategoryRoot("audio"),
          video: this.appConfigService.getLocalMaterialLibraryCategoryRoot("video"),
        },
        namingRules: [
          "素材库/文本/<brandId>/<YYYY>/<YYYY-MM>/<timestamp>-<title>.<ext>",
          "素材库/图片/<brandId>/<YYYY>/<YYYY-MM>/<timestamp>-<title>.<ext>",
          "素材库/语音/<brandId>/<YYYY>/<YYYY-MM>/<timestamp>-<title>.<ext>",
          "素材库/视频/<brandId>/<YYYY>/<YYYY-MM>/<timestamp>-<title>.<ext>",
        ],
        appliesImmediately: true,
      },
      paths: effectivePaths,
    };
  }

  updateSettings(payload: LocalRuntimeSettingsPayload) {
    if (!this.appConfigService.isLocalSingleUserMode()) {
      throw new BadRequestException("当前环境不是 local-single-user，本地资料目录设置仅在安装态可用。");
    }

    const currentLocalAppRoot = this.appConfigService.getLocalAppRoot();
    const defaultLocalAppRoot = this.appConfigService.getDefaultLocalAppRoot();
    const defaultMaterialLibraryBaseRoot = this.appConfigService.getDefaultMaterialLibraryBaseRoot();
    const settingsFilePath = this.appConfigService.getLocalLauncherSettingsPath();
    const currentSettings = this.readLauncherSettings();
    const hasLocalAppDataRoot = Object.prototype.hasOwnProperty.call(payload, "localAppDataRoot");
    const hasMaterialLibraryBaseRoot = Object.prototype.hasOwnProperty.call(payload, "materialLibraryBaseRoot");
    const requestedRoot = typeof payload.localAppDataRoot === "string" ? payload.localAppDataRoot.trim() : "";
    const requestedMaterialLibraryBaseRoot = typeof payload.materialLibraryBaseRoot === "string" ? payload.materialLibraryBaseRoot.trim() : "";
    const currentMaterialLibraryBaseRoot = currentSettings.materialLibraryBaseRoot || defaultMaterialLibraryBaseRoot;
    const nextLocalAppRoot = hasLocalAppDataRoot
      ? (requestedRoot ? this.normalizeRootPath(requestedRoot) : defaultLocalAppRoot)
      : (currentSettings.localAppDataRoot || currentLocalAppRoot);
    const nextMaterialLibraryBaseRoot = hasMaterialLibraryBaseRoot
      ? (requestedMaterialLibraryBaseRoot ? this.normalizeRootPath(requestedMaterialLibraryBaseRoot) : defaultMaterialLibraryBaseRoot)
      : currentMaterialLibraryBaseRoot;

    if (!isAbsolute(nextLocalAppRoot)) {
      throw new BadRequestException("资料目录必须使用绝对路径。");
    }
    if (!isAbsolute(nextMaterialLibraryBaseRoot)) {
      throw new BadRequestException("本地存储目录必须使用绝对路径。");
    }
    const installRoot = resolve(process.cwd(), "..");
    if (nextLocalAppRoot === installRoot || nextLocalAppRoot.startsWith(`${installRoot}\\`) || nextLocalAppRoot.startsWith(`${installRoot}/`)) {
      throw new BadRequestException("资料目录不能直接设置到程序安装目录内，请选择独立的数据文件夹。");
    }
    if (
      nextMaterialLibraryBaseRoot === installRoot
      || nextMaterialLibraryBaseRoot.startsWith(`${installRoot}\\`)
      || nextMaterialLibraryBaseRoot.startsWith(`${installRoot}/`)
    ) {
      throw new BadRequestException("本地存储目录不能直接设置到程序安装目录内，请选择独立的数据文件夹。");
    }

    const pendingMigrationFrom = nextLocalAppRoot !== currentLocalAppRoot
      ? currentLocalAppRoot
      : currentSettings.pendingMigrationFrom || "";

    const nextSettings: LauncherSettingsRecord = {
      localAppDataRoot: nextLocalAppRoot === defaultLocalAppRoot ? "" : nextLocalAppRoot,
      pendingMigrationFrom: pendingMigrationFrom && pendingMigrationFrom !== nextLocalAppRoot ? pendingMigrationFrom : "",
      materialLibraryBaseRoot: nextMaterialLibraryBaseRoot === defaultMaterialLibraryBaseRoot ? "" : nextMaterialLibraryBaseRoot,
      updatedAt: new Date().toISOString(),
    };

    const localAppRootChanged = nextLocalAppRoot !== currentLocalAppRoot;
    const materialLibraryChanged = nextMaterialLibraryBaseRoot !== currentMaterialLibraryBaseRoot;

    this.writeLauncherSettings(nextSettings);
    this.ensureMaterialLibraryScaffold(nextMaterialLibraryBaseRoot);
    this.ensureManagedStorageScaffold(nextMaterialLibraryBaseRoot);
    const migratedManagedStorage = this.migrateManagedStorage(nextMaterialLibraryBaseRoot, currentMaterialLibraryBaseRoot);

    return {
      success: true,
      message: localAppRootChanged
        ? "本地资料目录配置已保存。下次重启本地工作台时会迁移并切换到新目录；本地受控存储目录已立即更新到新的设置。"
        : materialLibraryChanged
          ? migratedManagedStorage
            ? "本地存储目录已保存并立即生效，素材库与站内生成内容都会写入新的目录，历史本地受控文件也已同步迁移。"
            : "本地存储目录已保存并立即生效，素材库与站内生成内容都会写入新的目录。"
          : migratedManagedStorage
            ? "本地存储目录已确认，历史本地受控文件也已同步迁移到当前目录。"
            : "本地资料目录配置已保存，当前运行时无需切换。",
      ...this.getSettings(),
      settingsFilePath,
    };
  }

  async pickMaterialLibraryBaseRoot() {
    if (!this.appConfigService.isLocalSingleUserMode()) {
      throw new BadRequestException("当前环境不是 local-single-user，素材存储目录选择仅在安装态可用。");
    }
    if (process.platform !== "win32") {
      throw new BadRequestException("当前目录选择器仅在 Windows 安装态提供，请手动填写绝对路径。");
    }

    const initialPath = this.appConfigService.getConfiguredMaterialLibraryBaseRoot();
    const script = `
Add-Type -AssemblyName System.Windows.Forms
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = '选择本地存储目录'
$dialog.ShowNewFolderButton = $true
if (Test-Path '${this.escapePowerShellSingleQuotedString(initialPath)}') { $dialog.SelectedPath = '${this.escapePowerShellSingleQuotedString(initialPath)}' }
$result = $dialog.ShowDialog()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
  Write-Output $dialog.SelectedPath
}
`;
    const result = await execFileAsync("powershell.exe", ["-NoProfile", "-STA", "-Command", script], {
      encoding: "utf8",
      windowsHide: false,
      maxBuffer: 1024 * 1024,
    });
    const selectedPath = this.normalizeRootPath(String(result.stdout || "").trim());
    const canceled = !selectedPath;
    return {
      canceled,
      selectedPath,
      libraryRoot: selectedPath ? resolve(selectedPath, this.appConfigService.getLocalMaterialLibraryFolderName()) : "",
    };
  }

  private readLauncherSettings(): LauncherSettingsRecord {
    const settingsFilePath = this.appConfigService.getLocalLauncherSettingsPath();
    try {
      const content = readFileSync(settingsFilePath, "utf8").replace(/^\uFEFF/, "");
      if (!content.trim()) {
        return {};
      }
      const parsed = JSON.parse(content) as LauncherSettingsRecord;
      return {
        localAppDataRoot: typeof parsed.localAppDataRoot === "string" ? parsed.localAppDataRoot.trim() : "",
        pendingMigrationFrom: typeof parsed.pendingMigrationFrom === "string" ? parsed.pendingMigrationFrom.trim() : "",
        materialLibraryBaseRoot: typeof parsed.materialLibraryBaseRoot === "string" ? parsed.materialLibraryBaseRoot.trim() : "",
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
      };
    } catch {
      return {};
    }
  }

  private writeLauncherSettings(settings: LauncherSettingsRecord) {
    const settingsFilePath = this.appConfigService.getLocalLauncherSettingsPath();
    mkdirSync(this.appConfigService.getDefaultLocalAppRoot(), { recursive: true });
    writeFileSync(settingsFilePath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  }

  private ensureMaterialLibraryScaffold(baseRoot: string) {
    const libraryRoot = resolve(baseRoot, this.appConfigService.getLocalMaterialLibraryFolderName());
    mkdirSync(libraryRoot, { recursive: true });
    mkdirSync(resolve(libraryRoot, "文本"), { recursive: true });
    mkdirSync(resolve(libraryRoot, "图片"), { recursive: true });
    mkdirSync(resolve(libraryRoot, "语音"), { recursive: true });
    mkdirSync(resolve(libraryRoot, "视频"), { recursive: true });
  }

  private ensureManagedStorageScaffold(baseRoot: string) {
    mkdirSync(resolve(baseRoot, this.appConfigService.getLocalManagedStorageFolderName()), { recursive: true });
  }

  private migrateManagedStorage(nextBaseRoot: string, previousBaseRoot: string) {
    const targetRoot = resolve(nextBaseRoot, this.appConfigService.getLocalManagedStorageFolderName());
    const currentManagedRoot = resolve(previousBaseRoot, this.appConfigService.getLocalManagedStorageFolderName());
    const legacyManagedRoot = resolve(this.appConfigService.getLocalStorageRoot(), "oss");
    const sourceRoots = [currentManagedRoot, legacyManagedRoot].filter(
      (item, index, array) => array.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index,
    );

    let migrated = false;
    for (const sourceRoot of sourceRoots) {
      if (sourceRoot.toLowerCase() === targetRoot.toLowerCase() || !existsSync(sourceRoot)) {
        continue;
      }
      for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
        cpSync(resolve(sourceRoot, entry.name), resolve(targetRoot, entry.name), {
          recursive: true,
          force: false,
          errorOnExist: false,
        });
      }
      migrated = true;
    }
    return migrated;
  }

  private escapePowerShellSingleQuotedString(value: string) {
    return String(value || "").replace(/'/g, "''");
  }

  private normalizeRootPath(value: string) {
    return value.replace(/[\\/]+$/, "");
  }
}
