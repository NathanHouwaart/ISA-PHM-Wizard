/**
 * Generate a unique identifier
 * Uses crypto.randomUUID() if available (modern browsers),
 * falls back to timestamp + random for older environments
 * 
 * @returns {string} A unique identifier string
 */
export const generateId = () => {
  // Check if crypto.randomUUID is available
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers or Node.js without crypto
  // Format: timestamp-random-random
  const timestamp = Date.now().toString(36);
  const randomPart1 = Math.random().toString(36).substring(2, 9);
  const randomPart2 = Math.random().toString(36).substring(2, 9);
  
  return `${timestamp}-${randomPart1}-${randomPart2}`;
};

export default generateId;
