# Sale-OS Implementation Plan & AI Agent Prompts

> **Companion to:** `sale-os-code-audit-report.pdf` (26-page audit report)
> **Repository:** https://github.com/letungbach/sale-os
> **Local path:** `/home/z/my-project/repos/sale-os`
> **Total effort estimate:** ~5 developer-days across 4 waves
> **Plan version:** 1.0 — 2026-10-24

---

## How to Use This Document

### Workflow

1. **One wave = one PR.** Don't mix waves. Each wave has a self-contained set of files and a clean verification path.
2. **One task = one agent invocation.** Copy the prompt block verbatim into your AI coding agent (Claude Code, Cursor, Aider, Continue, etc.). Each prompt is self-contained — the agent doesn't need to read the audit PDF.
3. **Verify after each task** by running the commands in the task's "Verification" section. Don't proceed to the next task until typecheck + lint pass.
4. **Commit after each task** using the commit message format below. This makes review and rollback trivial.
5. **Reference line numbers** in prompts are accurate as of commit `ae5d113` (initial commit). If the agent reports line drift, instruct it to grep for the function/identifier instead.

### Commit & Branch Conventions

```bash
# Branch per wave
git checkout -b fix/wave-1-config-safety
git checkout -b fix/wave-2-uiux-polish
git checkout -b fix/wave-3-data-integrity
git checkout -b fix/wave-4-architecture

# Commit per task
git commit -m "fix(tailwind): add darkMode:'class' to enable theme toggle [C1]"
git commit -m "feat(settings): confirm Reset Demo Data before wiping [C2]"
git commit -m "feat(settings): confirm Import JSON before replacing data [C3]"
```

### Universal Verification Commands

Run these in the repo root after **every** task:

```bash
npm run typecheck   # tsc --noEmit — must pass with 0 errors
npm run lint        # eslint — must pass with 0 errors (warnings OK)
npm run build       # vite build — must succeed
```

For runtime smoke-testing:

```bash
npm run dev         # then click through: dashboard → leads → bookings → tasks → pipeline → settings
```

### Agent Conventions

When invoking the AI agent, prefix every prompt with this preamble (the agent needs to know the project context):

```
PROJECT: sale-os — a local-first React 18 + Vite 5 + TypeScript 5.5 + Tailwind CSS 3.4
sales CRM for travel agents ("Phúc Gia Travel"). Bilingual EN/VI, dark mode, Dexie
(IndexedDB) persistence, recharts, jsPDF, zod, lucide-react.

REPO: /home/z/my-project/repos/sale-os  (already cloned, on branch main)
TECH: React 18, Vite 5, TS 5.5, Tailwind 3.4, Dexie 4, zod 4, recharts 3, jsPDF 4

RULES:
- Do NOT introduce new dependencies unless the prompt explicitly says so.
- Preserve existing i18n patterns: every user-visible string MUST go through t('key').
- Maintain TypeScript strict mode — no `any`, no `@ts-ignore`, no `as unknown as`.
- After changes: run `npm run typecheck && npm run lint && npm run build` and fix any
  errors before declaring the task complete.
- Commit with the message specified at the end of the prompt.
```

---

## Wave 1 — Configuration & Safety (≈ 0.5 day, 5 tasks)

**Goal:** Prevent data loss, unblock the theme system, add error recovery.
**Branch:** `fix/wave-1-config-safety`
**Ship first.** This wave contains the highest-leverage fixes.

---

### Task 1.1 — C1: Add `darkMode: 'class'` to Tailwind config

**Files:** `tailwind.config.js`
**Severity:** Critical
**Why:** Without this single line, every `dark:` variant in the codebase is gated on the OS preference, not the `.dark` class that `useTheme.ts` toggles. The theme button is broken.

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Add `darkMode: 'class'` to the Tailwind config so the theme toggle works.

CONTEXT:
- `tailwind.config.js` currently has no `darkMode` field, so Tailwind 3.4.1 defaults to
  the `media` strategy (gated on `prefers-color-scheme`).
- `src/theme/useTheme.ts` toggles `document.documentElement.classList.toggle('dark', ...)`,
  expecting class-based toggling.
- Every component uses `dark:bg-*`, `dark:text-*` variants expecting class-based toggling.

REQUIRED CHANGE to `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',   // <-- ADD THIS LINE
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

VERIFICATION:
1. Run `npm run build` — must succeed.
2. Run `npm run dev`, open the app, click the theme button (top-right Sun/Moon icon).
3. Verify: clicking cycles through light → dark → system; the body, sidebar, cards,
   inputs, and buttons all change color in every mode (not just the body).
4. Verify: with OS in light mode, forcing "dark" via the button produces a fully dark UI
   (dark cards, dark sidebar, light text on dark inputs).
5. Verify: with OS in dark mode, forcing "light" produces a fully light UI.

COMMIT: git commit -m "fix(tailwind): add darkMode:'class' to enable theme toggle [C1]"
````

---

### Task 1.2 — C2: Confirm Reset Demo Data before wiping

**Files:** `src/pages/SettingsPage.tsx`, `src/i18n/dictionary.ts`
**Severity:** Critical
**Why:** A single misclick on "Reset Demo Data" destroys all user data with no undo.

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Add a ConfirmDialog guard to the "Reset Demo Data" button on the Settings page.

CONTEXT:
- `src/pages/SettingsPage.tsx` line ~49 defines `doReset` which calls `resetDemoData()`
  immediately — no confirmation.
- Line ~115 renders `<Button variant="danger" onClick={doReset}>...`.
- Other pages (LeadsPage, BookingsPage, etc.) already use a `ConfirmDialog` component
  for destructive single-record deletes. Follow the same pattern.
- The `ConfirmDialog` component is imported from `@/components/Modal` (check existing
  imports in any CRUD page to confirm the exact API).

REQUIRED CHANGES:

1. In `src/pages/SettingsPage.tsx`:
   - Add state: `const [confirmReset, setConfirmReset] = useState(false);`
   - Change the Reset button's `onClick` from `doReset` to `() => setConfirmReset(true)`.
   - Render a `<ConfirmDialog>` below the button with these props:
     * `open={confirmReset}`
     * `title={t('set.resetDemo')}`
     * `message={t('set.resetWarning')}`  // new i18n key, added below
     * `confirmLabel={t('common.delete')}` or `t('common.confirm')` (match existing pattern)
     * `cancelLabel={t('common.cancel')}`
     * `danger` prop (if ConfirmDialog supports it; check the component)
     * `onConfirm={async () => { await doReset(); setConfirmReset(false); }}`
     * `onCancel={() => setConfirmReset(false)}`

2. In `src/i18n/dictionary.ts`:
   - Add a new key `resetWarning` under the `set` namespace for BOTH languages:
     * EN: `"This will erase all your leads, bookings, packages, and tasks and reload demo content. This cannot be undone."`
     * VI: `"Thao tác này sẽ xóa tất cả khách hàng tiềm năng, đặt phòng, gói tour và tác vụ của bạn và tải lại dữ liệu mẫu. Không thể hoàn tác."`
   - Match the existing dictionary structure (look at how `set.resetDone` is defined).

VERIFICATION:
1. `npm run typecheck` — 0 errors.
2. `npm run lint` — 0 errors.
3. `npm run build` — succeeds.
4. `npm run dev` → Settings → click "Reset Demo Data" → a confirmation dialog appears
   with the warning message → clicking Cancel closes the dialog without action →
   clicking Confirm runs the reset and shows the "Reset done" toast.

COMMIT: git commit -m "feat(settings): confirm Reset Demo Data before wiping [C2]"
````

---

### Task 1.3 — C3: Confirm Import JSON before replacing data

**Files:** `src/pages/SettingsPage.tsx`, `src/i18n/dictionary.ts`
**Severity:** Critical
**Why:** Picking the wrong file silently replaces all data with `{ replace: true }`.

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Add a ConfirmDialog guard to the "Import JSON" file picker, and auto-export a
backup before replacing data.

CONTEXT:
- `src/pages/SettingsPage.tsx` line ~40 defines `doImport(file: File)` which calls
  `importData(JSON.parse(text), { replace: true })` immediately after the user picks
  a file.
- The hidden `<input type="file">` is wired so that any file selection triggers
  `doImport` directly.
- `importData` is imported from `@/data/importExport`. It also exports `exportData()`
  (check the export).

REQUIRED CHANGES:

1. In `src/pages/SettingsPage.tsx`:
   - Add state to hold the pending file: `const [pendingImport, setPendingImport] = useState<File | null>(null);`
   - Change the file input's `onChange` handler to store the file instead of calling
     `doImport` directly:
     ```tsx
     onChange={(e) => {
       const f = e.target.files?.[0];
       if (f) setPendingImport(f);
       e.target.value = '';  // allow re-selecting the same file
     }}
     ```
   - Add a `<ConfirmDialog>` for the pending import:
     * `open={!!pendingImport}`
     * `title={t('set.importTitle')}`  // new key: "Import Data?"
     * `message={t('set.importWarning')}`  // new key, see below
     * `confirmLabel={t('set.importConfirm')}`  // new key: "Replace All Data"
     * `cancelLabel={t('common.cancel')}`
     * `danger`
     * `onConfirm={async () => { if (pendingImport) { await doImport(pendingImport); setPendingImport(null); } }}`
     * `onCancel={() => setPendingImport(null)}`
   - Modify `doImport` to auto-export a backup BEFORE calling `importData(..., { replace: true })`:
     ```tsx
     const doImport = async (file: File) => {
       try {
         // Auto-backup before replace
         const backup = await exportData();
         const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = `sale-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
         a.click();
         URL.revokeObjectURL(url);

         const text = await file.text();
         const res = await importData(JSON.parse(text), { replace: true });
         if (res.ok) { flash(t('set.importSuccess')); await refresh(); }
         else flash(`${t('set.importFailed')} ${res.errors.join('; ')}`);
       } catch { flash(t('set.importFailed')); }
     };
     ```
   - Verify `exportData` is exported from `@/data/importExport`. If it isn't, check
     `importExport.ts` and use whatever function exports the full dataset.

2. In `src/i18n/dictionary.ts`, add three keys under `set` for BOTH languages:
   - `importTitle`:
     * EN: `"Import Data?"`
     * VI: `"Nhập Dữ Liệu?"`
   - `importWarning`:
     * EN: `"This will erase all current data and replace it with the contents of the selected file. A backup of your current data will be downloaded automatically."`
     * VI: `"Thao tác này sẽ xóa tất cả dữ liệu hiện tại và thay thế bằng nội dung của tệp đã chọn. Bản sao lưu dữ liệu hiện tại sẽ được tải xuống tự động."`
   - `importConfirm`:
     * EN: `"Replace All Data"`
     * VI: `"Thay Tất Cả Dữ Liệu"`

VERIFICATION:
1. `npm run typecheck && npm run lint && npm run build` — all pass.
2. `npm run dev` → Settings → click "Import JSON" → pick a file → confirmation dialog
   appears with the warning → Cancel closes without action → Confirm triggers a backup
   download, then the import, then the success toast.
3. Verify the backup file downloads before the data is replaced (check Downloads folder).

COMMIT: git commit -m "feat(settings): confirm Import JSON + auto-backup before replacing [C3]"
````

---

### Task 1.4 — H7: Add ErrorBoundary at the app root

**Files:** `src/components/ErrorBoundary.tsx` (new), `src/App.tsx`, `src/i18n/dictionary.ts`
**Severity:** High
**Why:** Any render-time throw currently white-screens the entire app with no recovery path.

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Add a class-based ErrorBoundary at the app root with a recovery UI.

CONTEXT:
- `src/main.tsx` wraps `<App />` in `<StrictMode>` only — no error boundary.
- `src/App.tsx` renders `<AppProvider><RoutedApp/></AppProvider>`.
- The app is local-first; one bad IndexedDB record can brick it permanently.
- React 18 supports class-based error boundaries (no hook equivalent).

REQUIRED CHANGES:

1. Create `src/components/ErrorBoundary.tsx`:
   ```tsx
   import { Component, type ErrorInfo, type ReactNode } from 'react';

   interface Props { children: ReactNode; }
   interface State {
     error: Error | null;
     eventId: string | null;
   }

   export class ErrorBoundary extends Component<Props, State> {
     state: State = { error: null, eventId: null };

     static getDerivedStateFromError(error: Error): State {
       return { error, eventId: `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
     }

     componentDidCatch(error: Error, info: ErrorInfo) {
       console.error('[ErrorBoundary]', error, info);
       // Future: ship to telemetry when online
     }

     handleReload = () => {
       this.setState({ error: null, eventId: null });
       window.location.reload();
     };

     handleClearStorage = () => {
       if (!window.confirm('Clear all local data and reload? This cannot be undone.')) return;
       indexedDB.deleteDatabase('SaleOSDB');
       localStorage.clear();
       window.location.reload();
     };

     render() {
       if (!this.state.error) return this.props.children;
       return (
         <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
           <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 text-center space-y-4">
             <div className="text-5xl">⚠️</div>
             <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
               Something went wrong
             </h1>
             <p className="text-sm text-slate-600 dark:text-slate-400">
               The application hit an unexpected error. Try reloading. If the issue persists,
               clearing local data will reset the app to its initial state.
             </p>
             <pre className="text-xs text-left bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 p-3 rounded overflow-auto max-h-32">
               {this.state.error.message}
             </pre>
             <div className="flex gap-3 justify-center pt-2">
               <button
                 onClick={this.handleReload}
                 className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
               >
                 Reload App
               </button>
               <button
                 onClick={this.handleClearStorage}
                 className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
               >
                 Clear Local Data
               </button>
             </div>
             <p className="text-xs text-slate-400">
               Error ID: {this.state.eventId}
             </p>
           </div>
         </div>
       );
     }
   }
   ```
   - Verify the IndexedDB database name. Check `src/data/db.ts` for the actual `new Dexie('...')`
     call and use that name in `indexedDB.deleteDatabase(...)`. If the name differs, update
     the script accordingly.

2. In `src/App.tsx`:
   - Import: `import { ErrorBoundary } from '@/components/ErrorBoundary';`
   - Wrap the AppProvider:
     ```tsx
     export default function App() {
       return (
         <ErrorBoundary>
           <AppProvider>
             <RoutedApp />
           </AppProvider>
         </ErrorBoundary>
       );
     }
     ```

VERIFICATION:
1. `npm run typecheck && npm run lint && npm run build` — all pass.
2. Temporarily throw in a render (e.g., add `throw new Error('test');` at the top of
   `DashboardPage`'s render) → `npm run dev` → navigate to dashboard → see the
   ErrorBoundary UI with Reload and Clear Local Data buttons → click Reload → app
   reloads cleanly. Remove the test throw before committing.

COMMIT: git commit -m "feat(app): add ErrorBoundary at root with recovery UI [H7]"
````

---

### Task 1.5 — H9: Add try/catch + error state to CRUD operations and init

**Files:** `src/store/AppContext.tsx`, `src/i18n/dictionary.ts`
**Severity:** High
**Why:** A single DB error bricks the app on load; save failures are silent.

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Add try/catch + error state to the init useEffect and to every CRUD operation
in AppContext.

CONTEXT:
- `src/store/AppContext.tsx` line ~90 has an init IIFE with no try/catch — if
  `isSeeded()`, `seedDemoData()`, or `refresh()` rejects, `setLoading(false)` is
  never reached and the user is stuck on the loading screen forever.
- Every `saveLead`/`deleteLead`/`savePackage`/`deletePackage`/`saveBooking`/`deleteBooking`/
  `saveTask`/`deleteTask`/`recordPayment` (lines ~133-204) awaits a repository call
  with no try/catch — failures are unhandled rejections, UI keeps showing stale data.
- `flash` is not currently in AppContext (it's per-page). For surfacing errors from
  context, add an `error` field to the context value and let pages render it.

REQUIRED CHANGES:

1. In `src/store/AppContext.tsx`:
   a. Add a `lastError` state at the top of `AppProvider`:
      ```ts
      const [lastError, setLastError] = useState<string | null>(null);
      ```
   b. Wrap the init IIFE in try/catch/finally:
      ```ts
      useEffect(() => {
        (async () => {
          try {
            const seeded = await isSeeded();
            if (!seeded) await seedDemoData(false);
            await refresh();
          } catch (e) {
            console.error('[AppContext] init failed', e);
            setLastError(e instanceof Error ? e.message : 'Initialization failed');
          } finally {
            setLoading(false);
          }
        })();
      }, [refresh]);
      ```
   c. Wrap EVERY CRUD callback (`saveLead`, `deleteLead`, `savePackage`, ...,
      `recordPayment`) in try/catch. Pattern:
      ```ts
      const saveLead: AppContextValue['saveLead'] = useCallback(async (l) => {
        try {
          if (l.leadId) {
            await leadRepo.update(l.leadId, l);
          } else {
            const { leadId: _omit, ...rest } = l;
            void _omit;
            await leadRepo.create(rest);
          }
          await refresh();
        } catch (e) {
          console.error('[AppContext] saveLead failed', e);
          setLastError(e instanceof Error ? e.message : 'Failed to save lead');
          throw e;  // re-throw so the calling form can also handle it
        }
      }, [refresh]);
      ```
      Apply the same pattern to: `deleteLead`, `savePackage`, `deletePackage`,
      `saveBooking`, `deleteBooking`, `saveTask`, `deleteTask`, `recordPayment`.
   d. Add `lastError` and a `clearError` callback to the context value object:
      ```ts
      const clearError = useCallback(() => setLastError(null), []);
      // ...in the value object:
      lastError,
      clearError,
      ```
   e. Update `AppContextValue` interface (likely in the same file or in
      `src/domain/types.ts`) to include `lastError: string | null` and
      `clearError: () => void`.

2. In `src/App.tsx` `RoutedApp`:
   - Read `lastError` from `useApp()` and render a toast/banner when it's set.
   - Use a simple fixed-position banner at the bottom:
     ```tsx
     {lastError && (
       <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white
                       px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 text-sm">
         <span>{lastError}</span>
         <button onClick={clearError} className="text-rose-200 hover:text-white">✕</button>
       </div>
     )}
     ```
   - Also update the loading branch: if `loading` is false but `lastError` is set on
     init, show a retry UI instead of the dashboard.

VERIFICATION:
1. `npm run typecheck && npm run lint && npm run build` — all pass.
2. Manually test: in devtools, block IndexedDB (`Object.defineProperty(navigator, 'storage', { value: undefined })` or use the Storage inspector to revoke access) → reload → the loading screen should NOT hang forever; an error banner should appear with a retry path.
3. Trigger a save failure (e.g., add `throw new Error('test')` temporarily inside
   `leadRepo.update`) → click Save on a lead edit form → the error banner appears at the
   bottom and the user can dismiss it. Remove the test throw before committing.

COMMIT: git commit -m "feat(app): try/catch + error state for init and CRUD [H9]"
````

---

### Wave 1 Final Verification Checklist

After all 5 tasks land on `fix/wave-1-config-safety`:

- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run lint` — 0 errors
- [ ] `npm run build` — succeeds
- [ ] Theme button cycles through all 3 modes with full UI color change (not just body)
- [ ] "Reset Demo Data" shows confirmation before wiping
- [ ] "Import JSON" shows confirmation + downloads a backup before replacing
- [ ] Forcing a render error shows the ErrorBoundary UI with Reload + Clear buttons
- [ ] Blocking IndexedDB on init shows an error banner, not an infinite loading screen
- [ ] Open PR titled "Wave 1: Configuration & Safety (C1, C2, C3, H7, H9)"

---

## Wave 2 — UI/UX Polish (≈ 1–1.5 days, 7 tasks)

**Goal:** Accessibility, visual polish, meaningful confirmations.
**Branch:** `fix/wave-2-uiux-polish`
**Prerequisite:** Wave 1 merged.

---

### Task 2.1 — H8: Modal focus trap, autofocus, focus restoration, portal

**Files:** `src/components/Modal.tsx`
**Severity:** High

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Make the Modal component accessible: focus trap, autofocus, focus restoration,
portal rendering, and stable onClose handling.

CURRENT STATE of `src/components/Modal.tsx`:
- useEffect registers ESC handler and toggles body overflow.
- No autofocus, no Tab trap, no focus restoration.
- Not rendered via createPortal → vulnerable to ancestor stacking contexts.
- useEffect deps are [open, onClose] → parent re-renders cause listener churn.

REQUIRED CHANGES:

1. Add `createPortal`:
   ```tsx
   import { createPortal } from 'react-dom';
   // ... at the end, wrap the returned JSX:
   return createPortal(
     <div className="fixed inset-0 z-50 ...">...</div>,
     document.body
   );
   ```

2. Add a focus trap using a ref to the dialog panel:
   ```tsx
   import { type ReactNode, useEffect, useRef } from 'react';

   export function Modal({ open, onClose, title, children, footer, size = 'md' }: Props) {
     const panelRef = useRef<HTMLDivElement>(null);
     const previouslyFocused = useRef<HTMLElement | null>(null);
     const onCloseRef = useRef(onClose);
     onCloseRef.current = onClose;

     useEffect(() => {
       if (!open) return;

       // 1. Store currently focused element to restore later
       previouslyFocused.current = document.activeElement as HTMLElement;

       // 2. Move focus into the dialog
       const panel = panelRef.current;
       if (panel) {
         const focusable = panel.querySelector<HTMLElement>(
           'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
         );
         focusable?.focus();
       }

       // 3. Trap Tab / Shift+Tab
       const onKey = (e: KeyboardEvent) => {
         if (e.key === 'Escape') {
           onCloseRef.current();
           return;
         }
         if (e.key !== 'Tab' || !panelRef.current) return;
         const focusables = panelRef.current.querySelectorAll<HTMLElement>(
           'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
         );
         if (focusables.length === 0) return;
         const first = focusables[0];
         const last = focusables[focusables.length - 1];
         if (e.shiftKey && document.activeElement === first) {
           e.preventDefault();
           last.focus();
         } else if (!e.shiftKey && document.activeElement === last) {
           e.preventDefault();
           first.focus();
         }
       };
       window.addEventListener('keydown', onKey);

       // 4. Lock body scroll (iOS-safe)
       const prevOverflow = document.body.style.overflow;
       const prevPosition = document.body.style.position;
       const scrollY = window.scrollY;
       document.body.style.overflow = 'hidden';
       document.body.style.position = 'fixed';
       document.body.style.top = `-${scrollY}px`;
       document.body.style.width = '100%';

       return () => {
         window.removeEventListener('keydown', onKey);
         // Restore body scroll
         document.body.style.overflow = prevOverflow;
         document.body.style.position = prevPosition;
         document.body.style.top = '';
         document.body.style.width = '';
         window.scrollTo(0, scrollY);
         // Restore focus to the trigger
         previouslyFocused.current?.focus();
       };
     }, [open]);  // NOTE: only `open` in deps; onClose is via ref

     if (!open) return null;
     // ...rest of the JSX, but add `ref={panelRef}` to the panel div
     // and role="dialog" aria-modal="true" aria-labelledby={titleId}
   }
   ```

3. Add ARIA attributes to the panel div:
   - `role="dialog"`
   - `aria-modal="true"`
   - `aria-labelledby` pointing to a generated title ID (use `useId()` from React 18)
   - The title `<h2>` should get the matching `id`

VERIFICATION:
1. `npm run typecheck && npm run lint && npm run build` — all pass.
2. Keyboard test: open any modal (e.g., Lead Edit) → focus should jump to the first
   interactive element → press Tab repeatedly → focus cycles within the modal only →
   press Escape → modal closes → focus returns to the button that opened it.
3. Screen reader spot check (VoiceOver/NVDA): opening the modal announces the title as
   a dialog; closing returns focus to the trigger.
4. Mobile test (iOS Safari): open modal → background does not scroll when touching the
   backdrop; closing does not jump the scroll position.

COMMIT: git commit -m "feat(modal): focus trap, autofocus, portal, iOS scroll lock [H8]"
````

---

### Task 2.2 — M3: Mobile drawer accessibility (scroll lock, ESC, focus)

**Files:** `src/components/AppShell.tsx`
**Severity:** Medium

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Extract the Modal's accessibility logic into a reusable `useDialog` hook and
apply it to the mobile drawer in AppShell.

CONTEXT:
- `src/components/AppShell.tsx` line ~148 renders the mobile drawer as
  `{mobileNavOpen && (<div className="lg:hidden fixed inset-0 z-40">...</div>)}`.
- The drawer has no scroll lock, no ESC handler, no focus trap, no autofocus.
- After Task 2.1, Modal has all this logic inline. Refactor to share.

REQUIRED CHANGES:

1. Create `src/hooks/useDialog.ts`:
   ```ts
   import { useEffect, useRef } from 'react';

   interface Options {
     open: boolean;
     onClose: () => void;
     panelRef: React.RefObject<HTMLElement>;
   }

   /**
    * Shared accessibility behavior for Modal and mobile drawer:
    * - ESC to close
    * - Tab/Shift+Tab focus trap
    * - Body scroll lock (iOS-safe)
    * - Focus restoration to trigger on close
    */
   export function useDialog({ open, onClose, panelRef }: Options) {
     const onCloseRef = useRef(onClose);
     onCloseRef.current = onClose;
     const previouslyFocused = useRef<HTMLElement | null>(null);

     useEffect(() => {
       if (!open) return;
       previouslyFocused.current = document.activeElement as HTMLElement;

       const focusables = () => panelRef.current?.querySelectorAll<HTMLElement>(
         'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
       ) ?? [];

       // Move focus in
       const all = focusables();
       if (all.length > 0) all[0].focus();

       const onKey = (e: KeyboardEvent) => {
         if (e.key === 'Escape') { onCloseRef.current(); return; }
         if (e.key !== 'Tab') return;
         const items = focusables();
         if (items.length === 0) return;
         const first = items[0];
         const last = items[items.length - 1];
         if (e.shiftKey && document.activeElement === first) {
           e.preventDefault(); last.focus();
         } else if (!e.shiftKey && document.activeElement === last) {
           e.preventDefault(); first.focus();
         }
       };
       window.addEventListener('keydown', onKey);

       const scrollY = window.scrollY;
       const prev = {
         overflow: document.body.style.overflow,
         position: document.body.style.position,
         top: document.body.style.top,
         width: document.body.style.width,
       };
       document.body.style.overflow = 'hidden';
       document.body.style.position = 'fixed';
       document.body.style.top = `-${scrollY}px`;
       document.body.style.width = '100%';

       return () => {
         window.removeEventListener('keydown', onKey);
         Object.assign(document.body.style, prev);
         window.scrollTo(0, scrollY);
         previouslyFocused.current?.focus();
       };
     }, [open, panelRef]);
   }
   ```

2. Refactor `src/components/Modal.tsx` to use `useDialog`:
   - Remove the inline useEffect logic from Task 2.1.
   - Call `useDialog({ open, onClose, panelRef })`.
   - Keep the createPortal + ARIA attributes.

3. Apply `useDialog` to the mobile drawer in `src/components/AppShell.tsx`:
   - Add `const drawerRef = useRef<HTMLDivElement>(null);`
   - Call `useDialog({ open: mobileNavOpen, onClose: () => setMobileNavOpen(false), panelRef: drawerRef });`
   - Add `ref={drawerRef}` and `role="dialog" aria-modal="true" aria-label="Navigation"`
     to the drawer panel div.

VERIFICATION:
1. `npm run typecheck && npm run lint && npm run build` — all pass.
2. Open mobile drawer (resize browser to < 1024px, click hamburger) → focus moves into
   the drawer → Tab cycles within nav items → Escape closes → focus returns to hamburger.
3. Background does not scroll when touching the drawer area on mobile.
4. Modal still works correctly after the refactor (re-run Task 2.1 verification).

COMMIT: git commit -m "refactor(a11y): extract useDialog hook; apply to mobile drawer [M3]"
````

---

### Task 2.3 — M4: Add global focus-visible rings

**Files:** `src/index.css`
**Severity:** Medium

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Add a global `focus-visible` ring rule so every interactive element has a
visible focus indicator when navigated by keyboard.

CONTEXT:
- `src/components/Button.tsx` already applies `focus-visible:ring-2 focus-visible:ring-sky-500`.
- Other interactive elements (Modal close X, AppShell nav buttons, theme/lang buttons,
  hamburger) use raw `<button>` without focus-visible styles.
- `src/index.css` is the Tailwind entry point with an `@layer base` section.

REQUIRED CHANGE in `src/index.css`:
Add the following inside the existing `@layer base` block (or create one if it doesn't exist):

```css
@layer base {
  /* ...existing rules... */

  /* Global keyboard focus indicator — covers all interactive elements */
  button:focus-visible,
  a:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible,
  [role="button"]:focus-visible,
  [tabindex]:focus-visible {
    @apply outline-none ring-2 ring-sky-500 ring-offset-2 dark:ring-offset-slate-900;
  }
}
```

VERIFICATION:
1. `npm run build` — succeeds.
2. `npm run dev` → navigate the entire app using only Tab and Shift+Tab → every
   button, link, and input shows a visible sky-blue ring when focused.
3. Click an element with the mouse → no ring appears (focus-visible is keyboard-only).
4. Toggle dark mode → ring offset adapts to dark background.

COMMIT: git commit -m "feat(a11y): global focus-visible ring rule [M4]"
````

---

### Task 2.4 — M2: Eliminate theme FOUC with inline pre-hydration script

**Files:** `index.html`
**Severity:** Medium

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Add an inline blocking script to `index.html` that sets the `.dark` class
on `<html>` before the first paint, eliminating the flash of unstyled/wrong-theme
content for dark-mode users.

CONTEXT:
- `src/theme/useTheme.ts` reads `localStorage.getItem('pg_theme')` and applies the
  theme, but only after React mounts — after the first paint.
- `localStorage` key is `'pg_theme'`, values are `'light' | 'dark' | 'system'`.
- Default is `'system'` (falls back to `prefers-color-scheme`).

REQUIRED CHANGE in `index.html`:
Inside `<head>`, BEFORE the `<script type="module" src="/src/main.tsx">` tag, add:

```html
<script>
  // Pre-hydration theme application — prevents FOUC for dark-mode users
  (function () {
    try {
      var mode = localStorage.getItem('pg_theme') || 'system';
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var shouldUseDark = mode === 'dark' || (mode === 'system' && prefersDark);
      if (shouldUseDark) document.documentElement.classList.add('dark');
    } catch (e) {
      // localStorage may be unavailable (private mode); fall through to default light
      console.warn('Theme pre-hydration skipped:', e);
    }
  })();
</script>
```

VERIFICATION:
1. `npm run build` — succeeds.
2. `npm run dev` → set theme to "dark" in the app → reload the page → no white flash
   on first paint; the page loads dark immediately.
3. Set theme to "system" with OS in dark mode → reload → no white flash.
4. Set theme to "light" with OS in dark mode → reload → page loads light (no dark flash).
5. Open devtools Application → Local Storage → delete `pg_theme` → reload → defaults
   to system preference without errors.

COMMIT: git commit -m "feat(theme): inline pre-hydration script to eliminate FOUC [M2]"
````

---

### Task 2.5 — M10: Add exit animations to Modal and mobile drawer

**Files:** `src/hooks/useDelayedUnmount.ts` (new), `src/components/Modal.tsx`, `src/components/AppShell.tsx`
**Severity:** Medium

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Add exit (close) animations to Modal and the mobile drawer so they fade/slide
out instead of vanishing instantly.

CONTEXT:
- `Modal.tsx` returns `null` as soon as `open` is false → no exit animation possible.
- `AppShell.tsx` uses `{mobileNavOpen && ...}` → same issue.
- Both use `animate-fade-in` / `animate-slide-up` on mount only.

REQUIRED CHANGES:

1. Create `src/hooks/useDelayedUnmount.ts`:
   ```ts
   import { useEffect, useState } from 'react';

   /**
    * Keep a component mounted for `delay` ms after `open` becomes false,
    * so exit animations can play. Returns the effective "should render" boolean
    * and an `isClosing` flag to apply the exit animation class.
    */
   export function useDelayedUnmount(open: boolean, delay = 200) {
     const [shouldRender, setShouldRender] = useState(open);
     const [isClosing, setIsClosing] = useState(false);

     useEffect(() => {
       if (open) {
         setShouldRender(true);
         setIsClosing(false);
       } else if (shouldRender) {
         setIsClosing(true);
         const t = setTimeout(() => {
           setShouldRender(false);
           setIsClosing(false);
         }, delay);
         return () => clearTimeout(t);
       }
     }, [open, delay, shouldRender]);

     return { shouldRender, isClosing };
   }
   ```

2. In `src/components/Modal.tsx`:
   - Replace `if (!open) return null;` with:
     ```tsx
     const { shouldRender, isClosing } = useDelayedUnmount(open, 180);
     if (!shouldRender) return null;
     ```
   - Apply exit animation classes:
     - Backdrop: `className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-150 ${isClosing ? 'opacity-0' : 'opacity-100'}`}`
     - Panel: `className={`... animate-slide-up ${isClosing ? '!animate-fade-out' : ''}`}`
   - Add a `fade-out` keyframe to `src/index.css` if it doesn't exist:
     ```css
     @keyframes fade-out {
       from { opacity: 1; transform: translateY(0); }
       to   { opacity: 0; transform: translateY(8px); }
     }
     .animate-fade-out { animation: fade-out 180ms ease-out forwards; }
     ```
   - Important: the `useDialog` effect's cleanup (which restores focus and unlocks
     scroll) should run when `shouldRender` becomes false, not when `open` becomes
     false. Adjust the effect's deps or split into two effects if needed.

3. In `src/components/AppShell.tsx` mobile drawer:
   - Replace `{mobileNavOpen && (...)}` with:
     ```tsx
     const drawer = useDelayedUnmount(mobileNavOpen, 200);
     {drawer.shouldRender && (
       <div className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-200 ${drawer.isClosing ? 'opacity-0' : 'opacity-100'}`}>
         {/* ... */}
       </div>
     )}
     ```
   - The drawer panel inside can also slide out: apply `translate-x-full` when
     `drawer.isClosing` is true.

VERIFICATION:
1. `npm run typecheck && npm run lint && npm run build` — all pass.
2. Open any modal → close it → backdrop fades out + panel slides/fades down over
   ~180ms (not instant).
3. Open mobile drawer → close → backdrop fades + drawer slides out over ~200ms.
4. Re-open immediately after closing → no flicker, no double-mount.
5. Tab focus still works correctly during the exit animation (focus should stay
   trapped until the modal is fully unmounted).

COMMIT: git commit -m "feat(ui): exit animations for Modal and mobile drawer [M10]"
````

---

### Task 2.6 — H3 + H5 + H6 + M14 + M16 + M17: Page-level UX fixes (batch)

**Files:** `src/pages/TasksPage.tsx`, `src/pages/LeadsPage.tsx`, `src/pages/PackagesPage.tsx`, `src/pages/BookingsPage.tsx`, `src/pages/DashboardPage.tsx`, `src/pages/PipelinePage.tsx`, `src/i18n/dictionary.ts`
**Severity:** High + Medium mix

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Apply 6 small page-level UX fixes that are too small to warrant separate tasks.
Each is independent; if any one fails verification, comment it out and ship the rest.

=== FIX 1 — H3: Booking dropdown shows UUID instead of label ===
FILE: src/pages/TasksPage.tsx (around line 227 in TaskFormModal)

Replace the booking <option> rendering:
```tsx
// BEFORE
{bookings.map((b) => <option key={b.bookingId} value={b.bookingId}>{b.bookingId}</option>)}

// AFTER
{bookings.map((b) => {
  const lead = leads.find((l) => l.leadId === b.leadId);
  return (
    <option key={b.bookingId} value={b.bookingId}>
      {lead?.clientName ?? '—'} · {formatCurrency(b.totalAmount, b.currency, i18n.lang)}
    </option>
  );
})}
```
Verify `leads`, `formatCurrency`, and `i18n` are already destructured from `useApp()`
in TaskFormModal's scope. If `leads` is not currently destructured, add it.

=== FIX 2 — H5: Task status/type badges untranslated on Tasks page ===
FILE: src/pages/TasksPage.tsx (around lines 91 and 147)

Add a helper at the top of the file (outside the component):
```tsx
const taskTypeKey = (t: TaskType) => `task.${t.toLowerCase().replace(/\s/g, '')}`;
const statusKey = (s: TaskStatus) => `task.${s.toLowerCase()}`;
```
(Import `TaskType` and `TaskStatus` from `@/domain/types`.)

Replace:
- Line ~91: `<Badge color="slate">{task.status}</Badge>` →
  `<Badge color="slate">{t(statusKey(task.status))}</Badge>`
- Line ~147: `<Badge color="slate">{s.task.taskType}</Badge>` →
  `<Badge color="slate">{t(taskTypeKey(s.task.taskType))}</Badge>`

Verify the dictionary has keys like `task.completed`, `task.deferred`, `task.cancelled`,
`task.followup`, `task.supplier`, etc. If any key is missing, add it for both EN and VI.

=== FIX 3 — H6: ConfirmDialog message is just the page title ===
FILES: src/pages/LeadsPage.tsx, src/pages/PackagesPage.tsx, src/pages/TasksPage.tsx, src/pages/BookingsPage.tsx

In each file's `<ConfirmDialog>` for delete confirmation, replace `message={t('lead.title')}`
(or equivalent) with a meaningful per-entity message:

For LeadsPage:
```tsx
message={`${t('lead.confirmDelete')} ${confirmDelete?.clientName ?? ''}`}
```
For PackagesPage:
```tsx
message={`${t('pkg.confirmDelete')} ${confirmDelete?.title ?? ''}`}
```
For TasksPage:
```tsx
message={`${t('task.confirmDelete')} ${confirmDelete?.title ?? ''}`}
```
For BookingsPage:
```tsx
message={`${t('book.confirmDelete')} ${confirmDelete?.bookingId ?? ''}`}
```

Add the new i18n keys (both EN and VI) to src/i18n/dictionary.ts:
- `lead.confirmDelete`: EN `"Delete this lead permanently? This cannot be undone."` / VI `"Xóa vĩnh viễn khách hàng tiềm năng này? Không thể hoàn tác."`
- `pkg.confirmDelete`: EN `"Delete this package permanently? This cannot be undone."` / VI `"Xóa vĩnh viễn gói tour này? Không thể hoàn tác."`
- `task.confirmDelete`: EN `"Delete this task permanently? This cannot be undone."` / VI `"Xóa vĩnh viễn tác vụ này? Không thể hoàn tác."`
- `book.confirmDelete`: EN `"Delete this booking permanently? This cannot be undone."` / VI `"Xóa vĩnh viễn đặt phòng này? Không thể hoàn tác."`

=== FIX 4 — M14: Truncated task lists have no "Show all" ===
FILES: src/pages/DashboardPage.tsx (~line 213), src/pages/TasksPage.tsx (~line 79, 85)

In DashboardPage, after the `filtered.slice(0, 12).map(...)` block, add:
```tsx
{filtered.length > 12 && (
  <Button variant="ghost" size="sm" onClick={() => onNavigate('tasks')}>
    {t('common.showAll')} ({filtered.length})
  </Button>
)}
```

In TasksPage Open list, after `scored.slice(0, 12).map(...)`:
```tsx
{scored.length > 12 && (
  <p className="text-xs text-slate-500 mt-2">
    {t('task.showing')} 12 / {scored.length}. {t('task.refineFilters')}
  </p>
)}
```
(Same pattern for Completed/Deferred with `slice(0, 8)`.)

Add i18n keys: `common.showAll` (EN "Show all" / VI "Xem tất cả"),
`task.showing` (EN "Showing" / VI "Đang hiển thị"),
`task.refineFilters` (EN "Adjust filters to see more." / VI "Điều chỉnh bộ lọc để xem thêm.").

=== FIX 5 — M16: Pipeline mini-chart XAxis labels overlap ===
FILE: src/pages/DashboardPage.tsx (~line 228-238)

Find the `<XAxis dataKey="stage" tick={{ fontSize: 10 }} stroke="#94a3b8" />` and replace with:
```tsx
<XAxis
  dataKey="stage"
  tick={{ fontSize: 10 }}
  angle={-25}
  textAnchor="end"
  height={50}
  interval={0}
  stroke="#94a3b8"
/>
```

=== FIX 6 — M17: Icon-only buttons missing aria-labels ===
FILES: src/pages/LeadsPage.tsx (~line 82-84), src/pages/PackagesPage.tsx (~line 71-72), src/pages/TasksPage.tsx (~line 97-98)

For every icon-only `<Button>` (containing only a lucide icon, no text), add an
`aria-label`. Use the appropriate existing i18n key:
- WhatsApp button: `aria-label={t('act.whatsapp')}`
- Edit button: `aria-label={t('common.edit')}`
- Delete button: `aria-label={t('common.delete')}`

If `act.whatsapp` doesn't exist, add it: EN "Open WhatsApp chat" / VI "Mở trò chuyện WhatsApp".

VERIFICATION:
1. `npm run typecheck && npm run lint && npm run build` — all pass.
2. Tasks page: open a Task form modal → Booking dropdown shows "Client Name · $1,200"
   instead of "bk_01H8X...".
3. Tasks page: badges show translated strings (e.g., Vietnamese users see "Hoàn thành"
   instead of "Completed").
4. Each CRUD page: clicking delete on a record shows a confirm dialog with the record
   name, not just the section title.
5. Dashboard: if there are >12 open tasks, a "Show all (N)" button appears below the list.
6. Dashboard: pipeline mini-chart XAxis labels are rotated -25° and don't overlap.
7. Tab through Leads page: each icon button announces its purpose to the screen reader.

COMMIT: git commit -m "feat(pages): batch UX fixes — labels, translations, confirmations, aria [H3,H5,H6,M14,M16,M17]"
````

---

### Task 2.7 — M7 + M11 (partial): Theme toggle mode indicator + per-keystroke write debounce

**Files:** `src/components/AppShell.tsx`, `src/pages/SettingsPage.tsx`
**Severity:** Medium

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Two small UX improvements batched together:
(a) Theme toggle button shows the current mode (light/dark/system) via icon + aria-label.
(b) Settings form inputs use local state + debounce instead of per-keystroke DB writes.

=== PART A: Theme toggle mode indication ===
FILE: src/components/AppShell.tsx (around lines 52-58 and 112-118)

The theme button currently shows only Sun or Moon based on `effectiveTheme`. Users
can't tell whether they're in "dark" or "system (currently dark)".

Changes:
1. Import `Monitor` from lucide-react (already imported elsewhere in the file — verify).
2. Change the icon rendering from `effectiveTheme === 'dark' ? <Moon/> : <Sun/>` to:
   ```tsx
   const ThemeIcon = themeMode === 'light' ? Sun : themeMode === 'dark' ? Moon : Monitor;
   // ...
   <Button variant="ghost" size="sm" onClick={cycleTheme}
     aria-label={t('theme.toggle') + ': ' + t(`theme.mode.${themeMode}`)}
     aria-pressed={themeMode === 'dark'}>
     <ThemeIcon size={16} />
   </Button>
   ```
3. Add i18n keys (both EN and VI) to src/i18n/dictionary.ts under `theme`:
   - `mode.light`: EN "Light" / VI "Sáng"
   - `mode.dark`: EN "Dark" / VI "Tối"
   - `mode.system`: EN "System" / VI "Hệ thống"

=== PART B: Settings form debounce ===
FILE: src/pages/SettingsPage.tsx (around lines 60-105)

Currently every keystroke calls `setAgent({ name: e.target.value })` or
`setSettings({...})` which awaits a Dexie write.

Changes:
1. Add local draft state at the top of SettingsPage:
   ```tsx
   const [agentDraft, setAgentDraft] = useState(agent);
   const [settingsDraft, setSettingsDraft] = useState(settings);
   const saveTimer = useRef<number | null>(null);
   ```
2. Sync draft from props when the upstream value changes:
   ```tsx
   useEffect(() => { setAgentDraft(agent); }, [agent]);
   useEffect(() => { setSettingsDraft(settings); }, [settings]);
   ```
3. Replace every input's `onChange` to update the draft instead of calling `setAgent`/
   `setSettings` directly. Examples:
   ```tsx
   <Input value={agentDraft.name}
     onChange={(e) => setAgentDraft({ ...agentDraft, name: e.target.value })} />
   <Input type="number" min={0} max={1} step={0.01} value={agentDraft.commissionRate}
     onChange={(e) => setAgentDraft({
       ...agentDraft,
       commissionRate: Math.min(1, Math.max(0, Number(e.target.value) || 0)),
     })} />
   ```
   Apply to all agent + settings inputs.
4. Add a debounced save effect:
   ```tsx
   useEffect(() => {
     if (agentDraft === agent) return;
     if (saveTimer.current) window.clearTimeout(saveTimer.current);
     saveTimer.current = window.setTimeout(() => {
       setAgent(agentDraft);
     }, 500);
     return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
   }, [agentDraft, agent, setAgent]);

   useEffect(() => {
     if (settingsDraft === settings || !settingsDraft) return;
     if (saveTimer.current) window.clearTimeout(saveTimer.current);
     saveTimer.current = window.setTimeout(() => {
       setSettings(settingsDraft);
     }, 500);
     return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
   }, [settingsDraft, settings, setSettings]);
   ```
   (Note: if both effects share the same timer ref, ensure they don't clobber each
   other. Better: use two separate refs `agentTimer` and `settingsTimer`.)
5. Add a "Saved" indicator near the form header that shows when the draft matches the
   saved value vs. when it's pending:
   ```tsx
   const isDirty = agentDraft !== agent || settingsDraft !== settings;
   // ...
   <span className="text-xs text-slate-500">{isDirty ? t('set.saving') : t('set.saved')}</span>
   ```
   Add i18n keys: `set.saving` (EN "Saving..." / VI "Đang lưu..."),
   `set.saved` (EN "All changes saved" / VI "Đã lưu tất cả thay đổi").

VERIFICATION:
1. `npm run typecheck && npm run lint && npm run build` — all pass.
2. Click the theme button → icon cycles Sun → Moon → Monitor → Sun. Each click
   announces "Theme toggle: Light/Dark/System" to screen readers.
3. Open Settings → type "John Doe" in the Agent Name field → check IndexedDB writes
   in devtools (Application → IndexedDB → SaleOSDB → agents) → only ONE write should
   happen ~500ms after the last keystroke, not 8 writes.
4. Type "2" in commissionRate → value is clamped to 1 (200% rejected).
5. The "Saving.../Saved" indicator updates as you type and after the debounce fires.

COMMIT: git commit -m "feat(ux): theme mode indicator + debounced settings writes [M7,M11]"
````

---

### Wave 2 Final Verification Checklist

- [ ] `npm run typecheck && npm run lint && npm run build` — all pass
- [ ] Modal: keyboard trap works, focus restoration works, portal renders correctly
- [ ] Mobile drawer: scroll lock + ESC + focus trap all work
- [ ] All buttons show focus-visible rings when tabbed to
- [ ] No theme FOUC on reload in dark mode
- [ ] Modal and drawer have exit animations
- [ ] Tasks page booking dropdown shows client name + amount
- [ ] Tasks page badges are translated
- [ ] All delete confirmations show the record name
- [ ] Dashboard "Show all" appears when lists are truncated
- [ ] Pipeline mini-chart XAxis labels don't overlap
- [ ] All icon-only buttons have aria-labels
- [ ] Theme button shows Sun/Moon/Monitor and announces the mode
- [ ] Settings inputs debounce writes (no per-keystroke DB hits)
- [ ] Open PR titled "Wave 2: UI/UX Polish (H8, M3, M4, M2, M10, H3, H5, H6, M14, M16, M17, M7, M11)"

---

## Wave 3 — Data Integrity (≈ 1.5–2 days, 7 tasks)

**Goal:** Tighten schema validation, prevent data loss, fix logic bugs.
**Branch:** `fix/wave-3-data-integrity`
**Prerequisite:** Wave 1 merged. (Wave 2 not strictly required but recommended.)

---

### Task 3.1 — H12: Strip `undefined` from patch in `update()`

**Files:** `src/data/repositories.ts`
**Severity:** High

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: In every repository's `update()` method, strip `undefined` values from the patch
before merging with `{...existing, ...patch}`.

CONTEXT:
- `src/data/repositories.ts` has four repositories: `leadRepo`, `agentRepo`,
  `packageRepo`, `bookingRepo`, `taskRepo`, `settingsRepo` (check actual list).
- Each `update(id, patch)` method does:
  `const updated = { ...existing, ...patch, idField: id, updatedAt: nowISO() };`
- If a caller passes `{ agencyName: undefined }` (e.g., from a cleared optional field),
  the spread overwrites `existing.agencyName` with `undefined`, silently erasing data.

REQUIRED CHANGES:

1. Add a helper at the top of `src/data/repositories.ts`:
   ```ts
   /** Remove undefined keys from a patch so they don't overwrite existing values. */
   function stripUndefined<T extends Record<string, unknown>>(patch: Partial<T>): Partial<T> {
     const result: Record<string, unknown> = {};
     for (const [k, v] of Object.entries(patch)) {
       if (v !== undefined) result[k] = v;
     }
     return result as Partial<T>;
   }
   ```

2. In EVERY `update()` method, change the merge to use the cleaned patch:
   ```ts
   // BEFORE
   const updated: Lead = { ...existing, ...patch, leadId: id, updatedAt: nowISO() };

   // AFTER
   const cleanPatch = stripUndefined(patch);
   const updated: Lead = { ...existing, ...cleanPatch, leadId: id, updatedAt: nowISO() };
   ```
   Apply to: `leadRepo.update`, `agentRepo.update`, `packageRepo.update`,
   `bookingRepo.update`, `taskRepo.update`, `settingsRepo.update` (whichever exist).

VERIFICATION:
1. `npm run typecheck && npm run lint && npm run build` — all pass.
2. Manual test: open a Lead edit form → clear the "Agency" field → save → re-open the
   lead → other optional fields (notes, expectedCloseDate) should NOT be wiped.
3. Add a unit-style check in devtools console:
   ```js
   // After importing leadRepo (or via a debug hook):
   const lead = await leadRepo.get('lead_001');
   await leadRepo.update('lead_001', { agencyName: undefined, budget: 9999 });
   const updated = await leadRepo.get('lead_001');
   console.assert(updated.agencyName === lead.agencyName, 'agencyName should NOT be wiped');
   console.assert(updated.budget === 9999, 'budget should be updated');
   ```

COMMIT: git commit -m "fix(repos): strip undefined from patch in update() to prevent data loss [H12]"
````

---

### Task 3.2 — H13: Add `bookingId` and `agentId` reference checks to `importData`

**Files:** `src/data/importExport.ts`
**Severity:** High

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Strengthen the import validator to check `task → booking` and `entity → agent`
references that are currently missing.

CONTEXT:
- `src/data/importExport.ts` line ~72-81 has a reference-check loop that validates:
  * `b.leadId` → leads
  * `b.packageId` → packages
  * `t.leadId` → leads
- It does NOT check:
  * `t.bookingId` → bookings (tasks have an optional bookingId)
  * `l.agentId` → agents
  * `t.agentId` → agents
  * `s.agentId` → agents (settings)
- Result: orphan tasks/bookings/settings can be imported silently.

REQUIRED CHANGES:

In `src/data/importExport.ts`, find the reference-check loop and expand it. Build
sets for bookings and agents, then check every relevant FK:

```ts
const leadIds    = new Set(data.leads.map((l) => l.leadId));
const packageIds = new Set(data.packages.map((p) => p.packageId));
const bookingIds = new Set(data.bookings.map((b) => b.bookingId));
const agentIds   = new Set(data.agents.map((a) => a.agentId));

for (const b of data.bookings) {
  if (!leadIds.has(b.leadId))    errors.push(`Booking ${b.bookingId} references missing lead ${b.leadId}`);
  if (b.packageId && !packageIds.has(b.packageId))
                                 errors.push(`Booking ${b.bookingId} references missing package ${b.packageId}`);
  if (!agentIds.has(b.agentId))  errors.push(`Booking ${b.bookingId} references missing agent ${b.agentId}`);
}

for (const t of data.tasks) {
  if (t.leadId && !leadIds.has(t.leadId))
                                 errors.push(`Task ${t.taskId} references missing lead ${t.leadId}`);
  if (t.bookingId && !bookingIds.has(t.bookingId))
                                 errors.push(`Task ${t.taskId} references missing booking ${t.bookingId}`);
  if (!agentIds.has(t.agentId))  errors.push(`Task ${t.taskId} references missing agent ${t.agentId}`);
}

for (const l of data.leads) {
  if (!agentIds.has(l.agentId))  errors.push(`Lead ${l.leadId} references missing agent ${l.agentId}`);
}

for (const s of data.settings) {
  if (!agentIds.has(s.agentId))  errors.push(`Settings ${s.id} references missing agent ${s.agentId}`);
}
```

Verify the actual property names by reading `src/domain/types.ts` — confirm whether
the booking has `agentId`, whether settings uses `id` or `settingsId`, etc. Adjust
the code to match the actual types.

VERIFICATION:
1. `npm run typecheck && npm run lint && npm run build` — all pass.
2. Craft a test import JSON with an orphan task (`bookingId: "book_ghost"`) → use the
   Import button → the toast should show the error: "Task X references missing booking
   book_ghost" and the import should be rejected (`res.ok === false`).
3. Same test with an orphan agent reference on a lead → rejected.

COMMIT: git commit -m "fix(import): validate bookingId and agentId references [H13]"
````

---

### Task 3.3 — H15: Validate `paymentLink` URL and prevent XSS

**Files:** `src/domain/validation.ts`, `src/pages/BookingsPage.tsx`
**Severity:** High (security)

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Tighten the `paymentLink` zod schema to require a URL, and add a runtime
scheme allowlist in the renderer to prevent `javascript:` URL XSS.

CONTEXT:
- `src/domain/validation.ts` line ~64 has `paymentLink: z.string().optional()` —
  accepts any string, including `javascript:alert(1)`.
- `src/pages/BookingsPage.tsx` renders paymentLink as `<a href={paymentLink}>`
  (around line 200).

REQUIRED CHANGES:

1. In `src/domain/validation.ts`, tighten the schema:
   ```ts
   paymentLink: z.string().url().optional().or(z.literal('')),
   ```
   This accepts: undefined, empty string, or a valid URL (zod's `.url()` requires
   a scheme). It rejects `javascript:alert(1)` because that's not a valid URL.

2. In `src/pages/BookingsPage.tsx`, add a runtime sanitizer near the top of the
   component (outside the render loop):
   ```ts
   const SAFE_URL = /^https?:\/\//i;
   const safeHref = (u: string | undefined): string | undefined => {
     if (!u) return undefined;
     return SAFE_URL.test(u) ? u : undefined;
   };
   ```
   Then in every place that renders `<a href={paymentLink}>`:
   ```tsx
   const href = safeHref(b.paymentLink);
   {href ? (
     <a href={href} target="_blank" rel="noopener noreferrer" className="...">...</a>
   ) : (
     <span className="text-slate-400">—</span>
   )}
   ```

3. Also sanitize on input in the Booking form (BookingFormModal): add a check before
   save that strips non-http(s) URLs and warns the user.

VERIFICATION:
1. `npm run typecheck && npm run lint && npm run build` — all pass.
2. Edit a booking → set paymentLink to `javascript:alert(document.cookie)` → save →
   the field should either be rejected at save time or render as "—" (not as a
   clickable link) on the Bookings page.
3. Set paymentLink to `https://example.com/pay` → save → renders as a clickable
   link that opens in a new tab with `rel="noopener noreferrer"`.
4. Try importing a JSON with `paymentLink: "javascript:alert(1)"` → import should
   fail validation with a clear error message.

COMMIT: git commit -m "fix(security): validate paymentLink URL + runtime scheme allowlist [H15]"
````

---

### Task 3.4 — M19: Validate ISO 8601 format on `isoString`

**Files:** `src/domain/validation.ts`
**Severity:** Medium

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Strengthen the `isoString` zod schema to actually validate that the string is
parseable as a date.

CONTEXT:
- `src/domain/validation.ts` line ~3 has `const isoString = z.string().min(1);` —
  used for every date field (createdAt, updatedAt, dueAt, completedAt, expectedCloseDate).
- It accepts "hello" and "2024-13-45" which then break `new Date(value)` downstream.

REQUIRED CHANGE in `src/domain/validation.ts`:
```ts
// BEFORE
const isoString = z.string().min(1);

// AFTER
const isoString = z.string().min(1).refine(
  (s) => !isNaN(new Date(s).getTime()),
  { message: 'Invalid ISO date string' }
);
```

That's it. This single change cascades to every schema that uses `isoString`.

VERIFICATION:
1. `npm run typecheck && npm run lint && npm run build` — all pass.
2. Try importing a JSON with `createdAt: "hello"` on a lead → import should fail
   with "Invalid ISO date string".
3. Try importing with `createdAt: "2024-13-45"` → fails (Invalid Date).
4. Try importing with `createdAt: "2024-10-24T12:00:00.000Z"` → passes.
5. Existing app data should still load (run `npm run dev`, verify dashboard renders).

COMMIT: git commit -m "fix(validation): isoString now validates ISO 8601 format [M19]"
````

---

### Task 3.5 — M20: Add currency rounding helper

**Files:** `src/domain/calculations.ts` (and any other currency math site)
**Severity:** Medium

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Add a `round2` helper and apply it at every currency return site to prevent
floating-point noise from accumulating.

CONTEXT:
- `src/domain/calculations.ts` returns raw floats for `grossProfit`,
  `earnedCommission`, `discountAmount`, and the `confirmedRevenue`/`quotedValue`/
  `weightedForecast` reducers.
- Example: `489 * 0.08 = 39.120000000000005` (verified).
- `formatCurrency` masks display, but stored values carry sub-cent noise.

REQUIRED CHANGES:

1. Add a helper at the top of `src/domain/calculations.ts`:
   ```ts
   /** Round to 2 decimal places, avoiding floating-point representation errors. */
   export function round2(n: number): number {
     return Math.round((n + Number.EPSILON) * 100) / 100;
   }
   ```

2. Apply `round2()` at every currency return site. Wrap the final return value of:
   - `grossProfit` calculation
   - `earnedCommission` calculation
   - `discountAmount` calculation
   - The reducers in `summarizeRevenue` (return `round2(confirmedRevenue)` etc.)
   - Any function returning a monetary value

   Example:
   ```ts
   // BEFORE
   return commissionableRevenue * rate;
   // AFTER
   return round2(commissionableRevenue * rate);
   ```

3. Also apply in `src/integrations/discount.ts`:
   - `finalPrice` calculation
   - `discountAmount` calculation
   - `marginPctAfter` calculation (optional — margin is a percent, but rounding is fine)

VERIFICATION:
1. `npm run typecheck && npm run lint && npm run build` — all pass.
2. In devtools: `console.log(489 * 0.08)` → still shows `39.120000000000005`.
   Then `console.log(round2(489 * 0.08))` (import via a debug hook) → `39.12`.
3. Dashboard revenue figures should look cleaner (no `0.00000001` noise).
4. Existing test data should still produce sensible numbers (no order-of-magnitude changes).

COMMIT: git commit -m "fix(calculations): round2 helper to prevent float noise in currency math [M20]"
````

---

### Task 3.6 — H1 + H2 + H4 + H10 + H11: Logic bugs in calculations/scoring/pages (batch)

**Files:** `src/pages/BookingsPage.tsx`, `src/pages/PipelinePage.tsx`, `src/domain/calculations.ts`, `src/domain/scoring.ts`, `src/i18n/dictionary.ts`
**Severity:** High (5 distinct logic bugs)

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Fix 5 logic bugs in calculations, scoring, and pages. Each is independent.

=== FIX 1 — H1: Use computed paymentStatus instead of form selection ===
FILE: src/pages/BookingsPage.tsx (around lines 150-169 in BookingFormModal.submit)

The code computes `const computed = computePaymentStatus(...)` but discards it.

Change the `onSave` call:
```ts
// BEFORE
paymentStatus: form.paymentStatus,
// ...
void computed;

// AFTER
paymentStatus: computed,
```
Remove the `void computed;` line. Optionally also remove the manual `paymentStatus`
Select from the form and replace with a read-only display of the derived value.

=== FIX 2 — H2: Wrong toast after recording payment ===
FILE: src/pages/BookingsPage.tsx (around lines 122-127)

The code calls `flash(t('act.paymentLinkSaved'))` after `recordPayment`. This is
misleading — `recordPayment` doesn't touch `paymentLink`.

Add new i18n key in src/i18n/dictionary.ts under `act`:
- `paymentRecorded`: EN "Payment recorded." / VI "Đã ghi nhận thanh toán."

Then change:
```ts
// BEFORE
flash(t('act.paymentLinkSaved'));
// AFTER
flash(t('act.paymentRecorded'));
```

=== FIX 3 — H4: Pipeline cross-currency aggregation ===
FILE: src/pages/PipelinePage.tsx (around lines 37-38 and 55)

The page sums `l.budget` across all leads and formats using `leads[0]?.currency`,
producing wrong totals when currencies are mixed.

Add a currency guard at the top of the component:
```tsx
const currencies = new Set(leads.map((l) => l.currency));
const isMixed = currencies.size > 1;
```

For each total, either:
(a) Group by currency and show multiple totals, or
(b) Filter to the agent's `reportingCurrency` and exclude others, or
(c) At minimum, show a warning when currencies are mixed.

Minimum viable fix (option c):
```tsx
<span>{t('common.value')}: <strong>{formatCurrency(totals.value, leads[0]?.currency ?? 'USD', i18n.lang)}</strong></span>
{isMixed && (
  <span className="ml-2 text-amber-500 text-xs" title={t('pipeline.mixedCurrencyWarning')}>
    ⚠ {t('pipeline.mixedCurrency')}
  </span>
)}
```
Add i18n keys: `pipeline.mixedCurrency` (EN "Mixed currencies" / VI "Đa tiền tệ"),
`pipeline.mixedCurrencyWarning` (EN "Totals are summed across currencies without conversion. Filter by currency for accurate figures." / VI "Tổng được cộng qua các loại tiền tệ mà không quy đổi. Lọc theo tiền tệ để có số liệu chính xác.").

Better (option a) — group by currency:
```tsx
const byCurrency = useMemo(() => {
  const map = new Map<Currency, { value: number; won: number }>();
  for (const l of leads) {
    const entry = map.get(l.currency) ?? { value: 0, won: 0 };
    entry.value += l.budget;
    if (l.stage === 'Closed Won') entry.won += l.budget;
    map.set(l.currency, entry);
  }
  return Array.from(map.entries());
}, [leads]);

// Render:
{byCurrency.map(([cur, { value, won }]) => (
  <div key={cur} className="flex gap-4">
    <span>{cur}: <strong>{formatCurrency(value, cur, i18n.lang)}</strong></span>
    <span className="text-slate-500">{t('lead.closedWon')}: {formatCurrency(won, cur, i18n.lang)}</span>
  </div>
))}
```
Choose option (a) if feasible, fall back to (c) if the layout work is too much.

Apply the same fix to the per-stage `stageValue` aggregation (line 55).

=== FIX 4 — H10: hoursUntil returns 0 for 0–59 min overdue ===
FILE: src/domain/calculations.ts (around lines 216-221, the `hoursUntil` function)

```ts
// BEFORE
const diff = target - now.getTime();
return Math.ceil(diff / 3_600_000);

// AFTER
const diff = target - now.getTime();
if (diff < 0) return Math.floor(diff / 3_600_000);  // overdue: -0.0167 → -1
return Math.ceil(diff / 3_600_000);
```

This makes `isOverdue = hours < 0` correctly true for any task past its deadline
by even 1 minute.

=== FIX 5 — H11: streakInfo uses UTC instead of local timezone ===
FILE: src/domain/scoring.ts (around lines 253-269, the `streakInfo` function)

Replace `now.toISOString().slice(0, 10)` with local timezone formatting:

```ts
// BEFORE
const todayStr = now.toISOString().slice(0, 10);
// ...
const completedDate = new Date(c.completedAt).toISOString().slice(0, 10);

// AFTER
const fmt = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});
const todayStr = fmt.format(now);
// ...
const completedDate = fmt.format(new Date(c.completedAt));
```

`en-CA` locale produces YYYY-MM-DD which matches the existing string-comparison logic.

VERIFICATION:
1. `npm run typecheck && npm run lint && npm run build` — all pass.
2. BookingsPage: edit a booking → set amountPaid = totalAmount → save → paymentStatus
   should auto-derive to "Paid" without manually touching the dropdown.
3. BookingsPage: record a payment → toast should say "Payment recorded." not
   "Payment link saved."
4. PipelinePage: with mixed-currency demo data → totals should either be split by
   currency OR show the mixed-currency warning.
5. Scoring: create a Supplier task due in 1 minute → wait 2 minutes → task should
   show as "Overdue by 1h" and get the P0 critical override.
6. Streak: change system timezone to UTC-5 → complete a task at 11 PM local →
   reload → task should count toward "today" not "yesterday" (was previously
   misattributed to tomorrow in UTC).

COMMIT: git commit -m "fix(logic): paymentStatus auto-derive, payment toast, currency guard, hoursUntil, streakInfo TZ [H1,H2,H4,H10,H11]"
````

---

### Task 3.7 — M21: Add Dexie v2 migration harness with closedAt backfill

**Files:** `src/data/db.ts`, `src/domain/types.ts`, `src/data/repositories.ts`
**Severity:** Medium (architectural setup for future schema changes)

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Establish a Dexie migration harness by adding a v2 schema that backfills a
`closedAt` field on leads. This sets the pattern for all future migrations.

CONTEXT:
- `src/data/db.ts` has only `this.version(1).stores({...})`.
- The audit found that `avgInquiryToBookingDays` (in calculations.ts) uses
  `updatedAt` as the close date, which silently corrupts the KPI when closed leads
  are edited later.
- We need a `closedAt?: string` field on Lead, set once when stage transitions to
  "Closed Won", and a v2 migration that backfills it for existing leads.

REQUIRED CHANGES:

1. In `src/domain/types.ts`, add `closedAt?: string` to the `Lead` interface:
   ```ts
   export interface Lead {
     // ...existing fields...
     closedAt?: string;  // ISO timestamp when stage transitioned to "Closed Won"
   }
   ```

2. In `src/data/db.ts`, add a v2 schema with an upgrade callback:
   ```ts
   export class SaleOSDB extends Dexie {
     leads!: Table<Lead, string>;
     // ...other tables...

     constructor() {
       super('SaleOSDB');
       this.version(1).stores({
         leads: 'leadId, agentId, stage, createdAt, expectedCloseDate',
         // ...existing v1 stores...
       });

       // v2: add closedAt index + backfill closedAt for existing Closed Won leads
       this.version(2).stores({
         leads: 'leadId, agentId, stage, createdAt, expectedCloseDate, closedAt',
         // other tables unchanged but must be re-declared
         agents: 'agentId, name, active',
         packages: 'packageId, agentId, title',
         bookings: 'bookingId, leadId, packageId, agentId, status',
         tasks: 'taskId, leadId, bookingId, agentId, status, dueAt',
         settings: 'id, agentId',
         discountAudits: 'id, bookingId, createdAt',
       }).upgrade(async (tx) => {
         await tx.table('leads').toCollection().modify((lead) => {
           if (lead.stage === 'Closed Won' && !lead.closedAt) {
             // Best available proxy for close date: updatedAt at the time of migration
             lead.closedAt = lead.updatedAt;
           }
         });
       });
     }
   }
   ```
   IMPORTANT: in v2.stores, ALL tables must be re-declared (Dexie requires this),
   not just the changed one. Copy the v1 store definitions and add `closedAt` to
   the leads index.

3. In `src/data/repositories.ts`, update `leadRepo.update` to set `closedAt` when
   stage transitions to "Closed Won":
   ```ts
   async update(id: string, patch: Partial<Lead>): Promise<Lead> {
     const existing = await this.db.leads.get(id);
     if (!existing) throw new Error(`Lead ${id} not found`);
     const cleanPatch = stripUndefined(patch);

     // Set closedAt once when transitioning to Closed Won
     const transitioningToWon =
       cleanPatch.stage === 'Closed Won' && existing.stage !== 'Closed Won';
     const closedAt = transitioningToWon ? { closedAt: nowISO() } : {};

     const updated: Lead = {
       ...existing,
       ...cleanPatch,
       ...closedAt,
       leadId: id,
       updatedAt: nowISO(),
     };
     await this.db.leads.put(updated);
     return updated;
   }
   ```

4. In `src/domain/calculations.ts`, update `avgInquiryToBookingDays` (and any other
   KPI using `updatedAt` as close date) to prefer `closedAt`:
   ```ts
   // BEFORE
   const closeTime = new Date(l.updatedAt).getTime();
   // AFTER
   const closeTime = new Date(l.closedAt ?? l.updatedAt).getTime();
   ```

VERIFICATION:
1. `npm run typecheck && npm run lint && npm run build` — all pass.
2. Open the app with existing v1 data → Dexie should auto-upgrade to v2 → devtools
   Application → IndexedDB → SaleOSDB → check version is 2.
3. Verify existing Closed Won leads now have `closedAt` set (was their `updatedAt`).
4. Move a non-Closed Won lead to "Closed Won" → check `closedAt` is set to the
   current time, NOT modified by subsequent edits.
5. Edit the lead's notes after closing → `closedAt` should NOT change.
6. The "avg inquiry→booking days" KPI on the dashboard should now be stable across
   edits to closed leads.

COMMIT: git commit -m "feat(db): v2 migration harness + closedAt backfill for leads [M21]"
````

---

### Wave 3 Final Verification Checklist

- [ ] `npm run typecheck && npm run lint && npm run build` — all pass
- [ ] Clearing an optional field in edit form doesn't wipe other fields
- [ ] Import with orphan bookingId/agentId references is rejected with clear errors
- [ ] `javascript:` URL in paymentLink is rejected at save and doesn't render as link
- [ ] Import with malformed date strings is rejected
- [ ] Dashboard revenue figures have no `0.00000001` noise
- [ ] paymentStatus auto-derives from amounts
- [ ] Recording payment shows "Payment recorded." toast
- [ ] Pipeline page handles mixed currencies correctly (or warns)
- [ ] Supplier task 30 min overdue is correctly labeled and scored P0
- [ ] Streaks respect local timezone, not UTC
- [ ] Dexie auto-upgrades from v1 to v2 without data loss
- [ ] closedAt is set once on transition to Closed Won and never modified
- [ ] Open PR titled "Wave 3: Data Integrity (H12, H13, H15, M19, M20, H1, H2, H4, H10, H11, M21)"

---

## Wave 4 — Architecture & Performance (≈ 1–2 days, 7 tasks, optional)

**Goal:** Performance, maintainability, dead-code cleanup.
**Branch:** `fix/wave-4-architecture`
**Prerequisite:** Waves 1–3 merged. **Optional** — defer if shipping pressure is high.

---

### Task 4.1 — M1: Memoize AppContext value

**Files:** `src/store/AppContext.tsx`
**Severity:** Medium (performance)

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Wrap the AppContext value object in `useMemo` and the `setThemeMode` wrapper
in `useCallback` to prevent every consumer from re-rendering on every state change.

CONTEXT:
- `src/store/AppContext.tsx` line ~214-244 builds the value object inline on every
  render. Every component calling `useApp()` re-renders regardless of which slice
  of state it uses.

REQUIRED CHANGES:

1. Wrap the `setThemeMode` wrapper in `useCallback`:
   ```ts
   const setThemeModeCtx = useCallback((m: ThemeMode) => {
     setThemeMode(m);
     if (settings) setSettings({ theme: m });
   }, [settings, setSettings]);
   ```

2. Wrap the value object in `useMemo`:
   ```ts
   const value = useMemo<AppContextValue>(() => ({
     loading, isDemo, agent, settings, leads, packages, bookings, tasks,
     i18n, themeMode, effectiveTheme,
     setThemeMode: setThemeModeCtx, setLanguage, setSettings, setAgent,
     refresh, saveLead, deleteLead, savePackage, deletePackage,
     saveBooking, deleteBooking, saveTask, deleteTask, recordPayment,
     lastError, clearError, online,
   }), [
     loading, isDemo, agent, settings, leads, packages, bookings, tasks,
     i18n, themeMode, effectiveTheme, setThemeModeCtx, setLanguage,
     setSettings, setAgent, refresh, saveLead, deleteLead, savePackage,
     deletePackage, saveBooking, deleteBooking, saveTask, deleteTask,
     recordPayment, lastError, clearError, online,
   ]);
   ```
   Note: this depends on the CRUD callbacks already being `useCallback`-wrapped
   (they appear to be, per the audit). Verify each one has `useCallback`.

3. Remove the dead line at the end of AppProvider:
   ```ts
   void (settings?.reportingCurrency as Currency | undefined);  // DELETE THIS
   ```

VERIFICATION:
1. `npm run typecheck && npm run lint && npm run build` — all pass.
2. Open React DevTools Profiler → record a session → toggle the `online` indicator
   (e.g., toggle network in devtools) → verify that NOT every page re-renders.
3. Type in a Settings field → only the SettingsPage should re-render, not the
   Dashboard or other pages.

COMMIT: git commit -m "perf(context): memoize AppContext value + useCallback setThemeMode [M1]"
````

---

### Task 4.2 — M5: Collapse three-way theme sync to one source of truth

**Files:** `src/store/AppContext.tsx`
**Severity:** Medium (architecture)

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Remove the redundant theme sync paths so that `settings.theme` is the single
source of truth, updated only via `setSettings({ theme })`.

CONTEXT:
- `src/store/AppContext.tsx` has THREE paths syncing theme:
  (a) `setSettings` (line ~123) calls `setThemeMode(patch.theme)` when patch.theme is set.
  (b) The `setThemeMode` wrapper (line ~226) calls both `useTheme.setMode(m)` AND
      `setSettings({ theme: m })` — which itself calls `setThemeMode` again via (a).
  (c) The "keep theme synced" effect (lines ~207-212) calls
      `setThemeMode(settings.theme)` whenever settings.theme changes.

REQUIRED CHANGES:

1. Remove path (c): delete the entire `useEffect` at lines ~207-212 (the one with
   `eslint-disable-next-line react-hooks/exhaustive-deps`).

2. Simplify path (b): the `setThemeMode` wrapper should ONLY call `useTheme.setMode(m)`,
   not also call `setSettings`:
   ```ts
   const setThemeModeCtx = useCallback((m: ThemeMode) => {
     setThemeMode(m);  // updates useTheme state + DOM class
     setSettings({ theme: m });  // persists to DB; setSettings internally calls
                                  // setThemeMode(patch.theme) which is idempotent
   }, [setSettings]);
   ```
   Wait — this still has the loop. Better approach: remove the `setThemeMode` call
   from inside `setSettings` (path a), and let the explicit `setThemeMode` wrapper
   be the ONLY way to update both:
   - In `setSettings`: remove the `if (patch.theme) setThemeMode(patch.theme)` line.
     Now `setSettings` only persists settings; it doesn't touch theme state.
   - `setThemeModeCtx`: calls `setThemeMode(m)` (useTheme state + DOM) AND
     `setSettings({ theme: m })` (DB persist) — single source of intent.
   - On app load, `useTheme` reads from `localStorage` (already does), and
     `settings.theme` is just the persisted preference for next load.

3. Remove path (a) entirely (the `if (patch.theme) setThemeMode(patch.theme)` inside
   `setSettings`).

4. Verify the initial load still works: `useTheme` initializer reads `pg_theme` from
   localStorage → applies the class → `settings.theme` is loaded from DB later and
   is consistent (no flicker, no mismatch).

VERIFICATION:
1. `npm run typecheck && npm run lint && npm run build` — all pass.
2. Click the theme button → app switches theme → reload → theme persists.
3. In devtools, watch IndexedDB writes when toggling theme → should be exactly ONE
   write per click, not multiple.
4. In React DevTools Profiler, toggling theme should produce fewer re-renders than
   before (no double-update cycle).

COMMIT: git commit -m "refactor(theme): single source of truth, remove redundant sync [M5]"
````

---

### Task 4.3 — M6: Move inline AppShell sub-components to module scope

**Files:** `src/components/AppShell.tsx`
**Severity:** Medium (performance + focus stability)

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Move `NavList`, `BrandHeader`, and `HeaderActions` (defined inline inside
AppShell) to module scope so they don't get remounted on every render.

CONTEXT:
- `src/components/AppShell.tsx` lines ~64, ~90, ~102 define:
  ```tsx
  const NavList = () => (...)
  const BrandHeader = () => (...)
  const HeaderActions = () => (...)
  ```
  inside the AppShell component body. Each render creates a new component type,
  causing React to unmount and remount the entire subtree.

REQUIRED CHANGES:

1. Move each sub-component to module scope (outside `AppShell`), passing required
   props explicitly:
   ```tsx
   // Top of file, after imports
   function NavList({ current, onNavigate, t }: {
     current: PageKey;
     onNavigate: (p: PageKey) => void;
     t: (k: string) => string;
   }) {
     return (/* nav items */);
   }

   function BrandHeader({ isDemo, t }: { isDemo: boolean; t: (k: string) => string }) {
     return (/* brand + demo badge */);
   }

   function HeaderActions({ themeMode, effectiveTheme, onCycleTheme, lang, onToggleLang, onToggleMobileNav, t }: {
     themeMode: ThemeMode;
     effectiveTheme: 'light' | 'dark';
     onCycleTheme: () => void;
     lang: Lang;
     onToggleLang: () => void;
     onToggleMobileNav: () => void;
     t: (k: string) => string;
   }) {
     return (/* theme/lang/hamburger buttons */);
   }
   ```

2. In `AppShell`, replace inline usage with prop-passing:
   ```tsx
   <NavList current={current} onNavigate={onNavigate} t={t} />
   <BrandHeader isDemo={isDemo} t={t} />
   <HeaderActions
     themeMode={themeMode}
     effectiveTheme={effectiveTheme}
     onCycleTheme={cycleTheme}
     lang={i18n.lang}
     onToggleLang={() => setLanguage(i18n.lang === 'en' ? 'vi' : 'en')}
     onToggleMobileNav={() => setMobileNavOpen(true)}
     t={t}
   />
   ```

VERIFICATION:
1. `npm run typecheck && npm run lint && npm run build` — all pass.
2. Tab through the nav → focus a nav button → trigger a re-render (e.g., toggle
   online status via devtools) → focus should remain on the same button (not jump
   to body). Previously focus would jump because the button was destroyed and
   recreated.
3. React DevTools Profiler: re-renders of AppShell should no longer remount NavList
   and HeaderActions.

COMMIT: git commit -m "refactor(appshell): move inline sub-components to module scope [M6]"
````

---

### Task 4.4 — M13: Fix `flash()` timeout race

**Files:** `src/pages/SettingsPage.tsx`, `src/pages/BookingsPage.tsx`, optionally extract to a hook
**Severity:** Medium

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Track the `flash()` setTimeout id in a ref so rapid flashes don't cut each
other short.

CONTEXT:
- `src/pages/SettingsPage.tsx` line ~24: `const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };`
- `src/pages/BookingsPage.tsx` line ~42: same pattern, 2500ms.
- If user triggers two flashes 1000ms apart, the first timeout fires at t=3000
  and clears the second toast prematurely.

REQUIRED CHANGES:

1. Create `src/hooks/useFlash.ts`:
   ```ts
   import { useCallback, useRef, useState } from 'react';

   export function useFlash(duration = 3000) {
     const [toast, setToast] = useState<string | null>(null);
     const timer = useRef<number | null>(null);

     const flash = useCallback((msg: string) => {
       setToast(msg);
       if (timer.current !== null) window.clearTimeout(timer.current);
       timer.current = window.setTimeout(() => setToast(null), duration);
     }, [duration]);

     const clear = useCallback(() => {
       if (timer.current !== null) window.clearTimeout(timer.current);
       setToast(null);
     }, []);

     return { toast, flash, clear };
   }
   ```

2. Replace the local `flash` definitions in `SettingsPage.tsx` and `BookingsPage.tsx`:
   ```tsx
   // BEFORE
   const [toast, setToast] = useState<string | null>(null);
   const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

   // AFTER
   const { toast, flash, clear: clearToast } = useFlash(3000);
   ```

3. Apply the same refactor to any other page that has a local `flash` function
   (grep for `setTimeout(() => setToast(null)` to find them all).

VERIFICATION:
1. `npm run typecheck && npm run lint && npm run build` — all pass.
2. Settings: click "Reset Demo Data" → immediately click "Export JSON" → first toast
   should be replaced by the second, and the second should disappear 3000ms after
   IT was shown (not 3000ms after the first).
3. BookingsPage: record a payment, then immediately click "Generate PDF" → same
   behavior.

COMMIT: git commit -m "fix(ui): useFlash hook with timer ref to prevent toast race [M13]"
````

---

### Task 4.5 — M12: Memoize AI engines and webmcp status in SettingsPage

**Files:** `src/pages/SettingsPage.tsx`
**Severity:** Medium (performance)

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Memoize `createEngine('deterministic')`, `createEngine('onnx')`, and
`webmcp.status()` so they're not recreated on every render.

CONTEXT:
- `src/pages/SettingsPage.tsx` lines ~20-22:
  ```ts
  const detEngine = createEngine('deterministic');
  const onnxEngine = createEngine('onnx');
  const webmcpStatus = webmcp.status();
  ```
  These run on every render of SettingsPage, which happens often due to per-keystroke
  writes (now fixed by Task 2.7's debounce, but still wasteful).

REQUIRED CHANGES:

```tsx
// BEFORE
const detEngine = createEngine('deterministic');
const onnxEngine = createEngine('onnx');
const webmcpStatus = webmcp.status();

// AFTER
const detEngine = useMemo(() => createEngine('deterministic'), []);
const onnxEngine = useMemo(() => createEngine('onnx'), []);
const webmcpStatus = useMemo(() => webmcp.status(), []);
```

Add `useMemo` to the React import at the top of the file if not already there.

VERIFICATION:
1. `npm run typecheck && npm run lint && npm run build` — all pass.
2. Open Settings → type in a field → React DevTools Profiler should show that
   `createEngine` is not being called on every keystroke (look for "SettingsPage
   render" commits and check the hooks panel).
3. The engine section of Settings should display the same status as before.

COMMIT: git commit -m "perf(settings): useMemo for AI engines + webmcp status [M12]"
````

---

### Task 4.6 — M8: Stabilize Modal `onClose` with ref pattern

**Files:** `src/components/Modal.tsx` (or `src/hooks/useDialog.ts` if Task 2.2 landed)
**Severity:** Medium

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Stabilize the Modal's onClose reference using a ref pattern so the useEffect
doesn't churn when parent re-renders.

CONTEXT:
- After Task 2.1/2.2, the Modal/useDialog effect deps should already be `[open, panelRef]`
  (not `[open, onClose]`), but verify and complete the fix.
- Parents that pass `onClose={() => setX(false)}` create a new function identity each
  render.

REQUIRED CHANGES:

If not already done in Task 2.1/2.2, ensure `useDialog` (or Modal's effect) stores
`onClose` in a ref and uses `[open]` (or `[open, panelRef]`) as deps:

```ts
// In useDialog (or Modal):
const onCloseRef = useRef(onClose);
onCloseRef.current = onClose;

useEffect(() => {
  if (!open) return;
  // ... use onCloseRef.current() instead of onClose()
}, [open, panelRef]);  // NOT onClose
```

If Task 2.1/2.2 already did this, this task is a no-op — just verify and add a
comment explaining why the ref pattern is used.

VERIFICATION:
1. `npm run typecheck && npm run lint && npm run build` — all pass.
2. Open a modal → trigger a parent re-render (e.g., toggle online status in devtools)
   → the modal should NOT flicker, the body should NOT briefly unlock, and the ESC
   listener should NOT be re-registered.

COMMIT: git commit -m "refactor(modal): stabilize onClose with ref pattern [M8]"
````

---

### Task 4.7 — Dead code: decide on the discount feature

**Files:** `src/integrations/discount.ts`, `src/i18n/dictionary.ts`, `src/data/db.ts`, `src/domain/types.ts` (and any caller)
**Severity:** Medium (maintainability)

````
You are working on the sale-os repo at /home/z/my-project/repos/sale-os.

TASK: Decide whether to wire up the discount feature or delete the dead code.
Default: DELETE, since the audit found it has zero call sites and two latent bugs.

CONTEXT:
- `src/integrations/discount.ts` exports `applySeasonalDiscount` which has NO
  call sites in the entire codebase (grep to verify).
- `discountAuditRepo.create` is only called from inside `applySeasonalDiscount`.
- `src/i18n/dictionary.ts` has 10 orphan keys (`act.discount`, `act.discountPercent`,
  `act.discountReason`, `act.discountApplied`, `act.discountRejected` × 2 languages).
- The `discountAudits` Dexie store exists but is always empty.
- The audit also found two latent bugs in `discount.ts` (doesn't update booking
  totalAmount, baseCost=0 shortcut) — these would activate if anyone wires up the UI.

REQUIRED CHANGES (DELETE path — recommended):

1. Delete `src/integrations/discount.ts`.

2. In `src/data/db.ts`, remove the `discountAudits` store from the v1 (and v2 if
   Task 3.7 landed) schema. IMPORTANT: since the store is being removed, this
   requires a new schema version. If v2 already exists from Task 3.7, add v3:
   ```ts
   this.version(3).stores({
     // ...all the same stores as v2 EXCEPT discountAudits...
   }).upgrade(async (tx) => {
     await tx.table('discountAudits').clear();
   });
   ```
   If v2 hasn't landed yet, just remove `discountAudits` from v1's stores (no
   migration needed since it was always empty).

3. In `src/data/repositories.ts`, delete `discountAuditRepo` and its `DiscountAudit`
   type import.

4. In `src/domain/types.ts`, delete the `DiscountAudit` interface and any related
   types (`SeasonalDiscountRequest`, etc.).

5. In `src/i18n/dictionary.ts`, remove the 5 `act.discount*` keys from BOTH EN and
   VI sections (10 entries total).

6. Grep for any remaining references to `discount`, `DiscountAudit`,
   `applySeasonalDiscount`, `discountAuditRepo` — fix or remove.

ALTERNATIVE (WIRE-UP path — only if product wants the feature):
1. Fix the two bugs first:
   - In `applySeasonalDiscount`, after creating the audit, call
     `bookingRepo.update(req.bookingId, { totalAmount: finalPrice })`.
   - Remove the `baseCost = 0` shortcut; use `finalPrice <= 0 ? -Infinity : ((finalPrice - baseCost) / finalPrice) * 100`.
2. Create a `DiscountModal` component invoked from BookingsPage.
3. Add a "Apply Discount" button to each Booking card.
4. Wire up the i18n keys to the new modal.
5. Add tests for the discount flow.

VERIFICATION (DELETE path):
1. `npm run typecheck && npm run lint && npm run build` — all pass.
2. `npm run dev` → app loads, no errors in console about missing modules.
3. Grep `rg -i 'discount' src/` → should return zero results (or only comments).

COMMIT (DELETE path): git commit -m "chore: remove dead discount feature (zero call sites, latent bugs) [M-x]"
COMMIT (WIRE-UP path): git commit -m "feat(discount): wire up DiscountModal + fix booking update + baseCost=0 bug"
````

---

### Wave 4 Final Verification Checklist

- [ ] `npm run typecheck && npm run lint && npm run build` — all pass
- [ ] React DevTools Profiler shows fewer re-renders when toggling online status
- [ ] Theme toggle produces exactly one DB write per click
- [ ] Tab focus stays on nav button when AppShell re-renders
- [ ] Rapid flash() calls don't cut each other short
- [ ] Settings typing doesn't recreate engines per keystroke
- [ ] Modal doesn't flicker on parent re-render
- [ ] Discount feature is either fully wired up or fully removed (no half-state)
- [ ] Open PR titled "Wave 4: Architecture & Performance (M1, M5, M6, M13, M12, M8, dead-code)"

---

## Cross-Cutting Conventions

### Branch & PR Strategy

```
main
 ├─ fix/wave-1-config-safety      → PR #1 (merge first, hotfix-grade)
 ├─ fix/wave-2-uiux-polish        → PR #2 (after #1)
 ├─ fix/wave-3-data-integrity     → PR #3 (after #1; can parallel #2)
 └─ fix/wave-4-architecture       → PR #4 (after #2 and #3)
```

- **Wave 1** can be hotfix-merged directly to main with one approval — it's all
  critical safety/config fixes.
- **Waves 2 and 3** can be developed in parallel by two developers (different file
  sets, minimal conflict surface).
- **Wave 4** is optional and can wait until after the next feature release.

### Commit Message Format

```
<type>(<scope>): <subject> [<finding-id>]
```

Types: `fix`, `feat`, `refactor`, `perf`, `chore`, `docs`, `style`
Scopes: `tailwind`, `settings`, `app`, `modal`, `a11y`, `theme`, `pages`, `repos`,
`import`, `security`, `validation`, `calculations`, `db`, `context`, `appshell`,
`ui`, `discount`

Examples:
- `fix(tailwind): add darkMode:'class' to enable theme toggle [C1]`
- `feat(settings): confirm Reset Demo Data before wiping [C2]`
- `refactor(a11y): extract useDialog hook; apply to mobile drawer [M3]`
- `fix(repos): strip undefined from patch in update() [H12]`
- `perf(context): memoize AppContext value [M1]`

### Pre-PR Self-Review Checklist

Before opening a PR, verify:
- [ ] All tasks in the wave have their own commit
- [ ] `npm run typecheck` passes with 0 errors
- [ ] `npm run lint` passes with 0 errors (warnings OK)
- [ ] `npm run build` succeeds and produces `dist/`
- [ ] Manual smoke test: dashboard → leads → bookings → tasks → pipeline → settings
  all render without console errors
- [ ] Dark mode works in all three toggle states
- [ ] No new dependencies added (unless explicitly approved)
- [ ] PR description lists every finding ID addressed (e.g., "Closes C1, C2, C3, H7, H9")

### Testing Strategy

The codebase currently has no automated tests. For each wave, at minimum add:

1. **Wave 1:** Smoke test the recovery paths (ErrorBoundary trigger, init failure path).
2. **Wave 2:** Keyboard-only navigation pass through every page.
3. **Wave 3:** A test fixture file `test-fixtures/known-bad-import.json` and a
   script that asserts the expected error list. This becomes the regression test
   for the import validator.
4. **Wave 4:** No new tests required (pure refactor).

Setting up Vitest is out of scope for these waves but should be the very next
investment after Wave 4 lands.

### When the Agent Gets Stuck

If an agent reports any of these, stop and ask for clarification:
- "The file path doesn't exist" → confirm the repo is at
  `/home/z/my-project/repos/sale-os` and on the correct branch.
- "Line numbers don't match" → instruct the agent to grep for the function/identifier
  instead of relying on line numbers (the audit was done on commit `ae5d113`).
- "I can't find `exportData` in importExport.ts" → check what the actual export
  function is called; the audit may have used a generic name.
- "ConfirmDialog doesn't accept a `danger` prop" → check the actual component API
  in `src/components/Modal.tsx` and adapt the prompt.
- "The Dexie database name isn't `SaleOSDB`" → check `src/data/db.ts` for the
  actual `new Dexie('...')` call and use that name.

---

## Quick Reference: All 26 Tasks

| Wave | Task | Finding | Title | Files | Effort |
|------|------|---------|-------|-------|--------|
| 1 | 1.1 | C1 | Tailwind darkMode | tailwind.config.js | 5 min |
| 1 | 1.2 | C2 | Reset confirmation | SettingsPage, dictionary | 30 min |
| 1 | 1.3 | C3 | Import confirmation + backup | SettingsPage, dictionary | 45 min |
| 1 | 1.4 | H7 | ErrorBoundary | ErrorBoundary (new), App.tsx | 1 hr |
| 1 | 1.5 | H9 | CRUD try/catch + error state | AppContext, App.tsx | 1.5 hr |
| 2 | 2.1 | H8 | Modal a11y + portal | Modal.tsx | 1.5 hr |
| 2 | 2.2 | M3 | Mobile drawer a11y | AppShell, useDialog (new) | 1 hr |
| 2 | 2.3 | M4 | Global focus-visible rings | index.css | 10 min |
| 2 | 2.4 | M2 | Theme FOUC inline script | index.html | 15 min |
| 2 | 2.5 | M10 | Exit animations | useDelayedUnmount (new), Modal, AppShell | 1.5 hr |
| 2 | 2.6 | H3+H5+H6+M14+M16+M17 | Page UX batch | 6 pages, dictionary | 2 hr |
| 2 | 2.7 | M7+M11 | Theme mode indicator + debounce | AppShell, SettingsPage | 1.5 hr |
| 3 | 3.1 | H12 | update() strip undefined | repositories.ts | 30 min |
| 3 | 3.2 | H13 | importData ref checks | importExport.ts | 1 hr |
| 3 | 3.3 | H15 | paymentLink URL validation | validation.ts, BookingsPage | 1 hr |
| 3 | 3.4 | M19 | isoString format validation | validation.ts | 15 min |
| 3 | 3.5 | M20 | Currency rounding | calculations.ts, discount.ts | 45 min |
| 3 | 3.6 | H1+H2+H4+H10+H11 | Logic bugs batch | 5 files, dictionary | 2.5 hr |
| 3 | 3.7 | M21 | Dexie v2 migration + closedAt | db.ts, types.ts, repositories.ts | 1.5 hr |
| 4 | 4.1 | M1 | Memoize AppContext value | AppContext.tsx | 45 min |
| 4 | 4.2 | M5 | Theme sync single source | AppContext.tsx | 1 hr |
| 4 | 4.3 | M6 | AppShell sub-components to module scope | AppShell.tsx | 1 hr |
| 4 | 4.4 | M13 | useFlash hook | useFlash (new), Settings, Bookings | 45 min |
| 4 | 4.5 | M12 | useMemo engines | SettingsPage | 15 min |
| 4 | 4.6 | M8 | Stabilize Modal onClose | Modal / useDialog | 30 min |
| 4 | 4.7 | (dead) | Discount feature decision | discount.ts, db, dictionary, types | 1 hr |

**Total estimated effort:** ~25 hours = ~3.5 full developer-days, plus review and PR overhead ≈ 5 calendar days.

---

## Suggested First Prompt to Send to the Agent

To kick off Wave 1, copy this entire block into your AI coding agent:

````
PROJECT: sale-os — a local-first React 18 + Vite 5 + TypeScript 5.5 + Tailwind CSS 3.4
sales CRM for travel agents ("Phúc Gia Travel"). Bilingual EN/VI, dark mode, Dexie
(IndexedDB) persistence, recharts, jsPDF, zod, lucide-react.

REPO: /home/z/my-project/repos/sale-os  (already cloned, on branch main, commit ae5d113)
TECH: React 18, Vite 5, TS 5.5, Tailwind 3.4, Dexie 4, zod 4, recharts 3, jsPDF 4

RULES:
- Do NOT introduce new dependencies unless the prompt explicitly says so.
- Preserve existing i18n patterns: every user-visible string MUST go through t('key').
- Maintain TypeScript strict mode — no `any`, no `@ts-ignore`, no `as unknown as`.
- After changes: run `npm run typecheck && npm run lint && npm run build` and fix any
  errors before declaring the task complete.
- Commit with the message specified at the end of the prompt.

I will send you 5 tasks for Wave 1 (Configuration & Safety). Please complete them
sequentially, one commit per task. Start by creating branch `fix/wave-1-config-safety`
from main. After all 5 tasks, push the branch and report ready for PR.

Ready? Reply "ready" and I'll send Task 1.1.
````

Then send each task prompt (1.1 through 1.5) one at a time, waiting for the agent
to commit before sending the next.

---

## Production Deployment — Cloudflare Workers

**Target:** `https://os.letstravel.vn`  
**Deployment:** GitHub Actions builds and deploys the Vite SPA to Cloudflare Workers
with Static Assets whenever a commit is pushed to `main`; the workflow can also be
started manually with `workflow_dispatch`.

### Configuration added

- `worker.js` serves the generated static assets and exposes `/health` for a basic
  deployment check.
- `wrangler.jsonc` points Workers Static Assets at `dist/`, enables SPA fallback for
  client-side routes, and binds the Worker to the `os.letstravel.vn` custom domain.
- `.github/workflows/deploy-cloudflare.yml` runs install, type-check, lint, build,
  and `wrangler deploy` on pushes to `main`.
- Wrangler is a locked development dependency so local dry-runs and CI deployments
  use the same tool version.

### One-time setup

1. Ensure `letstravel.vn` is an active zone in the Cloudflare account and that
   `os.letstravel.vn` is available for a Workers custom domain. Cloudflare provisions
   the DNS record and certificate when Wrangler creates the custom domain.
2. Create a Cloudflare API token scoped to the target account with permission to
   deploy Workers and their static assets, and permission to create/manage the
   custom-domain DNS record for `letstravel.vn`. Restrict the token to the required
   account and zone.
3. In the GitHub repository settings, add Actions secrets:
   - `CLOUDFLARE_API_TOKEN` — the scoped API token.
   - `CLOUDFLARE_ACCOUNT_ID` — the Cloudflare account ID.
4. Merge or push the deployment commit to `main`, or run
   **Actions → Deploy to Cloudflare Workers → Run workflow**. After it succeeds,
   check `https://os.letstravel.vn/health` for `ok` and open the application URL.

Do not add Cloudflare credentials to source files, Wrangler configuration, or
repository variables. A first deployment requires the two GitHub secrets; tokens
do not need to be supplied in chat.

### Data and hosting behavior

This deploys the existing browser-based application; it does not migrate Dexie data
to a server. Records remain in each user's browser IndexedDB and are not shared or
automatically synchronized between browsers/devices. The production app remains
dependent on browser-local persistence unless a separate backend/sync feature is
implemented.

### Deployment verification checklist

- [ ] Configure the Cloudflare token and account ID as GitHub Actions secrets.
- [ ] Confirm the custom domain is provisioned and HTTPS is active.
- [ ] Confirm GitHub Actions passes type-check, lint, build, and Worker deployment.
- [ ] Confirm `/health` returns `ok`, application routes load through SPA fallback,
      and a page reload on a nested route still renders the app.
- [ ] Verify browser-local data persistence and clarify to users that it does not
      synchronize across devices.

---

End of plan. Good luck — the architecture is sound, the issues are localized, and
each wave should land cleanly with the verifications above.
