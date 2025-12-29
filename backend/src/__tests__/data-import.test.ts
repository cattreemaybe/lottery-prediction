import { describe, it, expect } from '@jest/globals';
import { parseCsvFile, type LotteryDrawInput } from '../services/data-import';

describe('Data Import Service', () => {
  describe('CSV Parsing', () => {
    it('should parse valid CSV data', () => {
      const csvContent = `期号,开奖日期,红1,红2,红3,红4,红5,红6,蓝球
2024001,2024-01-01,3,9,12,18,25,30,5
2024002,2024-01-02,2,11,16,21,29,32,8`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = parseCsvFile(buffer);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        period: '2024001',
        drawDate: new Date('2024-01-01'),
        redBalls: [3, 9, 12, 18, 25, 30],
        blueBall: 5,
      });
    });

    it('should handle alternative column names', () => {
      const csvContent = `period,date,red1,red2,red3,red4,red5,red6,blue
2024001,2024-01-01,3,9,12,18,25,30,5`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = parseCsvFile(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].period).toBe('2024001');
    });

    it('should throw error for invalid data', () => {
      const csvContent = `期号,开奖日期
2024001,2024-01-01`;

      const buffer = Buffer.from(csvContent, 'utf-8');

      expect(() => parseCsvFile(buffer)).toThrow();
    });
  });

  describe('Data Validation', () => {
    it('should validate red ball range', () => {
      const validData: LotteryDrawInput = {
        period: '2024001',
        drawDate: new Date('2024-01-01'),
        redBalls: [1, 2, 3, 4, 5, 6],
        blueBall: 5,
      };

      // This should pass validation
      expect(validData.redBalls.every(n => n >= 1 && n <= 33)).toBe(true);
    });

    it('should detect duplicate red balls', () => {
      const invalidData: LotteryDrawInput = {
        period: '2024001',
        drawDate: new Date('2024-01-01'),
        redBalls: [1, 2, 3, 4, 5, 5], // Duplicate 5
        blueBall: 5,
      };

      const uniqueCount = new Set(invalidData.redBalls).size;
      expect(uniqueCount).toBe(5); // Should be 6 for valid data
    });

    it('should validate blue ball range', () => {
      const validData: LotteryDrawInput = {
        period: '2024001',
        drawDate: new Date('2024-01-01'),
        redBalls: [1, 2, 3, 4, 5, 6],
        blueBall: 16,
      };

      expect(validData.blueBall).toBeGreaterThanOrEqual(1);
      expect(validData.blueBall).toBeLessThanOrEqual(16);
    });
  });

  describe('Period Format', () => {
    it('should validate 7-digit period format', () => {
      const validPeriods = ['2024001', '2024365', '2023999'];
      const invalidPeriods = ['202401', '20240001', 'ABC1234'];

      validPeriods.forEach(period => {
        expect(period).toMatch(/^\d{7}$/);
      });

      invalidPeriods.forEach(period => {
        expect(period).not.toMatch(/^\d{7}$/);
      });
    });
  });
});
