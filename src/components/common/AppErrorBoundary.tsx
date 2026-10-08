import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCw, Download, Trash2, ArrowLeft } from 'lucide-react';
import { getTodayString } from '../../utils/date';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  isRoot?: boolean;
  onResetView?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showResetConfirm: boolean;
  confirmText: string;
  isExporting: boolean;
  isResetting: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showResetConfirm: false,
      confirmText: '',
      isExporting: false,
      isResetting: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[AppErrorBoundary] Uncaught component tree error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showResetConfirm: false,
      confirmText: '',
    });
    this.props.onResetView?.();
  };

  handleExportRawData = async () => {
    this.setState({ isExporting: true });
    try {
      const rawData = await new Promise<Record<string, any>>((resolve, reject) => {
        const req = indexedDB.open('dhanveda_db');
        req.onerror = () => reject(req.error || new Error('Failed to open database'));
        req.onsuccess = () => {
          const db = req.result;
          const storeNames = Array.from(db.objectStoreNames);
          const data: Record<string, any> = {
            exportTimestamp: new Date().toISOString(),
            dbVersion: db.version,
            stores: {},
          };

          if (storeNames.length === 0) {
            db.close();
            resolve(data);
            return;
          }

          const tx = db.transaction(storeNames, 'readonly');
          let pending = storeNames.length;

          for (const store of storeNames) {
            const storeReq = tx.objectStore(store).getAll();
            storeReq.onsuccess = () => {
              data.stores[store] = storeReq.result;
              pending--;
              if (pending === 0) {
                db.close();
                resolve(data);
              }
            };
            storeReq.onerror = () => {
              data.stores[store] = [];
              pending--;
              if (pending === 0) {
                db.close();
                resolve(data);
              }
            };
          }
        };
      });

      const blob = new Blob([JSON.stringify(rawData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dhanveda-raw-data-${getTodayString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[AppErrorBoundary] Raw data export failed:', err);
      alert('Could not export raw database records: ' + String(err));
    } finally {
      this.setState({ isExporting: false });
    }
  };

  handleConfirmReset = async () => {
    if (this.state.confirmText.trim().toUpperCase() !== 'RESET') {
      alert('Please type RESET exactly to confirm resetting data.');
      return;
    }

    this.setState({ isResetting: true });
    try {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('dhanveda_db');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch (e) {
      alert('Failed to reset app data: ' + String(e));
      this.setState({ isResetting: false });
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { isRoot = false, fallbackTitle } = this.props;
    const { error, showResetConfirm, confirmText, isExporting, isResetting } = this.state;

    return (
      <div
        role="alert"
        aria-live="assertive"
        className={`w-full flex items-center justify-center p-4 ${
          isRoot ? 'min-h-screen bg-slate-900 text-slate-100' : 'min-h-[400px] py-12'
        }`}
      >
        <div className="w-full max-w-lg bg-surface text-ink-1 rounded-2xl border border-line shadow-lg p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertOctagon className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-ink-1">
                {fallbackTitle || (isRoot ? 'Something went wrong' : 'View encountered an error')}
              </h2>
              <p className="text-xs sm:text-sm text-ink-3 mt-1 leading-relaxed">
                {isRoot
                  ? 'An unexpected error interrupted DhanVeda. Your financial data is safely preserved in local storage.'
                  : 'This specific view failed to render safely. Other sections and navigation remain accessible.'}
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-sunken rounded-xl border border-line text-xs font-mono text-ink-2 break-all overflow-auto max-h-32 select-all">
              {error.message || String(error)}
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap gap-2.5 pt-2">
            {!isRoot && (
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:opacity-95 text-on-primary text-xs font-bold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Retry View
              </button>
            )}

            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sunken hover:bg-line text-ink-1 border border-line text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              Reload App
            </button>

            <button
              type="button"
              onClick={this.handleExportRawData}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sunken hover:bg-line text-ink-1 border border-line text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export Raw Data'}
            </button>

            <button
              type="button"
              onClick={() => this.setState({ showResetConfirm: true })}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer ml-auto"
            >
              <Trash2 className="w-4 h-4" />
              Reset App Data
            </button>
          </div>

          {/* Reset App Data Confirmation Dialog */}
          {showResetConfirm && (
            <div className="pt-4 border-t border-line space-y-3 animate-slide-up">
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                Type <span className="font-mono font-bold uppercase underline">RESET</span> below to permanently clear local data and start fresh:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => this.setState({ confirmText: e.target.value })}
                  placeholder="Type RESET"
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-sunken border border-line text-ink-1 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={this.handleConfirmReset}
                  disabled={isResetting || confirmText.trim().toUpperCase() !== 'RESET'}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isResetting ? 'Wiping...' : 'Confirm Reset'}
                </button>
                <button
                  type="button"
                  onClick={() => this.setState({ showResetConfirm: false, confirmText: '' })}
                  className="px-3 py-2 text-xs text-ink-3 hover:text-ink-1 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
