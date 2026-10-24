import { useState } from 'react';
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
  const { loading, i18n } = useApp();
  const [page, setPage] = useState<PageKey>('dashboard');
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  if (loading) {
    return <EmptyState title={i18n.t('common.loading')} />;
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
    <AppShell current={page} onNavigate={navigate}>
      {content}
    </AppShell>
  );
}

export default function App() {
  return (
    <AppProvider>
      <RoutedApp />
    </AppProvider>
  );
}
