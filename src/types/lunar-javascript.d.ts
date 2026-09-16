declare module "lunar-javascript" {
  export interface SolarValue {
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getLunar(): LunarValue;
    toYmd(): string;
  }

  export interface LunarValue {
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getSolar(): SolarValue;
  }

  export interface LunarMonthValue {
    getYear(): number;
    getMonth(): number;
    getDayCount(): number;
    isLeap(): boolean;
  }

  export interface LunarYearValue {
    getYear(): number;
    getMonth(month: number): LunarMonthValue | null;
    getLeapMonth(): number;
  }

  export const Solar: {
    fromYmd(year: number, month: number, day: number): SolarValue;
  };

  export const Lunar: {
    fromYmd(year: number, month: number, day: number): LunarValue;
  };

  export const LunarMonth: {
    fromYm(year: number, month: number): LunarMonthValue | null;
  };

  export const LunarYear: {
    fromYear(year: number): LunarYearValue;
  };
}

