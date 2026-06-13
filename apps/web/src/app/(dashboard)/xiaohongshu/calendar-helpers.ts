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
  "01-04": ["世界盲文日"],
  "01-10": ["中国人民警察节"],
  "01-15": ["全民国家安全教育宣传日"],
  "01-24": ["国际教育日"],
  "01-26": ["国际清洁能源日"],
  "01-27": ["缅怀大屠杀受难者国际纪念日"],
  "01-28": ["和平共处国际日"],
  "02-02": ["世界湿地日"],
  "02-04": ["世界抗癌日", "人类博爱国际日"],
  "02-06": ["国际零容忍女性生殖器残割日"],
  "02-10": ["世界豆类日", "国际阿拉伯豹日"],
  "02-11": ["妇女和女童参与科学国际日"],
  "02-13": ["世界无线电日"],
  "02-14": ["情人节"],
  "02-20": ["世界社会公正日"],
  "02-21": ["国际母语日"],
  "03-01": ["零歧视日", "世界海草日"],
  "03-03": ["世界野生动植物日"],
  "03-05": ["学雷锋纪念日", "中国青年志愿者服务日"],
  "03-08": ["妇女节"],
  "03-10": ["女法官国际日"],
  "03-12": ["植树节"],
  "03-15": ["消费者权益日"],
  "03-20": ["国际幸福日"],
  "03-21": ["国际森林日", "世界唐氏综合征日", "世界诗歌日"],
  "03-22": ["世界水日"],
  "03-23": ["世界气象日"],
  "03-24": ["世界防治结核病日"],
  "04-01": ["愚人节"],
  "04-02": ["世界孤独症关注日", "国际儿童图书日"],
  "04-07": ["世界卫生日"],
  "04-15": ["全民国家安全教育日"],
  "04-22": ["世界地球日"],
  "04-23": ["世界读书日"],
  "04-24": ["中国航天日"],
  "04-25": ["世界防治疟疾日"],
  "05-01": ["劳动节"],
  "05-03": ["世界新闻自由日"],
  "05-04": ["青年节"],
  "05-08": ["世界红十字日"],
  "05-10": ["中国品牌日"],
  "05-12": ["国际护士节", "全国防灾减灾日"],
  "05-15": ["国际家庭日"],
  "05-17": ["世界电信和信息社会日"],
  "05-18": ["国际博物馆日"],
  "05-19": ["中国旅游日"],
  "05-20": ["520"],
  "05-22": ["国际生物多样性日"],
  "05-30": ["全国科技工作者日"],
  "05-31": ["世界无烟日"],
  "06-01": ["儿童节", "618预售季"],
  "06-04": ["受侵略戕害的无辜儿童国际日"],
  "06-05": ["世界环境日"],
  "06-06": ["全国爱眼日"],
  "06-07": ["世界食品安全日"],
  "06-08": ["世界海洋日"],
  "06-14": ["世界献血者日"],
  "06-18": ["618大促", "打击仇恨言论国际日"],
  "06-20": ["世界难民日"],
  "06-21": ["国际瑜伽日"],
  "06-23": ["国际奥林匹克日"],
  "06-26": ["国际禁毒日"],
  "07-01": ["建党节", "香港回归纪念日"],
  "07-07": ["七七事变纪念日"],
  "07-11": ["世界人口日", "中国航海日"],
  "07-15": ["世界青年技能日"],
  "07-18": ["纳尔逊·曼德拉国际日"],
  "07-28": ["世界肝炎日"],
  "07-30": ["国际友谊日"],
  "08-01": ["建军节"],
  "08-08": ["全民健身日"],
  "08-12": ["国际青年日"],
  "08-19": ["中国医师节", "世界人道主义日"],
  "08-29": ["禁止核试验国际日"],
  "09-03": ["中国人民抗日战争胜利纪念日"],
  "09-05": ["中华慈善日"],
  "09-09": ["99公益日"],
  "09-10": ["教师节"],
  "09-15": ["国际民主日"],
  "09-16": ["保护臭氧层国际日"],
  "09-20": ["全国爱牙日"],
  "09-21": ["国际和平日"],
  "09-27": ["世界旅游日"],
  "09-30": ["烈士纪念日"],
  "10-01": ["国庆节"],
  "10-04": ["世界动物日"],
  "10-05": ["世界教师日"],
  "10-10": ["世界精神卫生日"],
  "10-13": ["国际减灾日"],
  "10-16": ["世界粮食日"],
  "10-24": ["联合国日", "程序员节"],
  "10-31": ["万圣夜"],
  "11-08": ["中国记者节"],
  "11-09": ["全国消防日"],
  "11-11": ["双十一"],
  "11-14": ["联合国糖尿病日"],
  "11-17": ["国际学生日"],
  "11-20": ["世界儿童日"],
  "11-21": ["世界电视日"],
  "11-29": ["声援巴勒斯坦人民国际日"],
  "12-01": ["世界艾滋病日"],
  "12-03": ["国际残疾人日"],
  "12-05": ["国际志愿人员日"],
  "12-10": ["国际人权日"],
  "12-12": ["双十二", "国际中立日"],
  "12-20": ["国际人类团结日"],
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

function getNthWeekdayOfMonth(year: number, month: number, weekday: number, occurrence: number) {
  const firstDay = createCalendarDate(year, month, 1);
  const offset = (weekday - firstDay.getDay() + 7) % 7;
  const day = 1 + offset + (occurrence - 1) * 7;
  const daysInMonth = new Date(year, month, 0).getDate();

  if (day > daysInMonth) {
    return "";
  }

  return buildCalendarDateKey(year, month, day);
}

function getLastWeekdayOfMonth(year: number, month: number, weekday: number) {
  const lastDate = new Date(year, month, 0);
  const offset = (lastDate.getDay() - weekday + 7) % 7;
  lastDate.setDate(lastDate.getDate() - offset);

  return buildCalendarDateKey(year, month, lastDate.getDate());
}

function getDynamicGregorianFestivalLabels(year: number, month: number, day: number) {
  const dateKey = buildCalendarDateKey(year, month, day);
  const result: string[] = [];

  if (dateKey === getNthWeekdayOfMonth(year, 5, 0, 2)) {
    result.push("母亲节");
  }

  if (dateKey === getNthWeekdayOfMonth(year, 5, 0, 3)) {
    result.push("全国助残日");
  }

  if (dateKey === getNthWeekdayOfMonth(year, 6, 0, 3)) {
    result.push("父亲节");
  }

  if (dateKey === getLastWeekdayOfMonth(year, 3, 1)) {
    result.push("全国中小学生安全教育日");
  }

  if (dateKey === getNthWeekdayOfMonth(year, 11, 4, 4)) {
    result.push("感恩节");
  }

  return result;
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
  const firstWeekday = firstDay.getDay();
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

  const gregorianFestivals = getGregorianFestivalLabels(value);
  if (gregorianFestivals[0]) {
    return gregorianFestivals[0];
  }

  const parts = parseCalendarDateParts(value);
  if (!parts) {
    return "";
  }

  const lunar = Lunar.fromDate(createCalendarDate(parts.year, parts.month, parts.day));
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

  return uniqueTextList([
    ...(GREGORIAN_FESTIVAL_MAP[dateKey] || []),
    ...getDynamicGregorianFestivalLabels(parts.year, parts.month, parts.day),
    ...solar.getFestivals(),
    ...solar.getOtherFestivals(),
  ]);
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
