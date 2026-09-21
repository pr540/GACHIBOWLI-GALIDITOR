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

---

## Prompt 4
**User Request:**
```text
Build add/edit/delete expense: title, amount, date, paid by (one or many), participants, split type: equal / exact amount / percentage / shares. Validate: no negative amounts, splits must add up exactly, round to 2 decimals. Add expense history with search and filter by member/date, with confirm on delete. Commit.
```
**Actions Taken:**
- Implemented comprehensive Add/Edit/Delete expense system supporting title, amount, date, single or multiple payers, and four split types: Equal, Exact Amount, Percentage, and Shares.
- Built real-time mathematical validation: prevents negative numbers, enforces that splits and multiple payers add up exactly to the total amount, and rounds all amounts to 2 decimal places.
- Added Expense History search (by title and payer) and dynamic filters by member and by date range (All Time, Today, Last 7 Days, This Month).
- Added modal confirmation before deleting an expense with automatic balance recalculation.
- Verified test suite and monorepo builds.
- Committed all changes to git repository.


---

## Prompt 5
**User Request:**
```text
dashbord next and caledra also should kept 
hisrtoy clea r button and use differnet images you can setup for dashbord 
splitops remove hristory and amount should remove when the swicth the account that member only should this website
```
**Actions Taken:**
- Added interactive **Month Calendar view** alongside the KPI cards mode in `MonthDashboard`, showing day cells with total amounts and allowing 1-tap day filtering.
- Generated and integrated a modern **3D financial dashboard image banner** (`/dashboard_banner.jpg`) with collapsible header.
- Implemented **"Clear History"** button in the Expense History toolbar with full confirmation modal to safely reset all expenses and balances.
- Implemented **Member-Scoped Personal View** (`👤 My View` vs `All Members`): when switching active accounts, the website dynamically scopes and displays only that member's relevant expenses, debts, and dashboard totals.
- Verified test suite (30/30 passing) and committed to git repository.

---

## Prompt 6
**User Request:**
```text
google sign page iwant you only create and autheciation give me dashbord background images add sign and  google with sigin 
add images and data should remove when login or sign in then only show our gg group 
and add another groups also 
expenses also remove when i add spilt then only histroy will come default amount remove
```
**Actions Taken:**
- Implemented **Google Sign-In page** with official multicolor Google authentication button, background hero banner image, glassmorphic login card, and account selector dialog.
- Completely removed the default sample expense (₹3,750); all member amounts and balances now **start clean at ₹0.00**. History and balances only populate when a user explicitly adds a split expense.
- Added **curated and custom groups** ("SplitOps (Primary GG Group)", "Gachibowli Flat 4B", "Goa Trip 2026", "Weekend Cricket Club") with individual icons, member counts, and favorite star toggles.
- Verified test suite and committed to git repository.

---

## Prompt 7
**User Request:**
```text
when click the task show me this like must should be clearly fix the isuess
remove this part and
images is half only
use different images ui is not good give me ui/ux
fastly do it
```
**Actions Taken:**
- Completely removed the circular debt table example card (`EXAMPLE: SPLITOPS DINNER`) from the landing page as requested.
- Fixed the half-cutoff banner image by replacing it with a full-bleed, immersive fintech hero header with modern generated visual art (`/splitops_banner.jpg`), smooth gradient transitions, and ambient glows.
- Redesigned the landing page with modern UI/UX: 4 feature cards (4 Precision Split Modes, 15 SplitOps Roster, Dynamic Month Calendar Heatmap, Pristine Zero-Ledger), prominent Google Sign-In and Group launcher CTAs.
- Overhauled `/groups` page: removed duplicate SplitOps card, softened harsh wireframe borders, added real-time group search and a "Favorites Only" toggle filter.
- Upgraded `/login` page with ambient wallpaper backdrop, glassmorphic card, and crystal-clear member roster chips.
- Verified all 30/30 unit tests pass, TypeScript compiles with 0 errors, and dev server routes return HTTP 200.
