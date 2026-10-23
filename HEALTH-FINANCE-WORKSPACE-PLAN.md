# Enermind Business — product and trust plan

## Mission

Build a global work platform that helps buyers hire capable people, helps sellers deliver digital services, and helps workers/learners gain practical experience with Google Sheets, Google Docs, automation, and carefully governed health/finance data support.

A $100 billion valuation is an aspiration, not a forecast or guarantee. The path to a durable company is solving real problems, earning customer trust, delivering measurable quality, and building repeatable revenue.

## Core work categories

1. Google Sheets automation: formulas, data validation, dashboards, Apps Script and approved workflows.
2. Google Docs editing: formatting, proofreading, templates and structured documents.
3. Health data support: only approved data entry, formatting, coding support or cleaning using sample/de-identified records in the initial release.
4. Finance data support: bookkeeping support, data entry, reconciliation, reporting preparation and cleaning; not personalised investment recommendations or guaranteed returns.
5. Data cleaning and document operations.

## Roles

- Buyer: search approved listings, submit work requests, evaluate applications and track own project activity.
- Seller: submit service listings; new listings remain pending until admin review.
- Both: buyer and seller capabilities.
- Worker: browse open permitted tasks and apply.
- Learner: follow learning paths, practise with safe sample tasks, and apply to beginner tasks.

Account type is a product preference, not an admin role. Admin privileges must be enforced separately by the backend and not inferred from account type.

## Google Sheets and Drive storage

See `DATA-STORAGE-ARCHITECTURE.md` for the separate Marketplace, Worker Operations, Learner Academy and Admin Operations spreadsheets, plus private Google Drive folders. Do not expose any operational spreadsheet or folder publicly.

## Operational tabs by spreadsheet

- `Sellers`: public listing fields and private moderation fields.
- `Buyers`: minimal buyer record reference.
- `Buyer_Social_Contacts`: public profile URLs that buyers add for contact/discovery, with a consent/public-basis confirmation. Never store login details, passwords, recovery codes, private messages, or private profile data.
- `Work_Requests`: buyer task requests, scope, budget and data sensitivity.
- `Task_Applications`: worker/learner proposals.
- `Deliverables`: submitted Google Docs/Sheets URLs and review status.
- `Buyer_Activity`: each buyer's own contact/project tracking.
- `Learning_Progress`: training progress.
- `Categories`: service categories.
- `Audit_Log`: operational audit trail.

## Trust and privacy requirements

- Start with sample or de-identified health/finance data only.
- Use minimum-necessary access, data minimisation, retention limits, secure sharing and audit logs.
- Never collect bank login passwords, card security codes, private keys, seed phrases, or third-party account credentials.
- Do not expose any private operational spreadsheet to buyers, sellers, workers, or learners.
- Show seller contact details only with consent; show only approved and available listings.
- Review new listings and reports; provide suspension and takedown processes.
- Keep worker payouts manual until a documented review and reconciliation workflow exists.
- Make no promises of guaranteed jobs, earnings, health outcomes, investment performance, or company valuation.

## Launch sequence

1. Private pilot with sample data and test accounts.
2. Admin-reviewed seller directory and buyer requests.
3. Task applications, deliverable review, and manual payout register.
4. Learner course content and qualification checks.
5. Security/privacy review before any real health/finance data.
6. Measure buyer repeat rate, seller response time, task completion, dispute rate, worker earnings actually paid, and support cost before scaling.
