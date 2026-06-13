"use client";

import { Lunar, Solar } from "lunar-javascript";
import { type XiaohongshuMarketingCalendarItem } from "../../../services/reports";

export type CalendarMonthCell = {
  date: string;
  year: number;
  month: number;
  day: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  isRestDay: boolean;
  lunarLabel: string;
  solarTerm: string;
  gregorianFestivals: string[];
  item?: XiaohongshuMarketingCalendarItem;
};

const GREGORIAN_FESTIVAL_MAP: Record<string, string[]> = {
  "01-01": ["元旦"],
  "02-14": ["情人节"],
  "03-08": ["妇女节"],
  "03-12": ["植树节"],
  "03-15": ["消费者权益日"],
  "04-01": ["愚人节"],
  "04-22": ["世界地球日"],
  "05-01": ["劳动节"],
  "05-04": ["青年节"],
  "05-12": ["国际护士节"],
  "05-18": ["国际博物馆日"],
  "05-20": ["520"],
  "05-31": ["世界无烟日"],
  "06-01": ["儿童节"],
  "06-04": ["受侵略戕害的无辜儿童国际日"],
  "06-05": ["世界环境日"],
  "06-06": ["全国爱眼日"],
  "06-21": ["国际瑜伽日"],
  "07-01": ["建党节"],
  "08-01": ["建军节"],
  "09-10": ["教师节"],
  "10-01": ["国庆节"],
  "11-11": ["双十一"],
  "11-14": ["联合国糖尿病日"],
  "12-24": ["平安夜"],
  "12-25": ["圣诞节"],
};

const REST_DAY_RANGES_BY_YEAR: Record<number, Array<[string, string]>> = {
  2026: [
    ["2026-01-01", "2026-01-03"],
    ["2026-02-15", "2026-02-23"],
    ["2026-04-04", "2026-04-06"],
    ["2026-05-01", "2026-05-05"],
    ["2026-06-19", "2026-06-21"],
    ["2026-09-25", "2026-09-27"],
    ["2026-10-01", "2026-10-07"],
  ],
};

function parseCalendarDateParts(value?: string) {
  if (!value) {
    return undefined;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) {
    return undefined;
  }

  return { year, month, day };
}

function buildCalendarDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function createCalendarDate(year: number, month: number, day: number) {
  return new Date(year, month - 1, day);
}

function getTodayKey() {
  const today = new Date();
  return buildCalendarDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());
}

function shiftCalendarDate(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function uniqueTextList(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

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
  const parts = parseCalendarDateParts(value);
  if (!parts) {
    return "";
  }

  return `${parts.year}-${String(parts.month).padStart(2, "0")}`;
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

  const firstDay = createCalendarDate(year, month, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const gridStart = shiftCalendarDate(firstDay, -firstWeekday);
  const byDate = new Map(items.map((item) => [item.date, item]));
  const todayKey = getTodayKey();

  return Array.from({ length: 42 }, (_, index) => {
    const current = shiftCalendarDate(gridStart, index);
    const cellYear = current.getFullYear();
    const cellMonth = current.getMonth() + 1;
    const cellDay = current.getDate();
    const dateKey = buildCalendarDateKey(cellYear, cellMonth, cellDay);
    const lunar = Lunar.fromDate(current);

    return {
      date: dateKey,
      year: cellYear,
      month: cellMonth,
      day: cellDay,
      inCurrentMonth: cellMonth === month,
      isToday: dateKey === todayKey,
      isRestDay: isCalendarRestDay(dateKey),
      lunarLabel: getCalendarLunarLabel(dateKey),
      solarTerm: lunar.getJieQi() || "",
      gregorianFestivals: getGregorianFestivalLabels(dateKey),
      item: byDate.get(dateKey),
    } satisfies CalendarMonthCell;
  });
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

export function getGregorianFestivalLabels(value?: string) {
  const parts = parseCalendarDateParts(value);
  if (!parts) {
    return [];
  }

  const solar = Solar.fromYmd(parts.year, parts.month, parts.day);
  const dateKey = `${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;

  return uniqueTextList([...(GREGORIAN_FESTIVAL_MAP[dateKey] || []), ...solar.getFestivals()]);
}

export function getCalendarLunarLabel(value?: string) {
  const parts = parseCalendarDateParts(value);
  if (!parts) {
    return "";
  }

  const lunar = Lunar.fromDate(createCalendarDate(parts.year, parts.month, parts.day));
  const dayLabel = lunar.getDayInChinese();
  if (dayLabel === "初一") {
    return `${lunar.getMonthInChinese()}月`;
  }

  return dayLabel;
}

export function isCalendarRestDay(value?: string) {
  const parts = parseCalendarDateParts(value);
  if (!parts) {
    return false;
  }

  const ranges = REST_DAY_RANGES_BY_YEAR[parts.year] || [];
  return ranges.some(([start, end]) => value! >= start && value! <= end);
}

export function formatCalendarOptionalValue(value?: string) {
  const text = value?.trim();
  return text ? text : " ";
}

export function formatCalendarListValue(value?: string[]) {
  const items = value?.map((item) => item.trim()).filter(Boolean) || [];
  return items.length ? items.join(" / ") : " ";
}
