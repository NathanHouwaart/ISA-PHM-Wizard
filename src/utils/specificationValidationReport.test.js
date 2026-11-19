import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { readSpecificationValidationReport } from './specificationValidationReport';

describe('export specification report', () => {
  it('reads the report without extracting dataset entries', () => {
    const report = { status: 'fail', checks: { phm_metadata: { errors: [{ message: 'Missing unit' }] } } };
    const zip = zipSync({ 'isa-phm-validation-report.json': strToU8(JSON.stringify(report)), 'data.csv': strToU8('data') });
    expect(readSpecificationValidationReport(zip)).toEqual(report);
  });
  it('reports unavailable for older backends or malformed reports', () => {
    expect(readSpecificationValidationReport(zipSync({ 'ISA-PHM-Out.isa-phm.json': strToU8('{}') })).status).toBe('unavailable');
    expect(readSpecificationValidationReport(zipSync({ 'isa-phm-validation-report.json': strToU8('bad') })).status).toBe('unavailable');
  });
});
