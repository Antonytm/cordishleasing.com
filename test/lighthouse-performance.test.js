import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import fs from 'fs';
import path from 'path';

const urls = [
  'https://cordishleasing.com/',
  'https://cordishleasing.netlify.app/'
];

const desktopConfig = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance'],
    formFactor: 'desktop',
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false,
    }
  }
};

const mobileConfig = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance'],
    formFactor: 'mobile',
    screenEmulation: {
      mobile: true,
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      disabled: false,
    }
  }
};

async function runLighthouse(url, config, device) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'info',
    output: 'json',
    port: chrome.port,
  };

  try {
    const runnerResult = await lighthouse(url, options, config);
    await chrome.kill();

    const { lhr } = runnerResult;
    const { performance } = lhr.categories;
    const { audits } = lhr;

    return {
      url,
      device,
      score: performance.score * 100,
      metrics: {
        firstContentfulPaint: audits['first-contentful-paint'].numericValue,
        speedIndex: audits['speed-index'].numericValue,
        largestContentfulPaint: audits['largest-contentful-paint'].numericValue,
        timeToInteractive: audits['interactive'].numericValue,
        totalBlockingTime: audits['total-blocking-time'].numericValue,
        cumulativeLayoutShift: audits['cumulative-layout-shift'].numericValue,
      }
    };
  } catch (error) {
    await chrome.kill();
    throw error;
  }
}

function generateMarkdownReport(results) {
  const timestamp = new Date().toLocaleString();
  let markdown = `# Lighthouse Performance Test Results\n\n`;
  markdown += `**Test Date:** ${timestamp}\n\n`;
  markdown += `---\n\n`;

  // Group results by URL
  const resultsByUrl = {};
  results.forEach(result => {
    if (!resultsByUrl[result.url]) {
      resultsByUrl[result.url] = {};
    }
    resultsByUrl[result.url][result.device] = result;
  });

  // Generate comparison table
  markdown += `## Performance Score Comparison\n\n`;
  markdown += `| URL | Desktop Score | Mobile Score |\n`;
  markdown += `|-----|--------------|--------------|`;

  const urlList = Object.keys(resultsByUrl);
  urlList.forEach(url => {
    const desktopScore = resultsByUrl[url].desktop?.score || 0;
    const mobileScore = resultsByUrl[url].mobile?.score || 0;
    const displayUrl = url.replace('https://', '');
    markdown += `\n| ${displayUrl} | ${desktopScore.toFixed(1)} | ${mobileScore.toFixed(1)} |`;
  });

  // Add improvement row
  if (urlList.length === 2) {
    const site1Desktop = resultsByUrl[urlList[0]].desktop?.score || 0;
    const site1Mobile = resultsByUrl[urlList[0]].mobile?.score || 0;
    const site2Desktop = resultsByUrl[urlList[1]].desktop?.score || 0;
    const site2Mobile = resultsByUrl[urlList[1]].mobile?.score || 0;

    const desktopDiff = site2Desktop - site1Desktop;
    const mobileDiff = site2Mobile - site1Mobile;

    const formatDiff = (diff) => {
      const sign = diff > 0 ? '+' : '';
      return `${sign}${diff.toFixed(1)}`;
    };

    markdown += `\n| **Improvement (Site 2 - Site 1)** | **${formatDiff(desktopDiff)}** | **${formatDiff(mobileDiff)}** |`;
  }

  markdown += `\n\n---\n\n`;

  // Detailed metrics for each URL
  urlList.forEach(url => {
    markdown += `## ${url}\n\n`;

    ['desktop', 'mobile'].forEach(device => {
      const result = resultsByUrl[url][device];
      if (!result) return;

      const deviceTitle = device.charAt(0).toUpperCase() + device.slice(1);
      markdown += `### ${deviceTitle}\n\n`;
      markdown += `**Performance Score:** ${result.score.toFixed(1)}/100\n\n`;

      const scoreEmoji = result.score >= 90 ? '🟢' : result.score >= 50 ? '🟡' : '🔴';
      markdown += `${scoreEmoji} `;
      if (result.score >= 90) markdown += `Excellent\n\n`;
      else if (result.score >= 50) markdown += `Needs Improvement\n\n`;
      else markdown += `Poor\n\n`;

      markdown += `#### Core Web Vitals\n\n`;
      markdown += `| Metric | Value | Rating |\n`;
      markdown += `|--------|-------|--------|\n`;

      const lcp = result.metrics.largestContentfulPaint / 1000;
      const lcpRating = lcp <= 2.5 ? '🟢 Good' : lcp <= 4.0 ? '🟡 Needs Improvement' : '🔴 Poor';
      markdown += `| Largest Contentful Paint (LCP) | ${lcp.toFixed(2)}s | ${lcpRating} |\n`;

      const cls = result.metrics.cumulativeLayoutShift;
      const clsRating = cls <= 0.1 ? '🟢 Good' : cls <= 0.25 ? '🟡 Needs Improvement' : '🔴 Poor';
      markdown += `| Cumulative Layout Shift (CLS) | ${cls.toFixed(3)} | ${clsRating} |\n`;

      const tbt = result.metrics.totalBlockingTime;
      const tbtRating = tbt <= 200 ? '🟢 Good' : tbt <= 600 ? '🟡 Needs Improvement' : '🔴 Poor';
      markdown += `| Total Blocking Time (TBT) | ${tbt.toFixed(0)}ms | ${tbtRating} |\n`;

      markdown += `\n#### Additional Metrics\n\n`;
      markdown += `| Metric | Value |\n`;
      markdown += `|--------|-------|\n`;
      markdown += `| First Contentful Paint (FCP) | ${(result.metrics.firstContentfulPaint / 1000).toFixed(2)}s |\n`;
      markdown += `| Speed Index | ${(result.metrics.speedIndex / 1000).toFixed(2)}s |\n`;
      markdown += `| Time to Interactive (TTI) | ${(result.metrics.timeToInteractive / 1000).toFixed(2)}s |\n\n`;
    });

    markdown += `---\n\n`;
  });

  // Site comparison
  if (urlList.length === 2) {
    markdown += `## Site Comparison\n\n`;
    const site1 = resultsByUrl[urlList[0]];
    const site2 = resultsByUrl[urlList[1]];

    const site1Avg = ((site1.desktop?.score || 0) + (site1.mobile?.score || 0)) / 2;
    const site2Avg = ((site2.desktop?.score || 0) + (site2.mobile?.score || 0)) / 2;
    const difference = Math.abs(site1Avg - site2Avg).toFixed(1);

    const betterSite = site1Avg > site2Avg ? urlList[0] : urlList[1];
    const worseSite = site1Avg > site2Avg ? urlList[1] : urlList[0];

    markdown += `**${betterSite}** performs better with an average score of **${Math.max(site1Avg, site2Avg).toFixed(1)}** compared to **${worseSite}** with **${Math.min(site1Avg, site2Avg).toFixed(1)}**.\n\n`;
    markdown += `**Difference:** ${difference} points\n\n`;

    // Metric-by-metric comparison
    markdown += `### Detailed Comparison (Desktop)\n\n`;
    markdown += `| Metric | ${urlList[0].replace('https://', '')} | ${urlList[1].replace('https://', '')} | Winner |\n`;
    markdown += `|--------|---------|---------|--------|\n`;

    const metrics = ['firstContentfulPaint', 'speedIndex', 'largestContentfulPaint', 'timeToInteractive', 'totalBlockingTime', 'cumulativeLayoutShift'];
    const metricNames = ['First Contentful Paint', 'Speed Index', 'Largest Contentful Paint', 'Time to Interactive', 'Total Blocking Time', 'Cumulative Layout Shift'];

    metrics.forEach((metric, i) => {
      const val1 = site1.desktop?.metrics[metric] || 0;
      const val2 = site2.desktop?.metrics[metric] || 0;
      const unit = metric === 'cumulativeLayoutShift' ? '' : metric === 'totalBlockingTime' ? 'ms' : 's';
      const divisor = metric === 'cumulativeLayoutShift' || metric === 'totalBlockingTime' ? 1 : 1000;
      const winner = val1 < val2 ? '🏆 Site 1' : val1 > val2 ? '🏆 Site 2' : '🤝 Tie';
      markdown += `| ${metricNames[i]} | ${(val1 / divisor).toFixed(metric === 'cumulativeLayoutShift' ? 3 : 2)}${unit} | ${(val2 / divisor).toFixed(metric === 'cumulativeLayoutShift' ? 3 : 2)}${unit} | ${winner} |\n`;
    });

    markdown += `\n`;
  }

  return markdown;
}

async function runTests() {
  console.log('Starting Lighthouse performance tests...\n');

  const results = [];

  for (const url of urls) {
    // Test Desktop
    console.log(`Testing: ${url} (Desktop)`);
    try {
      const desktopResult = await runLighthouse(url, desktopConfig, 'desktop');
      results.push(desktopResult);
      console.log(`✓ Desktop Performance Score: ${desktopResult.score.toFixed(1)}/100\n`);
    } catch (error) {
      console.error(`✗ Failed to test ${url} (Desktop):`, error.message);
    }

    // Test Mobile
    console.log(`Testing: ${url} (Mobile)`);
    try {
      const mobileResult = await runLighthouse(url, mobileConfig, 'mobile');
      results.push(mobileResult);
      console.log(`✓ Mobile Performance Score: ${mobileResult.score.toFixed(1)}/100\n`);
    } catch (error) {
      console.error(`✗ Failed to test ${url} (Mobile):`, error.message);
    }
  }

  // Save results as JSON
  const jsonPath = path.join(process.cwd(), 'lighthouse-results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`Results saved to: ${jsonPath}`);

  // Generate and save markdown report
  const markdown = generateMarkdownReport(results);
  const markdownPath = path.join(process.cwd(), 'lighthouse-results.md');
  fs.writeFileSync(markdownPath, markdown);
  console.log(`Markdown report saved to: ${markdownPath}\n`);

  // Summary
  console.log('=== Summary ===');
  const resultsByUrl = {};
  results.forEach(result => {
    if (!resultsByUrl[result.url]) {
      resultsByUrl[result.url] = {};
    }
    resultsByUrl[result.url][result.device] = result.score;
  });

  Object.keys(resultsByUrl).forEach(url => {
    const desktopScore = resultsByUrl[url].desktop || 0;
    const mobileScore = resultsByUrl[url].mobile || 0;
    console.log(`\n${url}`);
    console.log(`  Desktop: ${desktopScore.toFixed(1)}/100`);
    console.log(`  Mobile:  ${mobileScore.toFixed(1)}/100`);
    console.log(`  Average: ${((desktopScore + mobileScore) / 2).toFixed(1)}/100`);
  });
}

runTests().catch(console.error);
