---
name: Secure Zubair Login and Live Android App
description: "Secure Zubair owner access for Praneeth's authenticated account, remove the Android Server button, connect live group data, and prepare an Expo Go preview."
argument-hint: "Praneeth's sign-in email (not a password) and the live deployment URL if it is not configured"
agent: agent
---

Implement the requested ggsplitops login, ownership, live-update, and mobile delivery changes in this workspace. The application is under `ggsplitops/`.

Use the attached Android screenshot as UI context. It shows the darkened group screen behind an “Add Split Expense” modal and a split-method chooser with four options: Equal Split, Exact Rupee Split, Percentage Split, and Shares Split. Keep these split methods available and verify the expense modal remains usable on a phone; do not infer an unrelated redesign from the screenshot.

Before editing, inspect the existing implementation and report a concise local hypothesis and a focused check. Preserve the current architecture unless a concrete requirement forces a change:
- Web: Next.js under `ggsplitops/apps/web`.
- API/auth: Hono and Better Auth under `ggsplitops/apps/api`.
- Android: native Gradle WebView app under `ggsplitops/apps/android`, with bundled offline HTML and an APK build script.

Requirements:

1. **Real login and Zubair ownership**
   - Use the authenticated Better Auth session as the identity source. Do not grant access by choosing a roster name, typing a display name, setting local storage, or claiming a guest identity.
   - The user intends their authenticated Praneeth account to receive owner/admin access associated with the existing Zubair group-member record. Link the authenticated account to that record using a secure, auditable bootstrap or claim path. Use the supplied sign-in email to identify the account; the display names “Praneeth” and “Zubair” are not proof of identity.
   - The exact sign-in email has not been provided. If it is not supplied when this prompt is run, stop and ask before assigning owner access. Never silently choose an account.
   - Enforce group role requirements in the API, including the currently declared `minimumRole` checks. Keep authorization based on authenticated user IDs and group membership. Add focused tests for unauthenticated requests and role boundaries.
   - Preserve the existing session/cookie flow. Clearly state required environment variables; do not claim Google login is active unless its OAuth credentials are configured.

2. **Remove the Server button**
   - Remove the visible Server control from the Android app UI.
   - Keep the app connected to its configured live web/API service without asking end users to configure a server from the screen. Keep deployment configuration in an appropriate build/environment setting.
   - Do not remove necessary API configuration or weaken authentication to make the button disappear.

3. **Connected, live data**
   - Ensure signed-in group, expense, and balance views use the authenticated API and reflect successful writes across reloads/devices.
   - Add a practical live-refresh mechanism using the existing TanStack Query setup (polling/refetch is acceptable unless a server-push transport already exists). Invalidate or refresh affected queries after mutations.
   - Do not describe local-only state, navigation, or opening the website as live synchronization. Show a clear offline/error state and never present unsynced local changes as server-confirmed data.

4. **Expo Go preview and APK delivery**
   - Expo Go preview is mandatory. The current Android app is native Gradle, not an Expo project. Add the smallest maintainable Expo-compatible preview entry point needed to run the real app in Expo Go; prefer a separate app/package over replacing or rewriting the native Android project.
   - The Expo Go experience must use the same authenticated web/API data and live updates, not a simulated local login or a disconnected duplicate implementation. Verify its dependencies are supported by Expo Go and document any limitations.
   - Preserve the existing native Android project and APK build path. The user wants to test in Expo Go before proceeding with APK delivery; make the preview runnable now and provide exact later APK steps. Do not claim an APK was generated unless it was actually built and verified.
   - Ensure any shipped offline bundle is generated/refreshed from the intended source during the build, or clearly document its separate offline-only behavior.
   - Run available focused tests, type checks, lint, and the relevant Android build/validation. Do not claim an APK or Expo Go build succeeded unless it was actually produced and verified.

Implementation guidance:
- Start with the login and authorization source files, then trace the Android Server control and the existing live query/mutation paths. Inspect the current build scripts before changing them.
- Keep changes focused and follow existing project conventions. Do not commit or push unless asked.
- After the first edit, immediately run the cheapest focused executable check. Fix failures in the touched slice and rerun that check before broadening validation.
- Finish with a concise summary of changes, checks and their results, required environment configuration, and exact preview/APK steps. Clearly list any blocker that requires the user to provide an account email, deployment URL, Expo approval, or secret directly in their environment.