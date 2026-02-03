#!/usr/bin/env node

/**
 * Simple coverage report from V8 coverage data.
 * For detailed line-by-line coverage, the frontend needs source maps (see E2E-8).
 */

const fs = require('fs');
const path = require('path');

const coverageDir = path.join(__dirname, '..', 'coverage', 'v8');

if (!fs.existsSync(coverageDir)) {
  console.log('No coverage data found. Run tests first with coverage enabled.');
  process.exit(0);
}

const files = fs.readdirSync(coverageDir).filter(f => f.endsWith('.json'));

if (files.length === 0) {
  console.log('No coverage files found.');
  process.exit(0);
}

console.log('\n📊 Frontend Coverage Summary\n');
console.log('─'.repeat(60));

let totalBytes = 0;
let coveredBytes = 0;
const urlStats = new Map();

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(coverageDir, file), 'utf-8'));

  for (const entry of data) {
    const url = entry.url;
    const shortUrl = url.replace('http://localhost:13000/', '/');

    // Calculate bytes covered
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

    totalBytes += entryTotal;
    coveredBytes += entryCovered;
  }
}

// Print per-file stats
for (const [url, stats] of urlStats) {
  const pct = stats.total > 0 ? ((stats.covered / stats.total) * 100).toFixed(1) : 0;
  const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
  console.log(`${bar} ${pct.padStart(5)}%  ${url}`);
}

console.log('─'.repeat(60));

const totalPct = totalBytes > 0 ? ((coveredBytes / totalBytes) * 100).toFixed(1) : 0;
console.log(`\nTotal: ${totalPct}% of ${(totalBytes / 1024).toFixed(1)} KB covered\n`);

console.log('Note: This is byte-level coverage of bundled JS.');
console.log('For line-level coverage with source maps, see story E2E-8.\n');
