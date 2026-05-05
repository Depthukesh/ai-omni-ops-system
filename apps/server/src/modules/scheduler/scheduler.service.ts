import { Injectable, Logger, OnApplicationShutdown } from "@nestjs/common";

export type DailyJobOptions = {
  name: string;
  hour: number;
  minute?: number;
  onTick: () => Promise<void> | void;
  runOnStartupIfMissed?: boolean;
  shouldRunOnStartup?: () => Promise<boolean> | boolean;
};

type DailyJobState = {
  options: Required<Pick<DailyJobOptions, "name" | "hour" | "minute" | "onTick">>
    & Pick<DailyJobOptions, "runOnStartupIfMissed" | "shouldRunOnStartup">;
  running: boolean;
  timer?: NodeJS.Timeout;
};

@Injectable()
export class SchedulerService implements OnApplicationShutdown {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly dailyJobs = new Map<string, DailyJobState>();

  registerDailyJob(options: DailyJobOptions) {
    const normalizedOptions: DailyJobState["options"] = {
      ...options,
      minute: options.minute ?? 0,
    };

    this.unregisterJob(normalizedOptions.name);

    const job: DailyJobState = {
      options: normalizedOptions,
      running: false,
    };

    this.dailyJobs.set(normalizedOptions.name, job);
    this.scheduleNextRun(job);

    if (normalizedOptions.runOnStartupIfMissed) {
      void this.runStartupCatchUp(job);
    }
  }

  unregisterJob(name: string) {
    const job = this.dailyJobs.get(name);
    if (!job) {
      return;
    }

    if (job.timer) {
      clearTimeout(job.timer);
      job.timer = undefined;
    }

    this.dailyJobs.delete(name);
  }

  onApplicationShutdown() {
    for (const name of Array.from(this.dailyJobs.keys())) {
      this.unregisterJob(name);
    }
  }

  private async runStartupCatchUp(job: DailyJobState) {
    const shouldRun = await this.shouldRunOnStartup(job);
    if (!shouldRun) {
      return;
    }

    this.logger.log(`startup catch-up job triggered: ${job.options.name}`);
    await this.executeJob(job, "startup");
  }

  private async shouldRunOnStartup(job: DailyJobState) {
    if (job.options.shouldRunOnStartup) {
      return Boolean(await job.options.shouldRunOnStartup());
    }

    const now = new Date();
    const scheduledToday = new Date(now);
    scheduledToday.setHours(job.options.hour, job.options.minute, 0, 0);
    return now.getTime() >= scheduledToday.getTime();
  }

  private scheduleNextRun(job: DailyJobState) {
    if (job.timer) {
      clearTimeout(job.timer);
    }

    const nextRunAt = this.getNextRunAt(job.options.hour, job.options.minute);
    const delay = Math.max(nextRunAt.getTime() - Date.now(), 0);

    job.timer = setTimeout(() => {
      void this.executeJob(job, "schedule");
    }, delay);
  }

  private async executeJob(job: DailyJobState, trigger: "startup" | "schedule") {
    if (!this.dailyJobs.has(job.options.name)) {
      return;
    }

    if (job.running) {
      this.logger.warn(`skip overlapping job: ${job.options.name}`);
      this.scheduleNextRun(job);
      return;
    }

    job.running = true;

    try {
      await job.options.onTick();
      this.logger.log(`${trigger} job completed: ${job.options.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown scheduler error";
      this.logger.error(`${trigger} job failed: ${job.options.name} - ${message}`);
    } finally {
      job.running = false;
      if (this.dailyJobs.get(job.options.name) === job) {
        this.scheduleNextRun(job);
      }
    }
  }

  private getNextRunAt(hour: number, minute: number) {
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(hour, minute, 0, 0);

    if (nextRun.getTime() <= now.getTime()) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun;
  }
}
