import 'dotenv/config';
import iconv from 'iconv-lite';
import { load } from 'cheerio';

import type { LotteryDrawInput } from '../services/data-import';
import { importLotteryDraws } from '../services/data-import';
import { prisma } from '../lib/prisma';

const TARGET_URL = 'https://kaijiang.78500.cn/ssq/';
const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  Referer: 'https://kaijiang.78500.cn/',
};

async function fetchHtml(): Promise<string> {
  const response = await fetch(TARGET_URL, {
    headers: REQUEST_HEADERS,
  });

  if (!response.ok) {
    throw new Error(`请求开奖页面失败，状态码 ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return iconv.decode(buffer, 'gb2312');
}

function parseDraws(html: string): LotteryDrawInput[] {
  const $ = load(html);
  const results: LotteryDrawInput[] = [];

  $('tbody.list-tr tr').each((_index, element) => {
    const cells = $(element).find('td');
    if (cells.length < 3) {
      return;
    }

    const rawPeriod = cells.eq(0).text().trim();
    const period = rawPeriod.replace(/[^\d]/g, '');
    const dateText = cells.eq(1).text().trim();

    if (!period || !dateText) {
      return;
    }

    const redBalls = cells
      .eq(2)
      .find('div.qiu_ssq span.red')
      .map((_i, span) => parseInt($(span).text().trim(), 10))
      .get()
      .filter((num) => Number.isInteger(num));

    const blueBallText = cells.eq(2).find('div.qiu_ssq span.blue').first().text().trim();
    const blueBall = parseInt(blueBallText, 10);

    if (redBalls.length !== 6 || !Number.isInteger(blueBall)) {
      console.warn(`跳过期号 ${period}：号码解析异常`);
      return;
    }

    const drawDate = new Date(`${dateText}T00:00:00+08:00`);
    if (Number.isNaN(drawDate.getTime())) {
      console.warn(`跳过期号 ${period}：开奖日期解析异常 ${dateText}`);
      return;
    }

    results.push({
      period,
      drawDate,
      redBalls,
      blueBall,
    });
  });

  return results;
}

export async function runSsqCrawler() {
  console.log(`[crawler] ${new Date().toISOString()} 开始抓取 ${TARGET_URL}`);

  const html = await fetchHtml();
  const draws = parseDraws(html);

  if (draws.length === 0) {
    console.warn('[crawler] 未解析到任何开奖数据，终止同步');
    throw new Error('未解析到任何开奖数据');
  }

  console.log(`[crawler] 解析到 ${draws.length} 期数据，开始入库`);
  const result = await importLotteryDraws(draws, { onDuplicate: 'skip' }, 'crawler-78500');

  console.log(
    `[crawler] 导入完成：成功 ${result.inserted} 条，跳过 ${result.skipped} 条，错误 ${result.errors.length} 条`
  );
}

if (require.main === module) {
  runSsqCrawler()
    .catch((error) => {
      console.error('[crawler] 爬取或导入失败：', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
