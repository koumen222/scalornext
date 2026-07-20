import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from '@/lib/router-compat';
import { useEcomAuth } from '../hooks/useEcomAuth';
import { useMoney } from '../hooks/useMoney.js';
import { stockApi } from '../services/ecommApi.js';
import StockManagement from './StockManagement.jsx';
import { getContextualError } from '../utils/errorMessages';
import { getCache, setCache } from '../utils/cacheUtils.js';
import { tp } from '../i18n/platform.js';

const StockSkeleton = () => (
  <div className="p-3 sm:p-4 lg:p-6">
    <div className="flex justify-between items-center mb-4">
      <div className="h-8 w-44 bg-gray-200 rounded-lg animate-pulse" />
      <div className="h-9 w-32 bg-gray-200 rounded-lg animate-pulse" />
    </div>
    <div className="bg-card rounded-xl border overflow-hidden">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 sm:px-6 py-4 border-b border-gray-50">
          <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          <div className="h-4 w-16 bg-muted rounded animate-pulse ml-auto" />
          <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
          <div className="h-8 w-8 bg-muted rounded-lg animate-pulse" />
        </div>
      ))}
    </div>
  </div>
);

const EMPTY_FORM = {
  productId: '', productName: '', sourcing: 'local', quantity: '',
  weightKg: '', pricePerKg: '', purchasePrice: '', sellingPrice: '',
  supplierName: '', expectedArrival: '', trackingNumber: '', notes: ''
};

const StockOrdersList = () => {
  const { user } = useEcomAuth();
  const { fmt, symbol } = useMoney();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams();
  const [orders, setOrders] = useState([]);
  const isAdmin = user?.role === 'ecom_admin' || user?.role === 'super_admin';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formInitLoading, setFormInitLoading] = useState(false);

  useEffect(() => {
    loadOrders();
    if (location.pathname.endsWith('/new')) {
      openNewModal(location.state);
    } else if (routeId) {
      openEditModal(routeId);
    }
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await stockApi.getStockOrders();
      const ordersData = response.data?.data?.orders || response.data?.data || [];
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (err) { setError(getContextualError(err, 'load_orders')); setOrders([]); }
    finally { setLoading(false); }
  };

  const loadProducts = async () => {
    try {
      const r = await ecomApi.get('/products', { params: { isActive: true } });
      const d = r.data?.data || [];
      setProducts(Array.isArray(d) ? d : []);
    } catch { setProducts([]); }
  };

  const openNewModal = (prefill) => {
    setEditingId(null);
    setFormData(prefill?.productId ? { ...EMPTY_FORM, productId: prefill.productId, productName: prefill.productName || '' } : EMPTY_FORM);
    setFormError('');
    loadProducts(); setShowModal(true);
  };

  const openEditModal = async (orderId) => {
    setEditingId(orderId); setFormData(EMPTY_FORM); setFormError('');
    setFormInitLoading(true); loadProducts(); setShowModal(true);
    try {
      const res = await stockApi.getStockOrder(orderId);
      const o = res.data.data;
      setFormData({
        productId: o.productId?._id || o.productId || '', productName: o.productName || '',
        sourcing: o.sourcing || 'local', quantity: o.quantity?.toString() || '',
        weightKg: o.weightKg?.toString() || '', pricePerKg: o.pricePerKg?.toString() || '',
        purchasePrice: o.purchasePrice?.toString() || '', sellingPrice: o.sellingPrice?.toString() || '',
        supplierName: o.supplierName || '',
        expectedArrival: o.expectedArrival ? new Date(o.expectedArrival).toISOString().split('T')[0] : '',
        trackingNumber: o.trackingNumber || '', notes: o.notes || ''
      });
    } catch (err) { setFormError(getContextualError(err, 'load_orders')); }
    finally { setFormInitLoading(false); }
  };

  const closeModal = () => {
    setShowModal(false); setEditingId(null); setFormData(EMPTY_FORM); setFormError('');
    if (location.pathname.endsWith('/new') || routeId) {
      navigate('/ecom/stock/orders', { replace: true });
    }
  };

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setFormLoading(true); setFormError('');
    const qty = parseInt(formData.quantity) || 0;
    const wKg = parseFloat(formData.weightKg) || 0;
    const pKg = parseFloat(formData.pricePerKg) || 0;
    const pp = parseFloat(formData.purchasePrice) || 0;
    const sp = parseFloat(formData.sellingPrice) || 0;
    const tc = wKg * pKg;
    const payload = {
      productId: formData.productId || undefined, productName: formData.productName,
      sourcing: formData.sourcing, quantity: qty, weightKg: wKg, pricePerKg: pKg,
      purchasePrice: pp, sellingPrice: sp, transportCost: tc,
      supplierName: formData.supplierName, expectedArrival: formData.expectedArrival || undefined,
      trackingNumber: formData.trackingNumber, notes: formData.notes
    };
    try {
      if (editingId) await ecomApi.put(`/stock/orders/${editingId}`, payload);
      else await stockApi.createStockOrder(payload);
      closeModal(); loadOrders();
    } catch (err) { setFormError(getContextualError(err, 'save_order')); }
    finally { setFormLoading(false); }
  };

  const updateOrderStatus = async (orderId, action) => {
    try { 
      if (action === 'receive') {
        await stockApi.receiveStockOrder(orderId);
      } else if (action === 'cancel') {
        await stockApi.cancelStockOrder(orderId);
      }
      loadOrders(); 
    }
    catch (err) { setError(getContextualError(err, 'save_order')); }
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm(tp('Supprimer cette commande ? Cette action est irréversible.'))) return;
    try {
      await stockApi.deleteStockOrder(orderId);
      loadOrders();
    } catch (err) {
      setError(getContextualError(err, 'delete_order'));
    }
  };

  const qty = parseInt(formData.quantity) || 0;
  const wKg = parseFloat(formData.weightKg) || 0;
  const pKg = parseFloat(formData.pricePerKg) || 0;
  const pp = parseFloat(formData.purchasePrice) || 0;
  const sp = parseFloat(formData.sellingPrice) || 0;
  const tc = wKg * pKg;
  const totalCostCalcForm = pp * qty + tc;
  const totalSelling = sp * qty;
  const estProfit = totalSelling - totalCostCalcForm;

  const iCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent';

  const [activeStockTab, setActiveStockTab] = useState(isAdmin ? 'fournisseurs' : 'gestion');

  if (loading) return <StockSkeleton />;

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-3xl font-bold text-foreground">{tp('Stock')}</h1>
        {activeStockTab === 'fournisseurs' && (
          <button onClick={openNewModal} className="bg-primary text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-primary-700 text-sm font-medium">
            + Commande fournisseur
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-5">
        {isAdmin && (
          <button
            onClick={() => setActiveStockTab('fournisseurs')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeStockTab === 'fournisseurs'
                ? 'border-primary-600 text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            {tp('Fournisseurs')}
          </button>
        )}
        <button
          onClick={() => setActiveStockTab('gestion')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
            activeStockTab === 'gestion'
              ? 'border-primary-600 text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
          }`}
        >
          {tp('Gestion du stock')}
        </button>
      </div>

      {activeStockTab === 'gestion' && <StockManagement />}

      {activeStockTab === 'fournisseurs' && (
        <>
      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">{error}</div>}

      <div className="bg-card shadow rounded-lg overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-background">
            <tr>
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{tp('Produit')}</th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">{tp('Sourcing')}</th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{tp('Qté')}</th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">{tp('Achat')}</th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">{tp('Vente')}</th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">{tp('Transport')}</th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{tp('Total')}</th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{tp('Statut')}</th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{tp('Actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-200">
            {orders.length === 0 ? (
              <tr><td colSpan="9" className="px-4 py-8 text-center text-muted-foreground">{tp('Aucune commande fournisseur trouvée')}</td></tr>
            ) : orders.map((order) => {
              const totalPurchase = (order.purchasePrice || 0) * (order.quantity || 0);
              const totalCostCalc = totalPurchase + (order.transportCost || 0);
              return (
                <tr key={order._id} className="hover:bg-background">
                  <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                    <button onClick={() => openEditModal(order._id)} className="text-xs sm:text-sm font-medium text-primary hover:text-primary-800 hover:underline text-left">{order.productName || tp('N/A')}</button>
                    {order.supplierName && <div className="text-[10px] sm:text-xs text-muted-foreground">{order.supplierName}</div>}
                  </td>
                  <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.sourcing === 'chine' ? 'bg-red-100 text-red-800' : 'bg-primary-100 text-primary-800'}`}>
                      {order.sourcing === 'chine' ? 'Chine' : tp('Local')}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                    <div className="text-xs sm:text-sm font-bold text-foreground">{order.quantity || 0}</div>
                    {order.weightKg > 0 && <div className="text-[10px] sm:text-xs text-muted-foreground">{order.weightKg} kg</div>}
                  </td>
                  <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap hidden md:table-cell"><div className="text-xs sm:text-sm text-foreground">{fmt(order.purchasePrice)}</div></td>
                  <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap hidden md:table-cell"><div className="text-xs sm:text-sm text-foreground">{fmt(order.sellingPrice)}</div></td>
                  <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell"><div className="text-xs sm:text-sm text-foreground">{fmt(order.transportCost)}</div></td>
                  <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap"><div className="text-xs sm:text-sm font-semibold text-foreground">{fmt(totalCostCalc)}</div></td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'received' ? 'bg-green-100 text-green-800' : order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {order.status === 'received' ? 'Reçue' : order.status === 'cancelled' ? 'Annulée' : tp('En transit')}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => openEditModal(order._id)} className="text-primary hover:text-primary-900 mr-3">{tp('Modifier')}</button>
                    {order.status === 'in_transit' && (
                      <>
                        <button onClick={() => updateOrderStatus(order._id, 'receive')} className="text-green-600 hover:text-green-900 mr-3">{tp('Recevoir')}</button>
                        <button onClick={() => updateOrderStatus(order._id, 'cancel')} className="text-red-600 hover:text-red-900 mr-3">{tp('Annuler')}</button>
                      </>
                    )}
                    <button onClick={() => deleteOrder(order._id)} className="text-red-600 hover:text-red-900">{tp('Supprimer')}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Modal popup ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <h2 className="text-lg font-bold text-foreground">{editingId ? 'Modifier la commande' : tp('Nouvelle commande de stock')}</h2>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition text-muted-foreground hover:text-foreground text-2xl leading-none">&times;</button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {formInitLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <form id="stock-order-form" onSubmit={handleSubmit} className="space-y-5">
                  {formError && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{formError}</div>}

                  {/* Section: Produit & Sourcing */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{tp('Produit et sourcing')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">{tp('Produit *')}</label>
                        <select name="productId" required value={formData.productId}
                          onChange={(e) => {
                            const sel = products.find(p => p._id === e.target.value);
                            setFormData(prev => ({
                              ...prev,
                              productId: e.target.value,
                              productName: sel?.name || prev.productName,
                              purchasePrice: sel?.productCost ? sel.productCost.toString() : prev.purchasePrice,
                              sellingPrice: sel?.sellingPrice ? sel.sellingPrice.toString() : prev.sellingPrice,
                            }));
                          }}
                          className={iCls}>
                          <option value="">{tp('Sélectionnez un produit')}</option>
                          {products.map(p => (
                            <option key={p._id} value={p._id}>
                              {p.name}{p.stock !== undefined ? ` — stock: ${p.stock}` : ''}{p.status ? ` (${p.status})` : ''}
                            </option>
                          ))}
                        </select>
                        {formData.productId && (() => {
                          const sel = products.find(p => p._id === formData.productId);
                          if (!sel) return null;
                          return (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="inline-flex items-center gap-1 text-[11px] bg-muted text-muted-foreground px-2 py-1 rounded-md">
                                {tp('Stock actuel:')} <strong className={sel.stock <= (sel.reorderThreshold || 10) ? 'text-red-600' : 'text-primary'}>{sel.stock} unités</strong>
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] bg-primary-50 text-primary px-2 py-1 rounded-md">
                                {tp('Coût achat:')} <strong>{fmt(sel.productCost)}</strong>
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] bg-primary-50 text-primary px-2 py-1 rounded-md">
                                {tp('Prix vente:')} <strong>{fmt(sel.sellingPrice)}</strong>
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] bg-orange-50 text-orange-700 px-2 py-1 rounded-md">
                                {tp('Livraison:')} <strong>{fmt(sel.deliveryCost)}</strong>
                              </span>
                              {sel.avgAdsCost > 0 && (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-primary-50 text-primary-800 px-2 py-1 rounded-md">
                                  {tp('Moy. pub:')} <strong>{fmt(sel.avgAdsCost)}</strong>
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">{tp('Sourcing *')}</label>
                        <select name="sourcing" required value={formData.sourcing} onChange={handleChange} className={iCls}>
                          <option value="local">{tp('Local')}</option>
                          <option value="chine">{tp('Chine')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">{tp('Quantité *')}</label>
                        <input type="number" name="quantity" required min="1" value={formData.quantity} onChange={handleChange} className={iCls} placeholder="100" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">{tp('Fournisseur')}</label>
                        <input type="text" name="supplierName" value={formData.supplierName} onChange={handleChange} className={iCls} placeholder={tp('Nom du fournisseur')} />
                      </div>
                    </div>
                  </div>

                  {/* Section: Prix & Poids */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{tp('Prix et poids')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">{tp('Poids total (kg) *')}</label>
                        <input type="number" name="weightKg" required min="0" step="0.01" value={formData.weightKg} onChange={handleChange} className={iCls} placeholder="0.00" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Prix par kg ({symbol}) *</label>
                        <input type="number" name="pricePerKg" required min="0" step="0.01" value={formData.pricePerKg} onChange={handleChange} className={iCls} placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Prix d'achat unitaire ({symbol}) *
                          {formData.productId && products.find(p => p._id === formData.productId)?.productCost > 0 && (
                            <span className="ml-1 text-[10px] font-normal text-primary">{tp('auto-rempli depuis le produit')}</span>
                          )}
                        </label>
                        <input type="number" name="purchasePrice" required min="0" step="0.01" value={formData.purchasePrice} onChange={handleChange} className={iCls} placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Prix de vente unitaire ({symbol}) *
                          {formData.productId && products.find(p => p._id === formData.productId)?.sellingPrice > 0 && (
                            <span className="ml-1 text-[10px] font-normal text-primary">{tp('auto-rempli depuis le produit')}</span>
                          )}
                        </label>
                        <input type="number" name="sellingPrice" required min="0" step="0.01" value={formData.sellingPrice} onChange={handleChange} className={iCls} placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">{tp('Coût transport (calculé)')}</label>
                        <div className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-semibold text-foreground">{fmt(tc)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Section: Livraison */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{tp('Livraison')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">{tp('Date d\'arrivée prévue')}</label>
                        <input type="date" name="expectedArrival" value={formData.expectedArrival} onChange={handleChange} className={iCls} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">{tp('Numéro de suivi')}</label>
                        <input type="text" name="trackingNumber" value={formData.trackingNumber} onChange={handleChange} className={iCls} placeholder={tp('Ex: CN123456789')} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">{tp('Notes')}</label>
                      <textarea name="notes" rows="2" value={formData.notes} onChange={handleChange} className={iCls} placeholder={tp('Notes supplémentaires...')} />
                    </div>
                  </div>

                  {/* Financial preview */}
                  {qty > 0 && pp > 0 && (() => {
                    const selProd = products.find(p => p._id === formData.productId);
                    const delivCost = selProd?.deliveryCost || 0;
                    const netProfitPerUnit = sp - pp - delivCost;
                    const netProfit = netProfitPerUnit * qty - tc;
                    const marginPct = sp > 0 ? Math.round((netProfitPerUnit / sp) * 100) : 0;
                    return (
                      <div className={`rounded-xl p-4 border ${netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">{tp('Aperçu financier')}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                          <div><span className="text-muted-foreground text-xs">{tp('Coût achat total')}</span><p className="font-bold text-red-600">{fmt(totalCostCalcForm)}</p></div>
                          <div><span className="text-muted-foreground text-xs">{tp('Valeur vente totale')}</span><p className="font-bold text-primary">{fmt(totalSelling)}</p></div>
                          <div><span className="text-muted-foreground text-xs">{tp('Marge brute')}</span><p className={`font-bold ${estProfit >= 0 ? 'text-primary' : 'text-red-600'}`}>{fmt(estProfit)}</p></div>
                          {delivCost > 0 && (
                            <div><span className="text-muted-foreground text-xs">Livraison ({fmt(delivCost)}/u)</span><p className="font-semibold text-orange-600">−{fmt(delivCost * qty)}</p></div>
                          )}
                          <div><span className="text-muted-foreground text-xs">{tp('Profit net réel')}</span><p className={`font-bold text-lg ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(netProfit)}</p></div>
                          <div><span className="text-muted-foreground text-xs">Marge nette/u ({marginPct}%)</span><p className={`font-semibold ${netProfitPerUnit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(netProfitPerUnit)}</p></div>
                        </div>
                      </div>
                    );
                  })()}
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
              <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-foreground hover:bg-background transition">{tp('Annuler')}</button>
              <button type="submit" form="stock-order-form" disabled={formLoading || formInitLoading}
                className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition">
                {formLoading ? (editingId ? 'Modification…' : 'Création…') : (editingId ? 'Modifier' : 'Créer la commande')}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default StockOrdersList;
