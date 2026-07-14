import React, { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { tp } from '../i18n/platform.js';

const fmt = (n, currency = 'XAF') => {
  const v = Math.round(Number(n) || 0);
  try {
    return new Intl.NumberFormat('fr-FR').format(v) + ' ' + currency;
  } catch {
    return v + ' ' + currency;
  }
};

const IcoWallet = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5M18 12a2 2 0 000 4h4v-4h-4z" /></svg>;

const StatTile = ({ label, value, sub, accent }) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-4">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
    <p className={`text-lg font-extrabold mt-1 ${accent || 'text-gray-900'}`}>{value}</p>
    {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

const WithdrawModal = ({ wallet, onClose, onDone }) => {
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const max = wallet?.balance || 0;

  const submit = async () => {
    setError('');
    const amt = Math.round(Number(amount) || 0);
    if (amt <= 0) return setError(tp('Montant invalide'));
    if (amt > max) return setError(tp('Solde insuffisant'));
    if (!phone.trim()) return setError(tp('Numéro Mobile Money requis'));
    setSubmitting(true);
    try {
      const res = await api.post('/scalor-pay/withdraw', { amount: amt, phone: phone.trim() });
      if (res.data?.success) {
        onDone();
        onClose();
      } else {
        setError(res.data?.message || tp('Erreur'));
      }
    } catch (e) {
      setError(e?.response?.data?.message || tp('Erreur lors de la demande de retrait'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <h3 className="text-base font-bold text-gray-900">{tp('Retirer mon solde')}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{tp('Disponible')} : <span className="font-semibold text-gray-900">{fmt(max, wallet?.currency)}</span></p>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">{tp('Montant à retirer')}</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0F6B4F] focus:border-transparent bg-gray-50 focus:bg-white"
            />
            <button
              onClick={() => setAmount(String(max))}
              className="px-3 py-2.5 text-xs font-bold text-[#0F6B4F] bg-[#0F6B4F]/10 rounded-xl hover:bg-[#0F6B4F]/20"
            >
              {tp('Max')}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">{tp('Numéro Mobile Money')}</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+225 07 00 00 00 00"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0F6B4F] focus:border-transparent bg-gray-50 focus:bg-white"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">
            {tp('Annuler')}
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-[#0F6B4F] rounded-xl hover:bg-[#0A5740] disabled:opacity-60"
          >
            {submitting ? tp('Envoi...') : tp('Confirmer')}
          </button>
        </div>
      </div>
    </div>
  );
};

const statusBadge = (type, status) => {
  if (type === 'payout') {
    if (status === 'paid') return { label: tp('Versé'), cls: 'bg-green-100 text-green-700' };
    if (status === 'rejected') return { label: tp('Rejeté'), cls: 'bg-red-100 text-red-700' };
    return { label: tp('En cours'), cls: 'bg-amber-100 text-amber-700' };
  }
  if (status === 'paid') return { label: tp('Payé'), cls: 'bg-green-100 text-green-700' };
  if (status === 'failure' || status === 'no paid') return { label: tp('Échoué'), cls: 'bg-red-100 text-red-700' };
  return { label: tp('En attente'), cls: 'bg-gray-100 text-gray-600' };
};

const BoutiqueWallet = () => {
  const [wallet, setWallet] = useState(null);
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const load = useCallback(async () => {
    try {
      const [w, t] = await Promise.all([
        api.get('/scalor-pay/wallet'),
        api.get('/scalor-pay/transactions', { params: { limit: 50 } }),
      ]);
      if (w.data?.success) setWallet(w.data.data);
      if (t.data?.success) setTxs(t.data.data || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const currency = wallet?.currency || 'XAF';
  const commissionPct = wallet ? Math.round((wallet.commissionRate || 0) * 100) : 2;

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">

      <div>
        <h1 className="text-xl font-bold text-gray-900">{tp('Solde Scalor Pay')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{tp('Vos encaissements en ligne et vos retraits')}</p>
      </div>

      {/* Balance card */}
      <div
        className="rounded-2xl p-5 text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #0F6B4F 0%, #0A5740 100%)' }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
              <IcoWallet />
            </div>
            <div>
              <p className="text-xs text-white/70">{tp('Solde disponible')}</p>
              <p className="text-3xl font-extrabold mt-0.5">{loading ? '—' : fmt(wallet?.balance, currency)}</p>
            </div>
          </div>
          <button
            onClick={() => setShowWithdraw(true)}
            disabled={!wallet || wallet.balance <= 0}
            className="px-4 py-2 text-sm font-bold text-[#0F6B4F] bg-white rounded-xl hover:bg-white/90 disabled:opacity-50"
          >
            {tp('Retirer')}
          </button>
        </div>
        {wallet?.pendingBalance > 0 && (
          <p className="text-xs text-white/80 mt-3">
            {tp('En attente de confirmation')} : <span className="font-semibold">{fmt(wallet.pendingBalance, currency)}</span>
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label={tp('Total encaissé')} value={loading ? '—' : fmt(wallet?.totalCollected, currency)} sub={tp('brut')} />
        <StatTile label={tp('Net crédité')} value={loading ? '—' : fmt(wallet?.totalCredited, currency)} accent="text-[#0F6B4F]" />
        <StatTile label={`${tp('Commission')} (${commissionPct}%)`} value={loading ? '—' : fmt(wallet?.totalCommission, currency)} sub={tp('prélevée')} />
        <StatTile label={tp('Total retiré')} value={loading ? '—' : fmt(wallet?.totalWithdrawn, currency)} />
      </div>

      {/* Transactions */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">{tp('Historique')}</h2>
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {loading ? (
            <div className="p-6 text-center text-sm text-gray-400">{tp('Chargement...')}</div>
          ) : txs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500">{tp('Aucune transaction pour le moment')}</p>
              <p className="text-xs text-gray-400 mt-1">{tp('Les paiements Scalor Pay de vos clients apparaîtront ici.')}</p>
            </div>
          ) : (
            txs.map((tx) => {
              const badge = statusBadge(tx.type, tx.status);
              const isPayout = tx.type === 'payout';
              return (
                <div key={tx._id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isPayout ? 'bg-blue-50 text-blue-600' : 'bg-[#0F6B4F]/10 text-[#0F6B4F]'}`}>
                    {isPayout ? '↑' : '↓'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {isPayout ? tp('Retrait') : (tx.orderNumber || tp('Commande'))}
                      {!isPayout && tx.customerName ? ` · ${tx.customerName}` : ''}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      {tx.paymentMethod ? ` · ${tx.paymentMethod}` : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${isPayout ? 'text-blue-600' : 'text-[#0F6B4F]'}`}>
                      {isPayout ? '−' : '+'}{fmt(isPayout ? tx.netAmount : tx.netAmount, tx.currency || currency)}
                    </p>
                    <span className={`inline-block mt-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-full ${badge.cls}`}>{badge.label}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showWithdraw && (
        <WithdrawModal wallet={wallet} onClose={() => setShowWithdraw(false)} onDone={load} />
      )}
    </div>
  );
};

export default BoutiqueWallet;
