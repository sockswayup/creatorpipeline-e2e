#!/usr/bin/env node

/**
 * Generate HTML coverage report from Istanbul coverage data.
 * Istanbul provides per-file TypeScript coverage with source mapping.
 */

const fs = require('fs');
const path = require('path');

const coverageDir = path.join(__dirname, '..', 'coverage');
const istanbulDir = path.join(coverageDir, 'istanbul');
const nycOutputDir = path.join(coverageDir, 'frontend-istanbul');
const uiSourceDir = path.join(__dirname, '..', '..', 'creatorpipeline-ui');

// Rewrite container paths to local/relative paths
function rewritePath(containerPath) {
  // Convert /app/src/... to src/...
  if (containerPath.startsWith('/app/')) {
    return containerPath.slice(5);
  }
  return containerPath;
}

function main() {
  if (!fs.existsSync(istanbulDir)) {
    console.log('No Istanbul coverage data found. Run tests with instrumented build first.');
    console.log('Make sure VITE_COVERAGE=true is set when building the UI.');
    process.exit(1);
  }

  const files = fs.readdirSync(istanbulDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('No Istanbul coverage files found.');
    console.log('Istanbul coverage was not collected - ensure vite-plugin-istanbul is configured.');
    process.exit(1);
  }

  console.log(`📊 Processing ${files.length} Istanbul coverage file(s)...\n`);

  // Merge all coverage files into one
  const mergedCoverage = {};

  for (const file of files) {
    const filePath = path.join(istanbulDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      for (const [key, value] of Object.entries(data)) {
        const relativePath = rewritePath(key);

        if (!mergedCoverage[relativePath]) {
          mergedCoverage[relativePath] = { ...value, path: relativePath };
        } else {
          // Merge statement, branch, and function counts
          const existing = mergedCoverage[relativePath];

          // Merge statement counts (take max - file was hit if hit in any test)
          for (const [stmtId, count] of Object.entries(value.s || {})) {
            existing.s[stmtId] = Math.max(existing.s[stmtId] || 0, count);
          }

          // Merge branch counts
          for (const [branchId, counts] of Object.entries(value.b || {})) {
            if (!existing.b[branchId]) {
              existing.b[branchId] = counts;
            } else {
              existing.b[branchId] = existing.b[branchId].map((c, i) => Math.max(c, counts[i] || 0));
            }
          }

          // Merge function counts
          for (const [fnId, count] of Object.entries(value.f || {})) {
            existing.f[fnId] = Math.max(existing.f[fnId] || 0, count);
          }
        }
      }
    } catch (err) {
      console.log(`⚠️  Could not parse ${file}: ${err.message}`);
    }
  }

  if (Object.keys(mergedCoverage).length === 0) {
    console.log('No valid coverage data found in files.');
    process.exit(1);
  }

  // Calculate coverage stats per file
  const fileStats = [];
  let totalStatements = 0;
  let coveredStatements = 0;
  let totalFunctions = 0;
  let coveredFunctions = 0;
  let totalBranches = 0;
  let coveredBranches = 0;

  for (const [filePath, data] of Object.entries(mergedCoverage)) {
    // Count statements
    const stmts = Object.values(data.s || {});
    const stmtTotal = stmts.length;
    const stmtCovered = stmts.filter(c => c > 0).length;

    // Count functions
    const fns = Object.values(data.f || {});
    const fnTotal = fns.length;
    const fnCovered = fns.filter(c => c > 0).length;

    // Count branches
    const branches = Object.values(data.b || {}).flat();
    const branchTotal = branches.length;
    const branchCovered = branches.filter(c => c > 0).length;

    totalStatements += stmtTotal;
    coveredStatements += stmtCovered;
    totalFunctions += fnTotal;
    coveredFunctions += fnCovered;
    totalBranches += branchTotal;
    coveredBranches += branchCovered;

    const stmtPct = stmtTotal > 0 ? (stmtCovered / stmtTotal) * 100 : 0;
    const fnPct = fnTotal > 0 ? (fnCovered / fnTotal) * 100 : 0;
    const branchPct = branchTotal > 0 ? (branchCovered / branchTotal) * 100 : 0;

    fileStats.push({
      path: filePath,
      statements: { covered: stmtCovered, total: stmtTotal, pct: stmtPct },
      functions: { covered: fnCovered, total: fnTotal, pct: fnPct },
      branches: { covered: branchCovered, total: branchTotal, pct: branchPct },
    });
  }

  // Sort by path
  fileStats.sort((a, b) => a.path.localeCompare(b.path));

  // Calculate totals
  const totalStmtPct = totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0;
  const totalFnPct = totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0;
  const totalBranchPct = totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0;

  // Print console summary
  console.log('Coverage Summary by File:');
  console.log('─'.repeat(90));
  console.log(`${'File'.padEnd(50)} ${'Stmts'.padStart(10)} ${'Branch'.padStart(10)} ${'Funcs'.padStart(10)}`);
  console.log('─'.repeat(90));

  for (const file of fileStats) {
    const fileName = file.path.length > 48 ? '...' + file.path.slice(-45) : file.path;
    console.log(
      `${fileName.padEnd(50)} ${(file.statements.pct.toFixed(1) + '%').padStart(10)} ${(file.branches.pct.toFixed(1) + '%').padStart(10)} ${(file.functions.pct.toFixed(1) + '%').padStart(10)}`
    );
  }

  console.log('─'.repeat(90));
  console.log(`${'Total'.padEnd(50)} ${(totalStmtPct.toFixed(1) + '%').padStart(10)} ${(totalBranchPct.toFixed(1) + '%').padStart(10)} ${(totalFnPct.toFixed(1) + '%').padStart(10)}`);
  console.log(`\n📈 ${fileStats.length} TypeScript files, ${coveredStatements}/${totalStatements} statements covered\n`);

  // Create output directory
  fs.mkdirSync(path.join(nycOutputDir, 'html'), { recursive: true });

  // Save merged coverage JSON
  const mergedFile = path.join(nycOutputDir, 'coverage-final.json');
  fs.writeFileSync(mergedFile, JSON.stringify(mergedCoverage, null, 2));

  // Generate HTML report
  const html = generateHtmlReport(fileStats, {
    statements: { covered: coveredStatements, total: totalStatements, pct: totalStmtPct },
    functions: { covered: coveredFunctions, total: totalFunctions, pct: totalFnPct },
    branches: { covered: coveredBranches, total: totalBranches, pct: totalBranchPct },
  });

  const htmlFile = path.join(nycOutputDir, 'html', 'index.html');
  fs.writeFileSync(htmlFile, html);
  console.log(`✅ Istanbul HTML report: ${htmlFile}`);
}

function generateHtmlReport(fileStats, totals) {
  const pctClass = (pct) => pct >= 80 ? 'high' : pct >= 50 ? 'medium' : 'low';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Frontend Coverage Report (TypeScript)</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1400px;
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
      display: flex;
      gap: 40px;
    }
    .summary-item { text-align: center; }
    .summary-item h3 { margin: 0 0 10px 0; color: #666; font-size: 14px; }
    .summary-pct { font-size: 36px; font-weight: bold; }
    .summary-pct.high { color: #4CAF50; }
    .summary-pct.medium { color: #FF9800; }
    .summary-pct.low { color: #f44336; }
    .summary-detail { color: #666; font-size: 12px; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    th, td { padding: 10px 16px; text-align: left; }
    th { background: #333; color: white; font-weight: 500; }
    th:not(:first-child) { text-align: center; width: 120px; }
    td:not(:first-child) { text-align: center; }
    tr:nth-child(even) { background: #f9f9f9; }
    tr:hover { background: #f0f0f0; }
    .file-path { font-family: monospace; font-size: 13px; }
    .bar-container {
      width: 80px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      display: inline-block;
      vertical-align: middle;
      margin-right: 8px;
    }
    .bar {
      height: 16px;
      border-radius: 4px;
    }
    .bar.high { background: #4CAF50; }
    .bar.medium { background: #FF9800; }
    .bar.low { background: #f44336; }
    .pct { font-weight: 500; font-size: 13px; }
    .pct.high { color: #4CAF50; }
    .pct.medium { color: #FF9800; }
    .pct.low { color: #f44336; }
    .timestamp { color: #999; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>📊 Frontend Coverage Report (TypeScript)</h1>

  <div class="summary">
    <div class="summary-item">
      <h3>Statements</h3>
      <div class="summary-pct ${pctClass(totals.statements.pct)}">${totals.statements.pct.toFixed(1)}%</div>
      <div class="summary-detail">${totals.statements.covered}/${totals.statements.total}</div>
    </div>
    <div class="summary-item">
      <h3>Branches</h3>
      <div class="summary-pct ${pctClass(totals.branches.pct)}">${totals.branches.pct.toFixed(1)}%</div>
      <div class="summary-detail">${totals.branches.covered}/${totals.branches.total}</div>
    </div>
    <div class="summary-item">
      <h3>Functions</h3>
      <div class="summary-pct ${pctClass(totals.functions.pct)}">${totals.functions.pct.toFixed(1)}%</div>
      <div class="summary-detail">${totals.functions.covered}/${totals.functions.total}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>File</th>
        <th>Statements</th>
        <th>Branches</th>
        <th>Functions</th>
      </tr>
    </thead>
    <tbody>
      ${fileStats.map(file => `
      <tr>
        <td class="file-path">${file.path}</td>
        <td>
          <div class="bar-container"><div class="bar ${pctClass(file.statements.pct)}" style="width: ${file.statements.pct}%"></div></div>
          <span class="pct ${pctClass(file.statements.pct)}">${file.statements.pct.toFixed(0)}%</span>
        </td>
        <td>
          <div class="bar-container"><div class="bar ${pctClass(file.branches.pct)}" style="width: ${file.branches.pct}%"></div></div>
          <span class="pct ${pctClass(file.branches.pct)}">${file.branches.pct.toFixed(0)}%</span>
        </td>
        <td>
          <div class="bar-container"><div class="bar ${pctClass(file.functions.pct)}" style="width: ${file.functions.pct}%"></div></div>
          <span class="pct ${pctClass(file.functions.pct)}">${file.functions.pct.toFixed(0)}%</span>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="timestamp">Generated: ${new Date().toISOString()}</div>
</body>
</html>`;
}

main();
