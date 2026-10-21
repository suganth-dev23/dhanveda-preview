# DhanVeda — Comprehensive Fixes & Optimizations Changelog

Audit Baseline: `suganth-dev23/personal-finance` @ `5fc6706`  
Stack: React 19 + TypeScript + Vite 8 + Tailwind CSS + IndexedDB (`idb`)

---

## 1. Phase 1 — Data-Loss, Sync Concurrency, Ledger Integrity & Math (B1–B18)

| ID | Issue Description | Status | Files Touched |
|---|---|---|---|
| **B1** | AI report disappears after generation due to unstable callback identity triggering init effect | **Fixed** | `src/context/FinanceProvider.tsx` |
| **B2** | Drive sync overwrites concurrent local edits made during network round-trip | **Fixed** | `src/services/driveSync.ts`, `src/context/FinanceProvider.tsx` |
| **B3** | Renaming category orphans transactions, budgets, and recurring items | **Fixed** | `src/context/FinanceProvider.tsx`, `src/components/categories/CategoryModal.tsx`, `src/utils/recordValidation.ts` |
| **B4** | CSV import turns blank/garbage dates into today's date | **Fixed** | `src/utils/csvParser.ts` |
| **B5** | `parseINR` mangles real-world amounts (`Rs.300.00` imported as `₹0.30`, trailing Dr, etc.) | **Fixed** | `src/utils/currency.ts`, `src/utils/csvParser.ts` |
| **B6** | Editing settlement double-deducts or corrupts split reconciliations | **Fixed** | `src/context/FinanceProvider.tsx` |
| **B7** | Clear all data leaves categories empty instead of resetting default categories | **Fixed** | `src/context/FinanceProvider.tsx` |
| **B8** | Demo data backfilled into empty state on every reload | **Fixed** | `src/context/FinanceProvider.tsx` |
| **B9** | Account transfers counted as income/expenses, distorting savings rate | **Fixed** | `src/types/finance.ts`, `src/components/transactions/TransactionModal.tsx`, `src/context/FinanceProvider.tsx`, `src/utils/math.ts` |
| **B10** | Validation rejects pre-2000 dates and zero-amount transactions | **Fixed** | `src/utils/validation.ts` |
| **B11** | UTC date mismatch derives wrong "today" in IST | **Fixed** | `src/utils/date.ts`, `src/context/FinanceProvider.tsx`, `src/components/transactions/TransactionRow.tsx` |
| **B12** | Emergency fund withdrawal can exceed saved balance; dream confetti fires repeatedly | **Fixed** | `src/context/FinanceProvider.tsx` |
| **B13** | Debounced IndexedDB persist loses state on page close / rapid unmount | **Fixed** | `src/context/FinanceProvider.tsx` |
| **B14** | Sync error handling swallows 404/disconnect and leaks stale cache | **Fixed** | `src/services/driveSync.ts` |
| **B15** | Recurring payment schedule generates 6-month backlog on new creation; monthly equivalent rounding | **Fixed** | `src/utils/recurringDates.ts` |
| **B16** | Gamification streak setState updater contains impure side-effects | **Fixed** | `src/context/GamificationProvider.tsx` |
| **B17** | Duplicate detection misses same-day, same-amount candidate pairs | **Fixed** | `src/utils/deduplicator.ts` |
| **B18** | Currency formatter produces negative zero (`-₹0`) and omits paise in words | **Fixed** | `src/utils/currency.ts` |

---

## 2. Phase 2 — UX, Behaviour & Platform Stability (B19–B30)

| ID | Issue Description | Status | Files Touched |
|---|---|---|---|
| **B19** | No URL routing — Android/browser Back button closes app; refresh returns to dashboard | **Fixed** | `src/context/FinanceProvider.tsx` (hash routing with popstate & hashchange) |
| **B20** | 40 blocking native `alert()`/`window.confirm()` calls across views and modals | **Fixed** | `src/components/common/ConfirmDialog.tsx`, `CategoriesView.tsx`, `TransactionListView.tsx`, `SettingsView.tsx`, `DreamsView.tsx`, `InvestmentsView.tsx`, `EditSplitModal.tsx`, `PeopleView.tsx`, `SettlementHistoryView.tsx`, `SettleSplitModal.tsx`, `RecurringPaymentsView.tsx`, `AppErrorBoundary.tsx`, `FinanceProvider.tsx` |
| **B21** | Investments lack purchase/start-date input; CAGR assumes single lump sum | **Fixed** | `src/components/investments/InvestmentModal.tsx`, `src/components/investments/InvestmentsView.tsx`, `src/utils/investmentCalculations.ts` (added start date field & XIRR over logs) |
| **B22** | Future-dated transactions allowed up to +5 years without visual warning | **Fixed** | `src/components/transactions/TransactionRow.tsx` (scheduled badge), `src/components/transactions/TransactionModal.tsx` (scheduled warning banner) |
| **B23** | Dark-mode effect re-runs on recurring toggle, applying 350ms `.theme-anim` across app | **Fixed** | `src/context/FinanceProvider.tsx` (split into independent theme and preference effects) |
| **B24** | `TransactionModal` flashes blank on close during animate-out transition | **Fixed** | `src/components/transactions/TransactionModal.tsx` (preserved form DOM until overlay fully exits) |
| **B25** | IndexedDB connection stalls on version upgrade when multi-tabs open | **Fixed** | `src/utils/db.ts` (`blocked`, `blocking`, `versionchange` handlers dispatching `crossTabStale`), `src/context/FinanceProvider.tsx` |
| **B26** | Cross-tab writes silently overwrite state from stale snapshot | **Fixed** | `src/context/FinanceProvider.tsx` (blocks stale persistence and shows reload notification) |
| **B27** | Collision-prone `Date.now()` ID generation for bulk actions | **Fixed** | `src/utils/id.ts` (`generateId` monotonic sequence + timestamp + crypto entropy), `FinanceProvider.tsx`, `TransactionModal.tsx`, `ToastProvider.tsx`, `AutoRuleManagerModal.tsx` |
| **B28** | Misleading AI key toast wording, PWA orientation lock, missing vercel SPA rewrites | **Fixed** | `AIKeyModal.tsx`, `AIHealthSummaryView.tsx`, `vite.config.ts` (`orientation: 'any'`), `vercel.json` |
| **B29** | `toggleSelectAll` in transaction list fails when filters hide selected items | **Fixed** | `src/components/transactions/TransactionListView.tsx` (compares strictly against visible selection) |
| **B30** | Event listener return cleanup value ignored in `TransactionListView` | **Fixed** | `src/components/transactions/TransactionListView.tsx` (tracked timer in ref and cleaned up on unmount) |

---

## 3. Phase 3 — Optimizations & Performance (O1–O11)

| ID | Optimization | Status | Files Touched / Metric Result |
|---|---|---|---|
| **O1** | Context fan-out: high-frequency UI components re-rendered on all data ticks | **Optimized** | `src/context/FinanceContextDefs.ts` (`useFinanceSelector`), `MobileNav.tsx` & `MobileMoreDrawer.tsx` migrated to `useFinanceUi` |
| **O2** | `flushPendingSync` synchronously diffs all stores; slow object comparisons | **Optimized** | `src/utils/db.ts` (`hasItemChanged` O(1) early exit on `updatedAt`), `src/context/FinanceProvider.tsx` |
| **O3** | Sync upload payload uncompressed; redundant store rewrites | **Optimized** | `src/services/driveSync.ts` (unindented JSON payloads, persistDiff integration) |
| **O4** | Heavy 854-line `sampleData` & `canvas-confetti` statically loaded in initial bundle | **Optimized** | `FinanceProvider.tsx` (dynamic `import('../utils/sampleData')`), `src/utils/confetti.ts` (dynamic `import('canvas-confetti')`), `sampleData` chunk split to 17.37 kB, `confetti` chunk split to 10.58 kB |
| **O5** | `pdfjs-dist` bundled redundantly in `StatementImportView` (491 kB) | **Optimized** | `src/utils/pdfParser.ts` (dynamic `import('pdfjs-dist')` inside thread fallback only). **`StatementImportView` reduced from 491 kB to 61.43 kB (-87.5%)** |
| **O6** | Unused dependencies `clsx` and `tailwind-merge` in bundle | **Removed** | `package.json` (0 imports in codebase; removed from dependencies) |
| **O7** | Rupee glyph (`₹`, U+20B9) font flash on initial load | **Optimized** | `index.html` (preloaded `/fonts/plus-jakarta-sans-latin-ext.woff2`) |
| **O8** | Gamification double full-array evaluation over all 28 badges | **Optimized** | `src/context/GamificationProvider.tsx` (skips re-evaluation for already unlocked badges) |
| **O9** | Hot loops over transactions in duplicate checking and contact balances | **Optimized** | `src/utils/deduplicator.ts` (pre-indexes existing items into HashMaps, O(S+E)), `src/context/FinanceProvider.tsx` (single pass for contact balances, unnamed owed, and totalIOwe) |
| **O10** | `broadcastDataChange` allocates new `BroadcastChannel` instance per persist | **Optimized** | `src/context/FinanceProvider.tsx` (module-level singleton channel instance) |
| **O11** | Heavy `getCurrentMonthYear()` re-executed every render | **Optimized** | `src/utils/date.ts` (cached and memoized by local day key) |

---

## 4. Test & Verification Suite

- **Pure Math & Business Logic Tests:** `19/19` passed in Vitest (`appendixA.test.ts`, `appendixB.test.ts`, `investmentCalculations.test.ts`).
- **Static Type Check:** `npx tsc -b` completed with 0 errors.
- **Linter:** `npx oxlint` passed with 0 warnings and 0 errors across 155 files.
- **Production Build:** `npx vite build` completed cleanly in 2.70s with PWA Service Worker precache.
