const inspector = require('node:inspector');
const path = require('node:path');

const tests = [];
const coverageThreshold = 95;
const coveredAppFiles = [
  path.join('app', 'lib', 'app-data.js'),
  path.join('app', 'lib', 'display.js'),
  path.join('app', 'lib', 'json-store.js')
];

global.test = function test(name, fn) {
  tests.push({ name, fn });
};

function normalizePath(value) {
  return value.replace(/\//g, path.sep);
}

function createCoverageSession() {
  const session = new inspector.Session();
  session.connect();

  function post(method, params = {}) {
    return new Promise((resolve, reject) => {
      session.post(method, params, (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  return {
    async start() {
      await post('Profiler.enable');
      await post('Profiler.startPreciseCoverage', {
        callCount: true,
        detailed: true
      });
    },
    async stop() {
      const result = await post('Profiler.takePreciseCoverage');
      await post('Profiler.stopPreciseCoverage');
      await post('Profiler.disable');
      session.disconnect();
      return result.result;
    }
  };
}

function summarizeCoverage(scripts) {
  const summaries = coveredAppFiles.map((filePath) => {
    const normalizedFilePath = normalizePath(filePath);
    const script = scripts.find((entry) => normalizePath(entry.url).endsWith(normalizedFilePath));

    if (!script) {
      return {
        filePath,
        covered: 0,
        total: 1,
        percent: 0
      };
    }

    const ranges = script.functions.flatMap((fn) => fn.ranges);
    const covered = ranges.filter((range) => range.count > 0).length;
    const total = ranges.length || 1;

    return {
      filePath,
      covered,
      total,
      percent: Math.round((covered / total) * 10000) / 100
    };
  });

  const covered = summaries.reduce((sum, item) => sum + item.covered, 0);
  const total = summaries.reduce((sum, item) => sum + item.total, 0);

  return {
    files: summaries,
    covered,
    total,
    percent: Math.round((covered / total) * 10000) / 100
  };
}

async function main() {
  const coverage = createCoverageSession();
  await coverage.start();

  require('./app-data.test');
  require('./display.test');
  require('./i18n.test');
  require('./json-store.test');
  require('./path-integrity.test');

  let failed = 0;

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`not ok - ${name}`);
      console.error(error);
    }
  }

  const coverageSummary = summarizeCoverage(await coverage.stop());
  console.log(`coverage - app/lib path ranges: ${coverageSummary.percent}% (${coverageSummary.covered}/${coverageSummary.total})`);
  coverageSummary.files.forEach((entry) => {
    console.log(`coverage - ${entry.filePath}: ${entry.percent}% (${entry.covered}/${entry.total})`);
  });

  if (coverageSummary.percent < coverageThreshold) {
    failed += 1;
    console.error(`coverage below ${coverageThreshold}% threshold`);
  }

  if (failed > 0) {
    console.error(`${failed} test(s) failed`);
    process.exit(1);
  } else {
    console.log(`${tests.length} test(s) passed`);
    process.exit(0);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
