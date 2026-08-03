import { describe, expect, it } from 'vitest';
import {
  TEST_SETUP_EXPORT_FORMAT,
  TEST_SETUP_EXPORT_VERSION,
  createTestSetupExportPackage,
  getTestSetupExportFileName,
  parseTestSetupImportPackage,
  sanitizeTestSetupFileName
} from './testSetupExport';

describe('test setup export helpers', () => {
  it('creates a versioned package that preserves the test setup', () => {
    const testSetup = { id: 'setup-1', name: 'Pump Test Setup', sensors: [] };

    const result = createTestSetupExportPackage(testSetup);

    expect(result).toMatchObject({
      format: TEST_SETUP_EXPORT_FORMAT,
      formatVersion: TEST_SETUP_EXPORT_VERSION,
      testSetup
    });
    expect(new Date(result.exportedAt).toString()).not.toBe('Invalid Date');
  });

  it('rejects missing test setups', () => {
    expect(() => createTestSetupExportPackage(null)).toThrow('A test setup is required for export');
  });

  it('sanitizes export filenames', () => {
    expect(sanitizeTestSetupFileName('Pump: setup / v1')).toBe('Pump setup v1');
    expect(getTestSetupExportFileName({ name: 'Pump: setup / v1' }))
      .toBe('Pump setup v1 Test Setup ISA-PHM.json');
    expect(getTestSetupExportFileName({})).toBe('test-setup Test Setup ISA-PHM.json');
  });

  it('parses a matching test setup export package', () => {
    const exportPackage = createTestSetupExportPackage({ id: 'setup-1', name: 'Pump Test Setup' });

    expect(parseTestSetupImportPackage(JSON.stringify(exportPackage))).toEqual(exportPackage.testSetup);
  });

  it('rejects project exports and malformed test setup packages', () => {
    expect(() => parseTestSetupImportPackage('{')).toThrow('The selected file is not valid JSON');
    expect(() => parseTestSetupImportPackage({ projectId: 'project-1' }))
      .toThrow('The selected file is not a test setup export');
    expect(() => parseTestSetupImportPackage({
      format: TEST_SETUP_EXPORT_FORMAT,
      formatVersion: TEST_SETUP_EXPORT_VERSION,
      testSetup: { name: 'Missing ID' }
    })).toThrow('The test setup export does not contain a valid test setup');
  });
});
