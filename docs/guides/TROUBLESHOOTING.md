# Troubleshooting

Quick reference for the most common problems in the ISA-PHM Wizard, organized by where you encounter them.

---

## Project Sessions modal

### "No test setups available" when trying to link a test setup

**Cause:** You haven't created any test setups yet.  
**Fix:** Go to **Test Setups** → **Add Test Setup**, fill the Basic Info tab, and save.

---

## Slide 5 — Experiment Descriptions

### Configuration dropdown is empty

**Cause:** The selected test setup has no configurations defined.  
**Fix:** Edit the test setup → **Configurations** tab → add at least one configuration.

---

## Slide 8 — Test Matrix

### Grid has no variable columns (only a study column)

**Cause:** No study variables exist. You skipped Slides 6 and/or 7.  
**Fix:** Go back to Slide 6 and add fault specifications. Go to Slide 7 and add operating conditions. Return to Slide 8.

### Grid has no study rows

**Cause:** No experiments were created on Slide 5.  
**Fix:** Go back to Slide 5 and add at least one experiment.

---

## Slides 9 & 10 — Output Mapping

### Measurement protocol dropdown is empty (Slide 9)

**Cause:** The selected test setup has no measurement protocols.  
**Fix:** Edit the test setup → **Measurement** tab → add at least one protocol variant.

### Processing protocol dropdown is empty (Slide 10)

**Cause:** The selected test setup has no processing protocols.  
**Fix:** Edit the test setup → **Processing** tab → add at least one protocol variant.

### No sensor columns appear in the output grid

**Cause:** The selected test setup has no sensors.  
**Fix:** Edit the test setup → **Sensors** tab → add at least one sensor. Re-open the questionnaire.

### No study rows appear in the output grid

**Cause:** No experiments on Slide 5.  
**Fix:** Go back to Slide 5 and add experiments.

---

## Export / Convert to ISA-PHM

### Network error or timeout

**Cause:** The backend service is unreachable.  
**Fix:** Check your internet connection. Wait a moment and retry. If the problem persists, the backend may be temporarily unavailable.

### Conversion returns 4xx error

**Cause:** The metadata payload is malformed — most commonly a missing required field such as investigation title or contact email.  
**Fix:** Review Slides 2–4 and ensure all required fields are filled. Retry.

### Assay files in the ZIP are mostly empty

**Cause:** The file/value mappings in Slides 9 and/or 10 were not filled in.  
**Fix:** Return to Slides 9–10, fill in the file names or values per sensor per run, and re-convert.

---

## Data looks wrong after reloading the page

All project data is saved in **browser localStorage**. If data appears wrong or stale:
1. Open browser DevTools → Application → Local Storage.
2. Look for keys prefixed with `globalAppData_`.
3. Delete only the keys for the affected project (the key includes the project ID).
4. Reload and re-import the project from a previously exported JSON if available.

> **Never rely solely on localStorage for important data.** Export your project regularly as a JSON backup.

---

## Unsaved test setup changes lost

If you close the test setup editor without saving, a dialog asks whether to save, keep editing, or discard. If you accidentally discarded changes, they cannot be recovered unless you had exported the project.

---

## Slide renders blank / shows loading state indefinitely

**Cause:** The slide is waiting for project data that never loads (usually a stale project ID in localStorage).  
**Fix:** Use **Change Project** in the questionnaire header to re-select the project. If the problem persists, delete localStorage keys for that project and re-import from a JSON backup.

---

## Related guides

- [ISA-PHM Concepts — dependency chain](./GUIDE_CONCEPTS.md#dependency-chain)
- [Test Setups](./GUIDE_TEST_SETUPS.md)
- [Questionnaire overview](./GUIDE_QUESTIONNAIRE.md)
- [Export guide](./GUIDE_EXPORT.md)
