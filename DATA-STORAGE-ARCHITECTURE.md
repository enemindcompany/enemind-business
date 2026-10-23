# Enermind Business — separate data workspaces

## Product separation

1. **Marketplace (buyers and sellers):** eligible account-related services, seller listings, country/category search, buyer social profile references, contact/activity tracking.
2. **Worker operations:** paid project requests, applications, assignments, deliverable references and project status.
3. **Learner academy:** course progress, exercises, assessments and learner portfolio metadata.
4. **Admin operations:** audit events, moderation and administrative reporting.

Account type is not an admin role. Administrative privileges must be separately verified by the trusted backend.

## Separate Google Sheets

| Spreadsheet | Tabs | Intended use |
|---|---|---|
| Enermind Marketplace | Sellers, Buyers, Buyer_Social_Contacts, Buyer_Activity, Categories | Buyer/seller marketplace only |
| Enermind Worker Operations | Work_Requests, Task_Applications, Deliverables | Client projects and worker workflow |
| Enermind Learner Academy | Learning_Progress | Training progress only |
| Enermind Admin Operations | Audit_Log | Restricted administration/audit |

Apps Script routes data by tab name. The sheets are private operational registers, not public frontend data sources. The application calls a trusted Supabase Edge Function, which verifies the Firebase token and checks the user's account type before forwarding the action to Apps Script.

## Google Drive storage

The setup function creates a private root folder `Enermind Business Storage` and these child folders:

- Marketplace Records
- Worker Projects
- Learner Academy
- Health Finance Sample Data
- Project Deliverables
- Admin Reports and Audit

Each work request creates a private task folder under Worker Projects. Its Drive folder ID is stored in the restricted Worker Operations spreadsheet. Public task search never returns the folder ID. Drive permissions must be shared only with the intended buyer, accepted worker and authorised admins; folder URLs alone do not grant access.

The current implementation records Google Docs/Sheets deliverable URLs and creates task folders. Direct arbitrary file upload and automatic per-user Drive permission grants are not yet implemented. Those require a deliberate Drive API/OAuth or server-side permission workflow and tests before production.

## Buyer-only social profile fields

Only Buyer and Both account types may add public social profile references for others. Seller-only, Worker and Learner accounts must not see or submit those fields. Accept public profile URLs only, require the user's consent/public-basis confirmation, and never collect passwords, recovery codes, private messages, or private profile data.

## Health and finance data

Start with synthetic or de-identified datasets. Before handling identifiable health records or real financial account data, implement least-privilege access, explicit authorisation, retention/deletion policies, auditability, incident response, and jurisdiction-specific privacy/security review. Never collect banking passwords, card security codes, seed phrases, private keys, or third-party account credentials.
