// Main UI panel for screen-time management
import React, { useEffect, useState } from 'react';
import { useScreenTime } from '../../hooks/useScreenTime';

export function ScreenTimePanel() {
  const { children, ledger, loading, error, loadChildren, loadLedger, grant, connect } = useScreenTime();
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [minutes, setMinutes] = useState<number>(0);
  const [provider, setProvider] = useState<'APPLE' | 'GOOGLE'>('APPLE');

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  useEffect(() => {
    if (selectedChild) loadLedger(selectedChild);
  }, [selectedChild, loadLedger]);

  return (
    <div className="rounded-2xl shadow-card bg-white dark:bg-neutral-800 p-6 mb-6">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Screen Time Management</h2>
      {error && <div className="text-error-600 bg-error-50 dark:bg-error-900/30 rounded-xl px-4 py-2 mb-4">{error}</div>}
      <div className="mb-4 flex flex-col md:flex-row md:items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Provider</label>
          <select value={provider} onChange={e => setProvider(e.target.value as any)} className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="APPLE">Apple</option>
            <option value="GOOGLE">Google</option>
          </select>
        </div>
        <button className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-xl" onClick={() => connect(provider)} disabled={loading}>
          Connect Account
        </button>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Child</label>
        {loading ? (
          <div className="text-neutral-500">Loading children...</div>
        ) : children.length === 0 ? (
          <div className="text-neutral-500">No children found. Please connect an account or add children.</div>
        ) : (
          <select value={selectedChild || ''} onChange={e => setSelectedChild(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">Select...</option>
            {children.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name || c.id}</option>
            ))}
          </select>
        )}
      </div>
      <div className="mb-4 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Minutes</label>
          <input type="number" value={minutes} onChange={e => setMinutes(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <button className="px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-xl mt-2 md:mt-0" onClick={() => selectedChild && grant(selectedChild, minutes)} disabled={loading || !selectedChild}>
          Grant
        </button>
      </div>
      <div>
        <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">Ledger</h3>
        {loading ? (
          <div className="text-neutral-500">Loading ledger...</div>
        ) : ledger.length === 0 ? (
          <div className="text-neutral-500">No ledger entries found.</div>
        ) : (
          <table className="w-full border rounded-xl overflow-hidden">
            <thead className="bg-neutral-100 dark:bg-neutral-700">
              <tr>
                <th className="border px-2 py-1 text-left">Date</th>
                <th className="border px-2 py-1 text-left">Minutes</th>
                <th className="border px-2 py-1 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry: any) => (
                <tr key={entry.id} className="bg-white dark:bg-neutral-800">
                  <td className="border px-2 py-1">{entry.awardedAt || entry.appliedAt || entry.createdAt}</td>
                  <td className="border px-2 py-1">{entry.screenMinutes || entry.minutesDelta}</td>
                  <td className="border px-2 py-1">{entry.status || 'APPLIED'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
