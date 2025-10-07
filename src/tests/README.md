# ISA-PHM Wizard Test Suite

## Overview

This directory contains comprehensive integration tests for the ISA-PHM Wizard application, validating the complete conversion pipeline from the application's data model to the ISA-PHM format by calling the actual backend API.

## Test Files

### `conversion-integration.test.js`

**Type**: Integration Tests (Requires Backend API)

**Purpose**: Tests the complete end-to-end conversion pipeline by calling the actual backend API and comparing the response with the golden output file.

**Input**: `src/data/isa-project-example.json` - The default project configuration  
**Golden Output**: `isa-phm-out.json` - The expected ISA-PHM formatted result (generated once from backend)

**Prerequisites**:
```powershell
# Start the backend server first
cd ..\ISA-PHM-Backend
python -m uvicorn main:app --reload --port 8080
```

**Test Coverage**:

#### 1. Backend Availability (1 test)
- Checks if backend is running on localhost:8080
- Gracefully skips tests if backend not available

#### 2. API Response Structure (5 tests)
- Valid JSON response
- Investigation level fields present
- People array structure
- Publications array structure
- Studies array structure

#### 3. Investigation Level Data (6 tests)
- Investigation identifier matches golden output
- Title matches golden output
- Description matches golden output
- Submission date matches golden output
- Public release date matches golden output
- License in comments matches golden output

#### 4. People/Authors from API (3 tests)
- Correct number of people
- People data matches golden output (names, emails, affiliations)
- Roles match golden output
- Author IDs in comments match golden output

#### 5. Publications from API (2 tests)
- Correct number of publications
- Publication data matches golden output (title, DOI, status)

#### 6. Studies from API (5 tests)
- Correct number of studies
- Study identifiers match golden output
- Study titles match golden output
- Study descriptions match golden output
- Study filenames match golden output

#### 7. Study Protocols from API (4 tests)
- Correct number of protocols per study
- Experiment preparation protocol present with correct name
- Correct protocol type counts (measurement vs processing)
- Sensor IDs in measurement protocol comments

#### 8. Study Materials from API (3 tests)
- Materials structure present (sources and samples)
- Sources array present
- Samples with characteristics and factor values

#### 9. Study Factors from API (2 tests)
- Correct number of factors per study
- Factor names match golden output

#### 10. Assays from API (6 tests)
- Correct number of assays per study
- Assay filenames match golden output
- Technology platforms match golden output
- Measurement and technology types match golden output
- Data file types match golden output
- Process sequence lengths match golden output

#### 11. Data Format Validation (4 tests)
- ISO date format validation
- Valid email addresses
- Valid DOI format
- No undefined values in critical fields

#### 12. API Performance (1 test)
- Conversion completes in < 10 seconds

#### 13. Cross-References (2 tests)
- Valid protocol references in processes
- Valid material references in processes

#### 14. Complete Golden Output Comparison (5 tests)
- Investigation-level fields exactly match
- Structure counts identical (people, publications, studies, protocols, factors, assays)
- Characteristic categories match
- Unit categories match with values
- JSON structure consistency

**Total Tests**: 48 comprehensive integration tests

**Behavior**:
- Calls actual backend API at `http://localhost:8080/convert`
- Sends FormData with JSON payload matching frontend's `useSubmitData` hook format
- Compares API response against golden output (`isa-phm-out.json`)
- Skips all tests with helpful warnings if backend is not running
- Validates both structure AND actual values

---

## Running the Tests

### Run integration tests (backend required)
```powershell
npm test conversion-integration
```

### Run tests once (non-watch mode)
```powershell
npm test conversion-integration -- --run
```

### Run all tests
```powershell
npm test
```

### Run tests in watch mode
```powershell
npm test -- --watch
```

## Test Philosophy

### End-to-End Integration Testing

The test suite validates the complete pipeline:

1. **Real Backend Calls**: Actually calls the backend API, not mocked
2. **Golden Output Comparison**: Compares against known-good output (`isa-phm-out.json`)
3. **Value Validation**: Checks actual values, not just property existence
4. **Regression Detection**: Catches changes in backend conversion logic
5. **Performance Monitoring**: Ensures conversion completes in reasonable time

### Test Structure

- **beforeAll**: Makes single API call and stores response for all tests
- **Conditional Skipping**: Tests skip gracefully if backend unavailable
- **Detailed Comparisons**: Validates structure, values, counts, and cross-references
- **Helpful Messages**: Provides clear instructions when backend is not running

## Test Data

### Input Data (`isa-project-example.json`)

This file represents the default project state with:
- 1 investigation
- 4 contacts/authors
- 1 publication
- 1 test setup (Techport)
- 2 studies defined
- 11 sensors in the test setup
- Study variables, measurement protocols, processing protocols
- Various mappings between entities

### Golden Output (`isa-phm-out.json`)

**Generated once from backend** and used as the reference for all tests:
- Complete ISA-PHM Investigation structure
- 4 people/authors with roles
- 1 publication
- 2 studies with full metadata
- 23 protocols per study (1 preparation + 11 measurement + 11 processing)
- Materials (sources and samples)
- 6 study factors
- 11 assays per study (one per sensor)
- Complete cross-references and linkages

## Extending the Tests

When adding new features to the conversion pipeline:

1. **Update the backend** with new conversion logic
2. **Regenerate golden output**: Run conversion once and save to `isa-phm-out.json`
3. **Add new test cases**: Add tests that validate new fields/structures
4. **Run tests**: Ensure all tests pass with new golden output

### Example: Adding a New Test

```javascript
it('should have new field matching golden output', () => {
  if (!backendAvailable) return;
  apiOutput.studies.forEach((study, index) => {
    const expectedStudy = expectedOutput.studies[index];
    expect(study.newField).toBe(expectedStudy.newField);
  });
});
```

## Debugging Test Failures

### Common Issues

1. **Backend Not Running**: Start backend with `python -m uvicorn main:app --reload --port 8080`
2. **Port Mismatch**: Ensure backend is on port 8080 (or update `BACKEND_URL` in test)
3. **Backend Changes**: If backend logic changed, regenerate `isa-phm-out.json`
4. **Golden Output Outdated**: Update golden output if conversion format changed intentionally

### Debugging Tips

```javascript
// Check what the backend returned
console.log('API Output:', JSON.stringify(apiOutput, null, 2));

// Compare specific sections
console.log('Expected:', expectedOutput.studies[0].protocols.length);
console.log('Actual:', apiOutput.studies[0].protocols.length);
```

### Test Output

When backend is not available:
```
⚠️  SKIPPING INTEGRATION TESTS
⚠️  Backend is not running at http://localhost:8080
⚠️  Error: fetch failed
⚠️  Start it with: cd ../ISA-PHM-Backend && python -m uvicorn main:app --reload --port 8080
```

When tests pass:
```
✅ Backend is available
✅ Conversion successful!
📊 Response has 2 studies
⏱️  Conversion time: 1234 ms

✓ should have backend running on localhost:8080
✓ should match investigation-level fields exactly
✓ ... (48 tests passing)
```

## CI/CD Integration

These tests require a running backend, so CI/CD pipelines need to:

```yaml
# GitHub Actions example
- name: Start Backend
  run: |
    cd ../ISA-PHM-Backend
    python -m uvicorn main:app --reload --port 8080 &
    sleep 5  # Wait for backend to start

- name: Run Integration Tests
  run: npm test conversion-integration -- --run
```

## Performance

- **Initial API Call**: ~1-2 seconds (called once in beforeAll)
- **All 48 tests**: < 1 second (reuse API response)
- **Total execution**: ~2-3 seconds including API call

## Maintenance

### Updating Golden Output

When the conversion format changes intentionally:

1. **Start the backend**: `python -m uvicorn main:app --reload --port 8080`
2. **Make a test conversion**: Use the frontend or call API directly with default project
3. **Save the output**: Copy response to `isa-phm-out.json`
4. **Verify manually**: Check the output is correct
5. **Run tests**: `npm test conversion-integration -- --run`
6. **Commit both**: Commit updated backend code AND `isa-phm-out.json`

### Why Golden Output Testing?

- **Regression Detection**: Catches unintended changes in backend conversion
- **Format Validation**: Ensures output structure remains consistent
- **Documentation**: Golden output serves as example of correct format
- **Confidence**: Provides confidence that backend produces expected results

## Related Files

- `src/hooks/useSubmitData.jsx` - Frontend conversion payload preparation
- `src/data/isa-project-example.json` - Input data (default project)
- `isa-phm-out.json` - Golden output (expected result from backend)
- `src/contexts/GlobalDataContext.jsx` - Data management
- Backend: `../ISA-PHM-Backend/main.py` - Actual conversion logic

## Support

For questions or issues with the tests:
1. **Check backend is running**: `curl http://localhost:8080` should respond
2. **Review test output**: Look for specific failure messages
3. **Compare outputs**: Check API response vs golden output
4. **Verify payload**: Ensure input matches frontend's `useSubmitData` format
5. **Check backend logs**: Look for errors in backend console

**Test Coverage**:

#### 1. Investigation Level Data (6 tests)
- Investigation identifier, title, description
- Submission and public release dates
- License information in comments
- Ontology source references

#### 2. Authors/Contacts (5 tests)
- People array structure and count
- Person field validation (firstName, lastName, email, affiliation, roles)
- Author ID tracking in comments
- Role structure validation
- Contact data accuracy

#### 3. Publications (4 tests)
- Publications array structure
- Publication fields (title, DOI, status, etc.)
- Publication status structure
- Data accuracy for DOI and title

#### 4. Studies - Top Level (4 tests)
- Studies array presence and count
- Required study fields
- Study metadata accuracy
- Filename naming conventions

#### 5. Study Protocols (7 tests)
- Protocols array structure
- Experiment preparation protocol
- Measurement and processing protocols per sensor
- Protocol structure validation
- Sensor ID tracking in protocol comments
- Processing protocol parameters

#### 6. Study Materials (7 tests)
- Materials object structure (sources and samples)
- Source material validation
- Sample characteristics and structure
- Test setup characteristics mapping
- Factor values
- Sample derivation relationships

#### 7. Study Factors (4 tests)
- Factors array and expected types
- Factor structure validation
- Factor descriptions
- Unit information

#### 8. Study Process Sequence (3 tests)
- Process sequence structure
- Process links (source → sample)
- Protocol execution validation

#### 9. Study Characteristic Categories (2 tests)
- Characteristic categories array
- Category structure validation

#### 10. Study Unit Categories (3 tests)
- Unit categories array
- Unit structure validation
- Common unit presence

#### 11. Assays (10 tests)
- Assays array structure
- Assay structure validation
- Filename pattern matching
- Sample material references
- Data files (raw and processed)
- Process sequence for assays
- Protocol execution in assays
- Processing parameter values
- Process chain linking
- Next/previous process references

#### 12. Study Design Descriptors (2 tests)
- Design descriptors array
- Descriptor structure validation

#### 13. Cross-References and Consistency (5 tests)
- Study publications match investigation publications
- Study people match investigation people
- Unique @id references
- Valid protocol references
- Valid material references

#### 14. Data Integrity and Format (5 tests)
- ISO date format validation
- Email address format
- DOI format validation
- No undefined/null critical values
- Non-empty arrays validation

#### 15. Measurement Type Validation (4 tests)
- Vibration measurement assays
- Current measurement assays
- Voltage measurement assays
- Measurement type and technology type consistency

**Total Tests**: 71 comprehensive validation checks

---

### `conversion-integration.test.js`

**Type**: Integration Tests (Requires Backend API)

**Purpose**: Tests the complete end-to-end conversion pipeline by calling the actual backend API at `http://localhost:8000`.

**Prerequisites**:
```powershell
# Start the backend server first
cd ..\ISA-PHM-Backend
python -m uvicorn main:app --reload
```

**What It Tests**:
- Backend availability check
- API request/response format
- Complete conversion from input JSON to ISA-PHM format
- Output comparison with expected results
- Performance (conversion time < 10 seconds)

**Test Categories**:
1. **Backend Availability** (1 test) - Checks if localhost:8000 is running
2. **API Response Structure** (5 tests) - Validates response format
3. **Investigation Level Comparison** (5 tests) - Compares investigation data
4. **People/Authors Comparison** (2 tests) - Validates people data
5. **Publications Comparison** (2 tests) - Validates publications
6. **Studies Comparison** (8 tests) - Validates studies, protocols, materials, factors, assays
7. **Protocol Structure Comparison** (3 tests) - Validates protocol types
8. **Assay Structure Comparison** (2 tests) - Validates assay structure and data files
9. **Data Format Validation** (3 tests) - Validates dates, emails, DOIs
10. **Complete Output Comparison** (5 tests) - Deep structure comparison
11. **Performance** (1 test) - Validates conversion completes in < 10 seconds

**Total Tests**: 37 integration tests

**Behavior**:
- If backend is not running, tests will be skipped with a warning message
- Tests use the same payload format as the frontend's `useSubmitData` hook
- Compares actual API output with expected `isa-phm-out.json`

---

## Running the Tests

### Run all tests
```powershell
npm test
```

### Run only structure tests (no backend required)
```powershell
npm test conversion
```

### Run only integration tests (backend required)
```powershell
npm test conversion-integration
```

### Run tests in watch mode
```powershell
npm test -- --watch
```

### Run tests once (non-watch mode)
```powershell
npm test -- --run
```

### Run with coverage
```powershell
npm test -- --coverage
```

## Test Philosophy

### Multi-Level Validation

The test suite validates the conversion at multiple levels:

1. **Structural Validation**: Ensures the output has the correct shape (arrays, objects, required fields)
2. **Data Accuracy**: Verifies that values match expected input
3. **Cross-Reference Integrity**: Validates that references between entities (@id links) are valid
4. **Format Compliance**: Checks that data follows expected formats (dates, emails, DOIs)
5. **Semantic Consistency**: Ensures logical relationships (e.g., measurement type matches technology type)

### Test Isolation

Each test is independent and focuses on a specific aspect of the conversion. Tests do not depend on each other and can be run in any order.

### Comprehensive Coverage

The test suite aims to validate:
- **Every major section** of the ISA-PHM output
- **Every data type** (strings, arrays, objects, references)
- **Every relationship** between entities
- **Edge cases** and format requirements

## Test Data

### Input Data (`isa-project-example.json`)

This file represents the default project state with:
- 1 investigation
- 4 contacts/authors
- 1 publication
- 2 test setups (Wentelteef and Techport)
- 2 studies defined
- Multiple sensors per test setup
- Study variables, measurement protocols, processing protocols
- Various mappings between entities

### Expected Output (`isa-phm-out.json`)

The expected output after conversion should contain:
- Complete ISA-PHM Investigation structure
- All people/authors with roles
- Publications
- Multiple studies with full metadata
- Protocols (preparation, measurement, processing)
- Materials (sources and samples)
- Study factors
- Assays with process sequences
- Complete cross-references and linkages

## Extending the Tests

When adding new features to the conversion pipeline:

1. **Add tests for new fields**: Ensure new fields appear in the output
2. **Add validation for new structures**: Test the structure of new data types
3. **Add cross-reference tests**: If new references are added, validate them
4. **Update expected output**: Regenerate `isa-phm-out.json` with the updated conversion

### Example: Adding a New Test

```javascript
it('should have new field in investigation', () => {
  expect(expectedOutput.newField).toBeDefined();
  expect(expectedOutput.newField).toBe('expected value');
});
```

## Debugging Test Failures

### Common Issues

1. **File Not Found**: Ensure `isa-project-example.json` and `isa-phm-out.json` exist
2. **Structure Mismatch**: Check if the conversion logic changed
3. **Data Changes**: Verify input data hasn't been modified unexpectedly
4. **Format Changes**: Ensure date/email/DOI formats are correct

### Debugging Tips

```javascript
// Add console.log to inspect data
it('should debug output', () => {
  console.log(JSON.stringify(expectedOutput.studies[0], null, 2));
  // ... test assertions
});
```

## CI/CD Integration

These tests are designed to run in continuous integration pipelines:

```yaml
# GitHub Actions example
- name: Run Tests
  run: npm test
```

The tests will exit with code 0 on success, non-zero on failure.

## Performance

The test suite is optimized for performance:
- Files are loaded once per test file (beforeEach)
- Tests run in parallel where possible
- No external API calls or database connections

Typical execution time: < 1 second for all 71 tests

## Maintenance

### Updating Expected Output

When the conversion format changes intentionally:

1. Run the application and export a new `isa-phm-out.json`
2. Manually verify the output is correct
3. Replace the old expected output file
4. Run tests to ensure they pass

### Adding New Test Categories

When adding new ISA-PHM sections:

1. Create a new `describe` block
2. Add tests for structure, data, and relationships
3. Update this README with the new category
4. Update the total test count

## Related Files

- `src/hooks/useSubmitData.jsx` - Conversion logic
- `src/data/isa-project-example.json` - Input data
- `isa-phm-out.json` - Expected output
- `src/contexts/GlobalDataContext.jsx` - Data management

## Support

For questions or issues with the tests:
1. Check the test output for specific failure messages
2. Review the conversion logic in `useSubmitData.jsx`
3. Verify input/output JSON files are correct
4. Consult the ISA-PHM specification for format details
