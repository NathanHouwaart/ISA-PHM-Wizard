import { strFromU8, unzipSync } from 'fflate';

const REPORT_NAME = 'isa-phm-validation-report.json';
const MAX_REPORT_BYTES = 4 * 1024 * 1024;

export function readSpecificationValidationReport(archiveBytes) {
  try {
    const entries = unzipSync(archiveBytes, {
      filter: (entry) => entry.name === REPORT_NAME && entry.originalSize <= MAX_REPORT_BYTES,
    });
    if (!entries[REPORT_NAME]) throw new Error('No readable validation report was included.');
    const report = JSON.parse(strFromU8(entries[REPORT_NAME]));
    if (!['pass', 'fail', 'incomplete', 'unavailable'].includes(report?.status)
      || !report.checks || typeof report.checks !== 'object') {
      throw new Error('The validation report has an unexpected format.');
    }
    return report;
  } catch {
    return {
      status: 'unavailable', checks: {}, report_missing: true,
      limitations: ['The conversion service did not provide a readable shared validation report.',
        'Dataset files and paths were not checked.'],
    };
  }
}
