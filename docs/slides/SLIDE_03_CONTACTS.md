# Slide 3 — Contacts

**ISA-PHM hierarchy level:** Investigation  
**Dependencies:** None (but contacts must exist before adding publications that link to a corresponding author)

---

<table><tr>
  <td><img src="../images/annotated/isa-questionnaire-slide-3-add-contact.png" alt="Slide 3 — Add Contact button" /></td>
  <td><img src="../images/annotated/isa-questionnaire-slide-3-contact-info.png" alt="Slide 3 — Contact form filled" /></td>
  <td><img src="../images/annotated/isa-questionnaire-slide-3-contact-added.png" alt="Slide 3 — Contact card added" /></td>
</tr></table>

---

## Purpose

Records the people who contributed to the project. Contacts are linked to publications on Slide 4 via a corresponding author field.

---

## Fields per contact

| Field | Required | Description | Example |
|---|---|---|---|
| **First Name** | Yes | — | `John` |
| **Last Name** | Yes | — | `Doe` |
| **Mid Initials** | No | Middle initials if used in publications | `J` |
| **Email** | Conditionally | Required if this contact is a corresponding author on any publication | `test.123@example.com` |
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

---

## Editing and deleting

Click the **pencil icon** on a contact card to edit. Click the **trash icon** to delete.

> **Warning:** A contact cannot have their email removed if they are set as the corresponding author of a publication. Remove the corresponding-author link on Slide 4 first.

---

## Downstream use

Each contact becomes an entry in the top-level `people[]` array of `isa-phm.json`. The same list is also duplicated inside every `study.people[]`.

| Slide 3 field | JSON key |
|---|---|
| First Name | `people[].firstName` |
| Last Name | `people[].lastName` |
| Mid Initials | `people[].midInitials` |
| Email | `people[].email` |
| Phone | `people[].phone` |
| Fax | `people[].fax` |
| Address | `people[].address` |
| ORCID | `people[].comments[name="orcid"].value` |
| Affiliations | `people[].affiliation` (multiple values semicolon-delimited, e.g. `"Affiliation 1; Affiliation 2"`) |
| Roles | `people[].roles[].annotationValue` (one object per role) |

An internal `comments[name="author_id"].value` UUID is also written per person — this is used by the publication system to link author lists to contact entries.

---

[← Slide 2](./SLIDE_02_PROJECT_INFORMATION.md) | [Next: Slide 4 →](./SLIDE_04_PUBLICATIONS.md)
