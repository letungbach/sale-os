import { Component, type ErrorInfo, type ReactNode } from 'react';
import { makeI18n } from '@/i18n';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  eventId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, eventId: null };

  static getDerivedStateFromError(error: Error): State {
    return {
      error,
      eventId: `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  handleReload = () => {
    this.setState({ error: null, eventId: null });
    window.location.reload();
  };

  handleClearStorage = () => {
    const confirmed = window.confirm(
      makeI18n(localStorage.getItem('pg_lang') === 'vi' ? 'vi' : 'en').t('app.clearStorageConfirm'),
    );
    if (!confirmed) return;
    indexedDB.deleteDatabase('phucgia_salesos');
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const t = makeI18n(localStorage.getItem('pg_lang') === 'vi' ? 'vi' : 'en').t;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 text-center space-y-4">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            {t('app.errorTitle')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('app.errorMessage')}
          </p>
          <pre className="text-xs text-left bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 p-3 rounded overflow-auto max-h-32">
            {this.state.error.message}
          </pre>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={this.handleReload}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
            >
              {t('app.reload')}
            </button>
            <button
              onClick={this.handleClearStorage}
              className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
            >
              {t('app.clearLocalData')}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            {t('app.errorId')}: {this.state.eventId}
          </p>
        </div>
      </div>
    );
  }
}
