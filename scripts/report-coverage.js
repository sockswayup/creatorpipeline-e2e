#!/usr/bin/env node

/**
 * Combined coverage report from V8 (frontend) and JaCoCo (backend).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const coverageDir = path.join(__dirname, '..', 'coverage');
const v8Dir = path.join(coverageDir, 'v8');
const backendDir = path.join(coverageDir, 'backend');

console.log('\n' + '═'.repeat(60));
console.log('  📊 E2E Coverage Report');
console.log('═'.repeat(60) + '\n');

// ============ Frontend Coverage (V8) ============

let frontendCoverage = { covered: 0, total: 0 };

if (fs.existsSync(v8Dir)) {
  const files = fs.readdirSync(v8Dir).filter(f => f.endsWith('.json'));

  if (files.length > 0) {
    console.log('🖥️  FRONTEND (V8 Coverage)');
    console.log('─'.repeat(60));

    const urlStats = new Map();

    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(path.join(v8Dir, file), 'utf-8'));

      for (const entry of data) {
        const url = entry.url;
        const shortUrl = url.replace('http://localhost:13000/', '/');

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

    // Print per-file stats
    for (const [url, stats] of urlStats) {
      const pct = stats.total > 0 ? ((stats.covered / stats.total) * 100).toFixed(1) : 0;
      const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
      console.log(`${bar} ${String(pct).padStart(5)}%  ${url}`);
      frontendCoverage.total += stats.total;
      frontendCoverage.covered += stats.covered;
    }

    const frontendPct = frontendCoverage.total > 0
      ? ((frontendCoverage.covered / frontendCoverage.total) * 100).toFixed(1)
      : 0;
    console.log('─'.repeat(60));
    console.log(`Frontend Total: ${frontendPct}% of ${(frontendCoverage.total / 1024).toFixed(0)} KB\n`);
  }
} else {
  console.log('🖥️  FRONTEND: No coverage data found\n');
}

// ============ Backend Coverage (JaCoCo) ============

let backendCoverage = { covered: 0, total: 0, classes: [] };
const execFile = path.join(backendDir, 'jacoco.exec');

if (fs.existsSync(execFile)) {
  console.log('☕ BACKEND (JaCoCo Coverage)');
  console.log('─'.repeat(60));

  // Check if we can generate a report
  const apiClassesDir = path.join(__dirname, '..', '..', 'creatorpipeline-api', 'build', 'classes', 'java', 'main');
  const apiSourceDir = path.join(__dirname, '..', '..', 'creatorpipeline-api', 'src', 'main', 'java');

  if (fs.existsSync(apiClassesDir)) {
    try {
      // Try to generate XML report for parsing
      const xmlFile = path.join(backendDir, 'jacoco.xml');

      // Copy jacococli from container if we don't have it locally
      if (!fs.existsSync('/tmp/jacococli.jar')) {
        try {
          execSync('docker cp e2e-creatorpipeline-api:/jacoco/jacococli.jar /tmp/jacococli.jar 2>/dev/null', { stdio: 'pipe' });
        } catch {
          // Container might be stopped, try to find jacococli elsewhere
        }
      }

      if (fs.existsSync('/tmp/jacococli.jar')) {
        execSync(
          `java -jar /tmp/jacococli.jar report "${execFile}" ` +
          `--classfiles "${apiClassesDir}" ` +
          `--sourcefiles "${apiSourceDir}" ` +
          `--xml "${xmlFile}" ` +
          `--html "${path.join(backendDir, 'html')}"`,
          { stdio: 'pipe' }
        );

        // Parse XML for coverage numbers
        if (fs.existsSync(xmlFile)) {
          const xml = fs.readFileSync(xmlFile, 'utf-8');

          // Extract line coverage from XML
          const lineMatch = xml.match(/<counter type="LINE" missed="(\d+)" covered="(\d+)"\/>/);
          if (lineMatch) {
            const missed = parseInt(lineMatch[1]);
            const covered = parseInt(lineMatch[2]);
            backendCoverage.total = missed + covered;
            backendCoverage.covered = covered;
          }

          // Extract per-package coverage
          const packageMatches = xml.matchAll(/<package name="([^"]+)"[^>]*>[\s\S]*?<counter type="LINE" missed="(\d+)" covered="(\d+)"\/>/g);
          for (const match of packageMatches) {
            const pkg = match[1].replace(/\//g, '.');
            const missed = parseInt(match[2]);
            const covered = parseInt(match[3]);
            const total = missed + covered;
            const pct = total > 0 ? ((covered / total) * 100).toFixed(1) : 0;
            const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
            console.log(`${bar} ${String(pct).padStart(5)}%  ${pkg}`);
          }

          const backendPct = backendCoverage.total > 0
            ? ((backendCoverage.covered / backendCoverage.total) * 100).toFixed(1)
            : 0;
          console.log('─'.repeat(60));
          console.log(`Backend Total: ${backendPct}% (${backendCoverage.covered}/${backendCoverage.total} lines)`);
          console.log(`HTML Report: ${path.join(backendDir, 'html', 'index.html')}\n`);
        }
      } else {
        console.log('⚠️  jacococli.jar not found - cannot generate report');
        console.log(`   Raw coverage data: ${execFile}\n`);
      }
    } catch (err) {
      console.log('⚠️  Could not generate JaCoCo report:', err.message);
      console.log(`   Raw coverage data: ${execFile}\n`);
    }
  } else {
    console.log(`⚠️  API class files not found at:`);
    console.log(`   ${apiClassesDir}`);
    console.log(`   Run: cd ../creatorpipeline-api && ./gradlew classes`);
    console.log(`   Raw coverage data: ${execFile}\n`);
  }
} else {
  console.log('☕ BACKEND: No coverage data found');
  console.log(`   Expected: ${execFile}\n`);
}

// ============ Combined Summary ============

console.log('═'.repeat(60));
console.log('  COMBINED SUMMARY');
console.log('═'.repeat(60));

const fePct = frontendCoverage.total > 0
  ? ((frontendCoverage.covered / frontendCoverage.total) * 100).toFixed(1)
  : 'N/A';
const bePct = backendCoverage.total > 0
  ? ((backendCoverage.covered / backendCoverage.total) * 100).toFixed(1)
  : 'N/A';

console.log(`\n  Frontend:  ${String(fePct).padStart(6)}%`);
console.log(`  Backend:   ${String(bePct).padStart(6)}%`);

if (frontendCoverage.total > 0 && backendCoverage.total > 0) {
  // Weighted average (by size for FE, by lines for BE)
  const totalLines = backendCoverage.total;
  const totalBytes = frontendCoverage.total;
  // Simple average for now
  const combined = ((parseFloat(fePct) + parseFloat(bePct)) / 2).toFixed(1);
  console.log(`  ─────────────────`);
  console.log(`  Combined:  ${String(combined).padStart(6)}%`);
}

console.log('\n' + '═'.repeat(60) + '\n');
