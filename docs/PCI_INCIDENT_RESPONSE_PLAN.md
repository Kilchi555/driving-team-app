# PCI Incident Response Plan — Simy IT Systems Kilchenmann

| | |
|---|---|
| **Company** | Simy IT Systems Kilchenmann |
| **Effective Date** | 2026-05-29 |
| **Review Date** | 2027-05-29 (reviewed and tested at least annually) |
| **Approved By** | Pascal Kilchenmann, Owner / Managing Director |
| **Contact** | info@simy.ch |

---

## Purpose and Objective

This plan defines how Simy IT Systems Kilchenmann ("we", "Simy") responds to security
incidents that could impact cardholder data or PCI DSS compliance. Its goal is to
minimise risks, contain incidents rapidly, and ensure effective communication with
affected parties.

This process applies to all systems, networks, and personnel involved in processing,
transmitting, or storing payment-related data. It covers all types of security
incidents, including suspected breaches, malware infections, unauthorised access,
account compromise, and data-loss events.

> **Context:** Card data is never stored, processed, or transmitted on Simy systems — it
> is handled exclusively by Wallee's PCI-certified hosted payment page. The most relevant
> incident types for Simy are therefore: compromise of an administrative account,
> compromise of Wallee API credentials, unauthorised access to the Supabase database, or
> compromise of the Vercel hosting environment.

## Roles and Responsibilities

| Role | Responsibility |
|------|----------------|
| **Incident Coordinator** — Pascal Kilchenmann (info@simy.ch) | Coordinates incident management, documents the incident, and informs relevant parties (e.g. acquirer, Wallee, authorities, affected customers). |
| **Technical Lead** — Pascal Kilchenmann | Analyses technical root causes, performs containment (rotating secrets, revoking access) and recovery. |
| **Communications Lead** — Pascal Kilchenmann | Manages internal and external communications, including with customers and regulatory authorities. |

> Note: As a small organisation, these roles are currently held by the owner, Pascal
> Kilchenmann. They will be delegated as the team grows.

## Key Contacts

| Party | Contact |
|-------|---------|
| Wallee Support | support@wallee.com |
| Swiss Data Protection Authority (FDPIC / EDÖB) | https://www.edoeb.admin.ch — for personal-data breaches under the revised Swiss FADP (revDSG) |
| Cantonal Police | For suspected criminal activity (e.g. cyber crime) |
| Hosting provider | Vercel — https://vercel.com/help |
| Database provider | Supabase — support@supabase.io |

## Incident Response Procedure

1. **Detection and Reporting** — Any suspicious activity is reported immediately to the
   Incident Coordinator (info@simy.ch).
2. **Identification and Initial Assessment** — The incident is logged (date, time and
   detailed observations) and a preliminary analysis is performed to determine the nature
   and scope of the incident.
3. **Containment** — Affected systems are isolated to prevent further damage. Typical
   Simy containment actions:
   - Rotate Wallee API credentials (space user / API secret) in the environment configuration.
   - Rotate Supabase keys (service-role / anon keys) and review Row Level Security policies.
   - Revoke/disable compromised administrative accounts; force password resets and require passkey/MFA re-enrolment.
   - Roll back or take affected Vercel deployments offline if needed.
4. **Communication** — Wallee (support@wallee.com) and affected customers are notified
   without undue delay. Where personal data is affected, the FDPIC (EDÖB) is notified in
   accordance with the revised Swiss FADP; suspected criminal activity is reported to the
   cantonal police.
5. **Eradication** — The threat is eliminated from the system, the root cause and
   vulnerabilities are identified, and any malware or unauthorised access points are
   removed.
6. **Recovery** — Systems are verified, cleaned, and safely restored to operation.
   Systems are tested to ensure everything runs securely before normal operation resumes.
7. **Post-Incident Review** — The incident is documented, analysed, and corrective
   measures are defined and implemented to prevent recurrence.

## Communication

All incidents affecting cardholder data or PCI compliance must be reported **without
delay** to Wallee (support@wallee.com) and, where applicable, to regulatory authorities
(FDPIC / EDÖB for personal-data breaches; cantonal police in case of criminal activity).
Internal communication must always occur through secure channels.

## Training and Review

All relevant employees receive annual training on incident response processes. This plan
is tested at least once a year and updated as needed.
