/**
 * Z-index layer constants for consistent stacking context management
 * 
 * Use these constants instead of hardcoded z-index values to ensure
 * predictable layering across the application.
 */

export const Z_INDEX = {
  // Base layers
  BASE: 0,
  
  // Navigation and persistent UI
  NAVBAR: 50,
  
  // Overlays and modals
  MODAL_BACKDROP: 90,
  MODAL: 95,
  DIALOG: 100,
  
  // Tooltips and popovers (should appear above modals)
  TOOLTIP: 110,
  POPOVER: 110,
  
  // Notifications and alerts (highest priority)
  NOTIFICATION: 120,
  ALERT: 120,
};

export default Z_INDEX;
