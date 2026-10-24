# Phúc Gia Travel Sales OS — Architecture Documentation

> A bilingual (EN/VI) sales operations cockpit for travel agents. Local-first, offline-capable, with a deterministic task-scoring engine and optional ONNX model integration.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [Application Bootstrap & Routing](#3-application-bootstrap--routing)
4. [State Management (AppContext)](#4-state-management-appcontext)
5. [Data Layer](#5-data-layer)
6. [Domain Model & Types](#6-domain-model--types)
7. [Business Logic (calculations.ts)](#7-business-logic-calculationsts)
8. [Task Scoring Engine (scoring.ts)](#8-task-scoring-engine-scoringts)
9. [Decision Engine & AI (decisionEngine.ts)](#9-decision-engine--ai-decisionenginets)
10. [Pages & UI](#10-pages--ui)
11. [Shared Components](#11-shared-components)
12. [Internationalization (i18n)](#12-internationalization-i18n)
13. [Theming](#13-theming)
14. [Integrations](#14-integrations)
15. [WebMCP Adapter](#15-webmcp-adapter)
16. [Data Import / Export](#16-data-import--export)
17. [Validation (zod)](#17-validation-zod)
18. [Build Configuration](#18-build-configuration)
19. [Key Patterns & Conventions](#19-key-patterns--conventions)
20. [Known Gaps & Future Work](#20-known-gaps--future-work)

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 (StrictMode) |
| Build tool | Vite 5 |
| Language | TypeScript 5.5 |
| Styling | Tailwind CSS 3.4 (with `dark:` variants) |
| Icons | lucide-react |
| Charts | recharts 3 |
| Local DB | Dexie (IndexedDB wrapper) |
| PDF generation | jsPDF 4 |
| Validation | zod 4 |
| Optional AI | onnxruntime-web (dynamic import, not installed by default) |

No router library is used — navigation is managed via `useState<PageKey>` in `App.tsx`.

---

## 2. Project Structure

```
src/
├── App.tsx                      # Root: wraps AppProvider + RoutedApp (page switch)
├── main.tsx                     # Entry: createRoot + StrictMode
├── index.css                    # Tailwind directives + custom animations
├── vite-env.d.ts                # Vite client types + onnxruntime-web shim
│
├── ai/
│   └── decisionEngine.ts        # Deterministic + ONNX decision engines
│
├── components/
│   ├── AppShell.tsx              # Sidebar nav, header, theme/lang toggles
│   ├── Button.tsx               # Variants: primary/secondary/ghost/danger/outline
│   ├── Form.tsx                 # Field, Input, Textarea, Select, Badge, Card, EmptyState
│   └── Modal.tsx                # Modal + ConfirmDialog
│
├── data/
│   ├── db.ts                    # Dexie database definition (7 tables)
│   ├── repositories.ts          # CRUD repos per entity
│   ├── seed.ts                  # Demo data seeder
│   └── importExport.ts          # JSON/CSV export, JSON import with validation
│
├── domain/
│   ├── types.ts                 # All TypeScript interfaces & union types
│   ├── calculations.ts          # Revenue, commission, formatting, date utils
│   ├── scoring.ts               # GSD task scoring + ranking engine
│   └── validation.ts            # zod schemas for import validation
│
├── i18n/
│   ├── dictionary.ts            # EN + VI translation dictionaries
│   └── index.ts                 # makeI18n() factory + I18n interface
│
├── integrations/
│   ├── whatsapp.ts              # WhatsApp draft builder + phone normalization
│   ├── WhatsAppModal.tsx        # Modal UI for WhatsApp draft
│   ├── pdf.ts                   # jsPDF itinerary generator
│   └── discount.ts              # Seasonal discount logic + audit
│
├── pages/
│   ├── DashboardPage.tsx        # Performance KPIs, GSD queue, pipeline chart, alerts
│   ├── LeadsPage.tsx            # Lead CRUD + search/filter + WhatsApp
│   ├── PackagesPage.tsx         # Tour package CRUD + margin tracking
│   ├── BookingsPage.tsx         # Booking CRUD + payments + PDF download
│   ├── TasksPage.tsx            # GSD task list with scoring, filters, complete
│   ├── PipelinePage.tsx         # Kanban board (5 stage columns)
│   └── SettingsPage.tsx         # Agent profile, app settings, data mgmt, AI/WebMCP
│
├── store/
│   └── AppContext.tsx           # Central React context: state + CRUD + online status
│
├── theme/
│   └── useTheme.ts              # light/dark/system theme hook
│
└── webmcp/
    └── adapter.ts               # WebMCP (navigator.modelContext) feature detection
```

---

## 3. Application Bootstrap & Routing

### `main.tsx`
```
createRoot(#root) → <StrictMode> → <App />
```

### `App.tsx`
Two components:

- **`App`** (default export): wraps everything in `<AppProvider>`.
- **`RoutedApp`** (inside the provider): consumes `useApp()` for loading state and i18n. Holds `useState<PageKey>('dashboard')` for current page and `useState<string|null>` for cross-page task navigation (Dashboard → Tasks).

Page switching is a `switch` statement on `PageKey`:

```typescript
type PageKey = 'dashboard' | 'leads' | 'packages' | 'bookings' | 'tasks' | 'pipeline' | 'settings';
```

No URL routing — the entire app is a single-page SPA with in-memory navigation. The `AppShell` renders the sidebar and passes `onNavigate` down.

**Cross-page navigation:** Dashboard can open a specific task via `onOpenTask(taskId)`, which sets `openTaskId` and switches to the Tasks page. `TasksPage` receives `initialTaskId` and `onConsumeTaskId` to open the edit modal for that task.

---

## 4. State Management (AppContext)

**File:** `src/store/AppContext.tsx`

A single React Context (`AppContext`) wraps the entire app. All state and CRUD operations live here.

### State held:
| State | Type | Source |
|---|---|---|
| `loading` | `boolean` | true until seed+refresh complete |
| `isDemo` | `boolean` | true if agent ID is `agent_demo_01` |
| `agent` | `Agent \| undefined` | from `agentRepo.get()` |
| `settings` | `Settings \| undefined` | from `settingsRepo.get()` |
| `leads` | `Lead[]` | from `leadRepo.all()` |
| `packages` | `TourPackage[]` | from `packageRepo.all()` |
| `bookings` | `Booking[]` | from `bookingRepo.all()` |
| `tasks` | `GsdTask[]` | from `taskRepo.all()` |
| `online` | `boolean` | `navigator.onLine` + event listeners |

### Initialization flow:
1. `useEffect` on mount: check `isSeeded()` → if not seeded, `seedDemoData()` → then `refresh()` → `setLoading(false)`.
2. `refresh()` loads all entities in parallel via `Promise.all`.
3. Online/offline listeners attached via `window.addEventListener('online'/'offline')`.

### CRUD pattern:
Each entity has `saveX` and `deleteX` functions:
- **saveX:** if `id` present → `repo.update()`, else → `repo.create()` (strips the optional id field). After save, re-fetches all records for that entity.
- **deleteX:** calls `repo.remove()`, then re-fetches.

### Settings/Agent updates:
- `setSettings(patch)`: merges into existing settings, persists, updates state. If `patch.theme` present, also calls `setThemeMode`.
- `setAgent(patch)`: merges into existing agent, persists, updates state.
- `setLanguage(lang)`: updates settings + localStorage `pg_lang`.

### `recordPayment(bookingId, amount)`:
Fetches booking, computes new paid amount (capped at total), derives payment status, updates booking.

### Context value interface (`AppContextValue`):
Exposes all state + i18n + theme + all CRUD functions + `refresh()` + `online`.

---

## 5. Data Layer

### `src/data/db.ts`

Dexie database named `phucgia_salesos`, version 1, with 7 tables:

| Table | Primary Key | Indexed Fields |
|---|---|---|
| `agents` | `agentId` | `name`, `active` |
| `leads` | `leadId` | `agentId`, `stage`, `destination`, `priorityScore`, `nextActionAt`, `createdAt` |
| `packages` | `packageId` | `destination`, `availabilityStatus`, `supplierCutoffAt` |
| `bookings` | `bookingId` | `leadId`, `packageId`, `bookingStatus`, `paymentStatus`, `currency`, `createdAt` |
| `tasks` | `taskId` | `agentId`, `leadId`, `bookingId`, `urgencyLevel`, `status`, `dueAt`, `createdAt` |
| `settings` | `id` | `agentId` |
| `discountAudits` | `id` | `bookingId`, `leadId`, `createdAt` |

Helper exports: `newId(prefix)` generates `${prefix}_${timestamp36}_${random6}`, `nowISO()` returns `new Date().toISOString()`.

### `src/data/repositories.ts`

One repository object per entity, each with:
- `all()` / `get(id)` — read
- `create(data)` — generates ID + timestamps, puts into DB
- `update(id, patch)` — merges with existing, updates timestamp
- `remove(id)` — deletes

`agentRepo`: simpler — `get()` returns the active agent (or first), `save()` puts directly.

`settingsRepo`: includes `ensureDefault(agentId)` that creates a default settings record if none exists.

`discountAuditRepo`: `all()` + `create()` only (append-only audit log).

### `src/data/seed.ts`

Seeds demo data for first-time users:
- 1 demo agent (`agent_demo_01`, "Linh Pham")
- 4 tour packages (Da Nang, Sapa, Japan, Phu Quoc)
- 5 leads across all pipeline stages
- 9 bookings (3 current + 6 past completed for revenue history)
- 6 GSD tasks (various types, urgencies, statuses)
- 1 settings record

**`seedDemoData(force?)`**: if `force=true`, clears all tables first, then bulk-puts all demo data in a transaction. If not forced and agent already exists, returns early.

**`resetDemoData()`**: calls `seedDemoData(true)`.

**`isSeeded()`**: checks if `agents` table has any records.

---

## 6. Domain Model & Types

**File:** `src/domain/types.ts`

### Union types:
```typescript
Currency           = 'VND' | 'USD' | 'KRW' | 'JPY'
LeadStage          = 'Inquiry' | 'Quote Sent' | 'Deposit Paid' | 'Closed Won' | 'Lost'
PaymentStatus      = 'Unpaid' | 'Partial' | 'Paid' | 'Refunded'
BookingStatus      = 'Draft' | 'Confirmed' | 'Cancelled' | 'Completed'
AvailabilityStatus = 'Available' | 'Limited' | 'Sold Out' | 'On Request'
TaskType           = 'Follow Up' | 'Quote' | 'Deposit' | 'Itinerary' | 'Visa' | 'Supplier' | 'Custom'
UrgencyLevel       = 'P0' | 'P1' | 'P2'
TaskStatus         = 'Open' | 'Completed' | 'Deferred' | 'Cancelled'
```

### Core interfaces:

**Agent** — the sales agent profile: name, monthly revenue target, commission rate (0–1), currency, active flag.

**Lead** — a potential client: client name, optional agency name, destination, party size, budget, currency, pipeline stage, priority score (0–100), expected close date, quote expiry date, source, next action timestamp, notes. Timestamps for creation/update.

**TourPackage** — a sellable tour: title, destination, duration (days), base cost, selling price, currency, availability status, optional supplier cutoff date, season. Timestamps.

**Booking** — a confirmed/ draft reservation: links to a lead and optionally a package. Total amount, deposit, amount paid, balance due date, payment status, booking status, currency, confirmed-at timestamp, optional payment link. Timestamps.

**GsdTask** — a getting-stuff-done task: optional links to lead and booking, title, description, task type, urgency level (P0/P1/P2), estimated value, estimated minutes, due date, status, completed-at. Timestamps.

**Settings** — app configuration: language, theme, reporting currency, selling days total/elapsed, revenue recognition mode, margin floor %, P0/P1 thresholds. Timestamps.

**DiscountAudit** — audit trail for seasonal discounts: booking/lead reference, original price, discount %, final price, reason, approver. Creation timestamp.

---

## 7. Business Logic (calculations.ts)

**File:** `src/domain/calculations.ts`

### Pure functions:
- `grossProfit(pkg)` → selling price − base cost
- `grossMarginPct(pkg)` → (profit / selling price) × 100, returns 0 if price ≤ 0
- `outstandingBalance(booking)` → max(0, total − paid)
- `revenueAttainment(actual, target)` → (actual / target) × 100
- `revenueGap(target, actual)` → max(0, target − actual)
- `requiredDailyPace(gap, remainingDays)` → gap / remainingDays (Infinity if days ≤ 0 and gap > 0)
- `earnedCommission(revenue, rate)` → revenue × rate
- `quoteConversionRate(won, eligible)` → won / eligible (0 if eligible ≤ 0)
- `computePaymentStatus(total, paid)` → 'Unpaid' | 'Partial' | 'Paid'

### `summarizeRevenue(agent, leads, bookings, settings, now?)` → `RevenueSummary`
The core analytics function. Returns 16 metrics:

1. **confirmedRevenue** — depends on `settings.revenueRecognition`:
   - `on_full_payment`: only fully-paid bookings count
   - `on_deposit`: only `amountPaid` counts
   - `on_confirmation`: full `totalAmount` of confirmed/completed bookings
2. **cashCollected** — sum of `amountPaid` across recognized bookings
3. **commissionableRevenue** — `cashCollected` if `on_deposit`, else `confirmedRevenue`
4. **earnedCommission** — commissionable revenue × agent commission rate
5. **estimatedCommissionAtTarget** — monthly target × commission rate
6. **qualifiedLeads** — leads not in 'Lost' stage
7. **quotesSent** — leads in Quote Sent / Deposit Paid / Closed Won
8. **confirmedBookings** — count of recognized bookings
9. **quotedValue** — sum of budgets for leads past Inquiry
10. **forecastValue** — weighted: budget × (priorityScore / 100) for active-stage leads
11. **conversionRate** — won / eligible (non-Inquiry leads)
12. **attainmentPct** — confirmedRevenue / monthlyTarget × 100
13. **revenueGap** — max(0, target − confirmedRevenue)
14. **remainingDays** — max(0, sellingDaysTotal − sellingDaysElapsed)
15. **requiredPace** — gap / remainingDays
16. **avgInquiryToBookingDays** — average days from lead creation to update for Closed Won leads

### Formatting utilities:
- `formatCurrency(value, currency, locale)` — Intl.NumberFormat, compact notation for ≥1M, VND uses 0 decimals, returns '∞' for non-finite
- `formatDate(value?, locale)` — short date format
- `formatDateTime(value?, locale)` — date + time format
- `daysUntil(value?, now?)` / `hoursUntil(value?, now?)` — ceil diff to days/hours, null if no date

---

## 8. Task Scoring Engine (scoring.ts)

**File:** `src/domain/scoring.ts`

### `scoreTask(task, config?)` → `ScoredTask`

Scores each open task across 5 dimensions (total 100 points):

| Component | Max | Logic |
|---|---|---|
| **Deadline Urgency** | 30 | Overdue → 30; ≤4h → 30; ≤24h → 24; ≤3d → 18; ≤7d → 12; ≤14d → 6; else → 2; no date → 5 |
| **Financial Impact** | 25 | <$500 → 4; <$2000 → 10; <$10000 → 18; ≥$10000 → 25; ≤0 → 0 |
| **Conversion Likelihood** | 20 | Deposit → 18; Quote → 14; Follow Up → 12; Itinerary → 10; Visa → 8; Supplier → 15; Custom → 5 |
| **Strategic Importance** | 15 | Supplier → 15; Visa → 10; Deposit → 8; else → 3 |
| **Time Efficiency** | 10 | ≤5min → 10; ≤15min → 8; ≤30min → 6; ≤60min → 4; >60min → 2 |

**Critical override:** If task is a Supplier task and overdue, totalScore is boosted to ≥90 and priority becomes P0.

**Priority assignment:**
- P0: totalScore ≥ `p0Threshold` (default 80) OR criticalOverride
- P1: totalScore ≥ `p1Threshold` (default 50)
- P2: otherwise

Each scored task includes: `components[]` (breakdown), `explanation` (human-readable), `recommendedAction` (per task type), `warnings[]`, `isOverdue`, `criticalOverride`.

### `rankTasks(tasks, config?)` → `ScoredTask[]`
Filters to `status === 'Open'`, scores each, sorts by:
1. Total score (descending)
2. Earliest deadline
3. Highest estimated value
4. Earliest creation time

### `streakInfo(tasks, now?)` → `{ currentStreak, completedToday }`
Counts consecutive days with ≥1 completed task ending today (or yesterday if today has none).

### `priorityGroup(scored)` → `Record<UrgencyLevel, ScoredTask[]>`
Splits scored tasks into P0/P1/P2 buckets.

### `attachContext(scored, leads, bookings)` → `{ lead?, booking? }`
Resolves the associated lead and booking for a scored task.

---

## 9. Decision Engine & AI (decisionEngine.ts)

**File:** `src/ai/decisionEngine.ts`

Two engines implementing the `DecisionEngine` interface:

### `DeterministicDecisionEngine`
- Always available. Delegates to `rankTasks()` from `scoring.ts`.
- Returns `DecisionResult` with `engine: 'deterministic'`, latency, no warnings.

### `OnnxDecisionEngine`
- **Disabled by default** (`available = false`).
- `initialize()`: HEAD-checks `/models/laya_rank.onnx`. If found, dynamically imports `onnxruntime-web` (externalized in Vite build). If the import or model fails, stays disabled.
- `rank()`: if not initialized, falls back to deterministic with a warning. If initialized but inference adapter not wired (current state), also falls back with a warning.
- **Never fabricates inference** — always falls back to deterministic scoring.

### `createEngine(kind)`
Factory: `'onnx'` → `OnnxDecisionEngine`, default → `DeterministicDecisionEngine`.

### Type declarations
`onnxruntime-web` is not installed. A minimal ambient module declaration in `vite-env.d.ts` provides type shims. Vite config externalizes it so the build doesn't fail on the dynamic import.

---

## 10. Pages & UI

### DashboardPage (`src/pages/DashboardPage.tsx`)
The landing page. Props: `onNavigate(PageKey)`, `onOpenTask(taskId)`.

**Sections:**
1. **Performance header** — 8 StatCards in a responsive grid:
   - Monthly Target, Confirmed Revenue (with cash collected sub), Attainment % (with gap sub), Required Daily Pace (with remaining days), Earned Commission (with est. at target), Qualified Leads (with quotes sent), Confirmed Bookings (with conversion rate), Avg Inquiry→Booking (with quoted value)
2. **GSD Command Center** — priority-filterable task list (P0/P1/P2/All), top 12 tasks. Each TaskRow shows priority badge, type, due label, lead context, score bar, and quick-complete button.
3. **Sales Pipeline mini-chart** — recharts BarChart of lead count/value per stage, colored bars.
4. **GSD Productivity** — 6 mini stats: completed today, completion rate, overdue, high-value done, streak, zero-inbox.
5. **Supplier Cutoff Alerts** — packages with cutoff ≤7 days, sorted by urgency.
6. **Package Intelligence** — top 4 packages with margin % (green if ≥ floor, red if below).

### LeadsPage (`src/pages/LeadsPage.tsx`)
- Search bar (filters by client name, agency, destination) + stage filter dropdown.
- Card grid with stage badges, budget, dates, quote expiry warnings.
- WhatsApp button opens `WhatsAppModal`.
- Full CRUD via `LeadFormModal` (12 fields including notes).
- Delete confirmation via `ConfirmDialog`.

### PackagesPage (`src/pages/PackagesPage.tsx`)
- Sorted card grid (alphabetical by title).
- Each card: title, destination, duration, base cost, selling price, margin % (color-coded vs. floor), season, supplier cutoff (highlighted if ≤7 days).
- Full CRUD via `PackageFormModal` (9 fields).
- Delete confirmation.

### BookingsPage (`src/pages/BookingsPage.tsx`)
- Sorted card grid (newest first).
- Each card: client name (from lead), package title, total/paid/balance, balance due date, payment + booking status badges.
- Actions: PDF download (generates itinerary via jsPDF), Record Payment (modal with amount input), Edit, Delete.
- `PaymentModal` — pre-fills outstanding balance, caps at remaining, calls `recordPayment`.
- Full CRUD via `BookingFormModal` (11 fields: lead, package, amounts, currency, statuses, dates, payment link).

### TasksPage (`src/pages/TasksPage.tsx`)
- Props: `initialTaskId?`, `onConsumeTaskId?` — for cross-page task opening.
- Priority filter tabs (All/P0/P1/P2).
- **Filtered view:** shows only tasks matching the selected priority.
- **All view:** shows Open tasks (top 12, scored & ranked) + Completed/Deferred tasks (top 8).
- Each TaskRow: priority badge, type badge, due label (overdue/ hours/ days), lead context, explanation, score bar, edit + complete buttons.
- Full CRUD via `TaskFormModal` (10 fields including lead/booking association dropdowns).

### PipelinePage (`src/pages/PipelinePage.tsx`)
- 5-column kanban board (Inquiry → Quote Sent → Deposit Paid → Closed Won → Lost).
- Each column: stage label, count badge, total value, lead cards.
- Cards show client, agency, destination, party size, budget, expected close, quote expiry (red if ≤1 day).
- Header totals: total pipeline value + closed-won value.

### SettingsPage (`src/pages/SettingsPage.tsx`)
5 sections:
1. **Agent Profile** — name, monthly target, commission rate (inline editable).
2. **App Settings** — language, theme, reporting currency, revenue recognition mode, selling days total/elapsed, margin floor, P0/P1 thresholds (all inline editable).
3. **Data Management** — Export JSON, Export CSV, Import JSON (file picker), Reset to Demo Data. Privacy + sync notes.
4. **AI Status** — Deterministic engine badge (always available), ONNX engine status badge, not-configured note.
5. **WebMCP Status** — supported/unsupported badge + detail text.

---

## 11. Shared Components

### AppShell (`src/components/AppShell.tsx`)
- **Desktop sidebar** (fixed, 240px, lg+): brand header (Phúc Gia Travel logo + tagline), nav list (7 items with lucide icons), date display, demo data badge.
- **Mobile drawer**: slide-in nav with overlay, triggered by hamburger menu.
- **Header**: current page title, date, language toggle (EN/VI), theme cycle (light→dark→system), online/offline indicator.
- **Main content area**: max-width 7xl, centered, padded.
- Exports `PageKey` type.

### Button (`src/components/Button.tsx`)
- Variants: `primary` (sky), `secondary` (slate), `ghost` (transparent), `danger` (rose), `outline` (border).
- Sizes: `sm`, `md`, `lg`.
- Focus ring, disabled state, extends `ButtonHTMLAttributes`.

### Form (`src/components/Form.tsx`)
- `Field` — label wrapper with required asterisk and hint.
- `Input`, `Textarea`, `Select` — styled form controls, extend native HTML attributes.
- `Badge` — pill with 7 colors (slate/sky/emerald/amber/rose/violet/indigo).
- `Card` — rounded bordered container with shadow.
- `EmptyState` — centered empty message.

### Modal (`src/components/Modal.tsx`)
- `Modal` — overlay dialog with backdrop, escape-to-close, body scroll lock, 4 sizes (sm/md/lg/xl), optional footer.
- `ConfirmDialog` — pre-built confirmation modal with cancel/confirm buttons and danger styling.

---

## 12. Internationalization (i18n)

### `src/i18n/dictionary.ts`
Two flat dictionaries (`en`, `vi`) with ~230 keys covering all UI strings. Key naming convention:
- `app.*`, `nav.*`, `common.*` — global
- `dash.*` — dashboard
- `lead.*`, `pkg.*`, `book.*`, `task.*` — entity-specific
- `act.*` — action labels (WhatsApp, discount, PDF)
- `set.*` — settings
- `filters.*` — filter labels

`translate(lang, key)` falls back to English, then to the raw key.

### `src/i18n/index.ts`
`makeI18n(lang)` → `{ lang, t(key), locale }` where locale is `'vi-VN'` or `'en-US'`.

The i18n instance is created in `AppContext` via `useMemo` keyed on `settings.language`. All pages receive it via `useApp().i18n`.

---

## 13. Theming

**File:** `src/theme/useTheme.ts`

- `ThemeMode = 'light' | 'dark' | 'system'`
- Persists to `localStorage('pg_theme')`.
- `applyTheme(mode)`: resolves system to matchMedia, toggles `dark` class on `<html>`.
- Listens to `prefers-color-scheme` changes when in system mode.
- Returns `{ mode, setMode, effective }` where `effective` is `'light' | 'dark'`.

In `AppContext`, theme is initialized from `settings.theme` and kept synced via `useEffect` on `settings.theme`. The `setThemeMode` in context also persists to settings.

---

## 14. Integrations

### WhatsApp (`src/integrations/whatsapp.ts`)
- `normalizePhone(input)` — strips non-digits, validates 8–15 digits, strips leading +.
- `buildWhatsAppDraft(lead, phone, agentName, locale)` — generates a localized message with greeting, destination, party size, quote expiry, and agent signature. Returns `{ text, url }` where URL is a `wa.me` deep link with encoded text.

### WhatsAppModal (`src/integrations/WhatsAppModal.tsx`)
- Phone input (tel mode), live draft preview, copy-to-clipboard, open-in-WhatsApp button.
- Validates phone before enabling the open button.

### PDF (`src/integrations/pdf.ts`)
- `generateItineraryPdf(lead, pkg?, booking?, agentName, locale)` — creates an A4 jsPDF document with:
  - Header: "Phúc Gia Travel" + localized title
  - Client section: name, agency, destination, party size
  - Package section (if present): title, duration, season, selling price
  - Payment section (if present): total, paid, outstanding, balance due
  - Inclusions/Exclusions lists (localized)
  - Footer: agent name + disclaimer
- Returns the `jsPDF` instance (caller calls `.save()`).

### Discount (`src/integrations/discount.ts`)
- `applySeasonalDiscount(req)` — calculates discount amount, final price, and post-discount margin. If margin falls below floor, returns `{ ok: false, error }`. Otherwise creates a `DiscountAudit` record and returns `{ ok: true, audit }`.
- `packageMarginCheck(pkg, floor)` — returns `{ ok, marginPct }`.

---

## 15. WebMCP Adapter

**File:** `src/webmcp/adapter.ts`

Feature-detection adapter for the experimental `navigator.modelContext` API (browser-native MCP tool registration).

- `WebMcpAdapter` class with an internal tool registry (`Map<string, WebMcpToolDef>`).
- `detectApi()` checks for `navigator.modelContext.registerTool`.
- `registerTool(def)` / `unregisterTool(name)` — manage the internal registry.
- `tryRegisterAll()` — attempts to register all tools with the browser API (if available).
- `invoke(name, args)` — calls a registered tool's handler.
- `status()` → `{ supported, apiName, registeredCount, detail }`.
- `listTools()` — returns all registered tool definitions.

Currently not wired to any UI actions — only displayed as status in Settings.

---

## 16. Data Import / Export

**File:** `src/data/importExport.ts`

### Export
- `exportData()` → `ExportBundle` — collects all 7 tables into a versioned JSON bundle with `exportedAt` timestamp.
- `downloadFile(filename, content, mime)` — creates a Blob, triggers download via temporary `<a>`.
- `toCSV(rows)` — converts array of objects to CSV with proper escaping.

### Import
- `importData(json, { replace? })` — validates against `importSchema` (zod), checks for duplicate IDs within the bundle, validates referential integrity (bookings→leads, bookings→packages, tasks→leads), then bulk-puts all data in a transaction (optionally clearing first).
- Returns `{ ok, counts, errors }`.

---

## 17. Validation (zod)

**File:** `src/domain/validation.ts`

Defines zod schemas for all entities, mirroring the TypeScript interfaces:
- `agentSchema`, `leadSchema`, `packageSchema`, `bookingSchema`, `taskSchema`, `settingsSchema`, `discountAuditSchema`
- `importSchema` — composite schema for the import bundle with optional arrays defaulting to `[]`

Used exclusively by `importData()` for validating imported JSON before writing to the database.

---

## 18. Build Configuration

### `vite.config.ts`
```typescript
{
  plugins: [react()],
  resolve: { alias: { '@': './src' } },
  optimizeDeps: { exclude: ['lucide-react'] },
  build: { rollupOptions: { external: ['onnxruntime-web'] } },
}
```

- `@` alias maps to `src/` — all imports use `@/...` paths.
- `onnxruntime-web` is externalized so the dynamic import doesn't break the build (package is not installed).
- `lucide-react` is excluded from Vite's dep pre-bundling.

### TypeScript
- `tsconfig.app.json` — app source (strict mode)
- `tsconfig.node.json` — Node-side (vite config)
- `tsconfig.json` — project references

### Scripts
- `npm run dev` — Vite dev server (blocked in this environment)
- `npm run build` — Vite production build
- `npm run typecheck` — `tsc --noEmit -p tsconfig.app.json`
- `npm run lint` — ESLint
- `npm run preview` — Vite preview server

### Tailwind
- `tailwind.config.js` + `postcss.config.js` — standard Tailwind 3 setup with `darkMode: 'class'`.
- Custom animations defined in `index.css`: `animate-fade-in`, `animate-slide-up`.

---

## 19. Key Patterns & Conventions

### Import discipline
- All imports use the `@/` path alias (maps to `src/`).
- `Button` is imported from `@/components/Button` (not from `Form`).
- All other form controls come from `@/components/Form`.
- Icons come from `lucide-react`.

### Component composition
- Pages are exported as named functions (not default exports).
- Form modals are private functions within the same file (e.g., `LeadFormModal`, `BookingFormModal`).
- The `AppShell` is the only layout component; pages render their own content.

### State updates after mutations
- Every `saveX` / `deleteX` in `AppContext` re-fetches the affected entity's full list after the mutation. This ensures the UI reflects the DB state. No optimistic updates.

### Currency formatting
- `formatCurrency` handles Infinity (returns '∞'), uses `Intl.NumberFormat` with locale-specific currency, switches to compact notation for ≥1M, and VND uses 0 decimal places.

### Date handling
- All dates stored as ISO strings in the DB.
- Form inputs use `type="date"` (sliced to 10 chars) or `type="datetime-local"` (sliced to 16 chars), converted to ISO on save.
- `daysUntil` / `hoursUntil` use `Math.ceil` for remaining time.

### i18n key resolution
- Translation keys are constructed dynamically in many places, e.g.:
  ```typescript
  t(`lead.${stage.toLowerCase().replace(/\s/g, '').replace('quotesent', 'quoteSent')...}`)
  ```
- This pattern converts stage names like `'Quote Sent'` → `'lead.quoteSent'`.

### Dark mode
- Applied via `dark:` Tailwind classes throughout.
- Toggle is a cycle: light → dark → system.
- The `dark` class is toggled on `<html>` by `useTheme`.

### Offline awareness
- `navigator.onLine` + event listeners in `AppContext`.
- Header shows WiFi/WifiOff icon with localized label.

---

## 20. Known Gaps & Future Work

### Not yet implemented
- **No Supabase integration** — all data is local-only via Dexie/IndexedDB. The Settings page notes this: "Multi-device sync requires a future secure gateway." A Supabase instance is provisioned but unused.
- **No authentication** — single-user, local-only. No login flow.
- **ONNX inference** — the `OnnxDecisionEngine` initializes but does not perform actual inference. It always falls back to deterministic scoring. A validated model would need to be placed at `/models/laya_rank.onnx`.
- **WebMCP tools** — the adapter exists and reports status, but no tools are registered. Only a status badge is shown in Settings.
- **No URL routing** — navigation is purely in-memory state. Browser back/forward does not work. Deep-linking is not possible.
- **No code splitting** — the entire app is in one ~1.2MB JS chunk. The build warns about chunk size.
- **Discount UI** — `applySeasonalDiscount` logic exists but is not wired to any UI button or modal on the Bookings page.
- **Payment link** — bookings have a `paymentLink` field that can be set in the form, but there's no "copy link" or "open link" button on the booking card.
- **No tests** — no test files exist.
- **No error boundaries** — React error boundaries are not configured.

### Pre-existing warnings
- `src/store/AppContext.tsx` line 251: ESLint `react-refresh/only-export-components` warning — the file exports both the `AppProvider` component and the `useApp` hook. This is intentional and non-blocking.

### Potential improvements
- Add Supabase as the persistence layer (provisioned but unused).
- Implement actual ONNX inference with a validated model.
- Register WebMCP tools for agent-assisted actions.
- Add code-splitting per page (React.lazy + Suspense).
- Wire the discount approval flow to the Bookings page UI.
- Add URL-based routing for deep links and browser navigation.
- Add unit tests for `scoring.ts` and `calculations.ts` (pure functions, easy to test).

---

## Quick Reference: Data Flow

```
User interaction (page)
    ↓
useApp() → AppContext (state + CRUD)
    ↓
saveX() / deleteX() / recordPayment()
    ↓
repositories.ts (create/update/remove)
    ↓
db.ts (Dexie → IndexedDB)
    ↓
re-fetch all() → setState → re-render
```

```
Task scoring:
tasks[] → rankTasks(tasks, config) → scoreTask(each) → ScoredTask[]
    ↓
sorted by score/deadline/value/created
    ↓
Dashboard / TasksPage render with priority badges + score bars
```

```
Revenue:
bookings + leads + settings + agent → summarizeRevenue() → RevenueSummary
    ↓
Dashboard renders StatCards + pipeline chart
```
