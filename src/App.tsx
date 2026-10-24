import { useState } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppProvider, useApp } from '@/store/AppContext';
import { AppShell, type PageKey } from '@/components/AppShell';
import { EmptyState } from '@/components/Form';
import { DashboardPage } from '@/pages/DashboardPage';
import { LeadsPage } from '@/pages/LeadsPage';
import { PackagesPage } from '@/pages/PackagesPage';
import { BookingsPage } from '@/pages/BookingsPage';
import { TasksPage } from '@/pages/TasksPage';
import { PipelinePage } from '@/pages/PipelinePage';
import { SettingsPage } from '@/pages/SettingsPage';

function RoutedApp() {
  const { loading, lastError, clearError, retryInitialization, agent, settings, i18n } = useApp();
  const [page, setPage] = useState<PageKey>('dashboard');
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  if (loading) {
    return <EmptyState title={i18n.t('common.loading')} />;
  }

  if (lastError && (!agent || !settings)) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950 p-6 text-center">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          {i18n.t('app.initializationFailed')}
        </h1>
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{lastError}</p>
        <button
          onClick={() => void retryInitialization()}
          className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
        >
          {i18n.t('common.retry')}
        </button>
      </main>
    );
  }

  const navigate = (p: PageKey) => setPage(p);

  let content;
  switch (page) {
    case 'dashboard':
      content = <DashboardPage onNavigate={navigate} onOpenTask={(id) => { setOpenTaskId(id); setPage('tasks'); }} />;
      break;
    case 'leads':
      content = <LeadsPage />;
      break;
    case 'packages':
      content = <PackagesPage />;
      break;
    case 'bookings':
      content = <BookingsPage />;
      break;
    case 'tasks':
      content = <TasksPage initialTaskId={openTaskId} onConsumeTaskId={() => setOpenTaskId(null)} />;
      break;
    case 'pipeline':
      content = <PipelinePage />;
      break;
    case 'settings':
      content = <SettingsPage />;
      break;
    default:
      content = <DashboardPage onNavigate={navigate} onOpenTask={(id) => { setOpenTaskId(id); setPage('tasks'); }} />;
  }

  return (
    <>
      <AppShell current={page} onNavigate={navigate}>
        {content}
      </AppShell>
      {lastError && (
        <div
          role="alert"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 text-sm"
        >
          <span>{lastError}</span>
          <button
            onClick={clearError}
            aria-label={i18n.t('common.close')}
            className="text-rose-200 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <RoutedApp />
      </AppProvider>
    </ErrorBoundary>
  );
}
