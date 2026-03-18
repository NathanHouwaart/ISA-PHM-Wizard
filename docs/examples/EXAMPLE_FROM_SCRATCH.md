# Example — From Scratch: Simple Bearing Diagnostics

This walkthrough creates a complete ISA-PHM project from a blank installation. It uses a simple, invented scenario — an accelerated seeded-fault test on two bearing types — so every step has a concrete example value to copy or adapt.

For the pre-loaded real-world examples, see [Example: Sietze](./EXAMPLE_SIETZE.md) and [Example: Milling](./EXAMPLE_MILLING.md).

---

## Scenario

**Experiment:** Outer-race bearing fault diagnostics on a motor-pump test bench.  
**Template:** Diagnostic Experiment (single-run)  
**Studies:** 3 — Healthy, BPFO Severity 1, BPFO Severity 2  
**Sensors:** 2 vibration accelerometers (ch1, ch2)  
**Variables:** Fault Type, Fault Severity (fault specs) + Motor Speed, Load (operating conditions)

---

## Part 1 — Build the Test Setup

### 1.1 Open Test Setups

Click **Test Setups** → **Add Test Setup**.

[SCREENSHOT: Test Setups page — empty, "Add Test Setup" button]

### 1.2 Basic Info

| Field | Value |
|---|---|
| Name | `Motor-Pump Bench` |
| Location | `Lab 4, Building 3` |
| Experiment Preparation Protocol Name | `Bearing Installation SOP v1` |
| Set-up or test specimen-name | `Motor-pump-bench-A` |
| Description | `Electric induction motor driving a centrifugal pump. Bearing faults injected manually. Two accelerometers mounted at drive-end bearing housing.` |

[SCREENSHOT: Basic Info tab — fields filled as above]

### 1.3 Characteristics

Click **+ Add Characteristic** three times and fill:

| Category | Value | Unit |
|---|---|---|
| Motor | Siemens 1LA7113 | |
| Motor Nominal Speed | 1500 | RPM |
| Test Bearing | SKF 6308 | |

[SCREENSHOT: Characteristics tab — three rows filled]

### 1.4 Sensors

Click **+ Add Sensor** twice:

| Alias | Model | Type | Measurement Type |
|---|---|---|---|
| `vib_ch1` | PCB 352C33 | Accelerometer | Vibration |
| `vib_ch2` | PCB 352C33 | Accelerometer | Vibration |

[SCREENSHOT: Sensors tab — two sensors listed]

### 1.5 Configurations

Click **+ Add Configuration** three times:

| Name | Replaceable Component ID |
|---|---|
| `Healthy Bearing` | `RC-001` |
| `BPFO Severity 1` | `RC-002` |
| `BPFO Severity 2` | `RC-003` |

[SCREENSHOT: Configurations tab — three configurations]

### 1.6 Measurement Protocols

Click **+** to add one variant named `Standard Acquisition`.

Add two parameters using suggestion chips:
- `Sampling Rate` → vib_ch1: `25.6`, vib_ch2: `25.6`
- `Record Length` → vib_ch1: `10`, vib_ch2: `10`

[SCREENSHOT: Measurement Protocols tab — one variant, two parameters, sensor columns filled]

### 1.7 Processing Protocols

Click **+** to add one variant named `FFT Envelope`.

Add parameters:
- `Window Function` → vib_ch1: `Hann`, vib_ch2: `Hann`
- `FFT Size` → vib_ch1: `4096`, vib_ch2: `4096`

[SCREENSHOT: Processing Protocols tab — one variant, parameters filled]

### 1.8 Save

Click **Add Test Setup**.

[SCREENSHOT: Save confirmation / return to test setup list showing "Motor-Pump Bench"]

---

## Part 2 — Create and Configure the Project

### 2.1 Open ISA Questionnaire

Click **ISA Questionnaire**. The Project Sessions modal opens.

[SCREENSHOT: Project Sessions modal — empty, "New Project" button visible]

### 2.2 Create project

Click **New Project**. Name it `Bearing Fault Diagnostics 2026`. Confirm.

[SCREENSHOT: New project card created — "Bearing Fault Diagnostics 2026"]

### 2.3 Set template

Click **Template** on the project card → select **Diagnostic Experiment** → save.

[SCREENSHOT: Template dialog — Diagnostic Experiment selected]

### 2.4 Link test setup

Click **Test Setup** → select `Motor-Pump Bench` → save.

[SCREENSHOT: Test Setup dialog — Motor-Pump Bench selected]

### 2.5 Select the project

Click the project card to make it active. The modal closes, questionnaire loads.

[SCREENSHOT: Slide 1 — Introduction with project name "Bearing Fault Diagnostics 2026" visible in header]

---

## Part 3 — Fill the Questionnaire

### Slide 2 — Project Information

| Field | Value |
|---|---|
| Title | `Bearing Fault Diagnostics 2026` |
| Description | `Seeded outer-race bearing fault diagnostics. Three fault conditions (healthy, BPFO severity 1, BPFO severity 2) at one operating point. Two accelerometers, drive-end housing.` |
| License | `CC BY 4.0` |
| Data collection date | `2026-03-01` |
| Public release date | `2026-09-01` |

[SCREENSHOT: Slide 2 — filled fields]

Click **Next**.

### Slide 3 — Contacts

Click **Add Contact**:
- First Name: `Nathan`, Last Name: `Houwaart`
- Email: `n.houwaart@example.com`
- Roles: `Conceptualization`, `Data curation`

[SCREENSHOT: Slide 3 — one contact card]

Click **Next**.

### Slide 4 — Publications

Skip for now (no publication yet). Click **Next**.

### Slide 5 — Experiment Descriptions

Click **Add** three times:

| Name | Configuration | Description |
|---|---|---|
| `Healthy Run` | Healthy Bearing | Baseline measurement with no induced fault |
| `BPFO Severity 1` | BPFO Severity 1 | Outer-race fault, mild severity |
| `BPFO Severity 2` | BPFO Severity 2 | Outer-race fault, high severity |

[SCREENSHOT: Slide 5 — three experiment cards with configurations selected]

Click **Next**.

### Slide 6 — Fault Specifications

Click suggestion chips to add:
- **Fault Type** (Qualitative fault specification)
- **Fault Severity** (Quantitative fault specification)

[SCREENSHOT: Slide 6 — two rows added via chips]

Click **Next**.

### Slide 7 — Operating Conditions

Click suggestion chips to add:
- **Rotational Speed** (RPM)
- **Load** (N)

[SCREENSHOT: Slide 7 — two rows added]

Click **Next**.

### Slide 8 — Test Matrix

Fill the grid:

| Study | Fault Type | Fault Severity | Rotational Speed | Load |
|---|---|---|---|---|
| Healthy Run | None | 0 | 1500 | 50 |
| BPFO Severity 1 | BPFO | 1 | 1500 | 50 |
| BPFO Severity 2 | BPFO | 2 | 1500 | 50 |

Click a cell and type. Tab moves to the next cell.

[SCREENSHOT: Slide 8 — grid filled with values from table above]

Click **Next**.

### Slide 9 — Raw Measurement Output

For each study, select **Measurement Protocol**: `Standard Acquisition`.

Fill file names:

| Study | vib_ch1 | vib_ch2 |
|---|---|---|
| Healthy Run | `healthy_ch1.mat` | `healthy_ch2.mat` |
| BPFO Severity 1 | `bpfo_sev1_ch1.mat` | `bpfo_sev1_ch2.mat` |
| BPFO Severity 2 | `bpfo_sev2_ch1.mat` | `bpfo_sev2_ch2.mat` |

[SCREENSHOT: Slide 9 — grid with protocols and file names filled]

Click **Next**.

### Slide 10 — Processing Protocol Output

For each study, select **Processing Protocol**: `FFT Envelope`.

Fill file names:

| Study | vib_ch1 | vib_ch2 |
|---|---|---|
| Healthy Run | `healthy_envelope_ch1.csv` | `healthy_envelope_ch2.csv` |
| BPFO Severity 1 | `bpfo_sev1_envelope_ch1.csv` | `bpfo_sev1_envelope_ch2.csv` |
| BPFO Severity 2 | `bpfo_sev2_envelope_ch1.csv` | `bpfo_sev2_envelope_ch2.csv` |

[SCREENSHOT: Slide 10 — grid filled]

---

## Part 4 — Convert and Export

Click **Convert to ISA-PHM**.

[SCREENSHOT: Conversion loading state]

[SCREENSHOT: Download prompt / success message]

Download the ZIP. It contains:

```
i_investigation.txt
s_study_01.txt    ← Healthy Run
s_study_02.txt    ← BPFO Severity 1
s_study_03.txt    ← BPFO Severity 2
a_st01_st01.txt   ← Healthy Run, raw measurement assay (vib_ch1, vib_ch2)
a_st01_st02.txt   ← Healthy Run, processing assay
a_st02_st01.txt   ← BPFO Severity 1, raw measurement assay
...
```

---

## What you learned

- Test setups must be built before creating projects
- Configurations from the test setup populate the Slide 5 dropdown
- Study variables (Slides 6–7) become columns in the Test Matrix (Slide 8)
- Sensors from the test setup become columns in Slides 9–10
- The protocol selected per study determines the acquisition/processing parameters in the assay files

---

[Real-world example: Sietze →](./EXAMPLE_SIETZE.md) | [Real-world example: Milling →](./EXAMPLE_MILLING.md)
