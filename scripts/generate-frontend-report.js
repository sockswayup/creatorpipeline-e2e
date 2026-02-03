#!/usr/bin/env node

/**
 * Generate HTML coverage report from V8 coverage data.
 */

const fs = require('fs');
const path = require('path');

const coverageDir = path.join(__dirname, '..', 'coverage');
const v8Dir = path.join(coverageDir, 'v8');
const htmlDir = path.join(coverageDir, 'frontend', 'html');

function main() {
  if (!fs.existsSync(v8Dir)) {
    console.log('No V8 coverage data found. Run tests first.');
    process.exit(1);
  }

  const files = fs.readdirSync(v8Dir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('No V8 coverage files found.');
    process.exit(1);
  }

  console.log('📊 Generating frontend coverage report...\n');

  // Ensure output directory exists
  fs.mkdirSync(htmlDir, { recursive: true });

  // Collect coverage data
  const urlStats = new Map();

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(v8Dir, file), 'utf-8'));

    for (const entry of data) {
      const url = entry.url;
      if (!url.includes('localhost:13000')) continue;

      const shortUrl = url.replace('http://localhost:13000', '');

      let entryTotal = 0;
      let entryCovered = 0;

      for (const fn of entry.functions || []) {
        for (const range of fn.ranges || []) {
          const size = range.endOffset - range.startOffset;
          entryTotal += size;
          if (range.count > 0) {
            entryCovered += size;
          }
        }
      }

      if (entryTotal > 0) {
        const existing = urlStats.get(shortUrl) || { total: 0, covered: 0 };
        urlStats.set(shortUrl, {
          total: Math.max(existing.total, entryTotal),
          covered: Math.max(existing.covered, entryCovered),
        });
      }
    }
  }

  // Calculate totals
  let totalBytes = 0;
  let coveredBytes = 0;
  const rows = [];

  for (const [url, stats] of urlStats) {
    const pct = stats.total > 0 ? ((stats.covered / stats.total) * 100) : 0;
    totalBytes += stats.total;
    coveredBytes += stats.covered;
    rows.push({ url, ...stats, pct });
  }

  rows.sort((a, b) => a.url.localeCompare(b.url));
  const totalPct = totalBytes > 0 ? ((coveredBytes / totalBytes) * 100) : 0;

  // Generate HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Frontend Coverage Report</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
    .summary {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary h2 { margin-top: 0; color: #666; }
    .total-pct { font-size: 48px; font-weight: bold; color: ${totalPct >= 80 ? '#4CAF50' : totalPct >= 50 ? '#FF9800' : '#f44336'}; }
    .total-detail { color: #666; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    th, td { padding: 12px 16px; text-align: left; }
    th { background: #333; color: white; }
    tr:nth-child(even) { background: #f9f9f9; }
    tr:hover { background: #f0f0f0; }
    .bar-container {
      width: 200px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }
    .bar {
      height: 20px;
      border-radius: 4px;
      transition: width 0.3s;
    }
    .bar.high { background: #4CAF50; }
    .bar.medium { background: #FF9800; }
    .bar.low { background: #f44336; }
    .pct { font-weight: bold; min-width: 60px; }
    .pct.high { color: #4CAF50; }
    .pct.medium { color: #FF9800; }
    .pct.low { color: #f44336; }
    .note {
      margin-top: 20px;
      padding: 15px;
      background: #fff3cd;
      border-radius: 8px;
      border-left: 4px solid #ffc107;
    }
    .timestamp { color: #999; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>🖥️ Frontend Coverage Report</h1>

  <div class="summary">
    <h2>Overall Coverage</h2>
    <div class="total-pct">${totalPct.toFixed(1)}%</div>
    <div class="total-detail">${(coveredBytes / 1024).toFixed(1)} KB of ${(totalBytes / 1024).toFixed(1)} KB covered</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>File</th>
        <th>Coverage</th>
        <th></th>
        <th>Size</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(row => {
        const pctClass = row.pct >= 80 ? 'high' : row.pct >= 50 ? 'medium' : 'low';
        return `
      <tr>
        <td><code>${row.url}</code></td>
        <td class="pct ${pctClass}">${row.pct.toFixed(1)}%</td>
        <td>
          <div class="bar-container">
            <div class="bar ${pctClass}" style="width: ${row.pct}%"></div>
          </div>
        </td>
        <td>${(row.total / 1024).toFixed(1)} KB</td>
      </tr>`;
      }).join('')}
    </tbody>
  </table>

  <div class="note">
    <strong>Note:</strong> This report shows byte-level coverage of bundled JavaScript.
    For line-level TypeScript coverage with source mapping, the app needs to serve source maps
    and the coverage tool needs access to them during report generation.
  </div>

  <div class="timestamp">Generated: ${new Date().toISOString()}</div>
</body>
</html>`;

  const outputFile = path.join(htmlDir, 'index.html');
  fs.writeFileSync(outputFile, html);
  console.log(`✅ Frontend HTML report: ${outputFile}\n`);
}

main();
