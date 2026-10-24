import { useRef, useState } from 'react';
import { Download, Upload, RotateCcw, Cpu, Globe } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import type { Currency } from '@/domain/types';
import { exportData, importData, downloadFile, toCSV } from '@/data/importExport';
import { resetDemoData } from '@/data/seed';
import { createEngine } from '@/ai/decisionEngine';
import { webmcp } from '@/webmcp/adapter';
import { Badge, Card, EmptyState, Field, Input, Select } from '@/components/Form';
import { Button } from '@/components/Button';

const CURRENCIES: Currency[] = ['VND', 'USD', 'KRW', 'JPY'];

export function SettingsPage() {
  const { agent, settings, setSettings, setAgent, i18n, refresh } = useApp();
  const t = i18n.t;
  const fileRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);

  const detEngine = createEngine('deterministic');
  const onnxEngine = createEngine('onnx');
  const webmcpStatus = webmcp.status();

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  if (!agent || !settings) {
    return <EmptyState title={t('common.loading')} />;
  }

  const doExport = async () => {
    const data = await exportData();
    downloadFile(`phucgia_backup_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
  };

  const doExportCsv = async () => {
    const data = await exportData();
    downloadFile('leads.csv', toCSV(data.leads as Record<string, unknown>[]), 'text/csv');
  };

  const doImport = async (file: File) => {
    try {
      const text = await file.text();
      const res = await importData(JSON.parse(text), { replace: true });
      if (res.ok) { flash(t('set.importSuccess')); await refresh(); }
      else flash(`${t('set.importFailed')} ${res.errors.join('; ')}`);
    } catch { flash(t('set.importFailed')); }
  };

  const doReset = async () => {
    await resetDemoData();
    await refresh();
    flash(t('set.resetDone'));
  };

  return (
    <div className="space-y-4 max-w-3xl">
      {toast && <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-3 py-2 text-sm animate-fade-in">{toast}</div>}

      <section>
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">{t('set.agent')}</h2>
        <Card className="p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t('set.agentName')}><Input value={agent.name} onChange={(e) => setAgent({ name: e.target.value })} /></Field>
            <Field label={t('set.monthlyTarget')}><Input type="number" min={0} value={agent.monthlyRevenueTarget} onChange={(e) => setAgent({ monthlyRevenueTarget: Number(e.target.value) })} /></Field>
            <Field label={t('set.commissionRate')}><Input type="number" min={0} max={1} step={0.01} value={agent.commissionRate} onChange={(e) => setAgent({ commissionRate: Number(e.target.value) })} /></Field>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">{t('set.title')}</h2>
        <Card className="p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t('set.language')}>
              <Select value={settings.language} onChange={(e) => setSettings({ language: e.target.value as 'en' | 'vi' })}>
                <option value="en">English</option>
                <option value="vi">Tiếng Việt</option>
              </Select>
            </Field>
            <Field label={t('set.theme')}>
              <Select value={settings.theme} onChange={(e) => setSettings({ theme: e.target.value as 'light' | 'dark' | 'system' })}>
                <option value="light">{t('set.light')}</option>
                <option value="dark">{t('set.dark')}</option>
                <option value="system">{t('set.system')}</option>
              </Select>
            </Field>
            <Field label={t('set.reportingCurrency')}>
              <Select value={settings.reportingCurrency} onChange={(e) => setSettings({ reportingCurrency: e.target.value as Currency })}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label={t('set.revenueRecognition')}>
              <Select value={settings.revenueRecognition} onChange={(e) => setSettings({ revenueRecognition: e.target.value as 'on_deposit' | 'on_confirmation' | 'on_full_payment' })}>
                <option value="on_confirmation">{t('set.revOnConfirmation')}</option>
                <option value="on_deposit">{t('set.revOnDeposit')}</option>
                <option value="on_full_payment">{t('set.revOnFullPayment')}</option>
              </Select>
            </Field>
            <Field label={t('set.sellingDaysTotal')}><Input type="number" min={1} value={settings.sellingDaysTotal} onChange={(e) => setSettings({ sellingDaysTotal: Number(e.target.value) })} /></Field>
            <Field label={t('set.sellingDaysElapsed')}><Input type="number" min={0} value={settings.sellingDaysElapsed} onChange={(e) => setSettings({ sellingDaysElapsed: Number(e.target.value) })} /></Field>
            <Field label={t('set.marginFloor')}><Input type="number" min={0} max={100} value={settings.marginFloorPercent} onChange={(e) => setSettings({ marginFloorPercent: Number(e.target.value) })} /></Field>
            <Field label={t('set.p0Threshold')}><Input type="number" min={0} max={100} value={settings.p0Threshold} onChange={(e) => setSettings({ p0Threshold: Number(e.target.value) })} /></Field>
            <Field label={t('set.p1Threshold')}><Input type="number" min={0} max={100} value={settings.p1Threshold} onChange={(e) => setSettings({ p1Threshold: Number(e.target.value) })} /></Field>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">{t('set.dataManagement')}</h2>
        <Card className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={doExport}><Download size={14} /> {t('set.exportJson')}</Button>
            <Button variant="outline" onClick={doExportCsv}><Download size={14} /> {t('set.exportCsv')}</Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload size={14} /> {t('set.importJson')}</Button>
            <Button variant="danger" onClick={doReset}><RotateCcw size={14} /> {t('set.resetDemo')}</Button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ''; }} />
          </div>
          <p className="text-xs text-slate-400">{t('set.privacyNote')}</p>
          <p className="text-xs text-slate-400">{t('set.syncNote')}</p>
        </Card>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">{t('set.aiStatus')}</h2>
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-slate-400" />
            <span className="text-sm text-slate-700 dark:text-slate-200">{t('set.aiEngine')}</span>
            <Badge color="emerald">{t('set.aiDeterministic')}</Badge>
            <span className="text-xs text-slate-400">{detEngine.status().detail}</span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-slate-400" />
            <span className="text-sm text-slate-700 dark:text-slate-200">{t('set.aiOnnx')}</span>
            <Badge color={onnxEngine.available ? 'emerald' : 'amber'}>{onnxEngine.status().detail}</Badge>
          </div>
          <p className="text-xs text-slate-400">{t('set.aiNotConfigured')}</p>
        </Card>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">{t('set.webmcpStatus')}</h2>
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-slate-400" />
            <Badge color={webmcpStatus.supported ? 'emerald' : 'amber'}>
              {webmcpStatus.supported ? t('set.webmcpAvailable') : t('set.webmcpUnsupported')}
            </Badge>
          </div>
          <p className="text-xs text-slate-400">{webmcpStatus.detail}</p>
        </Card>
      </section>
    </div>
  );
}
