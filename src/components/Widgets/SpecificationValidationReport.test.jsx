import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SpecificationValidationReport from './SpecificationValidationReport';

describe('SpecificationValidationReport', () => {
  it('shows errors and the file-check limitation', () => {
    render(<SpecificationValidationReport report={{
      status: 'fail', checks: { phm_metadata: { errors: [{ code: 'unit', message: 'Missing unit' }] } },
      limitations: ['Dataset files and paths were not checked.'],
    }} />);
    expect(screen.getByText(/validation errors/)).toBeTruthy();
    expect(screen.getByText(/Missing unit/)).toBeTruthy();
    expect(screen.getByText(/Measurement files and their paths were not checked/)).toBeTruthy();
  });
  it('shows a concise success and keeps details collapsed', () => {
    render(<SpecificationValidationReport report={{ status: 'pass', checks: {}, limitations: ['Draft limitation'] }} />);
    expect(screen.getByText('Dataset exported successfully')).toBeTruthy();
    expect(screen.getByText('View validation details').parentElement.open).toBe(false);
  });
  it('makes advisories visible even when checks pass', () => {
    render(<SpecificationValidationReport report={{ status: 'pass', checks: {
      phm_metadata: { status: 'pass', advisories: [{ code: 'unit', message: 'Check the unit' }] },
    } }} />);
    expect(screen.getByText(/exported with validation warnings/)).toBeTruthy();
    expect(screen.getByText(/Check the unit/)).toBeTruthy();
  });
  it('does not claim the zip contains a missing report', () => {
    render(<SpecificationValidationReport report={{ status: 'unavailable', checks: {}, report_missing: true }} />);
    expect(screen.queryByText(/ZIP also contains/)).toBeNull();
  });
});
