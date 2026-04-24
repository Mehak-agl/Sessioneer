# Project Brief — Sessioneer

**Project Code:** P980 / R075.1
**Client:** QUT Technology 4 Teaching (T4T) — a consortium of QUT academic and professional staff

---

## Problem

Unit coordinators at QUT managing large units (300+ students) need to schedule sessional teaching staff for 10–20 tutorials per week, delivered by 4–10 sessional staff. Currently handled via pen and paper, email chains, or shared spreadsheets — painful for everyone involved.

## Goal

Build a proof-of-concept **Sessioneer** system that makes it easier for unit coordinators and sessional staff to negotiate and confirm teaching schedules.

---

## Core Features (Proof of Concept)

1. **Unit coordinator** creates a Sessioneer instance for a unit and a set of potential sessional staff
2. **Sessional staff** indicate their availability and how many sessions they are able to teach
3. **Unit coordinator** views feasible allocations and selects options for sessional staff to confirm
4. **Data** can be viewed and exported at any point in time
5. System handles: access control, audit/history tracking, business continuity

---

## Key Considerations

- **Access control** — Sessional staff may not yet have QUT logins (not yet appointed), so the system likely needs an invitation-based flow rather than relying on QUT credentials
- **Audit/history tracking** — Changes to schedules and availability should be traceable
- **Business continuity** — System should be reliable and recoverable
- **QUT IT environment** — Deployment should be designed with QUT infrastructure in mind

---

## Deliverables

- User analysis: needs, capabilities, use cases
- Review of existing scheduling technologies
- System architecture proposals
- Team formation models and processes
- Implemented and evaluated proof-of-concept prototype
- Project artefacts usable and extensible by future teams

---

## Client Preferences

- Code should be **straightforward, readable and maintainable** — not clever or opaque
- Leverage existing systems and standards where appropriate — don't reinvent wheels
- Fortnightly meetings, on-campus or online
