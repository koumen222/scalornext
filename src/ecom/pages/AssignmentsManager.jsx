import React, { useState, useEffect, useRef } from 'react';
import ecomApi from '../services/ecommApi.js';
import { useMoney } from '../hooks/useMoney.js';
import { tp } from '../i18n/platform.js';
import { useSearchParams } from '@/lib/router-compat';

const IconFillLoader = ({ backgroundClassName = 'bg-background' }) => {
  const [p, setP] = useState(0);

  useEffect(() => {
    let raf;
    let start;
    const durationMs = 1200;
    const tick = (t) => {
      if (!start) start = t;
      const elapsed = t - start;
      const progress = (elapsed % durationMs) / durationMs;
      setP(Math.min(100, Math.round(progress * 100)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={`w-full h-full min-h-screen ${backgroundClassName} flex items-center justify-center`}>
      <div className="relative w-20 h-20">
        <img
          src="/icon.png"
          alt="Loading"
          className="w-20 h-20 object-contain opacity-20"
        />
        <div
          className="absolute inset-0 overflow-hidden transition-all duration-200 ease-out"
          style={{ clipPath: `inset(${100 - p}% 0 0 0)` }}
        >
          <img
            src="/icon.png"
            alt="Loading"
            className="w-20 h-20 object-contain"
          />
        </div>
      </div>
    </div>
  );
};

// Détermine le type de source (scalor / shopify) à partir du type ou du nom
const sourceKind = (source) => {
  if (!source) return null;
  const type = source.sourceType || source.metadata?.type || '';
  const name = (source.name || '').toLowerCase();
  if (type === 'scalor_store' || name.includes('scalor')) return 'scalor';
  if (type === 'shopify' || name.includes('shopify')) return 'shopify';
  return null;
};

// Affiche le logo Scalor/Shopify, sinon retombe sur l'emoji d'origine
const SourceLogo = ({ source, fallback, className = 'w-4 h-4' }) => {
  const kind = sourceKind(source);
  if (kind === 'scalor') {
    return <img src="/icon.svg" alt="Scalor" className={`${className} object-contain`} />;
  }
  if (kind === 'shopify') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="#95BF47" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Shopify">
        <path d="M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.73c-.018-.116-.114-.192-.211-.192s-1.929-.136-1.929-.136-1.275-1.274-1.439-1.411c-.045-.037-.075-.057-.121-.074l-.914 21.104h.023zM11.71 11.305s-.81-.424-1.774-.424c-1.447 0-1.504.906-1.504 1.141 0 1.232 3.24 1.715 3.24 4.629 0 2.295-1.44 3.76-3.406 3.76-2.354 0-3.54-1.465-3.54-1.465l.646-2.086s1.245 1.066 2.28 1.066c.675 0 .975-.545.975-.932 0-1.619-2.654-1.694-2.654-4.359-.034-2.237 1.571-4.416 4.827-4.416 1.257 0 1.875.361 1.875.361l-.945 2.715-.02.01zM11.17.83c.136 0 .271.038.405.135-.984.465-2.064 1.639-2.508 3.992-.656.213-1.293.405-1.889.578C7.697 3.75 8.951.84 11.17.84V.83zm1.235 2.949v.135c-.754.232-1.583.484-2.394.736.466-1.777 1.333-2.645 2.085-2.971.193.501.309 1.176.309 2.1zm.539-2.234c.694.074 1.141.867 1.429 1.755-.349.114-.735.231-1.158.366v-.252c0-.752-.096-1.371-.271-1.871v.002zm2.992 1.289c-.02 0-.06.021-.078.021s-.289.075-.714.21c-.423-1.233-1.176-2.37-2.508-2.37h-.115C12.135.209 11.669 0 11.265 0 8.159 0 6.675 3.877 6.21 5.846c-1.194.365-2.063.636-2.16.674-.675.213-.694.232-.772.87-.075.462-1.83 14.063-1.83 14.063L15.009 24l.927-21.166z" />
      </svg>
    );
  }
  return <span>{fallback}</span>;
};

const AssignmentsManager = () => {
  const { symbol } = useMoney();
  const [searchParams, setSearchParams] = useSearchParams();
  const prefillDoneRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState([]);
  const [closeuses, setCloseuses] = useState([]);
  const [products, setProducts] = useState([]);
  const [storeProducts, setStoreProducts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [googleSheetsData, setGoogleSheetsData] = useState({});
  const [showSheetsPreview, setShowSheetsPreview] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [sheetProducts, setSheetProducts] = useState({});
  const [loadingSheetProducts, setLoadingSheetProducts] = useState({});
  const [formData, setFormData] = useState({
    closeuseId: '',
    orderSources: [],
    productAssignments: [],
    notes: '',
    commission: 0,
    commissionType: 'percentage'
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  // Pre-remplissage : arrive depuis "Ajouter une closeuse" (?closeuse=ID)
  useEffect(() => {
    if (loading || prefillDoneRef.current) return;
    const cid = searchParams.get('closeuse');
    if (!cid) return;
    prefillDoneRef.current = true;
    setEditingAssignment(null);
    setFormData({
      closeuseId: cid,
      orderSources: [],
      productAssignments: [],
      notes: '',
      commission: 0,
      commissionType: 'percentage'
    });
    setShowForm(true);
    // Nettoyer l'URL pour eviter la reouverture au refresh
    setSearchParams({}, { replace: true });
  }, [loading, searchParams, setSearchParams]);

  const loadData = async (useCache = true) => {
    try {
      setLoading(true);

      const [sourcesRes, closeusesRes, productsRes, storeProductsRes, assignmentsRes] = await Promise.all([
        ecomApi.get('/assignments/sources').catch(e => { console.error('sources err', e?.response?.data || e.message); return { data: { data: [] } }; }),
        ecomApi.get('/users?role=ecom_closeuse').catch(e => { console.error('users err', e?.response?.data || e.message); return { data: { data: [] } }; }),
        ecomApi.get('/products').catch(e => { console.error('products err', e?.response?.data || e.message); return { data: { data: [] } }; }),
        ecomApi.get('/store-products?limit=200&published=false').catch(() => ({ data: { data: [] } })),
        ecomApi.get('/assignments').catch(e => { console.error('assignments err', e?.response?.data || e.message); return { data: { data: [] } }; }),
      ]);

      const sourcesData = sourcesRes?.data?.data;
      const closeusesData = closeusesRes?.data?.data?.users ?? closeusesRes?.data?.data;
      const productsData = productsRes?.data?.data;
      const storeProductsData = storeProductsRes?.data?.data?.products || storeProductsRes?.data?.data || [];
      const assignmentsData = assignmentsRes?.data?.data;

      console.log('📊 Données brutes:', {
        sources: sourcesData,
        closeuses: closeusesData,
        products: productsData,
        assignments: assignmentsData
      });

      const sources = Array.isArray(sourcesData) ? sourcesData : [];
      const closeuses = Array.isArray(closeusesData) ? closeusesData : [];
      const products = Array.isArray(productsData) ? productsData : [];
      const storeProds = Array.isArray(storeProductsData) ? storeProductsData : [];
      const assignments = Array.isArray(assignmentsData) ? assignmentsData : [];

      setSources(sources);
      setCloseuses(closeuses);
      setProducts(products);
      setStoreProducts(storeProds);
      setAssignments(assignments);
      
      // Check Google Sheets sources and load their data
      await loadGoogleSheetsInfo(sources);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      setMessage(tp('Erreur lors du chargement des données'));
      // Assurer que les états sont toujours des tableaux même en cas d'erreur
      setSources([]);
      setCloseuses([]);
      setProducts([]);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadGoogleSheetsInfo = async (sources) => {
    const googleSources = sources.filter(source => 
      source.metadata?.type === 'google_sheets' && source.metadata?.spreadsheetId
    );
    
    const sheetsData = {};
    
    for (const source of googleSources) {
      sheetsData[source._id] = {
        status: 'connected',
        lastChecked: new Date(),
        data: {
          spreadsheetId: source.metadata.spreadsheetId,
          sheetName: source.metadata.sheetName
        }
      };
    }
    
    setGoogleSheetsData(sheetsData);
  };

  if (loading) {
    return <IconFillLoader />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    console.log('📤 [Submit] formData envoyé:', JSON.stringify(formData, null, 2));

    try {
      let res;
      if (editingAssignment) {
        res = await ecomApi.put(`/assignments/${editingAssignment._id}`, formData);
        setMessage(tp('Attribution mise à jour avec succès'));
      } else {
        res = await ecomApi.post('/assignments', formData);
        setMessage(tp('Attribution créée avec succès'));
      }
      console.log('📥 [Submit] Réponse backend:', JSON.stringify(res.data, null, 2));
      
      setShowForm(false);
      setEditingAssignment(null);
      setFormData({
        closeuseId: '',
        orderSources: [],
        productAssignments: [],
        notes: '',
        commission: 0,
        commissionType: 'percentage'
      });
      
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Erreur lors de l\'enregistrement');
    }
  };

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment);
    // Garder dbIds et sheetNames séparés dans productIds
    // Le backend sépare lui-même les ObjectIds valides des noms sheets
    const productAssignments = Array.isArray(assignment.productAssignments) ? assignment.productAssignments.map(pa => {
      const dbIds = Array.isArray(pa.productIds)
        ? pa.productIds.filter(Boolean).map(p => typeof p === 'object' ? String(p._id || p) : String(p)).filter(Boolean)
        : [];
      const sheetNames = Array.isArray(pa.sheetProductNames) ? pa.sheetProductNames : [];
      return {
        sourceId: String(pa.sourceId?._id || pa.sourceId),
        productIds: [...dbIds, ...sheetNames]
      };
    }) : [];

    setFormData({
      closeuseId: assignment.closeuseId?._id?.toString() || assignment.closeuseId,
      orderSources: Array.isArray(assignment.orderSources)
        ? assignment.orderSources.map(os => ({ sourceId: os.sourceId?._id?.toString() || os.sourceId }))
        : [],
      productAssignments,
      notes: assignment.notes || '',
      commission: assignment.commission || 0,
      commissionType: assignment.commissionType || 'percentage'
    });

    // Charger les produits sheets pour chaque source
    productAssignments.forEach(pa => {
      if (pa.sourceId) loadSourceProducts(pa.sourceId);
    });

    setShowForm(true);
  };

  const handleDelete = async (assignmentId) => {
    if (!confirm(tp('Êtes-vous sûr de vouloir supprimer cette attribution ?'))) return;
    
    try {
      await ecomApi.delete(`/assignments/${assignmentId}`);
      setMessage(tp('Attribution supprimée avec succès'));
      await loadData();
    } catch (error) {
      setMessage('Erreur lors de la suppression');
    }
  };

  const addOrderSource = () => {
    setFormData(prev => ({
      ...prev,
      orderSources: [...prev.orderSources, { sourceId: '' }]
    }));
  };

  const removeOrderSource = (index) => {
    setFormData(prev => ({
      ...prev,
      orderSources: prev.orderSources.filter((_, i) => i !== index)
    }));
  };

  const addProductAssignment = () => {
    setFormData(prev => ({
      ...prev,
      productAssignments: [...prev.productAssignments, { sourceId: '', productIds: [] }]
    }));
  };

  const removeProductAssignment = (index) => {
    setFormData(prev => ({
      ...prev,
      productAssignments: prev.productAssignments.filter((_, i) => i !== index)
    }));
  };

  const updateProductAssignment = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      productAssignments: Array.isArray(prev.productAssignments) ? prev.productAssignments.map((pa, i) => 
        i === index ? { ...pa, [field]: value } : pa
      ) : []
    }));
  };

  // Toggle source : coche/décoche une source et crée/supprime son productAssignment
  const toggleSource = (sourceId) => {
    const sid = String(sourceId);
    setFormData(prev => {
      const isChecked = prev.orderSources.some(os => String(os.sourceId) === sid);
      if (isChecked) {
        return {
          ...prev,
          orderSources: prev.orderSources.filter(os => String(os.sourceId) !== sid),
          productAssignments: prev.productAssignments.filter(p => String(p.sourceId) !== sid)
        };
      } else {
        loadSourceProducts(sid); // no-op pour Scalor, charge sinon
        return {
          ...prev,
          orderSources: [...prev.orderSources, { sourceId: sid }],
          productAssignments: [...prev.productAssignments, { sourceId: sid, productIds: [] }]
        };
      }
    });
  };

  // Toggle un produit dans une source
  const toggleProduct = (sourceId, productId) => {
    const pid = String(productId);
    const sid = String(sourceId);
    setFormData(prev => {
      const hasPa = prev.productAssignments.some(p => String(p.sourceId) === sid);
      const assignments = hasPa
        ? prev.productAssignments.map(p => {
            if (String(p.sourceId) !== sid) return p;
            const ids = p.productIds.map(String);
            return {
              ...p,
              productIds: ids.includes(pid) ? ids.filter(id => id !== pid) : [...ids, pid]
            };
          })
        : [...prev.productAssignments, { sourceId: sid, productIds: [pid] }];
      return { ...prev, productAssignments: assignments };
    });
  };

  // Sélectionner / désélectionner tous les produits d'une source
  const selectAllProducts = (sourceId, allIds) => {
    const sid = String(sourceId);
    const ids = allIds.map(String);
    setFormData(prev => {
      const hasPa = prev.productAssignments.some(p => String(p.sourceId) === sid);
      const assignments = hasPa
        ? prev.productAssignments.map(p => String(p.sourceId) === sid ? { ...p, productIds: ids } : p)
        : [...prev.productAssignments, { sourceId: sid, productIds: ids }];
      return { ...prev, productAssignments: assignments };
    });
  };

  const handleSyncGoogleSheets = async () => {
    setSyncing(true);
    setMessage('');
    
    try {
      const response = await ecomApi.post('/assignments/sync-sources');
      
      setMessage(`✅ ${response.data.message}`);
      await loadData(); // Reload data to show new sources
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Erreur lors de la synchronisation';
      setMessage(`❌ ${errorMsg}`);
    } finally {
      setSyncing(false);
    }
  };

  const handlePreviewSheetsData = async (source) => {
    if (!source.metadata?.spreadsheetId) return;
    
    setSelectedSource(source);
    setShowSheetsPreview(true);
    
    try {
      const response = await ecomApi.post('/assignments/preview-sheets', {
        spreadsheetId: source.metadata.spreadsheetId,
        sheetName: source.metadata.sheetName,
        maxRows: 10
      });
      
      setGoogleSheetsData(prev => ({
        ...prev,
        [source._id]: {
          ...prev[source._id],
          preview: response.data.data || response.data
        }
      }));
    } catch (error) {
      console.error('Erreur preview sheets:', error);
      setMessage(tp('Erreur lors de la prévisualisation des données'));
    }
  };

  // Charge les produits d'une source Google Sheets (extraits de la feuille).
  // Scalor utilise `storeProducts` ; Shopify/webhook = toute la source (pas de picker).
  const loadSourceProducts = async (sourceId) => {
    const source = sources.find(s => String(s._id) === String(sourceId));
    if (!source) return;
    const isSheet = source.metadata?.type === 'google_sheets';
    if (!isSheet || !source.metadata?.spreadsheetId) return;
    if (sheetProducts[sourceId]?.products?.length > 0) return; // déjà chargé

    setLoadingSheetProducts(prev => ({ ...prev, [sourceId]: true }));
    try {
      const response = await ecomApi.post('/assignments/sheet-products', {
        spreadsheetId: source.metadata.spreadsheetId,
        sheetName: source.metadata.sheetName,
      });
      setSheetProducts(prev => ({
        ...prev,
        [sourceId]: { products: response.data.data?.products || [], error: null },
      }));
    } catch (error) {
      console.error('Erreur chargement produits sheet:', error);
      const errorMsg = error.response?.data?.message || 'Erreur de connexion au Google Sheet';
      setSheetProducts(prev => ({ ...prev, [sourceId]: { error: errorMsg, products: [] } }));
    } finally {
      setLoadingSheetProducts(prev => ({ ...prev, [sourceId]: false }));
    }
  };

  const isGoogleSheetsSource = (source) => {
    return source.metadata?.type === 'google_sheets';
  };

  const getGoogleSheetsStatus = (sourceId) => {
    return googleSheetsData[sourceId];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-full overflow-x-hidden">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground leading-tight">{tp('Attributions')}</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 hidden sm:block">{tp('Affectez des sources et produits aux closeuses')}</p>
          </div>
          <button
            onClick={() => {
              setEditingAssignment(null);
              setFormData({ closeuseId: '', orderSources: [], productAssignments: [], notes: '' });
              setShowForm(true);
            }}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-full text-sm font-medium shadow-sm shadow-primary-200/60 transition hover:bg-primary active:bg-primary"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            <span className="hidden sm:inline">{tp('Nouvelle')} </span>Attribution
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message}
        </div>
      )}

      {/* Sources Google Sheets */}
      {sources.filter(isGoogleSheetsSource).length > 0 && (
        <div className="mb-6 bg-card rounded-2xl border shadow-sm shadow-gray-100/70 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v1a1 1 0 001 1h4a1 1 0 001-1v-1m3-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v6m9 4h.01" />
              </svg>
              {tp('Sources Google Sheets')}
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sources.filter(isGoogleSheetsSource).map((source) => {
                const sheetsInfo = getGoogleSheetsStatus(source._id);
                return (
                  <div key={source._id} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{source.icon}</span>
                        <h3 className="font-medium text-foreground">{source.name}</h3>
                      </div>
                      {sheetsInfo?.status === 'connected' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="6" />
                          </svg>
                          {tp('Connecté')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-500">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="6" />
                          </svg>
                          {tp('Erreur')}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <span className="text-xs font-mono truncate">
                          {source.metadata?.spreadsheetId?.slice(0, 12)}...
                        </span>
                      </div>
                      
                      {source.metadata?.sheetName && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-xs">{source.metadata.sheetName}</span>
                        </div>
                      )}
                      
                      {sheetsInfo?.rowCount && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <span className="text-xs">{sheetsInfo.rowCount} lignes</span>
                        </div>
                      )}
                      
                      {sheetsInfo?.error && (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                          {sheetsInfo.error}
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-border">
                      <button
                        onClick={() => handlePreviewSheetsData(source)}
                        className="w-full px-3 py-1.5 bg-primary-50 text-primary rounded text-xs font-medium hover:bg-primary-100 transition"
                      >
                        {tp('Aperçu des données')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* Modal preview Google Sheets */}
      {showSheetsPreview && selectedSource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">
                  Aperçu: {selectedSource.icon} {selectedSource.name}
                </h2>
                <button
                  onClick={() => {
                    setShowSheetsPreview(false);
                    setSelectedSource(null);
                  }}
                  className="text-muted-foreground hover:text-muted-foreground"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {selectedSource.metadata?.spreadsheetId && (
                  <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                    {selectedSource.metadata.spreadsheetId}
                  </span>
                )}
                {selectedSource.metadata?.sheetName && (
                  <span className="ml-2">Sheet: {selectedSource.metadata.sheetName}</span>
                )}
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {googleSheetsData[selectedSource._id]?.preview ? (
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-foreground mb-2">{tp('Aperçu des données')}</h3>
                    <div className="text-xs text-muted-foreground">
                      {googleSheetsData[selectedSource._id].preview.metadata?.parsedRows || 0} lignes chargées
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-background">
                        <tr>
                          {Array.isArray(googleSheetsData[selectedSource._id]?.preview?.headers) && googleSheetsData[selectedSource._id].preview.headers.map((header, index) => (
                            <th key={index} className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-gray-200">
                        {Array.isArray(googleSheetsData[selectedSource._id]?.preview?.preview) && googleSheetsData[selectedSource._id].preview.preview.map((row, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-background">
                            {Array.isArray(googleSheetsData[selectedSource._id]?.preview?.headers) && googleSheetsData[selectedSource._id].preview.headers.map((header, colIndex) => (
                              <td key={colIndex} className="px-4 py-2 text-sm text-foreground whitespace-nowrap">
                                {row[header] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {Array.isArray(googleSheetsData[selectedSource._id]?.preview?.recommendations) && googleSheetsData[selectedSource._id].preview.recommendations.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-foreground mb-2">{tp('Recommandations')}</h4>
                      <div className="space-y-2">
                        {googleSheetsData[selectedSource._id].preview.recommendations.map((rec, index) => (
                          <div key={index} className={`p-3 rounded-lg text-sm ${
                            rec.type === 'error' ? 'bg-red-50 text-red-800' :
                            rec.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                            'bg-primary-50 text-primary-800'
                          }`}>
                            <div className="font-medium">{rec.message}</div>
                            {rec.action && <div className="text-xs mt-1 opacity-75">{rec.action}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Liste des affectations */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tp('Attributions existantes')}</p>
          {assignments.length > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">{assignments.length}</span>
          )}
        </div>

        {assignments.length === 0 ? (
          <div className="bg-card rounded-2xl border py-16 text-center">
            <svg className="w-8 h-8 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <p className="text-sm font-medium text-foreground mb-1">{tp('Aucune attribution')}</p>
            <p className="text-sm text-muted-foreground">{tp('Créez une attribution pour commencer')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const totalProducts = assignment.productAssignments?.reduce((acc, pa) =>
                acc + (pa.productIds?.length || 0) + (pa.sheetProductNames?.length || 0), 0) || 0;
              const sourcesWithProducts = assignment.productAssignments?.filter(pa =>
                (pa.productIds?.length || 0) + (pa.sheetProductNames?.length || 0) > 0) || [];

              return (
                <div key={assignment._id} className="bg-card rounded-[26px] border border-border p-4 shadow-sm shadow-gray-100/70 transition hover:border-primary-100 sm:p-5">
                  {/* Row 1 — identity + actions */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                      {assignment.closeuseId?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {assignment.closeuseId?.name || '—'}
                        </p>
                        {assignment.commission > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
                            {assignment.commission}{assignment.commissionType === 'percentage' ? '%' : ` ${symbol}`} / commande
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{assignment.closeuseId?.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(assignment)}
                        className="w-8 h-8 rounded-full hover:bg-primary-50 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                        title={tp('Modifier')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button
                        onClick={() => handleDelete(assignment._id)}
                        className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                        title={tp('Supprimer')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Separator */}
                  {(assignment.orderSources?.length > 0 || assignment.notes) && (
                    <div className="mt-4 pt-4 border-t border-gray-50 space-y-3">

                      {/* Sources + produits par source */}
                      {Array.isArray(assignment.orderSources) && assignment.orderSources.length > 0 && (
                        <div className="space-y-2">
                          {assignment.orderSources.map((os) => {
                            const sid = String(os.sourceId?._id || os.sourceId);
                            const pa = sourcesWithProducts.find(p => String(p.sourceId?._id || p.sourceId) === sid);
                            const dbCount = pa?.productIds?.length || 0;
                            const sheetNames = pa?.sheetProductNames || [];
                            const color = os.sourceInfo?.color || '#6366F1';
                            const fullSource = sources.find(s => String(s._id) === sid) || os.sourceInfo;
                            return (
                              <div key={sid} className="flex items-start gap-2.5">
                                {/* source chip */}
                                <span
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0"
                                  style={{ backgroundColor: color + '18', color }}
                                >
                                  <SourceLogo source={fullSource} fallback={os.sourceInfo?.icon || '🔗'} className="w-4 h-4" />
                                  <span>{os.sourceInfo?.name || sid}</span>
                                </span>
                                {/* product summary */}
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {dbCount > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                                      {dbCount} produit{dbCount > 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {sheetNames.map((name, nIdx) => (
                                    <span key={nIdx} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-600">
                                      {name}
                                    </span>
                                  ))}
                                  {dbCount === 0 && sheetNames.length === 0 && (
                                    <span className="text-xs text-muted-foreground pt-0.5">{tp('Tous les produits')}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Notes */}
                      {assignment.notes && (
                        <p className="text-xs text-muted-foreground italic flex items-start gap-1.5">
                          <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                          {assignment.notes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Footer summary */}
                  {totalProducts > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                      <span className="text-xs text-muted-foreground">
                        {totalProducts} produit{totalProducts > 1 ? 's' : ''} · {assignment.orderSources?.length || 0} source{(assignment.orderSources?.length || 0) > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-end sm:items-center justify-center sm:p-4 z-50">
          <div className="bg-card sm:rounded-xl w-full sm:max-w-3xl max-h-[95vh] sm:max-h-[92vh] flex flex-col shadow-2xl rounded-t-2xl">
            {/* Handle iOS sheet */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            {/* Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-foreground">
                  {editingAssignment ? 'Modifier l\'attribution' : tp('Nouvelle attribution')}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{tp('Sélectionnez une closeuse, ses sources et ses produits')}</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingAssignment(null); setFormData({ closeuseId: '', orderSources: [], productAssignments: [], notes: '', commission: 0, commissionType: 'percentage' }); }}
                className="p-2 rounded-full bg-muted text-muted-foreground active:bg-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-5">

                {/* ÉTAPE 1 — Closeuse */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-semibold">1</span>
                    <h3 className="text-sm font-semibold text-foreground">{tp('Choisir la closeuse')}</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Array.isArray(closeuses) && closeuses.map((closeuse) => (
                      <label
                        key={closeuse._id}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.closeuseId === closeuse._id
                            ? 'border-primary-300 bg-primary-50'
                            : 'border-border hover:border-gray-300 hover:bg-background'
                        }`}
                      >
                        <input
                          type="radio"
                          name="closeuse"
                          value={closeuse._id}
                          checked={formData.closeuseId === closeuse._id}
                          onChange={(e) => setFormData(prev => ({ ...prev, closeuseId: e.target.value }))}
                          className="sr-only"
                        />
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                          {closeuse.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{closeuse.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{closeuse.email}</div>
                        </div>
                        {formData.closeuseId === closeuse._id && (
                          <svg className="w-4 h-4 text-primary ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </label>
                    ))}
                    {closeuses.length === 0 && (
                      <p className="text-sm text-muted-foreground col-span-2">{tp('Aucune closeuse disponible')}</p>
                    )}
                  </div>
                </div>

                {/* ÉTAPE 2 — Sources + Produits par source */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-semibold">2</span>
                    <h3 className="text-sm font-semibold text-foreground">Sources & Produits assignés</h3>
                    <span className="text-xs text-muted-foreground">{tp('— Cochez les sources puis sélectionnez les produits')}</span>
                  </div>

                  <div className="space-y-3">
                    {Array.isArray(sources) && sources.map((source) => {
                      const sid = String(source._id);
                      const isSourceChecked = formData.orderSources.some(os => String(os.sourceId) === sid);
                      const pa = formData.productAssignments.find(p => String(p.sourceId) === sid);
                      const selectedProductIds = (pa?.productIds || []).map(String);
                      const isSheetSource = source.metadata?.type === 'google_sheets';
                      const isScalorSource = source.metadata?.type === 'scalor_store' || source.sourceType === 'scalor_store';
                      // Sélecteur produit uniquement pour Scalor (catalogue boutique) et Google
                      // Sheets (produits de la feuille). Shopify/webhook : la source = toutes ses
                      // commandes (le backend matche par source, sans filtre produit).
                      const hasProductPicker = isScalorSource || isSheetSource;
                      const srcProducts = sheetProducts[sid];
                      const isLoadingProds = loadingSheetProducts[sid];
                      // Scalor : produits de la boutique (objets StoreProduct, sélection par _id).
                      // Toute autre source (Shopify, webhook, Google Sheets) : NOMS de produits
                      // issus des commandes/feuille de CETTE source (sélection par nom).
                      const availableProducts = isScalorSource
                        ? storeProducts
                        : (srcProducts?.products || []);

                      return (
                        <div
                          key={source._id}
                          className={`rounded-lg border-2 transition-all ${
                            isSourceChecked ? 'border-primary-300 bg-primary-50/40' : 'border-border bg-card'
                          }`}
                        >
                          {/* Header source */}
                          <label className="flex items-center gap-3 p-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isSourceChecked}
                              onChange={() => toggleSource(sid)}
                              className="w-4 h-4 rounded border-gray-300 text-primary cursor-pointer"
                            />
                            <SourceLogo source={source} fallback={source.icon} className="w-5 h-5" />
                            <span className="text-sm font-medium text-foreground flex-1">{source.name}</span>
                            {isSheetSource && (
                              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{tp('Google Sheets')}</span>
                            )}
                            {source.sourceType === 'scalor_store' || source.metadata?.type === 'scalor_store' ? (
                              <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary rounded-full font-semibold">Scalor</span>
                            ) : source.sourceType === 'webhook' && !isSheetSource ? (
                              <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">{tp('Webhook')}</span>
                            ) : source.sourceType === 'shopify' ? (
                              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">Shopify</span>
                            ) : null}
                            {isSourceChecked && selectedProductIds.length > 0 && (
                              <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary rounded-full font-medium">
                                {selectedProductIds.length} produit{selectedProductIds.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </label>

                          {/* Produits (visible si source cochée) */}
                          {isSourceChecked && (
                            <div className="px-4 pb-4 border-t border-primary-100">
                              {!hasProductPicker ? (
                                <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary-100 bg-primary-50/60 px-3 py-2.5 text-[13px] leading-snug text-muted-foreground">
                                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  <span>{tp('Toutes les commandes de cette source seront attribuées à cette closeuse. Pour attribuer produit par produit, créez une boutique Scalor.')}</span>
                                </div>
                              ) : isLoadingProds ? (
                                <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                                  <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                                  {tp('Chargement des produits...')}
                                </div>
                              ) : srcProducts?.error ? (
                                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                  {srcProducts.error}
                                </div>
                              ) : (
                                <div className="mt-3">
                                  {/* Boutons tout sélectionner / désélectionner */}
                                  <div className="flex gap-2 mb-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const allIds = isScalorSource
                                          ? availableProducts.map(p => String(p._id))
                                          : availableProducts;
                                        selectAllProducts(sid, allIds);
                                      }}
                                      className="text-xs px-2 py-1 bg-primary-100 text-primary rounded hover:bg-primary-200"
                                    >
                                      Tout sélectionner ({availableProducts.length})
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => selectAllProducts(sid, [])}
                                      className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded hover:bg-gray-200"
                                    >
                                      {tp('Tout désélectionner')}
                                    </button>
                                  </div>

                                  {/* Liste produits */}
                                  {availableProducts.length === 0 ? (
                                    <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
                                      {isSheetSource ? 'Aucun produit trouvé dans ce Google Sheet.' : isScalorSource ? tp('Aucun produit disponible.') : tp('Aucune commande trouvée pour cette source pour le moment.')}
                                    </p>
                                  ) : (
                                    <div className="max-h-44 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1 pr-1">
                                      {!isScalorSource
                                        ? availableProducts.map((productName, idx) => (
                                            <label key={idx} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition-colors ${
                                              selectedProductIds.includes(String(productName)) ? 'bg-primary-100 text-primary-800' : 'hover:bg-muted text-foreground'
                                            }`}>
                                              <input
                                                type="checkbox"
                                                checked={selectedProductIds.includes(String(productName))}
                                                onChange={() => toggleProduct(sid, String(productName))}
                                                className="w-3.5 h-3.5 rounded border-gray-300 text-primary"
                                              />
                                              <span className="truncate">{productName}</span>
                                            </label>
                                          ))
                                        : availableProducts.map((product) => {
                                            const pid = String(product._id);
                                            const isChecked = selectedProductIds.includes(pid);
                                            return (
                                              <label key={pid} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition-colors ${
                                                isChecked ? 'bg-primary-100 text-primary-800' : 'hover:bg-muted text-foreground'
                                              }`}>
                                                <input
                                                  type="checkbox"
                                                  checked={isChecked}
                                                  onChange={() => toggleProduct(sid, pid)}
                                                  className="w-3.5 h-3.5 rounded border-gray-300 text-primary"
                                                />
                                                <span className="truncate">{product.name}</span>
                                              </label>
                                            );
                                          })
                                      }
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {sources.length === 0 && (
                      <p className="text-sm text-muted-foreground">{tp('Aucune source disponible')}</p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{tp('Notes')} <span className="text-muted-foreground font-normal">{tp('(optionnel)')}</span></label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                    placeholder={tp('Notes optionnelles...')}
                  />
                </div>

                {/* 🆕 Commission */}
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-semibold">3</span>
                    <h3 className="text-sm font-semibold text-foreground">{tp('Commission de la closeuse')}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">{tp('Montant')}</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.commission}
                        onChange={(e) => setFormData(prev => ({ ...prev, commission: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                        placeholder={tp('Ex: 10')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">{tp('Type')}</label>
                      <select
                        value={formData.commissionType}
                        onChange={(e) => setFormData(prev => ({ ...prev, commissionType: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent bg-card"
                      >
                        <option value="percentage">{tp('% (pourcentage)')}</option>
                        <option value="fixed">{symbol} (montant fixe)</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-primary mt-2">
                    {tp('La closeuse verra sa commission sur chaque commande traitée.')}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-border flex-shrink-0 bg-background sm:rounded-b-xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
                {formData.closeuseId && (
                  <p className="text-xs text-muted-foreground mb-2 truncate">
                    {closeuses.find(c => c._id === formData.closeuseId)?.name} — {formData.orderSources.length} source{formData.orderSources.length > 1 ? 's' : ''}, {formData.productAssignments.reduce((acc, pa) => acc + pa.productIds.length, 0)} produit(s)
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setEditingAssignment(null); setFormData({ closeuseId: '', orderSources: [], productAssignments: [], notes: '', commission: 0, commissionType: 'percentage' }); }}
                    className="flex-1 sm:flex-none px-4 py-2.5 text-sm border border-gray-300 text-foreground rounded-lg active:bg-muted font-medium"
                  >
                    {tp('Annuler')}
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.closeuseId}
                    className="flex-1 sm:flex-none px-5 py-2.5 text-sm bg-primary text-white rounded-full shadow-sm shadow-primary-200/60 transition hover:bg-primary active:bg-primary disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {editingAssignment ? 'Mettre à jour' : tp('Créer')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentsManager;
