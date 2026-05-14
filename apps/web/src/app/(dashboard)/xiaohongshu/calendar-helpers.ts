"use client";

import { Lunar, Solar } from "lunar-javascript";
import { type XiaohongshuMarketingCalendarItem } from "../../../services/reports";

export function formatCalendarDate(value?: string) {
  if (!value) {
    return "未排期";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function formatCalendarDay(value?: string) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
  }).format(new Date(value));
}

export function formatCalendarMonthDay(value?: string) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getMonth() + 1}月${String(date.getDate()).padStart(2, "0")}日`;
}

export function formatCalendarWeekday(value?: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    weekday: "short",
  })
    .format(new Date(value))
    .replace("周", "星期");
}

export function getCalendarMonthKey(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatCalendarMonthLabel(monthKey?: string) {
  if (!monthKey) {
    return "未排期";
  }

  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!year || !month) {
    return monthKey;
  }

  return `${year}年${month}月`;
}

export function buildCalendarMonthMatrix(monthKey: string, items: XiaohongshuMarketingCalendarItem[]) {
  if (!monthKey) {
    return [];
  }

  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!year || !month) {
    return [];
  }

  const firstDay = new Date(year, month - 1, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const byDate = new Map(items.map((item) => [item.date, item]));
  const cells: Array<XiaohongshuMarketingCalendarItem | null> = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push(byDate.get(date) || null);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function getCalendarFestivalLabel(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const solarFestival = solar.getFestivals()[0];
  if (solarFestival) {
    return solarFestival;
  }

  const lunar = Lunar.fromDate(date);
  const lunarFestival = lunar.getFestivals()[0];
  if (lunarFestival) {
    return lunarFestival;
  }

  const jieQi = lunar.getJieQi();
  if (jieQi) {
    return jieQi;
  }

  return "";
}

export function formatCalendarOptionalValue(value?: string) {
  const text = value?.trim();
  return text ? text : " ";
}

export function formatCalendarListValue(value?: string[]) {
  const items = value?.map((item) => item.trim()).filter(Boolean) || [];
  return items.length ? items.join(" / ") : " ";
}
