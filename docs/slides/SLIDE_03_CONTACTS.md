# Slide 3 — Contacts

**ISA-PHM hierarchy level:** Investigation  
**Dependencies:** None (but contacts must exist before adding publications that link to a corresponding author)

---

[SCREENSHOT: Slide 3 — Contacts, empty state (no contacts yet)]

[SCREENSHOT: Slide 3 — Contacts, one contact card expanded showing all fields]

---

## Purpose

Records the people who contributed to the project. Contacts are linked to publications on Slide 4 via a corresponding author field.

---

## Fields per contact

| Field | Required | Description | Example |
|---|---|---|---|
| **First Name** | Yes | — | `Sietze` |
| **Last Name** | Yes | — | `Houwaart` |
| **Mid Initials** | No | Middle initials if used in publications | `J` |
| **Email** | Conditionally | Required if this contact is a corresponding author on any publication | `s.houwaart@example.com` |
| **Phone** | No | — | — |
| **Fax** | No | — | — |
| **Address** | No | Institutional address | — |
| **ORCID** | No | Persistent researcher identifier | `0000-0001-2345-6789` |
| **Affiliations** | No | One or more institutional affiliations | `Delft University of Technology` |
| **Roles** | No | Contribution roles | `Conceptualization`, `Data curation` |

---

## Adding contacts

Click **Add Contact** (or **Add Contact Now** in the empty state).

Fill the fields in the card that appears. Affiliations and Roles can be multi-valued — type an entry and press Enter (or use the add button) to add another.

[SCREENSHOT: Slide 3 — contact form card open, multiple affiliations and roles filled]

---

## Editing and deleting

Click the **pencil icon** on a contact card to edit. Click the **trash icon** to delete.

> **Warning:** A contact cannot have their email removed if they are set as the corresponding author of a publication. Remove the corresponding-author link on Slide 4 first.

---

## Downstream use

Contacts appear in the `INVESTIGATION CONTACTS` block of `i_investigation.txt`. Each contact's roles and affiliations are serialized as semicolon-delimited values in the ISA format.

---

[← Slide 2](./SLIDE_02_PROJECT_INFORMATION.md) | [Next: Slide 4 →](./SLIDE_04_PUBLICATIONS.md)
