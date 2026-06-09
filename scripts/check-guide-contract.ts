import { validateGuideContracts, validateGuideContractSource } from '../lib/guides';

if (process.argv.includes('--demo-missing')) {
  const result = validateGuideContractSource(
    'missing-demo',
    '---\ntitle: 临时缺字段测试\n---\n\n# 临时缺字段测试\n',
  );
  console.log(JSON.stringify(result));
  process.exit(result.errors.length > 0 ? 0 : 1);
}

const failures = validateGuideContracts();

if (failures.length > 0) {
  console.error('Guide contract check failed:');
  for (const failure of failures) {
    console.error(`- ${failure.slug}`);
    for (const error of failure.errors) {
      console.error(`  - ${error}`);
    }
  }
  process.exit(1);
}

console.log('Guide contract check passed.');
