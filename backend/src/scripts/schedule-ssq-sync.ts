import 'dotenv/config';
import cron from 'node-cron';

import { runSsqCrawler } from './fetch-ssq-from-78500';
import { prisma } from '../lib/prisma';

type ScheduleConfig = {
  spec: string;
  label: string;
};

const TIMEZONE = 'Asia/Shanghai';
const schedules: ScheduleConfig[] = [
  { spec: '0 8 * * *', label: '08:00' },
  { spec: '30 21 * * *', label: '21:30' },
  { spec: '30 22 * * *', label: '22:30' },
];

function registerJobs() {
  schedules.forEach(({ spec, label }) => {
    cron.schedule(
      spec,
      async () => {
        console.log(`[scheduler] ${new Date().toISOString()} 触发任务（${label}）`);
        try {
          await runSsqCrawler();
        } catch (error) {
          console.error(`[scheduler] 任务（${label}）执行失败：`, error);
        }
      },
      {
        timezone: TIMEZONE,
      }
    );
  });
}

function handleShutdown(signal: NodeJS.Signals) {
  console.log(`[scheduler] 收到 ${signal}，准备退出`);
  prisma
    .$disconnect()
    .catch((error) => {
      console.error('[scheduler] 断开 Prisma 连接失败：', error);
    })
    .finally(() => {
      process.exit(0);
    });
}

function main() {
  console.log('[scheduler] 双色球抓取定时器已启动');
  console.log(`[scheduler] 时区：${TIMEZONE}，计划任务：${schedules.map((s) => s.label).join(', ')}`);

  registerJobs();

  process.once('SIGINT', handleShutdown);
  process.once('SIGTERM', handleShutdown);
}

main();
