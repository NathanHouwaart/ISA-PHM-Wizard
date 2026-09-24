# Test Setup Package

Standalone test setups are exported as versioned ZIP packages. Runtime storage remains split between structured browser state and IndexedDB attachment blobs; the package is the portable boundary between browsers.

## Ownership

The package contains data owned by the test setup:

- the test setup definition, components, sensors, sensor types, and protocols;
- datasheets for non-replaceable components;
- sensor-type datasheets;
- test-setup PNG/JPEG images.

Project-owned component types, component instances, experiment assignments, and component-type datasheets are intentionally excluded. They belong in the future project package.

## Version 1 layout

```text
manifest.json
test-setup.json
Datasheets/001.pdf
Images/001.png
```

`manifest.json` declares every file, its original filename, size, SHA-256 checksum, attachment ID, MIME type, and owning entity. Import rejects undeclared files, unsafe paths, duplicates, checksum mismatches, excessive sizes, excessive compression ratios, and unsupported versions.

Imported attachment IDs are regenerated and all test-setup references are remapped before the setup enters application state. Attachment records are written in one IndexedDB transaction.

Legacy version-1 JSON test-setup exports remain importable, but they cannot carry attachment files.
