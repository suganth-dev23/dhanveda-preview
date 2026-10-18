import React, { useState, useEffect } from 'react';
import { X, Key, Sparkles, ExternalLink, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { AIProvider } from '../../types/finance';
import { DEFAULT_AI_MODELS } from '../../services/aiService';

interface AIKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PROVIDER_METADATA: Record<
  AIProvider,
  { name: string; tag: string; link: string; note: string }
> = {
  gemini: {
    name: 'Google Gemini',
    tag: 'Recommended (Free Tier Available)',
    link: 'https://aistudio.google.com/app/apikey',
    note: 'Generous free tier with no credit card required. Fast and direct client communication.',
  },
  openai: {
    name: 'OpenAI (ChatGPT)',
    tag: 'Requires API Credits',
    link: 'https://platform.openai.com/api-keys',
    note: 'Requires an active OpenAI developer account with billing or prepaid trial credits.',
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    tag: 'Requires API Credits',
    link: 'https://console.anthropic.com/settings/keys',
    note: 'Requires Anthropic console credits. Direct browser access mode is supported.',
  },
};

interface AIKeyFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const AIKeyForm: React.FC<AIKeyFormProps> = ({ onClose, onSuccess }) => {
  const { aiSettings, updateAISettings } = useFinance();
  const { showToast } = useToast();

  const [provider, setProvider] = useState<AIProvider>(aiSettings.provider || 'gemini');
  const [apiKey, setApiKey] = useState(aiSettings.apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeMeta = PROVIDER_METADATA[provider];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKey = apiKey.trim();

    if (!trimmedKey) {
      setError(`Please enter a valid API key for ${activeMeta.name}.`);
      showToast('warning', 'API Key Required', `Enter your ${activeMeta.name} key.`);
      return;
    }

    updateAISettings({
      provider,
      apiKey: trimmedKey,
      model: DEFAULT_AI_MODELS[provider],
    });

    showToast('success', 'AI Key Configured', 'Stored securely in your browser local storage.');
    setError(null);
    onSuccess?.();
    onClose();
  };

  return (
    <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 font-medium">
              {error}
            </div>
          )}

          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-2">
              Select AI Intelligence Engine
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.keys(PROVIDER_METADATA) as AIProvider[]).map(pKey => {
                const meta = PROVIDER_METADATA[pKey];
                const isSelected = provider === pKey;
                return (
                  <button
                    key={pKey}
                    type="button"
                    onClick={() => {
                      setProvider(pKey);
                      if (aiSettings.provider === pKey) {
                        setApiKey(aiSettings.apiKey || '');
                      } else {
                        setApiKey('');
                      }
                      setError(null);
                    }}
                    className={`p-3 rounded-xl text-left border transition-colors ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 ring-1 ring-emerald-500/50'
                        : 'border-line bg-sunken hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-ink-1">{meta.name}</span>
                      {pKey === 'gemini' && (
                        <span className="text-xs font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          FREE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-3 mt-1 truncate">{meta.tag}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Provider Info Card */}
          <div className="p-3.5 rounded-xl bg-sunken border border-line space-y-2 text-xs">
            <div className="flex items-start justify-between gap-2">
              <p className="text-ink-2 leading-relaxed">
                <span className="font-bold text-ink-1">{activeMeta.name}: </span>
                {activeMeta.note}
              </p>
              <a
                href={activeMeta.link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0"
              >
                <span>Get API Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-xs font-semibold text-ink-2 mb-1.5">
              {activeMeta.name} API Key
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => {
                  setApiKey(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={`Paste your ${activeMeta.name} API Key...`}
                className="w-full pl-9 pr-10 py-2.5 bg-sunken border border-line rounded-xl text-xs font-mono text-ink-1 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-1 p-0.5"
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-xs text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Zero-Telemetry: Stored only in browser local storage. Never sent to any DhanVeda servers.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-2 hover:bg-sunken border border-line transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-primary hover:opacity-95 text-on-primary text-xs font-bold shadow-sm transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </form>
  );
};

export const AIKeyModal: React.FC<AIKeyModalProps> = ({ isOpen, onClose, onSuccess }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-key-modal-title"
    >
      <div
        className="w-full max-w-lg bg-surface rounded-2xl border border-line shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-tint text-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 id="ai-key-modal-title" className="text-base font-bold text-ink-1">
                Configure AI Intelligence
              </h3>
              <p className="text-xs text-ink-3">Private Client-Side Intelligence Engine</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-ink-3 hover:text-ink-1 hover:bg-sunken transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <AIKeyForm key={isOpen ? 'open' : 'closed'} onClose={onClose} onSuccess={onSuccess} />
      </div>
    </div>
  );
};
