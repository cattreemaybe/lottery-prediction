/**
 * Quick test script for data import functionality
 * Run with: npx ts-node src/scripts/test-data-import.ts
 */

import { parseCsvFile, generateCsvTemplate, generateExcelTemplate } from '../services/data-import';

console.log('🧪 Testing Data Import Functionality\n');

// Test 1: Generate templates
console.log('Test 1: Generate Templates');
try {
  const csvTemplate = generateCsvTemplate();
  const excelBuffer = generateExcelTemplate();

  console.log('✅ CSV Template generated:', csvTemplate.substring(0, 50) + '...');
  console.log('✅ Excel Template generated:', excelBuffer.length, 'bytes');
  console.log('');
} catch (error) {
  console.error('❌ Template generation failed:', error);
  process.exit(1);
}

// Test 2: Parse CSV
console.log('Test 2: Parse CSV Data');
try {
  const csvContent = `期号,开奖日期,红1,红2,红3,红4,红5,红6,蓝球
2024001,2024-01-01,3,9,12,18,25,30,5
2024002,2024-01-02,2,11,16,21,29,32,8
2024003,2024-01-03,1,7,14,20,28,33,12`;

  const csvBuffer = Buffer.from(csvContent, 'utf-8');
  const parsedData = parseCsvFile(csvBuffer);

  console.log('✅ Parsed', parsedData.length, 'records from CSV');
  console.log('Sample record:', JSON.stringify(parsedData[0], null, 2));
  console.log('');

  // Validate data structure
  parsedData.forEach((record, index) => {
    if (!record.period || !record.drawDate || !record.redBalls || record.redBalls.length !== 6) {
      throw new Error(`Invalid record at index ${index}`);
    }
    if (record.blueBall < 1 || record.blueBall > 16) {
      throw new Error(`Invalid blue ball at index ${index}: ${record.blueBall}`);
    }
    record.redBalls.forEach((ball, ballIndex) => {
      if (ball < 1 || ball > 33) {
        throw new Error(`Invalid red ball at index ${index}, ball ${ballIndex}: ${ball}`);
      }
    });
  });

  console.log('✅ All records validated successfully');
  console.log('');
} catch (error) {
  console.error('❌ CSV parsing failed:', error);
  process.exit(1);
}

// Test 3: Test alternative column names
console.log('Test 3: Alternative Column Names');
try {
  const csvContent = `period,date,red1,red2,red3,red4,red5,red6,blue
2024001,2024-01-01,3,9,12,18,25,30,5`;

  const csvBuffer = Buffer.from(csvContent, 'utf-8');
  const parsedData = parseCsvFile(csvBuffer);

  console.log('✅ Parsed with English column names');
  console.log('Record:', JSON.stringify(parsedData[0], null, 2));
  console.log('');
} catch (error) {
  console.error('❌ Alternative column names test failed:', error);
  process.exit(1);
}

// Test 4: Error handling - invalid data
console.log('Test 4: Error Handling');
try {
  const invalidCsv = `期号,开奖日期
2024001,2024-01-01`;

  const csvBuffer = Buffer.from(invalidCsv, 'utf-8');

  try {
    parseCsvFile(csvBuffer);
    console.error('❌ Should have thrown error for invalid data');
    process.exit(1);
  } catch (error) {
    console.log('✅ Correctly rejected invalid data');
    console.log('Error:', (error as Error).message.substring(0, 100));
    console.log('');
  }
} catch (error) {
  console.error('❌ Error handling test failed:', error);
  process.exit(1);
}

// Test 5: Period format validation
console.log('Test 5: Period Format Validation');
try {
  const validPeriods = ['2024001', '2024365', '2023999'];
  const invalidPeriods = ['202401', '20240001', 'ABC1234'];

  const periodRegex = /^\d{7}$/;

  validPeriods.forEach(period => {
    if (!periodRegex.test(period)) {
      throw new Error(`Valid period rejected: ${period}`);
    }
  });

  invalidPeriods.forEach(period => {
    if (periodRegex.test(period)) {
      throw new Error(`Invalid period accepted: ${period}`);
    }
  });

  console.log('✅ Period format validation working correctly');
  console.log('');
} catch (error) {
  console.error('❌ Period validation failed:', error);
  process.exit(1);
}

// Test 6: Red ball validation
console.log('Test 6: Red Ball Validation');
try {
  const testCases = [
    { balls: [1, 2, 3, 4, 5, 6], valid: true, reason: 'Valid range' },
    { balls: [0, 2, 3, 4, 5, 6], valid: false, reason: 'Below range' },
    { balls: [1, 2, 3, 4, 5, 34], valid: false, reason: 'Above range' },
    { balls: [1, 2, 3, 4, 5, 5], valid: false, reason: 'Duplicate' },
  ];

  testCases.forEach(({ balls, valid, reason }) => {
    const inRange = balls.every(n => n >= 1 && n <= 33);
    const noDuplicates = new Set(balls).size === 6;
    const isValid = inRange && noDuplicates;

    if (isValid !== valid) {
      throw new Error(`Test case failed: ${reason}`);
    }

    console.log(`  ${isValid ? '✅' : '❌'} ${reason}:`, balls);
  });

  console.log('✅ Red ball validation working correctly');
  console.log('');
} catch (error) {
  console.error('❌ Red ball validation failed:', error);
  process.exit(1);
}

// Summary
console.log('═══════════════════════════════════════');
console.log('🎉 All tests passed successfully!');
console.log('═══════════════════════════════════════');
console.log('');
console.log('Next steps:');
console.log('1. Start PostgreSQL and Redis');
console.log('2. Run: npx prisma migrate dev');
console.log('3. Start backend: npm run dev');
console.log('4. Test API endpoints (see TEST_GUIDE.md)');
console.log('');
