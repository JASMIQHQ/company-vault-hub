# Company Vault Hub

Your success will be judged by working functionality, not by the number of features or pages you create. Prefer the simplest implementation that satisfies the acceptance criteria.

JASMIQ PROCUREMENT AI

SPRINT 1 — COMPANY VAULT

EXECUTION MODE (READ CAREFULLY)

This project already has a production Supabase backend.

NON-NEGOTIABLE RULES

DO NOT:

 Create another Supabase project.

 Create database tables.

 Generate SQL migrations.

 Create storage buckets.

 Rename columns.

 Add columns.

 Modify RLS.

 Scaffold dummy data.

 Invent APIs.

 Create mock services.

 Assume the schema.

If anything required is missing,

STOP

and ask me.

Never guess.

FIRST ACTION (MANDATORY)

Before writing any code:

 Connect to my existing Supabase project using Lovable Integration.

 Read the live database schema.

 Read the storage buckets.

 Read the Row Level Security policies.

 Read the existing RPC functions.

 Verify everything.

Only after reading the real backend should you generate code.

GitHub remains the source of truth.

TECH STACK

Frontend

 React

 TypeScript

 Vite

 TailwindCSS

 shadcn/ui

Backend

 Existing Supabase Project

Deployment

 Existing GitHub Repository

 Existing Netlify Site

EXISTING TABLES

Use these tables exactly as they exist.

 profiles

 organizations

 organization_members

 roles

 permissions

 role_permissions

 company_documents

 tenders

 tender_files

 tender_requirements

 generated_documents

Never recreate them.

EXISTING STORAGE

Use these buckets exactly as they exist.

 company-documents

 tender-files

 generated-documents

 temp-processing

Never recreate them.

BUILD ONLY SPRINT 1

Nothing else.

Do NOT build:

 Dashboard

 Analytics

 Notifications

 Calendar

 AI Assistant

 OCR

 Tender Engine

 Proposal Engine

 Reporting

 Settings

 Admin

 Future placeholders

Only build the Company Vault.

DESIGN SYSTEM

Use the exact visual language from my existing AUST ScholarTrack application.

Reference:

https://aust-scholartrack.netlify.app/

Recreate its overall design philosophy:

 Premium enterprise feel

 Glassmorphism

 Soft backdrop blur

 Rounded XL cards

 Thin translucent borders

 Elegant shadows

 Excellent whitespace

 Premium typography

 Calm color palette

 Smooth micro animations

 Dark Mode

 Light Mode

 Theme persistence

The application should feel like

Linear × Notion × Vercel

using the same premium visual quality as AUST ScholarTrack.

Do NOT redesign it.

Reuse the same design language.

AUTHENTICATION

Use the existing authentication.

After login,

resolve the user's organization automatically from the existing membership tables.

Do not ask the user to choose an organization unless multiple memberships actually exist.

COMPANY VAULT PAGE

Only build one page.

The page contains:

• Upload Button

• Document List

• Search Box

Nothing else.

Do not build dashboards.

Do not build analytics.

Do not build widgets.

UPLOAD

Supported files

 PDF

 PNG

 JPG

 JPEG

Maximum

25MB

UPLOAD FLOW

When the user uploads a file:

 Upload to

company-documents/{organization_id}/...

using the existing storage bucket.

 Call the existing upload flow already available in Supabase.

 Insert into

company_documents

using the existing schema.

Never invent fields.

Never invent RPC parameters.

Read the schema first.

DOCUMENT LIST

Display the uploaded documents.

Each row should show only:

 Document Name

 Document Type

 Upload Date

 Analysis Status

 Actions

Actions

 Preview

 Download

Nothing else.

STATUS BADGES

Display existing values exactly.

pending

processing

requires_review

verified

failed

Do not invent new statuses.

STATES

Implement:

Loading

Empty

Error

Success

Use elegant shadcn components.

RESPONSIVENESS

Desktop

Tablet

Mobile

All must work correctly.

CODE QUALITY

Strict TypeScript

Reusable Components

No duplicated logic

Clean folder structure

No fake APIs

No mock data

No assumptions

Read everything from Supabase.

STOP CONDITION

Sprint 1 is complete only if all eight checks pass.

 User logs in successfully.

 User's organization is resolved automatically.

 User uploads a real PDF.

 File is stored in the existing company-documents bucket.

 A row is inserted into company_documents.

 The uploaded document appears in the document list.

 Preview works using a signed URL.

 Download works using a signed URL.

If any one of these eight checks fails,

Sprint 1 is NOT COMPLETE.

Do not continue to Sprint 2.

Stop immediately after Sprint 1.

FINAL DELIVERABLE

When Sprint 1 is complete, provide:

 Files created

 Components created

 Supabase queries used

 Storage upload flow

 Folder structure

 Any issues discovered in the existing backend

 Anything requiring my approval before continuing

Do not build anything beyond Sprint 1.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/34dae358-75b2-4fd8-9bec-6fa63c1b748b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
