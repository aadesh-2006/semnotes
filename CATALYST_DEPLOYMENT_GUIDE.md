# SEMNÓTĒS — Zoho Catalyst Slate Deployment & Compatibility Guide

**Application:** SEMNÓTĒS (*Dignity. Self-respect. Discipline.*)  
**Repository:** `https://github.com/aadesh-2006/semnotes`  
**Target Platform:** Zoho Catalyst Slate  
**Stack:** React 19, TypeScript 5.7, Vite 6, Tailwind CSS, Dexie.js (IndexedDB v6)  
**Status:** Pre-Deployment Verification Complete — **Awaiting Deployment Authorization**  

---

## 1. Executive Summary & Objective

This document establishes the verified deployment configuration and step-by-step procedures for hosting SEMNÓTĒS on **Zoho Catalyst Slate**. 

SEMNÓTĒS is a local-first, universal personal discipline and habit tracking platform. It is a completely static Single-Page Application (SPA) with zero server-side runtime, zero database backend dependencies, and zero private API requirements. All persistent user records (habits, check-ins, streaks, milestones, reflections, focus sessions, and settings) reside in the user's browser via IndexedDB.

> **CRITICAL DEPLOYMENT BOUNDARY:**  
> This guide prepares the application for deployment and documents the verified configuration. **No public production deployment has been executed.** Deployment to a live production environment requires explicit operator review and approval.

---

## 2. Catalyst Slate Platform Compatibility

### A. Slate vs. Legacy Catalyst Web Client Hosting
Zoho Catalyst provides two distinct frontend hosting mechanisms:
1. **Legacy Web Client Hosting:** Intended for static websites and hybrid applications tightly coupled with Catalyst Serverless Functions, typically serving assets under an `/app/` route prefix and relying on `client-package.json`.
2. **Catalyst Slate (Modern Frontend Cloud):** A purpose-built, Git-integrated deployment platform optimized for modern JavaScript frameworks (React, Vite, Next.js, Vue, Angular, Svelte, Astro). It serves applications directly at the root of a modern domain (`https://<app-name>.onslate.com` or custom domain) with native support for build pipelines, instant preview URLs, and atomic rollbacks.

**SEMNÓTĒS targets Zoho Catalyst Slate exclusively.**

### B. Compatibility Matrix

| Feature | Catalyst Slate Capability | SEMNÓTĒS Requirement | Compatibility Status |
| :--- | :--- | :--- | :---: |
| **Framework** | Native `react-vite` preset | React 19 + Vite 6 | **100% Compatible** |
| **Build Pipeline** | Node.js 18+ / 20+ CI environment | TypeScript `tsc -b` + Vite 6 build | **100% Compatible** |
| **Install Command** | `npm install` / `npm ci` | `package-lock.json` dependency graph | **100% Compatible** |
| **Build Command** | Custom script support (`npm run build`) | `tsc -b && vite build` | **100% Compatible** |
| **Output Directory** | Configurable output folder | `dist/` | **100% Compatible** |
| **SPA Deep Routing** | `_redirects` fallback engine | `public/_redirects` (`/* /index.html 200`) | **100% Compatible** |
| **Preview Sandboxes** | Isolated Preview URLs per deployment | Verification before production release | **100% Compatible** |
| **Rollback** | Versioned deployment history with 1-click redeploy | Zero-downtime rollback capability | **100% Compatible** |
| **Backend Runtime** | Static edge delivery (CDN) | Zero server runtime required | **100% Compatible** |

---

## 3. SPA Routing & Deep-Link Resolution

SEMNÓTĒS utilizes `react-router-dom` (v7) with HTML5 History API (`<BrowserRouter>`). When a user navigates within the application, view transitions occur on the client side without server requests. However, when a user:
- Directly enters a deep URL (e.g. `https://<app>.onslate.com/streaks`)
- Refreshes a parameterized timeline (e.g. `https://<app>.onslate.com/streaks/c52cf460-...`)
- Refreshes `/calendar`, `/journal`, `/analytics`, `/focus`, or `/settings`

The hosting web server receives a request for a path that does not exist as a physical file on disk. Without an SPA fallback rule, the server would return an HTTP `404 Not Found`.

### Slate Fallback Rule Configuration
In accordance with official Catalyst Slate specifications, SPA rewrite is handled via a `_redirects` file:
1. `public/_redirects` is maintained in source control with the content:
   ```text
   /*    /index.html   200
   ```
2. When `npm run build` runs, Vite automatically copies all files from `public/` into the root of `dist/`.
3. In `dist/_redirects`, the rule instructs Slate's edge routers to rewrite all incoming paths to `/index.html` with an HTTP `200 OK` status, allowing React Router to take over and render the requested view.
4. Any truly non-existent or unrecognized application paths (e.g., `/unknown-route`) are captured by React Router's wildcard route (`path="*"`) and render SEMNÓTĒS's solemn, Obsidian & Gold `NotFoundView` with direct return navigation.

---

## 4. Local-First Data Safety & Origin Isolation

> ⚠️ **CRITICAL USER DATA PRESERVATION NOTICE**

SEMNÓTĒS stores 100% of its user data locally in browser IndexedDB (`semnotes_db` v6 via Dexie.js).

### Same-Origin Policy (SOP) Invariant
Web browsers isolate IndexedDB strictly by **Origin** (`protocol://hostname:port`):
- Data created on `http://localhost:5173` is **NOT accessible** on `http://127.0.0.1:4173`.
- Data created on a Slate Preview URL (`https://deploy-abc123.<app>.onslate.com`) is **NOT accessible** on the production URL (`https://<app>.onslate.com`).
- Data created on `https://<app>.onslate.com` will **NOT automatically transfer** if a custom domain (e.g., `https://discipline.example.com`) is subsequently attached.

### Data Migration & Backup Protocol
1. **Never use actual personal discipline records for deployment smoke testing.**
2. **Prior to domain transition:** Users must navigate to **Settings > Export Backup** (`/settings`), download their authenticated JSON backup file (either standard or client-side AES-256-GCM encrypted), and keep it safe.
3. **Upon accessing the new hosted domain:** Users navigate to **Settings > Restore Backup** and upload their backup file. SEMNÓTĒS's atomic single-transaction restore engine will validate and populate the IndexedDB instance on the new origin.

---

## 5. Exact Catalyst Slate Build Configuration

When creating or configuring the application in the **Zoho Catalyst Slate Console**, use the following exact parameters:

| Configuration Field | Parameter Value | Explanation |
| :--- | :--- | :--- |
| **Framework** | `react-vite` (or `React` / `Vite`) | Auto-detects Vite frontend toolchain |
| **Repository Provider** | `GitHub` | Linked via Catalyst Account Settings |
| **Repository** | `aadesh-2006/semnotes` | Target application repository |
| **Branch** | `main` | Production branch |
| **Root / Source Directory** | `./` (or `/`) | Repository root contains `package.json` |
| **Install Command** | `npm install` | Restores audited dependencies from `package-lock.json` |
| **Build Command** | `npm run build` | Executes TypeScript validation (`tsc -b`) and Vite production bundle |
| **Output Directory** | `dist` | Destination folder generated by Vite build |
| **Node Version** | `18.x` or `20.x` | Modern LTS Node environment |
| **Auto Deploy** | Disabled (Manual Approval Recommended) | Requires explicit human approval before promotion to production |

---

## 6. Step-by-Step Deployment Guide

Follow these steps in the Zoho Catalyst Console:

### Step 1: Connect GitHub in Catalyst Settings
1. Log in to the [Zoho Catalyst Console](https://console.catalyst.zoho.com/).
2. Select your Catalyst Project.
3. In the left navigation sidebar under **Admin / Settings**, select **Git Integrations**.
4. Authenticate and authorize your **GitHub** account, granting access to `aadesh-2006/semnotes`.

### Step 2: Create a New Slate Application
1. In the Catalyst sidebar under **Develop**, click **Slate**.
2. Click **Create Application** (or **+ Add App**).
3. Set the **Application Name** (e.g., `semnotes`).
4. Select deployment source: **Deploy from Git Repository**.

### Step 3: Configure Repository & Branch
1. Select **GitHub** as the Git provider.
2. Select repository: `aadesh-2006/semnotes`.
3. Select branch: `main`.

### Step 4: Configure Build Settings
1. Select framework: **React + Vite** (`react-vite`).
2. Verify or set:
   - **Root Directory:** `./`
   - **Install Command:** `npm install`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Click **Save & Continue**.

### Step 5: Generate & Inspect Deployment Preview
1. Click **Deploy** to initiate the build pipeline.
2. Slate will provision a sandboxed build worker:
   - Clones the repository at the latest commit.
   - Executes `npm install`.
   - Executes `npm run build` (`tsc -b && vite build`).
   - Packages `dist/` including `dist/_redirects`.
3. Upon completion, Slate generates a unique **Deployment Preview URL** (e.g. `https://preview-<build-id>.<app>.onslate.com`).

### Step 6: Execute Preview Verification Checklist
Before approving promotion to production, run the verification checklist detailed in **Section 7** on the Preview URL.

### Step 7: Promote to Production (Explicit Authorization Required)
1. Once all preview verification checks pass:
2. In the Slate Console, locate the successful preview deployment in the **Deployments** history table.
3. Click the actions menu (`...`) next to the deployment and select **Promote to Production** (or click **Deploy to Production**).
4. Slate will route traffic from the live production domain (`https://<app>.onslate.com`) to this verified build.

### Step 8: Verify Live Production Deployment
1. Navigate to `https://<app>.onslate.com/`.
2. Verify the application loads cleanly.
3. Verify deep routing and hard refresh on `/streaks`.

---

## 7. Preview Verification Checklist

Before promoting any build from Preview to Production, verify each of the following items on the **Deployment Preview URL**:

- [ ] **Command Center (`/`):**
  - Application loads cleanly with Obsidian & Gold design system.
  - Zero browser console errors (`F12 > Console`).
  - Zero 404s in network panel (`F12 > Network`).
- [ ] **Direct Navigation & Deep Links:**
  - Navigate directly to `/streaks`: view loads correctly.
  - Hard refresh (`Ctrl+F5` / `Cmd+Shift+R`) on `/streaks`: loads view without a Catalyst 404 error.
  - Navigate directly to `/calendar`: month grid and heatmap load.
  - Navigate directly to `/journal`: reflection cards and prompt rotation load.
  - Navigate directly to `/analytics`: Discipline Score and trend chart render; `vendor-charts` chunk loads on demand.
  - Navigate directly to `/focus`: custom timer and Pomodoro interface load.
  - Navigate directly to `/settings`: sovereign storage and backup panels load.
- [ ] **Habit Timeline Deep Link:**
  - Create a test habit.
  - Open its detail page (`/streaks/<habit-id>`).
  - Hard refresh the page: timeline persists without crashing or routing to root.
- [ ] **Unknown Route Recovery:**
  - Navigate to `/nonexistent-route-test`.
  - Verifies 404 `NotFoundView` renders with "Return to Command Center" button.
  - Click the button: returns cleanly to `/`.
- [ ] **Local-First Data Sanity:**
  - Create a test habit and complete a check-in.
  - Refresh the page: habit and check-in remain intact in IndexedDB.
  - Export a JSON backup: file downloads successfully with valid SHA-256 signature.
  - Restore test backup: restores records cleanly.

---

## 8. Rollback Procedures

If an unexpected runtime regression or visual anomaly is discovered in production:

### Instant Console Rollback
1. Open the [Catalyst Console](https://console.catalyst.zoho.com/) and navigate to **Slate > Deployments**.
2. Review the list of historical deployments. Each build displays:
   - Commit hash and message.
   - Deployment date and author.
   - Status (Production, Preview, Superseded).
3. Locate the previous known-good deployment (e.g. the prior successful production build).
4. Click the options menu (`...`) on that deployment row and select **Promote to Production**.
5. Slate instantly updates edge routing to point back to the previous immutable build artifact within seconds, without needing to recompile or rebuild source code.

---

## 9. Platform Limitations & Considerations

1. **Client-Side PBKDF2 Performance on Mobile:**
   - SEMNÓTĒS uses OWASP-standard **600,000 PBKDF2 iterations** for client-side encrypted backups. On lower-end mobile devices, generating an encrypted backup may take 2–3 seconds of CPU execution. This occurs entirely in the client browser using Web Crypto API (`crypto.subtle`) and does not impact Catalyst Slate server load.
2. **IndexedDB Storage Quotas:**
   - Modern browsers grant IndexedDB storage based on available disk space (typically hundreds of megabytes to gigabytes). For a text and log-based habit tracker, years of discipline records consume < 10 MB.
3. **No Automatic Multi-Device Sync:**
   - Because SEMNÓTĒS is local-first, accessing the application from two different devices (e.g., desktop browser and phone browser) maintains two distinct IndexedDB databases. Users must use the built-in JSON backup and restore features in Settings to transfer data between devices.

---

## 10. Local Verification Sign-Off

The SEMNÓTĒS repository has been rigorously validated locally prior to deployment preparation:

- **Clean Working Tree:** Verified on branch `main` at commit `d5b95c0`.
- **Dependency Cleanliness:** `npm ci` completed cleanly (337 packages audited, 0 production vulnerabilities).
- **Type Checking:** `npx tsc -b` completed with **0 errors**.
- **Automated Tests:** `npm run test` completed with **354/354 tests passing across 36 test suites (100% pass rate)**.
- **Production Build:** `npm run build` compiled in 15.18s, producing `dist/` (initial script 128 kB, vendor-charts 417 kB deferred).
- **Preview Verification:** Tested on `http://127.0.0.1:4173/` using headless browser agent across all 8 primary routes and 404 recovery with **0 console errors and 0 missing assets**.

*The application is fully prepared for Zoho Catalyst Slate deployment upon operator approval.*
