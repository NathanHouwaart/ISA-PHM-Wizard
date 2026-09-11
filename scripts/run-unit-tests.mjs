import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Vitest/jsdom retains IndexedDB state across files in a worker.  Starting a
// fresh worker for every file keeps the complete suite below the local heap
// limit while still exercising every unit test.
const BATCH_SIZE = 1;
const TEST_FILE = /\.test\.(?:js|jsx)$/;

const allFiles = await readdir('src', { recursive: true });
const unitTests = allFiles
  .filter((file) => TEST_FILE.test(file))
  .map((file) => path.join('src', file))
  .filter((file) => !file.startsWith(path.join('src', 'tests', 'backend-')))
  .filter((file) => file !== path.join('src', 'tests', 'conversion-payload.contract.test.js'))
  .sort();

if (unitTests.length === 0) {
  throw new Error('No unit test files were found');
}

for (let index = 0; index < unitTests.length; index += BATCH_SIZE) {
  const batch = unitTests.slice(index, index + BATCH_SIZE);
  const batchNumber = Math.floor(index / BATCH_SIZE) + 1;
  const batchTotal = Math.ceil(unitTests.length / BATCH_SIZE);
  console.log(`\nRunning unit-test batch ${batchNumber}/${batchTotal} (${batch.length} files)`);

  const result = spawnSync(
    process.execPath,
    ['node_modules/vitest/vitest.mjs', '--run', '--pool=forks', '--maxWorkers=1', ...batch],
    { stdio: 'inherit' }
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
