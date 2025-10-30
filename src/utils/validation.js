// Small validation utilities used across the app

/**
 * Returns true if the provided string is a syntactically valid email address.
 * This is a lightweight check intended for form validation (not full RFC spec).
 */
export function isValidEmail(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  // Basic, commonly used email regex that balances strictness and practicality
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed);
}

export default {
  isValidEmail,
};
