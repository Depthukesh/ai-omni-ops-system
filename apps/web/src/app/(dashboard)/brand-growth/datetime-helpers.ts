export function formatDateTime(value?: string) {
  if (!value) {
    return "未记录";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")} ${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
}

export function formatDateLabel(value?: string) {
  if (!value) {
    return "未记录";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
}

export function formatCount(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0";
  }
  return value.toLocaleString("zh-CN");
}

export function formatMetric(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatHotspotHeat(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "接口未返回";
  }

  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)} 亿`;
  }

  if (value >= 10000) {
    return `${(value / 10000).toFixed(1)} 万`;
  }

  return value.toLocaleString("zh-CN");
}

export function sortByCollectedAtDesc<T extends { collectedAt?: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftTime = left.collectedAt ? new Date(left.collectedAt).getTime() : 0;
    const rightTime = right.collectedAt ? new Date(right.collectedAt).getTime() : 0;
    return rightTime - leftTime;
  });
}
