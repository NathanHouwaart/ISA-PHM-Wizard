export const shouldRunBackendIntegration = () => {
  const explicit = process.env.RUN_BACKEND_INTEGRATION;
  if (explicit === '1') return true;
  if (explicit === '0') return false;
  return process.env.CI === 'true';
};

