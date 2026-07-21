import React, { useState, useEffect } from 'react';
import { useNavigate } from '@/lib/router-compat';
import {
  Search, Plus, Edit, Trash2, Download, Upload,
  Package, FlaskConical, BarChart3, BadgeCheck, X, ExternalLink
} from 'lucide-react';
import ecomApi from '../services/ecommApi.js';
import ProductImport from '../components/ProductImport.jsx';
import { getContextualError } from '../utils/errorMessages';
import { tp } from '../i18n/platform.js';

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);
const fmtF = (n) => `${fmt(n)} F`;

const STATUS = {
  research:  { label: 'Recherche', cls: 'bg-sky-100 text-sky-700' },
  testing:   { label: 'Test',      cls: 'bg-amber-100 text-amber-700' },
  validated: { get label() { return tp('Validé'); },    cls: 'bg-primary-100 text-primary' },
  rejected:  { get label() { return tp('Rejeté'); },    cls: 'bg-red-100 text-red-600' },
};

const marginColor = (m) =>
  m >= 60 ? 'text-primary' : m >= 40 ? 'text-amber-500' : 'text-red-500';

const Badge = ({ status }) => {
  const s = STATUS[status] || STATUS.research;
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.cls}`}>{s.label}</span>;
};

const LinkPill = ({ href, label }) =>
  href ? (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E6F2ED] text-[#0F6B4F] text-[11px] font-semibold hover:bg-primary-100 transition">
      {label} <ExternalLink className="w-2.5 h-2.5" />
    </a>
  ) : null;

// ─── Detail drawer ───────────────────────────────────────────────────────────
const DetailPanel = ({ product, onClose, onEdit, onDelete, onPassToTest }) => {
  if (!product) return null;
  const m = product.margin || 0;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-border">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground leading-snug">{product.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge status={product.status} />
              <span className="text-[11px] text-muted-foreground">
                {new Date(product.researchDate || product.createdAt).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground transition flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-background rounded-xl p-3 text-center">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{tp('Marge')}</p>
              <p className={`text-lg font-bold mt-0.5 ${marginColor(m)}`}>{m.toFixed(1)}%</p>
            </div>
            <div className="bg-background rounded-xl p-3 text-center">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{tp('Bénéfice')}</p>
              <p className="text-lg font-bold mt-0.5 text-primary">{fmtF(product.profit)}</p>
            </div>
            <div className="bg-background rounded-xl p-3 text-center">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{tp('Score')}</p>
              <p className="text-lg font-bold mt-0.5 text-amber-500">{product.opportunityScore || 3}/5</p>
            </div>
          </div>

          {/* Finances */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{tp('Finances')}</p>
            <div className="space-y-1.5">
              {[
                ['Prix de vente',   fmtF(product.sellingPrice), 'font-bold text-foreground text-base'],
                ['Sourcing brut',   fmtF(product.sourcingPrice)],
                ['Frais livraison', fmtF(product.shippingUnitCost)],
                ['Coût total (COGS)', fmtF(product.cogs)],
                product.weight ? ['Poids', `${product.weight} kg`] : null,
              ].filter(Boolean).map(([label, value, cls = 'text-foreground']) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className={`text-sm font-semibold ${cls}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Marché */}
          {(product.demand || product.competition || product.trend) && (
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{tp('Marché')}</p>
              <div className="flex flex-wrap gap-2">
                {product.demand && (
                  <span className="px-2.5 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground">
                    Demande: {product.demand === 'high' ? 'Élevée' : product.demand === 'low' ? 'Faible' : tp('Moyenne')}
                  </span>
                )}
                {product.competition && (
                  <span className="px-2.5 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground">
                    Concurrence: {product.competition === 'high' ? 'Élevée' : product.competition === 'low' ? 'Faible' : tp('Moyenne')}
                  </span>
                )}
                {product.trend && (
                  <span className="px-2.5 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground">
                    {product.trend === 'rising' ? '📈 Montante' : product.trend === 'falling' ? '📉 Déclinante' : '➡️ Stable'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Liens */}
          {(product.creative || product.alibabaLink || product.researchLink || product.websiteUrl) && (
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{tp('Sources')}</p>
              <div className="flex flex-wrap gap-2">
                <LinkPill href={product.creative} label="Creative" />
                <LinkPill href={product.alibabaLink} label="Alibaba" />
                <LinkPill href={product.researchLink} label="Recherche" />
                <LinkPill href={product.websiteUrl} label="Site web" />
              </div>
            </div>
          )}

          {/* Pros / Cons */}
          {((product.pros?.filter(p=>p).length > 0) || (product.cons?.filter(c=>c).length > 0)) && (
            <div className="grid grid-cols-2 gap-3">
              {product.pros?.filter(p=>p).length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-1.5">{tp('✓ Forces')}</p>
                  <ul className="space-y-1">
                    {product.pros.filter(p=>p).map((p,i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <span className="text-primary-400 mt-0.5">•</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {product.cons?.filter(c=>c).length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-red-500 uppercase tracking-widest mb-1.5">{tp('✗ Faiblesses')}</p>
                  <ul className="space-y-1">
                    {product.cons.filter(c=>c).map((c,i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <span className="text-red-400 mt-0.5">•</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {product.notes && (
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">{tp('Notes')}</p>
              <p className="text-xs text-muted-foreground leading-relaxed bg-background rounded-xl p-3">{product.notes}</p>
            </div>
          )}
        </div>

        {/* Actions footer */}
        <div className="px-5 py-4 border-t border-border flex items-center gap-2">
          <button onClick={() => onEdit(product._id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-background transition">
            <Edit className="w-4 h-4" />Modifier
          </button>
          {!['testing','validated'].includes(product.status) && (
            <button onClick={() => onPassToTest(product)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#0F6B4F] rounded-xl text-sm font-semibold text-white hover:bg-[#0a5740] transition">
              <FlaskConical className="w-4 h-4" />Passer en test
            </button>
          )}
          <button onClick={() => onDelete(product._id)}
            className="p-2.5 border border-red-100 rounded-xl text-red-500 hover:bg-red-50 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const ProductResearchList = () => {
  const navigate = useNavigate();
  const [products, setProducts]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [searchTerm, setSearchTerm]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy]           = useState('researchDate');
  const [sortOrder, setSortOrder]     = useState('desc');
  const [showImport, setShowImport]   = useState(false);
  const [selected, setSelected]       = useState(null);

  useEffect(() => { loadProducts(); }, [searchTerm, statusFilter, sortBy, sortOrder]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const p = new URLSearchParams();
      if (searchTerm)   p.append('search', searchTerm);
      if (statusFilter) p.append('status', statusFilter);
      p.append('sortBy', sortBy);
      p.append('sortOrder', sortOrder);
      p.append('limit', '100');
      const res = await ecomApi.get(`/products-research/research?${p.toString()}`);
      if (res.data.success) setProducts(res.data.data);
    } catch (e) {
      setError(getContextualError(e, 'load_products'));
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!confirm('Supprimer ce produit ?')) return;
    try {
      await ecomApi.delete(`/products-research/research/${id}`);
      setSelected(null);
      loadProducts();
    } catch (e) { setError(getContextualError(e, 'delete_product')); }
  };

  const passToTest = async (p) => {
    if (!confirm(`Créer un produit de test pour "${p.name}" ?`)) return;
    try {
      await ecomApi.post('/products', {
        name: p.name, status: 'test',
        sellingPrice: p.sellingPrice || 0,
        productCost: p.sourcingPrice || 0,
        deliveryCost: p.shippingUnitCost || 0,
        avgAdsCost: 0, stock: 0, reorderThreshold: 10, isActive: true,
      });
      await ecomApi.put(`/products-research/research/${p._id}/status`, { status: 'testing' });
      setSelected(null);
      loadProducts();
    } catch { setError(tp('Erreur lors de la création')); }
  };

  const exportCSV = () => {
    const headers = ['PRODUIT','PRIX SOURCING','POIDS','LIVRAISON','COGS','PRIX VENTE','MARGE','BÉNÉFICE','SCORE','STATUT','DATE'];
    const rows = products.map(p => [
      `"${p.name}"`, p.sourcingPrice||0, p.weight||0, p.shippingUnitCost||0,
      p.cogs||0, p.sellingPrice||0, `${(p.margin||0).toFixed(1)}%`,
      p.profit||0, `${p.opportunityScore||3}/5`, p.status,
      new Date(p.researchDate).toLocaleDateString('fr-FR'),
    ].join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `veille-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const researchCount  = products.filter(p => p.status === 'research').length;
  const testingCount   = products.filter(p => p.status === 'testing').length;
  const validatedCount = products.filter(p => p.status === 'validated').length;
  const avgMargin      = products.length ? products.reduce((s,p) => s+(p.margin||0),0)/products.length : 0;

  if (loading) return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-3">
        {[...Array(8)].map((_,i) => <div key={i} className="h-14 bg-card rounded-2xl animate-pulse border border-border" />)}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <div className="bg-card border-b border-border px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-foreground">{tp('Veille Produits')}</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {products.length} produit{products.length !== 1 ? 's' : ''} · {researchCount} en recherche · {testingCount} en test · {validatedCount} validés
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowImport(v => !v)}
              className="p-2 rounded-xl border border-border text-muted-foreground hover:bg-background transition" title={tp('Importer CSV')}>
              <Upload className="w-4 h-4" />
            </button>
            <button onClick={exportCSV}
              className="p-2 rounded-xl border border-border text-muted-foreground hover:bg-background transition" title={tp('Exporter CSV')}>
              <Download className="w-4 h-4" />
            </button>
            <button onClick={() => navigate('/ecom/product-finder')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0F6B4F] hover:bg-[#0a5740] text-white text-sm font-bold rounded-xl transition shadow-sm">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{tp('Ajouter')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 space-y-3">

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total', value: products.length, color: 'text-foreground' },
            { label: 'En test', value: testingCount, color: 'text-amber-600' },
            { get label() { return tp('Validés'); }, value: validatedCount, color: 'text-primary' },
            { label: 'Marge moy.', value: `${avgMargin.toFixed(0)}%`, color: marginColor(avgMargin) },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-card rounded-2xl border p-3 text-center">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
              <p className={`text-xl font-bold mt-0.5 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Import */}
        {showImport && (
          <div className="bg-card rounded-2xl border p-4">
            <ProductImport onImportSuccess={() => { loadProducts(); setShowImport(false); }} />
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder={tp('Rechercher…')}
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-xl bg-card outline-none focus:ring-2 focus:ring-[#0F6B4F]/20 focus:border-[#0F6B4F] transition"
            />
          </label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-xl bg-card outline-none focus:ring-2 focus:ring-[#0F6B4F]/20 focus:border-[#0F6B4F] text-muted-foreground">
            <option value="">{tp('Tous')}</option>
            <option value="research">{tp('Recherche')}</option>
            <option value="testing">{tp('Test')}</option>
            <option value="validated">{tp('Validé')}</option>
            <option value="rejected">{tp('Rejeté')}</option>
          </select>
          <select value={`${sortBy}-${sortOrder}`}
            onChange={e => { const [f,o] = e.target.value.split('-'); setSortBy(f); setSortOrder(o); }}
            className="px-3 py-2 text-sm border border-border rounded-xl bg-card outline-none focus:ring-2 focus:ring-[#0F6B4F]/20 focus:border-[#0F6B4F] text-muted-foreground">
            <option value="researchDate-desc">{tp('Récents')}</option>
            <option value="researchDate-asc">{tp('Anciens')}</option>
            <option value="margin-desc">{tp('Marge ↓')}</option>
            <option value="margin-asc">{tp('Marge ↑')}</option>
            <option value="opportunityScore-desc">{tp('Score ↓')}</option>
            <option value="name-asc">A-Z</option>
          </select>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}

        {/* List */}
        {products.length === 0 ? (
          <div className="bg-card rounded-2xl border px-6 py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">{tp('Aucun produit')}</p>
            <p className="text-xs text-muted-foreground mt-1 mb-5">{tp('Ajoutez votre premier produit de veille')}</p>
            <button onClick={() => navigate('/ecom/product-finder')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0F6B4F] text-white text-sm font-bold rounded-xl hover:bg-[#0a5740] transition">
              <Plus className="w-4 h-4" />Ajouter un produit
            </button>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border overflow-hidden">
            {products.map((p, i) => (
              <button key={p._id} onClick={() => setSelected(p)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3.5 hover:bg-background/80 transition ${i < products.length-1 ? 'border-b border-border' : ''} ${selected?._id === p._id ? 'bg-[#E6F2ED]/50' : ''}`}>

                {/* Image or icon */}
                <div className="w-9 h-9 rounded-xl bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {p.imageUrl
                    ? <img src={p.imageUrl} alt="" className="w-9 h-9 object-cover rounded-xl" />
                    : <Package className="w-4 h-4 text-muted-foreground" />
                  }
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{new Date(p.researchDate || p.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>

                {/* Margin */}
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${marginColor(p.margin||0)}`}>{(p.margin||0).toFixed(0)}%</p>
                  <p className="text-[11px] text-muted-foreground">{fmtF(p.sellingPrice)}</p>
                </div>

                {/* Badge */}
                <div className="flex-shrink-0 hidden sm:block">
                  <Badge status={p.status} />
                </div>

                {/* Chevron */}
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <DetailPanel
          product={selected}
          onClose={() => setSelected(null)}
          onEdit={(id) => navigate(`/ecom/product-finder/${id}/edit`)}
          onDelete={deleteProduct}
          onPassToTest={passToTest}
        />
      )}
    </div>
  );
};

export default ProductResearchList;
