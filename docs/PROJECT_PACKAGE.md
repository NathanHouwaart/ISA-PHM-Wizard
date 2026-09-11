# ISA-PHM project package

Project exports use a versioned ZIP package so that editable questionnaire state and browser-stored attachments remain portable together.

```text
<project name> ISA-PHM.zip
├── manifest.json
├── project.json
├── Datasheets/
│   └── 001.pdf
└── Images/
    └── 001.png
```

`project.json` remains the authoritative editable project state. `manifest.json` records the package version and, for every file, its path, size, SHA-256 checksum, original filename, MIME type, attachment ID, and owners.

Imports are created as new projects. Attachment identifiers and the selected test-setup identifier are remapped to prevent collisions with existing browser data. The importer validates the complete package before writing, stages attachments in one IndexedDB transaction, and removes staged attachments if project persistence fails.

The importer rejects undeclared and duplicate entries, unsafe paths, encrypted or multi-part archives, excessive file counts or expanded sizes, suspicious compression ratios, invalid file signatures, unsupported attachment types, missing references, and checksum mismatches. Existing JSON-only project exports remain importable, but cannot contain attachment bytes.
