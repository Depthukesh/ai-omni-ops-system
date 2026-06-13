declare module "lunar-javascript" {
  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    getFestivals(): string[];
    getOtherFestivals(): string[];
  }

  export class Lunar {
    static fromDate(date: Date): Lunar;
    getFestivals(): string[];
    getJieQi(): string;
    getDayInChinese(): string;
    getMonthInChinese(): string;
  }
}
