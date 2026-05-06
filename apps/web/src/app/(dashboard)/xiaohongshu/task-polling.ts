import { useEffect, useRef } from "react";
import { type TaskRecord, type TaskStatus } from "../../../services/personal-center";

export function useDelayedTaskPolling(options: {
  active: boolean;
  updatedAt?: string;
  onPoll: () => void | Promise<void>;
  delayMs?: number;
}) {
  const callbackRef = useRef(options.onPoll);

  useEffect(() => {
    callbackRef.current = options.onPoll;
  }, [options.onPoll]);

  useEffect(() => {
    if (!options.active) {
      return;
    }

    const timer = window.setTimeout(() => {
      void callbackRef.current();
    }, options.delayMs ?? 4000);

    return () => window.clearTimeout(timer);
  }, [options.active, options.updatedAt, options.delayMs]);
}

export function isTaskActive(taskStatus?: TaskStatus) {
  return taskStatus === "QUEUED" || taskStatus === "RUNNING";
}

export function findLatestTaskByTypes(tasks: TaskRecord[], taskTypes: string | string[]) {
  const typeList = Array.isArray(taskTypes) ? taskTypes : [taskTypes];
  return tasks
    .filter((item) => typeList.includes(item.taskType))
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0];
}
