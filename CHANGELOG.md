# Changelog

All notable changes to this project are documented in this file.

## Unreleased

### Breaking
- Assay filenames are now study-local (`se01`, `se02`, ...) instead of `a_stXX_seXX`.
  This affects downstream selectors that previously relied on study-prefixed assay names.

### Changed
- Conversion download filenames now default to `<Project Name> ISA-PHM.json`.
- Project export filenames now default to `<Project Name> ISA-PHM.json`.
- In-app file explorer now supports folder selection with recursive expansion to files.
- Explorer folder navigation now avoids unnecessary lazy-load calls when children are already available in memory.
