export const TEST_SETUP_EXPORT_FORMAT = 'isa-phm-test-setup';
export const TEST_SETUP_EXPORT_VERSION = 1;

export const sanitizeTestSetupFileName = (value) => {
  const source = typeof value === 'string' ? value : '';
  return source
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const createTestSetupExportPackage = (testSetup) => {
  if (!testSetup || typeof testSetup !== 'object') {
    throw new Error('A test setup is required for export');
  }

  return {
    format: TEST_SETUP_EXPORT_FORMAT,
    formatVersion: TEST_SETUP_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    testSetup
  };
};

export const getTestSetupExportFileName = (testSetup) => {
  const baseName = sanitizeTestSetupFileName(testSetup?.name) || 'test-setup';
  return `${baseName} Test Setup ISA-PHM.json`;
};

export const parseTestSetupImportPackage = (value) => {
  let importPackage = value;

  if (typeof value === 'string') {
    try {
      importPackage = JSON.parse(value);
    } catch {
      throw new Error('The selected file is not valid JSON');
    }
  }

  if (!importPackage || typeof importPackage !== 'object') {
    throw new Error('The selected file is not a test setup export');
  }

  if (importPackage.format !== TEST_SETUP_EXPORT_FORMAT) {
    throw new Error('The selected file is not a test setup export');
  }

  if (importPackage.formatVersion !== TEST_SETUP_EXPORT_VERSION) {
    throw new Error(`Unsupported test setup export version: ${importPackage.formatVersion ?? 'unknown'}`);
  }

  const testSetup = importPackage.testSetup;
  if (!testSetup || typeof testSetup !== 'object' || typeof testSetup.id !== 'string' || !testSetup.id.trim()) {
    throw new Error('The test setup export does not contain a valid test setup');
  }

  return testSetup;
};
