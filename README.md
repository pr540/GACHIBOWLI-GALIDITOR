# GACHIBOWLI-GALIDITOR

Welcome to GACHIBOWLI-GALIDITOR.

## Modules

- `ggsplitops/`: Shared expenses, settlement, and split operations engine.

## Current Status (as of 2026-09-30)

The project is operational in three layers:

- Web app: Next.js-based SplitOps app running on port 3000
- API: local backend serving authenticated routes on port 3001
- Expo mobile shell: Expo Go app launching from `apps/expo` and targeting the running web app via LAN

Verified items:

- Web app responds with `HTTP/1.1 200 OK` on `http://localhost:3000`
- Expo Go server is running with Metro URL `exp://192.168.1.7:8081`
- Expo typecheck passes via `pnpm --filter @splitbills/expo typecheck`
- Security headers are live on the web responses
- Offline-first group creation is implemented for public-link/network failures
- Transport fare support for Cab/Bike is included in expense creation and saved totals
- Stable automation hooks are available for UI testing and Tosca flows

## QA / Test Cases

Recommended smoke tests for release validation:

1. Launch Expo Go and validate the app loads the web shell.
2. Verify the group list loads and can create a new group.
3. Validate login and guest access paths.
4. Add a new expense with amount, payer, split method, and date.
5. Verify cab or bike fare is added to the total and included in split calculations.
6. Confirm balance updates and history entries show the transport badge.
7. Test invalid inputs and save validations.
8. Check offline fallback on create-group or network loss.
9. Confirm security headers and auth requirements remain enforced.
10. Validate app behavior across mobile UI states and rerender flows.

## Credits & Attribution

The `ggsplitops/` module is imported and adapted from [SplitBills](https://github.com/aaron-seq/SplitBills) created by [Aaron Sequeira (aaron-seq)].
Licensed under the MIT License. See [ggsplitops/LICENSE](ggsplitops/LICENSE) for the full license text.
