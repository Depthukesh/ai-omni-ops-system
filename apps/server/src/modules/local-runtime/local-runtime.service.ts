import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { BadRequestException, Injectable } from "@nestjs/common";
import { AppConfigService } from "../../config/app-config.service";

type LauncherSettingsRecord = {
  localAppDataRoot?: string;
  pendingMigrationFrom?: string;
  updatedAt?: string;
};

export type LocalRuntimeSettingsPayload = {
  localAppDataRoot?: string | null;
};

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

    return {
      supported: runtimeMode === "local-single-user",
      runtimeMode,
      inviteCodeRequired: runtimeMode !== "local-single-user",
      currentLocalAppRoot,
      configuredLocalAppRoot,
      defaultLocalAppRoot,
      settingsFilePath,
      pendingMigrationFrom: settings.pendingMigrationFrom || null,
      restartRequired: currentLocalAppRoot !== configuredLocalAppRoot || Boolean(settings.pendingMigrationFrom),
      paths: effectivePaths,
    };
  }

  updateSettings(payload: LocalRuntimeSettingsPayload) {
    if (!this.appConfigService.isLocalSingleUserMode()) {
      throw new BadRequestException("当前环境不是 local-single-user，本地资料目录设置仅在安装态可用。");
    }

    const currentLocalAppRoot = this.appConfigService.getLocalAppRoot();
    const defaultLocalAppRoot = this.appConfigService.getDefaultLocalAppRoot();
    const settingsFilePath = this.appConfigService.getLocalLauncherSettingsPath();
    const currentSettings = this.readLauncherSettings();
    const requestedRoot = typeof payload.localAppDataRoot === "string" ? payload.localAppDataRoot.trim() : "";
    const nextLocalAppRoot = requestedRoot ? this.normalizeRootPath(requestedRoot) : defaultLocalAppRoot;

    if (!isAbsolute(nextLocalAppRoot)) {
      throw new BadRequestException("资料目录必须使用绝对路径。");
    }
    const installRoot = resolve(process.cwd(), "..");
    if (nextLocalAppRoot === installRoot || nextLocalAppRoot.startsWith(`${installRoot}\\`) || nextLocalAppRoot.startsWith(`${installRoot}/`)) {
      throw new BadRequestException("资料目录不能直接设置到程序安装目录内，请选择独立的数据文件夹。");
    }

    const pendingMigrationFrom = nextLocalAppRoot !== currentLocalAppRoot
      ? currentLocalAppRoot
      : currentSettings.pendingMigrationFrom || "";

    const nextSettings: LauncherSettingsRecord = {
      localAppDataRoot: nextLocalAppRoot === defaultLocalAppRoot ? "" : nextLocalAppRoot,
      pendingMigrationFrom: pendingMigrationFrom && pendingMigrationFrom !== nextLocalAppRoot ? pendingMigrationFrom : "",
      updatedAt: new Date().toISOString(),
    };

    this.writeLauncherSettings(nextSettings);

    return {
      success: true,
      message: nextLocalAppRoot === currentLocalAppRoot
        ? "本地资料目录配置已保存，当前运行时无需切换。"
        : "本地资料目录配置已保存。下次重启本地工作台时会迁移并切换到新目录。",
      ...this.getSettings(),
      settingsFilePath,
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

  private normalizeRootPath(value: string) {
    return value.replace(/[\\/]+$/, "");
  }
}
