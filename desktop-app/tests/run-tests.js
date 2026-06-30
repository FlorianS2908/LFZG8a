const tests = [];

global.test = function test(name, fn) {
  tests.push({ name, fn });
};

require('./app-data.test');
require('./diagnostics.test');
require('./display.test');

let failed = 0;

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`not ok - ${name}`);
    console.error(error);
  }
}

if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
} else {
  console.log(`${tests.length} test(s) passed`);
  process.exit(0);
}
