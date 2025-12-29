/**
 * @fileoverview fortune.ts
 * @module frontend/src/lib/fortune
 *
 * Input:
//   - (no external imports)
 *
 * Output:
//   - calculateFortuneNumbers
 *
 * Pos: frontend/src/lib/fortune.ts
 */

interface FortuneResult {
  redBalls: number[];
  blueBall: number;
  luckScore: number;
  energyTrend: string;
  suggestion: string;
}

const ELEMENT_ENERGIES = ['火', '木', '水', '金', '土'] as const;
const SUGGESTIONS = [
  { min: 0, max: 60, text: '今日多观察节奏，保持心态平稳，等待更合适的机会。' },
  { min: 61, max: 80, text: '运势平衡，适合在熟悉的号码组合上做小幅尝试。' },
  { min: 81, max: 90, text: '灵感较强，可以参考热号与奇偶均衡组合。' },
  { min: 91, max: 100, text: '今日状态极佳，优先考虑直觉与历史热号的交集。' },
];

export type { FortuneResult };

export function calculateFortuneNumbers(
  birthdayInput: string | Date,
  referenceDate: Date = new Date(),
): FortuneResult {
  const birthday = normalizeBirthday(birthdayInput);
  const baseSeed = buildSeed(birthday, referenceDate);
  const random = mulberry32(baseSeed);

  const redSet = new Set<number>();
  while (redSet.size < 6) {
    const candidate = Math.floor(random() * 33) + 1;
    redSet.add(candidate);
  }
  const redBalls = Array.from(redSet).sort((a, b) => a - b);
  const blueBall = Math.floor(random() * 16) + 1;

  const luckScore = calculateLuckScore(birthday, referenceDate, random);
  const energyTrend = pickEnergyTrend(birthday, referenceDate);
  const suggestion = pickSuggestion(luckScore);

  return {
    redBalls,
    blueBall,
    luckScore,
    energyTrend,
    suggestion,
  };
}

function normalizeBirthday(input: string | Date): Date {
  if (input instanceof Date) {
    return input;
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('生日格式不正确');
  }
  return parsed;
}

function buildSeed(birthday: Date, today: Date): number {
  const birthSum = birthday.getFullYear() * 10000 + (birthday.getMonth() + 1) * 100 + birthday.getDate();
  const todaySum = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const daySpan = Math.abs(dayOfYear(today) - dayOfYear(birthday));
  return (birthSum * 97 + todaySum * 53 + daySpan * 113) >>> 0;
}

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function calculateLuckScore(birthday: Date, today: Date, random: () => number): number {
  const cycleValue =
    ((birthday.getMonth() + 1) * 13 + birthday.getDate() * 7 + today.getDate() * 9 + dayOfYear(today)) % 100;
  const base = 55 + cycleValue * 0.4 + random() * 15;
  return clamp(Math.round(base), 40, 99);
}

function pickEnergyTrend(birthday: Date, today: Date): string {
  const index = (birthday.getDate() + today.getMonth() + dayOfYear(today)) % ELEMENT_ENERGIES.length;
  const element = ELEMENT_ENERGIES[index];
  const descriptions: Record<(typeof ELEMENT_ENERGIES)[number], string> = {
    火: '火元素高涨，适合选择亮眼的奇数组合增强冲势。',
    木: '木能量回升，偏好递增或连号，象征生长与延展。',
    水: '水元素充足，偶数与平衡组合更利于顺势而为。',
    金: '金能量稳定，可多关注历史热号与和值区间。',
    土: '土元素扎实，建议按节奏组合，奇偶与大小均衡。',
  };
  return descriptions[element];
}

function pickSuggestion(score: number): string {
  const found = SUGGESTIONS.find((item) => score >= item.min && score <= item.max);
  return found?.text ?? SUGGESTIONS[0].text;
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
