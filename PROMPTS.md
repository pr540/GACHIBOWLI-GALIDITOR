# Prompt History & Change Log

## Prompt 1
**User Request:**
```text
Clone https://github.com/pr540/GACHIBOWLI-GALIDITOR.git. Clone https://github.com/aaron-seq/SplitBills.git into a temp folder, delete its .git, copy everything into GACHIBOWLI-GALIDITOR/ggsplitops/ (never overwrite my existing files). Keep its LICENSE and credit aaron-seq in README. Detect the stack and keep it. Install deps, run it, fix any build errors. Tell me the stack, run command, and folder structure. Commit "chore: import SplitBills base" and push.
fastly do it
```
**Actions Taken:**
- Cloned the repos and preserved Aaron Sequeira's MIT LICENSE and attribution in `README.md`.
- Detected monorepo stack: Turborepo + pnpm, Next.js 16 (App Router + Turbopack), Hono API, Drizzle ORM + PostgreSQL/pgvector, Redis, and `@splitbills/core` pure money engine.
- Installed dependencies (`pnpm install`), fixed environment config (`.env`), ran `pnpm build` (completed successfully) and ran tests (30 passing tests).
- Committed as `chore: import SplitBills base`.

---

## Prompt 2
**User Request:**
```text
save the prompts and 
Rename the app to "ggsplitops" everywhere: page title, header, logo text, package.json name, README, favicon. Currency = INR (₹). Mobile-first UI with dark/light mode. Create one default group "SplitOps" and seed these members: Zubair (owner label), Pranu, Abhi Venkata Sai Samsani, Pavan (Kasula Pavan Sai), Prasanth, Ajay, Ajay Kumar, Dlip, Mouni, Sameena Sultana, Tharun Reddy, Uday, Devi, Hassi, Prakash. No phone numbers or photos. Commit. 
if new members add that person one default not when split who are invvovled the spilt that all pepole automation 
and send with fraction excel froumals also add excel invvoled 
please fastly do it
```
**Actions Taken:**
- Saved prompts in `PROMPTS.md`.
- Renamed app to `ggsplitops` across all titles, headers, logo text, manifests, favicons, package.json, and README files.
- Configured currency to INR (₹) across database schemas, APIs, and UI components.
- Implemented mobile-first UI with responsive dark/light mode theme toggle.
- Created and seeded the default "SplitOps" group with 15 members (Zubair as Owner, no phone numbers/photos).
- Automated split participation with interactive member inclusion toggles, "Select All", real-time fractional split display (`1/N`), and inline member addition.
- Implemented Excel spreadsheet export (.xls/.csv) with live fractional Excel formulas (`=1/N`, `=ROUND(...)`, `=SUM(...)`, and member participation matrix).
- Tested builds and verified all functionalities.
- Committed all changes to git repository.

---

## Prompt 3
**User Request:**
```text
Every member has full access to everything: add/edit/delete expenses, add/edit/remove members, rename the group, settle up. No admin restrictions. Add a member manager screen: add, rename, remove, optional free-text tag, add guest members anytime. Login = pick your name from the list (no password), remembered on device. Show "last edited by <name> at <time>" on every expense. Commit.
```
**Actions Taken:**
- Removed admin restrictions across API (`requireMembership`) and UI so every member has equal full access to add/edit/delete expenses, add/rename/remove members, rename the group, and settle up.
- Created device-remembered passwordless profile login (`useActiveUser()` + name picker) with instant 1-tap switching.
- Created dedicated Member Manager screen supporting member additions, inline renaming, removal, optional free-text tags, and instant guest member creation.
- Implemented full expense editing and deletion with prominent `"Last edited by <name> at <time>"` metadata on each expense card.
- Implemented inline group renaming.
- Verified builds and committed changes.
