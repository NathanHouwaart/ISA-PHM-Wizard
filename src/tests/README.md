# Test suites

`npm run test:unit` runs browser-independent unit and component tests.

`npm run test:contract` validates conversion payload construction, including both built-in project archives in `public/examples/`.

`RUN_BACKEND_INTEGRATION=1 npm run test:integration` runs backend conversion checks. Start the ISA-PHM backend first; the integration suite converts both complete built-in project archives.
