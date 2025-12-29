/**
 * Generate test lottery data for development and testing
 * Run with: npx ts-node src/scripts/generate-test-data.ts <count>
 */

import * as fs from 'fs';
import * as path from 'path';

function generateRandomRedBalls(): number[] {
  const balls = new Set<number>();
  while (balls.size < 6) {
    balls.add(Math.floor(Math.random() * 33) + 1);
  }
  return Array.from(balls).sort((a, b) => a - b);
}

function generateRandomBlueBall(): number {
  return Math.floor(Math.random() * 16) + 1;
}

function generateTestData(count: number = 100): string {
  const records: string[] = [];

  // CSV Header
  records.push('期号,开奖日期,红1,红2,红3,红4,红5,红6,蓝球');

  // Generate records
  const startDate = new Date('2020-01-01');

  for (let i = 1; i <= count; i++) {
    const period = `2020${i.toString().padStart(3, '0')}`;

    // Date increments every 2-3 days
    const dayOffset = i * 2 + Math.floor(Math.random() * 2);
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    const redBalls = generateRandomRedBalls();
    const blueBall = generateRandomBlueBall();

    const row = [period, dateStr, ...redBalls, blueBall].join(',');
    records.push(row);
  }

  return records.join('\n');
}

// Main execution
const count = parseInt(process.argv[2] || '100', 10);

if (isNaN(count) || count < 1 || count > 10000) {
  console.error('❌ Invalid count. Usage: npx ts-node generate-test-data.ts <count>');
  console.error('   Count must be between 1 and 10000');
  process.exit(1);
}

console.log(`🎲 Generating ${count} test lottery records...`);

const csvData = generateTestData(count);
const outputFile = path.join(process.cwd(), `test-data-${count}.csv`);

fs.writeFileSync(outputFile, csvData, 'utf-8');

console.log(`✅ Generated ${count} records`);
console.log(`📄 Saved to: ${outputFile}`);
console.log(`📊 File size: ${(csvData.length / 1024).toFixed(2)} KB`);
console.log('');
console.log('Next steps:');
console.log('1. Start the backend server');
console.log('2. Upload this file via the History page or API:');
console.log(`   curl -X POST http://localhost:4000/api/lottery/import \\`);
console.log(`     -F "file=@${outputFile}" \\`);
console.log(`     -F "onDuplicate=skip"`);
console.log('');
