import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from '@/lib/router-compat';
import {
  ArrowLeft, Save, Image, Plus, X, Loader2, AlertCircle, CheckCircle,
  Search, PackageSearch, Link, Sparkles, Globe, FileText, ChevronDown,
  ChevronUp, Layers, ChevronRight, Target, Lightbulb,
  BarChart3, Star, Shield, Zap, BookOpen, Type, Trash2, Download,
  Upload, ExternalLink, HelpCircle
} from 'lucide-react';
import { storeProductsApi, storeManageApi } from '../services/storeApi.js';
import AlibabaImportModal from '../components/AlibabaImportModal.jsx';
import RichTextEditor from '../components/RichTextEditor.jsx';
import AiTextPromptBox from '../components/AiTextPromptBox.jsx';
import AiImagePromptBox from '../components/AiImagePromptBox.jsx';
import AiGifPromptBox from '../components/AiGifPromptBox.jsx';
import QuantityOffersManager from '../components/QuantityOffersManager.jsx';
import ReviewGenerator from '../components/ReviewGenerator.jsx';
import DigitalProductEbookModal from '../components/DigitalProductEbookModal.jsx';
import { getErrorMessage } from '../utils/errorMessages.js';
import { invalidateProductPageCache } from '../hooks/useStoreData.js';
import { tp } from '../i18n/platform.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function markdownImagesToHtml(md) {
  if (!md) return md;
  return md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) =>
    `<img src="${src}" alt="${alt}" style="max-width:100%;height:auto;border-radius:6px;margin:8px 0;" loading="lazy" />`
  );
}

function buildProductCarouselImages(productData = {}, fallbackName = '') {
  const seen = new Set();
  const output = [];
  const push = (entry, fallbackAlt, type = '') => {
    const url = typeof entry === 'string' ? entry : entry?.url;
    if (!url || seen.has(url)) return;
    seen.add(url);
    output.push({ url, alt: typeof entry === 'string' ? fallbackAlt : (entry?.alt || fallbackAlt), order: output.length, ...(type ? { type } : {}) });
  };
  const productName = productData.name || productData.title || fallbackName || 'Produit';
  const incomingImages = Array.isArray(productData.images) ? productData.images : [];
  const beforeAfterImages = Array.isArray(productData.beforeAfterImages) && productData.beforeAfterImages.length > 0
    ? productData.beforeAfterImages
    : (productData.beforeAfterImage ? [productData.beforeAfterImage] : []);
  const anglePosters = Array.isArray(productData.angles)
    ? productData.angles.map(a => a?.poster_url).filter(Boolean) : [];
  incomingImages.forEach((img, i) => push(img, `${productName} — image ${i + 1}`, img?.type || 'product'));
  push(productData.heroImage, productName, 'hero');
  beforeAfterImages.forEach((img, i) => push(img, `${productName} — avant/après ${i + 1}`, 'social-proof-before-after'));
  push(productData.heroPosterImage, `${productName} — visuel principal`, 'hero-poster');
  anglePosters.forEach((url, i) => push(url, `${productName} — argument ${i + 1}`, 'angle-poster'));
  if (!output.length) incomingImages.slice(0, 2).forEach((img, i) => push(img, `${productName} — image ${i + 1}`, img?.type || 'product'));
  return output;
}

const isPremiumPageData = (pageData = {}, productPageConfig = {}) => (
  pageData?.pageStyle === 'premium'
  || pageData?.layout === 'premium_product_page'
  || pageData?.theme === 'premium_product'
  || Boolean(pageData?.premium_page)
  || productPageConfig?.pageStyle === 'premium'
  || productPageConfig?.theme === 'premium_product'
  || Boolean(productPageConfig?.premiumPage)
);

const syncPageDataHeroImage = (pageData, primaryImage, productPageConfig) => {
  if (!pageData) return pageData;
  if (isPremiumPageData(pageData, productPageConfig)) {
    return {
      ...pageData,
      heroImage: pageData.heroImage || pageData.premiumImages?.hero || primaryImage || null,
    };
  }
  return { ...pageData, heroImage: primaryImage };
};

function clearPublicStoreSessionCaches() {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  const keys = [];
  for (let i = 0; i < window.sessionStorage.length; i++) {
    const k = window.sessionStorage.key(i);
    if (k && (k.startsWith('sf_') || k.startsWith('sfp_'))) keys.push(k);
  }
  keys.forEach(k => window.sessionStorage.removeItem(k));
  // Also clear the in-memory product page cache so admin changes are instant
  invalidateProductPageCache();
}


// ── Toast ─────────────────────────────────────────────────────────────────────

const Toast = ({ toast, onDismiss }) => {
  if (!toast) return null;
  const isErr = toast.type === 'error';
  return (
    <div className={`fixed top-4 right-4 z-[9999] flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm animate-slide-in ${
      isErr ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
    }`}>
      {isErr ? <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
      <span className="flex-1">{toast.message}</span>
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100 flex-shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// ── Section wrapper ───────────────────────────────────────────────────────────

const SectionRow = ({ icon, label, open, onToggle, children }) => (
  <div className="border-b border-border last:border-b-0">
    <button type="button" onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-background transition text-left">
      <span className="flex items-center gap-2.5 text-sm font-medium text-foreground">{icon}{label}</span>
      {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
    </button>
    {open && <div className="px-5 pb-5 space-y-3">{children}</div>}
  </div>
);

const Field = ({ label, hint, children }) => (
  <div>
    <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
  </div>
);

const inputCls = "w-full px-3 py-2.5 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition placeholder-gray-300";
const textareaCls = `${inputCls} resize-none`;

// ── Main Component ────────────────────────────────────────────────────────────

const StoreProductForm = ({ embedded = false } = {}) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/ecom/boutique') ? '/ecom/boutique' : '/ecom/store';
  const isEdit = !!id;
  const navState = location.state?.prefill || null;
  // Quand on arrive depuis le générateur de page produit : page publiée,
  // stock pré-rempli et prix par défaut, pour que la page soit live tout de suite.
  const fromGenerator = location.state?.fromGenerator || false;

  // ── Core state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [storeTemplate, setStoreTemplate] = useState('classic');
  const [uploading, setUploading] = useState(false);
  const [csvBusy, setCsvBusy] = useState(false);
  const [digitalProductLoading, setDigitalProductLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Image upload state ──────────────────────────────────────────────────────
  const [dragOver, setDragOver] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // ── GIF state ────────────────────────────────────────────────────────────────

  // ── Picker state ─────────────────────────────────────────────────────────────
  const [showPicker, setShowPicker] = useState(false);
  const [pickerProducts, setPickerProducts] = useState([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerLoading, setPickerLoading] = useState(false);
  const [linkedProduct, setLinkedProduct] = useState(null);
  const searchTimeout = useRef(null);
  const descEditorRef = useRef(null);

  // ── Collapsible sections ──────────────────────────────────────────────────
  const [openSections, setOpenSections] = useState({});
  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Modals ────────────────────────────────────────────────────────────────
  const [showAlibabaModal, setShowAlibabaModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiInputType, setAiInputType] = useState('description');
  const [aiInput, setAiInput] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiGenerated, setAiGenerated] = useState(null);
  const [showDigitalProductModal, setShowDigitalProductModal] = useState(false);
  const [digitalProductError, setDigitalProductError] = useState('');
  const [digitalProductResult, setDigitalProductResult] = useState(null);

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: navState?.name || '',
    description: navState?.description || '',
    price: navState?.price || (fromGenerator ? '10000' : ''),
    compareAtPrice: '',
    currency: navState?.currency || '',
    targetMarket: navState?.targetMarket || '',
    country: navState?.country || '',
    city: navState?.city || '',
    locale: navState?.locale || '',
    pageLanguage: navState?.pageLanguage || '',
    stock: fromGenerator ? '1000' : '0',
    category: navState?.category || '',
    tags: navState?.tags || '',
    isPublished: fromGenerator,
    seoTitle: navState?.seoTitle || '',
    seoDescription: navState?.seoDescription || '',
    images: navState?.images || [],
    linkedProductId: null,
    testimonials: navState?._pageData?.testimonials || [],
    faq: navState?._pageData?.faq || [],
    _pageData: navState?._pageData || null,
    productPageConfig: navState?.productPageConfig || null,
  });

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  }, []);

  // ── Load product (edit mode) ──────────────────────────────────────────────
  useEffect(() => {
    storeManageApi.getTheme()
      .then(res => setStoreTemplate(res.data?.data?.template || 'classic'))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await storeProductsApi.getProduct(id);
        const p = res.data?.data;
        if (p) {
          setForm({
            name: p.name || '',
            description: p.description || '',
            price: String(p.price ?? ''),
            compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : '',
            currency: p.currency || '',
            targetMarket: p.targetMarket || '',
            country: p.country || '',
            city: p.city || '',
            locale: p.locale || '',
            pageLanguage: p.pageLanguage || '',
            stock: String(p.stock ?? '0'),
            category: p.category || '',
            tags: (p.tags || []).join(', '),
            isPublished: p.isPublished || false,
            seoTitle: p.seoTitle || '',
            seoDescription: p.seoDescription || '',
            images: p.images || [],
            linkedProductId: p.linkedProductId || null,
            testimonials: p.testimonials || [],
            faq: p.faq || [],
            _pageData: p._pageData || null,
            productPageConfig: p.productPageConfig || null,
          });
          if (p.linkedProductId) setLinkedProduct({ _id: p.linkedProductId, name: p.name });
        }
      } catch {
        showToast('error', 'Impossible de charger le produit');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, showToast]);

  // ── Picker debounced search ───────────────────────────────────────────────
  useEffect(() => {
    if (!showPicker) return;
    clearTimeout(searchTimeout.current);
    setPickerLoading(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await storeProductsApi.getSystemProducts(pickerSearch);
        setPickerProducts(res.data?.data || []);
      } catch {
        setPickerProducts([]);
      } finally {
        setPickerLoading(false);
      }
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [pickerSearch, showPicker]);

  // ── Form helpers ──────────────────────────────────────────────────────────
  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // Insertions IA (image, GIF, paragraphe) : à la position du curseur dans
  // l'éditeur de description — à défaut, à la fin du contenu.
  const insertIntoDescription = (html) => {
    if (descEditorRef.current?.insertHtmlAtCaret) {
      descEditorRef.current.insertHtmlAtCaret(html); // le onChange de l'éditeur synchronise form.description
    } else {
      setForm(prev => ({ ...prev, description: `${prev.description || ''}${html}` }));
    }
  };

  const syncHeroWithImages = (updater) => {
    setForm(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const images = Array.isArray(next.images) ? next.images : [];
      const primaryImage = images[0]?.url || null;
      const nextPageData = next._pageData || prev._pageData || null;
      const nextProductPageConfig = next.productPageConfig || prev.productPageConfig || null;
      return { ...next, _pageData: syncPageDataHeroImage(nextPageData, primaryImage, nextProductPageConfig) };
    });
  };

  const getPageData = (key, fallback) => form._pageData?.[key] ?? fallback;
  const setPageData = (key, value) =>
    setForm(prev => ({ ...prev, _pageData: { ...(prev._pageData || {}), [key]: value } }));

  // ── Image handlers ────────────────────────────────────────────────────────
  const addPhotos = async (fileList) => {
    const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    setUploading(true);
    const errors = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        errors.push(`${file.name} dépasse 5 MB`);
        continue;
      }
      try {
        const res = await storeProductsApi.uploadImages([file]);
        const uploaded = res.data?.data?.[0];
        if (!uploaded?.url) throw new Error('URL manquante dans la réponse');
        syncHeroWithImages(prev => ({
          ...prev,
          images: [...prev.images, { url: uploaded.url, alt: prev.name || file.name, order: prev.images.length }],
        }));
      } catch (err) {
        errors.push(`${file.name} : ${err?.response?.data?.message || err.message || 'Erreur upload'}`);
      }
    }
    setUploading(false);
    if (errors.length) showToast('error', errors.join(' — '));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addPhotos(e.dataTransfer.files);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const handleRemoveImage = (index) =>
    syncHeroWithImages(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));

  const handleMoveImage = (index, direction) =>
    syncHeroWithImages(prev => {
      const imgs = [...prev.images];
      const target = index + direction;
      if (target < 0 || target >= imgs.length) return prev;
      [imgs[index], imgs[target]] = [imgs[target], imgs[index]];
      return { ...prev, images: imgs.map((img, i) => ({ ...img, order: i })) };
    });

  const handleSetHero = (index) => {
    if (index === 0) return;
    syncHeroWithImages(prev => {
      const imgs = [...prev.images];
      const [moved] = imgs.splice(index, 1);
      imgs.unshift(moved);
      return { ...prev, images: imgs.map((img, i) => ({ ...img, order: i })) };
    });
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    syncHeroWithImages(prev => ({
      ...prev,
      images: [...prev.images, { url: imageUrlInput.trim(), alt: prev.name, order: prev.images.length }],
    }));
    setImageUrlInput('');
  };

  // ── Picker ────────────────────────────────────────────────────────────────
  const handlePickProduct = (product) => {
    setForm(prev => ({ ...prev, name: product.name, price: String(product.sellingPrice ?? ''), linkedProductId: product._id }));
    setLinkedProduct(product);
    setShowPicker(false);
    setPickerSearch('');
  };

  const handleUnlinkProduct = () => {
    setLinkedProduct(null);
    setForm(prev => ({ ...prev, linkedProductId: null }));
  };

  // ── AI ────────────────────────────────────────────────────────────────────
  const handleAiGenerate = async () => {
    if (!aiInput.trim()) return;
    setAiGenerating(true);
    setAiError('');
    setAiGenerated(null);
    try {
      const res = await storeProductsApi.generateProduct(aiInput.trim(), aiInputType);
      setAiGenerated(res.data?.data || null);
    } catch (err) {
      setAiError(err?.response?.data?.message || 'Erreur lors de la génération');
    } finally {
      setAiGenerating(false);
    }
  };

  const applyAiGenerated = () => {
    if (!aiGenerated) return;
    let desc = aiGenerated.description || '';
    if (aiGenerated.benefits) {
      aiGenerated.benefits.forEach((b, i) => {
        if (b.generated_image_url) {
          desc = desc.replace(`{{IMAGE_${i + 1}}}`, `![${b.benefit_title || 'Image'}](${b.generated_image_url})`);
          desc = desc.replace(`![Marketing Image ${i + 1}](image_${i + 1})`, `![${b.benefit_title || 'Image'}](${b.generated_image_url})`);
        }
      });
    }
    const nextImages = buildProductCarouselImages(aiGenerated, aiGenerated.name || form.name);
    syncHeroWithImages(prev => ({
      ...prev,
      name: aiGenerated.name || prev.name,
      description: markdownImagesToHtml(desc) || prev.description,
      category: aiGenerated.category || prev.category,
      tags: (aiGenerated.tags || []).join(', '),
      seoTitle: aiGenerated.seoTitle || prev.seoTitle,
      seoDescription: aiGenerated.seoDescription || prev.seoDescription,
      price: aiGenerated.suggestedPrice > 0 ? String(aiGenerated.suggestedPrice) : prev.price,
      images: nextImages.length > 0 ? nextImages : prev.images,
    }));
    setShowAiModal(false);
    setAiInput('');
    setAiGenerated(null);
    setAiError('');
    showToast('success', 'Fiche produit générée par IA — vérifiez et enregistrez.');
  };

  const handleAlibabaApply = (productData) => {
    let desc = productData.description || '';
    if (productData.benefits) {
      productData.benefits.forEach((b, i) => {
        if (b.generated_image_url) {
          desc = desc.replace(`{{IMAGE_${i + 1}}}`, `![${b.benefit_title || 'Image'}](${b.generated_image_url})`);
          desc = desc.replace(`![Marketing Image ${i + 1}](image_${i + 1})`, `![${b.benefit_title || 'Image'}](${b.generated_image_url})`);
        }
      });
    }
    const imgs = buildProductCarouselImages(productData, productData.name || form.name);
    syncHeroWithImages(prev => ({
      ...prev,
      name: productData.name || prev.name,
      description: markdownImagesToHtml(desc) || prev.description,
      price: productData.price || prev.price,
      category: productData.category || prev.category,
      tags: productData.tags || prev.tags,
      seoTitle: productData.seoTitle || prev.seoTitle,
      seoDescription: productData.seoDescription || prev.seoDescription,
      images: imgs.length > 0 ? imgs : prev.images,
      testimonials: productData._pageData?.testimonials?.length > 0 ? productData._pageData.testimonials : prev.testimonials,
      faq: productData._pageData?.faq?.length > 0 ? productData._pageData.faq : prev.faq,
      _pageData: productData._pageData || prev._pageData,
      productPageConfig: productData.productPageConfig || prev.productPageConfig,
    }));
    showToast('success', 'Données Alibaba importées — vérifiez et enregistrez.');
  };

  // ── CSV ───────────────────────────────────────────────────────────────────
  const handleExportProductCsv = async () => {
    if (!id) return;
    setCsvBusy(true);
    try {
      const res = await storeProductsApi.exportProductCsv(id);
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `page-produit-${form.slug || id}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast('error', 'Impossible d\'exporter ce produit en CSV');
    } finally {
      setCsvBusy(false);
    }
  };

  const openDigitalProductModal = () => {
    if (!isEdit || !id) {
      showToast('error', "Enregistrez d'abord le produit avant de créer son produit digital.");
      return;
    }
    setDigitalProductError('');
    setDigitalProductResult(null);
    setShowDigitalProductModal(true);
  };

  const handleGenerateDigitalProduct = async (brief = {}) => {
    if (!isEdit || !id) return;
    setDigitalProductLoading(true);
    setDigitalProductError('');
    setDigitalProductResult(null);
    try {
      const res = await storeProductsApi.generateDigitalProduct(id, brief);
      const updated = res.data?.data;
      if (!res.data?.success || !updated) {
        throw new Error(res.data?.message || 'Impossible de générer le produit digital');
      }
      setForm((previous) => ({
        ...previous,
        _pageData: updated._pageData || {
          ...(previous._pageData || {}),
          ebook: res.data?.ebook || previous._pageData?.ebook,
        },
        productPageConfig: updated.productPageConfig || previous.productPageConfig,
      }));
      clearPublicStoreSessionCaches();
      setDigitalProductResult({
        ebook: res.data?.ebook || updated?._pageData?.ebook,
        digitalProduct: res.data?.digitalProduct || updated?._pageData?.digitalProduct,
        pdf: res.data?.ebook?.pdf || updated?._pageData?.ebook?.pdf,
      });
      showToast('success', 'Produit digital généré et ajouté à cette page.');
    } catch (err) {
      setDigitalProductError(err?.response?.data?.detail || err?.response?.data?.message || err.message || 'Erreur lors de la génération du produit digital');
    } finally {
      setDigitalProductLoading(false);
    }
  };

  const handleDisableDigitalProduct = async () => {
    if (!isEdit || !id) return;
    if (!window.confirm(tp('Désactiver le produit digital de cette page ? Il ne sera plus affiché aux clients.'))) return;
    setSaving(true);
    try {
      const res = await storeProductsApi.disableDigitalProduct(id);
      const updated = res.data?.data;
      if (updated) {
        setForm((prev) => ({
          ...prev,
          _pageData: updated._pageData ?? prev._pageData,
          productPageConfig: updated.productPageConfig ?? prev.productPageConfig,
        }));
      } else {
        // Fallback : vider localement si le serveur ne renvoie pas les données
        setForm((prev) => ({
          ...prev,
          _pageData: prev._pageData ? { ...prev._pageData, ebook: undefined, digitalProduct: undefined } : prev._pageData,
          productPageConfig: prev.productPageConfig
            ? { ...prev.productPageConfig, ebook: undefined, digitalProduct: undefined, digitalProductOfferEnabled: false }
            : prev.productPageConfig,
        }));
      }
      clearPublicStoreSessionCaches();
      showToast('success', 'Produit digital désactivé.');
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Impossible de désactiver le produit digital.'));
    } finally {
      setSaving(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast('error', 'Le nom du produit est obligatoire.'); return; }
    if (!form.price) { showToast('error', 'Le prix du produit est obligatoire.'); return; }

    setSaving(true);
    const primaryImage = form.images?.[0]?.url || null;
    const syncedPageData = syncPageDataHeroImage(form._pageData, primaryImage, form.productPageConfig);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: parseFloat(form.price),
      compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : null,
      currency: String(form.currency || '').trim().toUpperCase(),
      targetMarket: form.targetMarket.trim(),
      country: form.country.trim(),
      city: form.city.trim(),
      locale: form.locale.trim(),
      pageLanguage: form.pageLanguage || null,
      stock: parseInt(form.stock) || 0,
      category: form.category.trim(),
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      isPublished: form.isPublished,
      seoTitle: form.seoTitle.trim(),
      seoDescription: form.seoDescription.trim(),
      images: form.images,
      linkedProductId: form.linkedProductId || null,
      ...(form.productPageConfig && { productPageConfig: form.productPageConfig }),
      ...(form.testimonials?.length > 0 && { testimonials: form.testimonials }),
      ...(form.faq?.length > 0 && { faq: form.faq }),
      ...(syncedPageData && { _pageData: syncedPageData }),
    };

    try {
      if (isEdit) {
        await storeProductsApi.updateProduct(id, payload);
        clearPublicStoreSessionCaches();
        showToast('success', 'Produit mis à jour avec succès');
      } else {
        await storeProductsApi.createProduct(payload);
        clearPublicStoreSessionCaches();
        showToast('success', 'Produit créé avec succès');
        setTimeout(() => navigate(`${basePath}/products`), 1200);
      }
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Impossible de sauvegarder le produit.'));
    } finally {
      setSaving(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-7 h-7 rounded-full border-[3px] border-border border-t-primary-600 animate-spin" />
      </div>
    );
  }

  const digitalProductReady = Boolean(
    form._pageData?.ebook
    || form.productPageConfig?.ebook
    || form._pageData?.digitalProduct
    || form.productPageConfig?.digitalProduct
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={embedded ? 'bg-background' : 'min-h-screen bg-background'}>
      <style>{`
        @keyframes slide-in { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        .animate-slide-in { animation: slide-in 0.2s ease; }
      `}</style>

      {/* Toast */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* ── Sticky header ───────────────────────────────────────────────── */}
      <div className="bg-card border-b border-border sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`${basePath}/products`)}
            className="p-1.5 rounded-lg hover:bg-muted transition flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground hidden sm:block">{tp('Produits boutique')}</p>
            <h1 className="text-sm font-semibold text-foreground truncate leading-tight">
              {isEdit ? (form.name || 'Modifier le produit') : tp('Nouveau produit')}
            </h1>
          </div>

          {/* Status badge */}
          <button
            type="button"
            onClick={() => handleChange('isPublished', !form.isPublished)}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              form.isPublished
                ? 'bg-primary-50 text-primary border-primary-200 hover:bg-primary-100'
                : 'bg-muted text-muted-foreground border-border hover:bg-gray-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${form.isPublished ? 'bg-primary' : 'bg-gray-400'}`} />
            {form.isPublished ? 'Actif' : tp('Brouillon')}
          </button>

          <div className="flex items-center gap-2">
            {isEdit && (
              <button
                type="button"
                onClick={() => {
                  const isPremium = storeTemplate === 'magazine' || isPremiumPageData(form._pageData, form.productPageConfig);
                  navigate(`${basePath}/products/${id}/${isPremium ? 'premium-builder' : 'builder'}`);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition shadow-sm"
              >
                <Layers className="w-3.5 h-3.5" /> Page Builder
              </button>
            )}
            <button
              type="submit"
              form="store-product-form"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-700 disabled:opacity-60 transition shadow-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="hidden sm:inline">{saving ? 'Enregistrement...' : tp('Enregistrer')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <form id="store-product-form" onSubmit={handleSubmit}>
          <div className="flex flex-col lg:flex-row gap-5 items-start">

            {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* Titre & Description */}
              <div className="bg-card rounded-xl border shadow-sm p-5 space-y-4">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder={tp('Nom du produit')}
                  className="w-full text-xl font-bold text-foreground placeholder-gray-300 border-0 outline-none focus:ring-0 p-0 bg-transparent"
                  required
                />
                <div className="border-t border-border pt-4">
                  <RichTextEditor
                    ref={descEditorRef}
                    value={form.description}
                    onChange={(html) => handleChange('description', html)}
                    placeholder={tp('Décrivez votre produit : avantages, matière, utilisation…')}
                    minHeight={160}
                    maxHeight={500}
                  />
                  {/* IA description : générer / ajouter un paragraphe / insérer une image */}
                  <div className="mt-2 flex flex-wrap items-start gap-x-4 gap-y-1.5">
                    <AiTextPromptBox
                      withMethods
                      format="html"
                      purpose="description de fiche produit e-commerce (vendeur, structuré, orienté bénéfices)"
                      maxWords={220}
                      label={tp('Générer la description par IA')}
                      context={{
                        produit: form.name,
                        prix: form.price,
                        categorie: form.category,
                        marche: form.targetMarket || form.country,
                      }}
                      onGenerated={(text) => {
                        // HTML structuré (h2/h3/p/ul) renvoyé tel quel par l'IA ;
                        // fallback : texte plat → paragraphes
                        const html = /<h2|<h3|<p|<ul/i.test(String(text))
                          ? String(text)
                          : String(text)
                            .split(/\n{2,}|\n/)
                            .map((l) => l.trim())
                            .filter(Boolean)
                            .map((l) => `<p>${l}</p>`)
                            .join('');
                        const existing = String(form.description || '').replace(/<[^>]+>/g, '').trim();
                        if (existing) {
                          // Contenu déjà présent → insertion au curseur, sans écraser
                          insertIntoDescription(html || `<p>${text}</p>`);
                        } else {
                          handleChange('description', html || `<p>${text}</p>`);
                        }
                      }}
                    />
                    <AiTextPromptBox
                      withMethods
                      purpose="UN paragraphe complémentaire de description produit (continue le texte existant sans le répéter : angle nouveau — utilisation, bénéfice, réassurance, cible…)"
                      maxWords={70}
                      label={tp('Ajouter un paragraphe par IA')}
                      context={{
                        produit: form.name,
                        prix: form.price,
                        categorie: form.category,
                        descriptionActuelle: String(form.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 900),
                      }}
                      onGenerated={(text) => {
                        const para = String(text)
                          .split(/\n{2,}|\n/)
                          .map((l) => l.trim())
                          .filter(Boolean)
                          .map((l) => `<p>${l}</p>`)
                          .join('');
                        insertIntoDescription(para || `<p>${text}</p>`);
                      }}
                    />
                    <AiGifPromptBox
                      subject={form.name}
                      context={form.description}
                      aspectRatio="1:1"
                      referenceOptions={form.images?.[0]?.url ? [{ label: tp('Image principale'), url: form.images[0].url }] : []}
                      onGenerated={(gifUrl) => {
                        insertIntoDescription(`<p><img src="${gifUrl}" alt="${(form.name || '').replace(/"/g, '')}" style="max-width:100%;height:auto;border-radius:12px" /></p>`);
                      }}
                    />
                    <AiImagePromptBox
                      compact
                      value=""
                      label={tp('Insérer une image par IA')}
                      aspectRatio="4:3"
                      subject={form.name}
                      referenceOptions={form.images?.[0]?.url ? [{ label: tp('Image principale'), url: form.images[0].url }] : []}
                      onGenerated={(url) => {
                        insertIntoDescription(`<p><img src="${url}" alt="${(form.name || '').replace(/"/g, '')}" style="max-width:100%;height:auto;border-radius:12px" /></p>`);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* ── Images ─────────────────────────────────────────────── */}
              <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between border-b border-border">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Image className="w-4 h-4 text-muted-foreground" />
                    {tp('Images')}
                    {form.images.length > 0 && (
                      <span className="text-xs text-muted-foreground font-normal">
                        {form.images.length} photo{form.images.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </h2>
                  {uploading && (
                    <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Upload en cours...
                    </span>
                  )}
                </div>

                <div className="p-5">
                  {form.images.length === 0 ? (
                    /* Empty — big drop zone */
                    <label
                      className={`flex flex-col items-center justify-center w-full h-52 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                        dragOver
                          ? 'border-primary-400 bg-primary-50 scale-[1.01]'
                          : 'border-border hover:border-primary-300 hover:bg-background'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <input
                        type="file" accept="image/*" multiple className="hidden"
                        onChange={(e) => addPhotos(e.target.files)} disabled={uploading}
                      />
                      <div className={`flex flex-col items-center gap-3 pointer-events-none ${dragOver ? 'text-primary' : 'text-muted-foreground'}`}>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition ${dragOver ? 'bg-primary-100' : 'bg-muted'}`}>
                          <Upload className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-foreground">
                            {dragOver ? 'Déposez vos images ici' : tp('Glissez-déposez vos images')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{tp('ou cliquez pour parcourir · JPG, PNG, WebP · max 5 MB')}</p>
                        </div>
                        {!dragOver && (
                          <span className="px-4 py-1.5 bg-card border border-border rounded-lg text-xs font-semibold text-muted-foreground shadow-sm">
                            {tp('Sélectionner des fichiers')}
                          </span>
                        )}
                      </div>
                    </label>
                  ) : (
                    /* Grid of images */
                    <div
                      className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 p-1 rounded-xl transition ${dragOver ? 'ring-2 ring-primary-400 ring-inset bg-primary-50/50' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      {form.images.map((img, i) => (
                        <div key={img.url || i} className="relative group aspect-square">
                          <img
                            src={img.url}
                            alt={img.alt || form.name}
                            className={`w-full h-full rounded-xl object-cover transition ${
                              i === 0
                                ? 'ring-2 ring-primary-500 ring-offset-1'
                                : 'ring-1 ring-gray-200'
                            }`}
                            loading="lazy"
                          />
                          {/* Main badge */}
                          {i === 0 && (
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-primary text-white text-[9px] font-bold rounded-md leading-none">
                              {tp('PRINCIPALE')}
                            </span>
                          )}
                          {/* Hover overlay */}
                          <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                            {i !== 0 && (
                              <button type="button" onClick={() => handleSetHero(i)} title={tp('Définir comme principale')}
                                className="p-1.5 bg-card/95 rounded-lg text-amber-600 hover:bg-card transition text-sm font-bold leading-none shadow-sm">
                                ★
                              </button>
                            )}
                            {i > 0 && (
                              <button type="button" onClick={() => handleMoveImage(i, -1)} title={tp('Déplacer à gauche')}
                                className="p-1.5 bg-card/95 rounded-lg text-foreground hover:bg-card transition shadow-sm">
                                <ChevronUp className="w-3.5 h-3.5 -rotate-90" />
                              </button>
                            )}
                            {i < form.images.length - 1 && (
                              <button type="button" onClick={() => handleMoveImage(i, 1)} title={tp('Déplacer à droite')}
                                className="p-1.5 bg-card/95 rounded-lg text-foreground hover:bg-card transition shadow-sm">
                                <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                              </button>
                            )}
                            <button type="button" onClick={() => handleRemoveImage(i)} title={tp('Supprimer')}
                              className="p-1.5 bg-red-500 rounded-lg text-white hover:bg-red-600 transition shadow-sm">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {/* Add more cell */}
                      <label className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary-300 hover:bg-primary-50 flex flex-col items-center justify-center cursor-pointer transition group">
                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} disabled={uploading} />
                        {uploading ? (
                          <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition" />
                            <span className="text-[10px] text-gray-300 group-hover:text-primary-500 mt-1 transition font-medium">{tp('Ajouter')}</span>
                          </>
                        )}
                      </label>
                    </div>
                  )}

                  {/* URL input */}
                  <div className="flex gap-2 mt-4">
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddImageUrl(); } }}
                      placeholder={tp('Ou collez une URL d\'image...')}
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-300"
                    />
                    <button type="button" onClick={handleAddImageUrl} disabled={!imageUrlInput.trim()}
                      className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted disabled:opacity-40 transition font-medium whitespace-nowrap">
                      {tp('Ajouter')}
                    </button>
                  </div>

                  {/* Générer une image produit par IA (à partir de la principale si présente) */}
                  <div className="mt-2">
                    <AiImagePromptBox
                      compact
                      value={form.images?.[0]?.url || ''}
                      aspectRatio="1:1"
                      subject={form.name}
                      referenceOptions={form.images?.[0]?.url ? [{ label: tp('Image principale'), url: form.images[0].url }] : []}
                      onGenerated={(url) => setForm((prev) => ({
                        ...prev,
                        images: [...prev.images, { url, alt: prev.name, order: prev.images.length }],
                      }))}
                    />
                  </div>
                </div>
              </div>

              {/* ── Prix & Stock ─────────────────────────────────────────── */}
              <div className="bg-card rounded-xl border shadow-sm p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4">Prix & Stock</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">{tp('Prix *')}</label>
                    <div className="relative">
                      <input type="number" value={form.price} onChange={(e) => handleChange('price', e.target.value)}
                        placeholder="15000" min="0" step="any" required
                        className="w-full px-3 py-2.5 pr-14 border border-border rounded-lg text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
                        {form.currency || tp('FCFA')}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">{tp('Ancien prix')}</label>
                    <input type="number" value={form.compareAtPrice} onChange={(e) => handleChange('compareAtPrice', e.target.value)}
                      placeholder="20000" min="0" step="any" className={inputCls} />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">{tp('Stock')}</label>
                    <input type="number" value={form.stock} onChange={(e) => handleChange('stock', e.target.value)}
                      min="0" className={inputCls} />
                  </div>
                </div>

              </div>

              {/* ── Organisation ─────────────────────────────────────────── */}
              <div className="bg-card rounded-xl border shadow-sm p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4">{tp('Organisation')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">{tp('Catégorie')}</label>
                    <input type="text" value={form.category} onChange={(e) => handleChange('category', e.target.value)}
                      placeholder={tp('Ex: Vêtements, Beauté…')} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">{tp('Tags')}</label>
                    <input type="text" value={form.tags} onChange={(e) => handleChange('tags', e.target.value)}
                      placeholder={tp('promo, nouveau, bestseller')} className={inputCls} />
                    <p className="text-[11px] text-muted-foreground mt-1">{tp('Séparez par des virgules')}</p>
                  </div>
                </div>
              </div>

              {/* ── Sections page produit ────────────────────────────────── */}
              <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                  <Layers className="w-4 h-4 text-violet-500" />
                  <h2 className="text-sm font-semibold text-foreground">{tp('Sections de la page produit')}</h2>
                  <span className="ml-auto text-[11px] text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border">{tp('Contenu marketing avancé')}</span>
                </div>

                <SectionRow icon={<Type className="w-4 h-4 text-violet-500" />} label="Hero (Accroche)" open={openSections.hero} onToggle={() => toggleSection('hero')}>
                  <Field label="Slogan">
                    <input type="text" value={getPageData('hero_slogan', '')} onChange={(e) => setPageData('hero_slogan', e.target.value)} placeholder={tp('La solution naturelle pour votre peau')} className={inputCls} />
                  </Field>
                  <Field label="Baseline (message de confiance)">
                    <input type="text" value={getPageData('hero_baseline', '')} onChange={(e) => setPageData('hero_baseline', e.target.value)} placeholder={tp('✅ Livraison gratuite · Satisfait ou remboursé')} className={inputCls} />
                  </Field>
                </SectionRow>

                <SectionRow icon={<Target className="w-4 h-4 text-red-500" />} label="Problème" open={openSections.problem} onToggle={() => toggleSection('problem')}>
                  <Field label="Titre">
                    <input type="text" value={getPageData('problem_section', {})?.title || ''} onChange={(e) => setPageData('problem_section', { ...getPageData('problem_section', {}), title: e.target.value })} placeholder={tp('Le problème')} className={inputCls} />
                  </Field>
                  <Field label="Points de douleur (un par ligne)">
                    <textarea value={(getPageData('problem_section', {})?.pain_points || []).join('\n')} onChange={(e) => setPageData('problem_section', { ...getPageData('problem_section', {}), pain_points: e.target.value.split('\n').filter(l => l.trim()) })} placeholder={"Peau sèche et irritée\nProduits chimiques inefficaces"} rows={4} className={textareaCls} />
                  </Field>
                </SectionRow>

                <SectionRow icon={<Lightbulb className="w-4 h-4 text-primary-500" />} label="Solution" open={openSections.solution} onToggle={() => toggleSection('solution')}>
                  <Field label="Titre">
                    <input type="text" value={getPageData('solution_section', {})?.title || ''} onChange={(e) => setPageData('solution_section', { ...getPageData('solution_section', {}), title: e.target.value })} placeholder={tp('La solution')} className={inputCls} />
                  </Field>
                  <Field label="Description">
                    <textarea value={getPageData('solution_section', {})?.description || ''} onChange={(e) => setPageData('solution_section', { ...getPageData('solution_section', {}), description: e.target.value })} rows={3} className={textareaCls} />
                  </Field>
                </SectionRow>

                <SectionRow icon={<BarChart3 className="w-4 h-4 text-blue-500" />} label="Statistiques" open={openSections.stats} onToggle={() => toggleSection('stats')}>
                  {(getPageData('stats_bar', []) || []).map((stat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="text" value={stat.value || ''} onChange={(e) => { const arr = [...(getPageData('stats_bar', []))]; arr[i] = { ...arr[i], value: e.target.value }; setPageData('stats_bar', arr); }} placeholder="1000+" className="w-24 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                      <input type="text" value={stat.label || ''} onChange={(e) => { const arr = [...(getPageData('stats_bar', []))]; arr[i] = { ...arr[i], label: e.target.value }; setPageData('stats_bar', arr); }} placeholder={tp('Clients satisfaits')} className={`flex-1 ${inputCls}`} />
                      <button type="button" onClick={() => setPageData('stats_bar', getPageData('stats_bar', []).filter((_, j) => j !== i))} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setPageData('stats_bar', [...(getPageData('stats_bar', []) || []), { value: '', label: '' }])} className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> {tp('Ajouter une stat')}</button>
                </SectionRow>

                <SectionRow icon={<Star className="w-4 h-4 text-yellow-500" />} label="Avantages clés" open={openSections.benefits} onToggle={() => toggleSection('benefits')}>
                  <Field label="Avantages (un par ligne)">
                    <textarea value={(getPageData('benefits_bullets', []) || []).join('\n')} onChange={(e) => setPageData('benefits_bullets', e.target.value.split('\n').filter(l => l.trim()))} placeholder={"✅ 100% naturel\n✅ Résultats visibles en 7 jours\n✅ Sans effets secondaires"} rows={4} className={textareaCls} />
                  </Field>
                </SectionRow>

                <SectionRow icon={<Zap className="w-4 h-4 text-orange-500" />} label="Blocs de conversion" open={openSections.conversion} onToggle={() => toggleSection('conversion')}>
                  {(getPageData('conversion_blocks', []) || []).map((block, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="text" value={block.icon || ''} onChange={(e) => { const arr = [...(getPageData('conversion_blocks', []))]; arr[i] = { ...arr[i], icon: e.target.value }; setPageData('conversion_blocks', arr); }} placeholder="🚚" className="w-14 px-2 py-2 border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500" />
                      <input type="text" value={block.text || ''} onChange={(e) => { const arr = [...(getPageData('conversion_blocks', []))]; arr[i] = { ...arr[i], text: e.target.value }; setPageData('conversion_blocks', arr); }} placeholder={tp('Livraison gratuite')} className={`flex-1 ${inputCls}`} />
                      <button type="button" onClick={() => setPageData('conversion_blocks', getPageData('conversion_blocks', []).filter((_, j) => j !== i))} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setPageData('conversion_blocks', [...(getPageData('conversion_blocks', []) || []), { icon: '', text: '' }])} className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> {tp('Ajouter un bloc')}</button>
                </SectionRow>

                <SectionRow icon={<Shield className="w-4 h-4 text-primary-500" />} label="Offre & Garantie" open={openSections.offer} onToggle={() => toggleSection('offer')}>
                  <Field label="Label de l'offre">
                    <input type="text" value={getPageData('offer_block', {})?.offer_label || ''} onChange={(e) => setPageData('offer_block', { ...getPageData('offer_block', {}), offer_label: e.target.value })} placeholder={tp('Offre spéciale')} className={inputCls} />
                  </Field>
                  <Field label="Texte de garantie">
                    <input type="text" value={getPageData('offer_block', {})?.guarantee_text || ''} onChange={(e) => setPageData('offer_block', { ...getPageData('offer_block', {}), guarantee_text: e.target.value })} placeholder={tp('Satisfait ou remboursé sous 30 jours')} className={inputCls} />
                  </Field>
                </SectionRow>

                <SectionRow icon={<AlertCircle className="w-4 h-4 text-red-500" />} label="Urgence" open={openSections.urgency} onToggle={() => toggleSection('urgency')}>
                  <Field label="Badge d'urgence">
                    <input type="text" value={getPageData('urgency_badge', '')} onChange={(e) => setPageData('urgency_badge', e.target.value)} placeholder={tp('🔥 Plus que 3 en stock !')} className={inputCls} />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input type="checkbox" checked={getPageData('urgency_elements', {})?.stock_limited || false} onChange={(e) => setPageData('urgency_elements', { ...getPageData('urgency_elements', {}), stock_limited: e.target.checked })} className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500" />
                      {tp('Stock limité')}
                    </label>
                    <Field label="Preuve sociale">
                      <input type="number" min="0" value={getPageData('urgency_elements', {})?.social_proof_count || ''} onChange={(e) => setPageData('urgency_elements', { ...getPageData('urgency_elements', {}), social_proof_count: parseInt(e.target.value) || 0 })} placeholder="42" className={inputCls} />
                    </Field>
                    <Field label="Résultat rapide">
                      <input type="text" value={getPageData('urgency_elements', {})?.quick_result || ''} onChange={(e) => setPageData('urgency_elements', { ...getPageData('urgency_elements', {}), quick_result: e.target.value })} placeholder={tp('7 jours')} className={inputCls} />
                    </Field>
                  </div>
                </SectionRow>

                <SectionRow icon={<BookOpen className="w-4 h-4 text-indigo-500" />} label="Guide d'utilisation" open={openSections.guide} onToggle={() => toggleSection('guide')}>
                  <textarea value={getPageData('guide_utilisation', '')} onChange={(e) => setPageData('guide_utilisation', e.target.value)} placeholder={tp('Expliquez comment utiliser le produit étape par étape...')} rows={4} className={textareaCls} />
                </SectionRow>

                {/* ── Premium: Accordéons Hero + FAQ ──────────────────── */}
                {isPremiumPageData(form._pageData, form.productPageConfig) && (
                  <>
                    <SectionRow icon={<ChevronDown className="w-4 h-4 text-teal-500" />} label="Barres dépliables (sous CTA)" open={openSections.heroAccordions} onToggle={() => toggleSection('heroAccordions')}>
                      {(form.productPageConfig?.premiumPage?.hero?.accordions || []).map((acc, i) => (
                        <div key={i} className="p-3 bg-background border border-border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                            <button type="button" onClick={() => {
                              const next = { ...form.productPageConfig };
                              const accordions = [...(next.premiumPage?.hero?.accordions || [])];
                              accordions.splice(i, 1);
                              next.premiumPage = { ...next.premiumPage, hero: { ...next.premiumPage?.hero, accordions } };
                              setForm(f => ({ ...f, productPageConfig: next }));
                            }} className="p-1 text-red-400 hover:text-red-600 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                          <input type="text" value={acc.title || ''} placeholder={tp('Titre')} className={inputCls} onChange={(e) => {
                            const next = { ...form.productPageConfig };
                            const accordions = [...(next.premiumPage?.hero?.accordions || [])];
                            accordions[i] = { ...accordions[i], title: e.target.value };
                            next.premiumPage = { ...next.premiumPage, hero: { ...next.premiumPage?.hero, accordions } };
                            setForm(f => ({ ...f, productPageConfig: next }));
                          }} />
                          <textarea value={acc.content || ''} placeholder={tp('Contenu')} rows={3} className={textareaCls} onChange={(e) => {
                            const next = { ...form.productPageConfig };
                            const accordions = [...(next.premiumPage?.hero?.accordions || [])];
                            accordions[i] = { ...accordions[i], content: e.target.value };
                            next.premiumPage = { ...next.premiumPage, hero: { ...next.premiumPage?.hero, accordions } };
                            setForm(f => ({ ...f, productPageConfig: next }));
                          }} />
                        </div>
                      ))}
                      <button type="button" onClick={() => {
                        const next = { ...form.productPageConfig };
                        const accordions = [...(next.premiumPage?.hero?.accordions || []), { title: '', content: '' }];
                        next.premiumPage = { ...next.premiumPage, hero: { ...next.premiumPage?.hero, accordions } };
                        setForm(f => ({ ...f, productPageConfig: next }));
                      }} className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> {tp('Ajouter une barre')}</button>
                    </SectionRow>

                    <SectionRow icon={<HelpCircle className="w-4 h-4 text-orange-500" />} label="FAQ Premium" open={openSections.premiumFaq} onToggle={() => toggleSection('premiumFaq')}>
                      <Field label="Titre de la section">
                        <input type="text" value={form.productPageConfig?.premiumPage?.faq?.headline || ''} className={inputCls} placeholder={tp('Questions fréquentes')} onChange={(e) => {
                          const next = { ...form.productPageConfig };
                          next.premiumPage = { ...next.premiumPage, faq: { ...next.premiumPage?.faq, headline: e.target.value } };
                          setForm(f => ({ ...f, productPageConfig: next }));
                        }} />
                      </Field>
                      {(form.productPageConfig?.premiumPage?.faq?.items || []).map((item, i) => (
                        <div key={i} className="p-3 bg-background border border-border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-muted-foreground">Question {i + 1}</span>
                            <button type="button" onClick={() => {
                              const next = { ...form.productPageConfig };
                              const items = [...(next.premiumPage?.faq?.items || [])];
                              items.splice(i, 1);
                              next.premiumPage = { ...next.premiumPage, faq: { ...next.premiumPage?.faq, items } };
                              setForm(f => ({ ...f, productPageConfig: next }));
                            }} className="p-1 text-red-400 hover:text-red-600 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                          <input type="text" value={item.question || ''} placeholder={tp('Question')} className={inputCls} onChange={(e) => {
                            const next = { ...form.productPageConfig };
                            const items = [...(next.premiumPage?.faq?.items || [])];
                            items[i] = { ...items[i], question: e.target.value };
                            next.premiumPage = { ...next.premiumPage, faq: { ...next.premiumPage?.faq, items } };
                            setForm(f => ({ ...f, productPageConfig: next }));
                          }} />
                          <textarea value={item.answer || ''} placeholder={tp('Réponse')} rows={2} className={textareaCls} onChange={(e) => {
                            const next = { ...form.productPageConfig };
                            const items = [...(next.premiumPage?.faq?.items || [])];
                            items[i] = { ...items[i], answer: e.target.value };
                            next.premiumPage = { ...next.premiumPage, faq: { ...next.premiumPage?.faq, items } };
                            setForm(f => ({ ...f, productPageConfig: next }));
                          }} />
                        </div>
                      ))}
                      <button type="button" onClick={() => {
                        const next = { ...form.productPageConfig };
                        const items = [...(next.premiumPage?.faq?.items || []), { question: '', answer: '' }];
                        next.premiumPage = { ...next.premiumPage, faq: { ...next.premiumPage?.faq, items } };
                        setForm(f => ({ ...f, productPageConfig: next }));
                      }} className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> {tp('Ajouter une question')}</button>
                    </SectionRow>
                  </>
                )}
              </div>

              {/* ── Offres quantité ──────────────────────────────────────── */}
              {isEdit && (
                <div className="bg-card rounded-xl border shadow-sm p-5">
                  <QuantityOffersManager productId={id} />
                </div>
              )}

              {/* ── Avis clients ─────────────────────────────────────────── */}
              <ReviewGenerator
                productDescription={form.description || form.name}
                existingTestimonials={form.testimonials || []}
                onSave={(testimonials) => setForm(f => ({ ...f, testimonials }))}
              />

              {/* ── SEO ─────────────────────────────────────────────────── */}
              <div className="bg-card rounded-xl border shadow-sm p-5 space-y-4">
                <h2 className="text-sm font-semibold text-foreground">{tp('Référencement (SEO)')}</h2>
                <Field label="Titre SEO" hint={`${(form.seoTitle || form.name).length}/70 caractères`}>
                  <input type="text" value={form.seoTitle} onChange={(e) => handleChange('seoTitle', e.target.value)}
                    placeholder={form.name || tp('Titre pour les moteurs de recherche')} maxLength={70} className={inputCls} />
                </Field>
                <Field label="Description SEO" hint={`${form.seoDescription.length}/160 caractères`}>
                  <textarea value={form.seoDescription} onChange={(e) => handleChange('seoDescription', e.target.value)}
                    placeholder={tp('Description courte pour Google...')} rows={2} maxLength={160} className={textareaCls} />
                </Field>
              </div>

              {/* Bottom save (mobile) */}
              <div className="lg:hidden pb-6">
                <button type="submit" disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-700 disabled:opacity-60 transition shadow-md">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Enregistrement...' : tp('Enregistrer le produit')}
                </button>
              </div>
            </div>

            {/* ── RIGHT SIDEBAR ─────────────────────────────────────────── */}
            <div className="lg:w-72 xl:w-80 flex-shrink-0 space-y-4 lg:sticky lg:top-20">

              {/* Status + Save */}
              <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3">
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{tp('Statut')}</h3>
                <button
                  type="button"
                  onClick={() => handleChange('isPublished', !form.isPublished)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition ${
                    form.isPublished
                      ? 'border-primary-300 bg-primary-50 hover:bg-primary-100'
                      : 'border-border bg-background hover:border-gray-300 hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${form.isPublished ? 'bg-primary' : 'bg-gray-300'}`} />
                    <span className="text-sm font-semibold text-foreground">{form.isPublished ? 'Actif' : tp('Brouillon')}</span>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                    form.isPublished ? 'bg-primary-100 text-primary' : 'bg-gray-200 text-muted-foreground'
                  }`}>
                    {form.isPublished ? 'Visible' : tp('Masqué')}
                  </span>
                </button>
                <p className="text-[11px] text-muted-foreground text-center">
                  {form.isPublished ? 'Visible sur votre boutique' : tp('Cliquez pour rendre visible')}
                </p>
                <button
                  type="submit"
                  form="store-product-form"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-700 disabled:opacity-60 transition shadow-md"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Enregistrement...' : tp('Enregistrer')}
                </button>
              </div>

              {/* Actions rapides */}
              <div className="bg-card rounded-xl border shadow-sm p-4 space-y-2">
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-3">{tp('Actions rapides')}</h3>
                {isEdit && (
                  <button type="button" onClick={() => {
                    const isPremium = storeTemplate === 'magazine' || isPremiumPageData(form._pageData, form.productPageConfig);
                    navigate(`${basePath}/products/${id}/${isPremium ? 'premium-builder' : 'builder'}`);
                  }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition">
                    <Layers className="w-4 h-4 flex-shrink-0" /> Page Builder
                  </button>
                )}
                {isEdit && (
                  digitalProductReady ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-emerald-800 leading-snug truncate">
                            {(form._pageData?.ebook?.title || form.productPageConfig?.ebook?.title) || tp('Ebook généré')}
                          </p>
                          {(form._pageData?.ebook?.pdf?.url || form.productPageConfig?.ebook?.pdf?.url) && (
                            <a
                              href={form._pageData?.ebook?.pdf?.url || form.productPageConfig?.ebook?.pdf?.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-emerald-600 font-semibold hover:underline"
                            >
                              {tp('Voir le PDF')}
                            </a>
                          )}
                        </div>
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full flex-shrink-0">{tp('Actif')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={openDigitalProductModal}
                        disabled={digitalProductLoading}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-emerald-200 bg-card text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-60"
                      >
                        {digitalProductLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        Régénérer
                        <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full leading-none">{tp('3 crédits')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDisableDigitalProduct}
                        disabled={digitalProductLoading || saving}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-card text-xs font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-60"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                        Désactiver
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={openDigitalProductModal}
                      disabled={digitalProductLoading}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold text-foreground hover:bg-muted transition disabled:opacity-60"
                    >
                      {digitalProductLoading ? <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" /> : <FileText className="w-4 h-4 flex-shrink-0" />}
                      Produit digital
                      <span className="ml-auto px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full leading-none">{tp('3 crédits')}</span>
                    </button>
                  )
                )}
              </div>

              {/* Lier au catalogue */}
              <div className="bg-card rounded-xl border shadow-sm p-4">
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-3">{tp('Catalogue')}</h3>
                {linkedProduct ? (
                  <div className="flex items-center gap-2 p-3 bg-primary-50 border border-primary-200 rounded-xl">
                    <Link className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-primary-800 truncate">{linkedProduct.name}</p>
                      {linkedProduct.sellingPrice && (
                        <p className="text-[11px] text-primary">{linkedProduct.sellingPrice?.toLocaleString()} XAF</p>
                      )}
                    </div>
                    <button type="button" onClick={handleUnlinkProduct} className="p-1 text-primary-400 hover:text-red-500 transition flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowPicker(true)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary-300 hover:text-primary hover:bg-primary-50 transition font-medium">
                    <Search className="w-4 h-4" /> Lier au catalogue
                  </button>
                )}
                <p className="text-[11px] text-muted-foreground mt-2 text-center leading-tight">
                  {tp('Synchronise les commandes avec votre catalogue')}
                </p>
              </div>

              {/* Export */}
              {isEdit && (
                <div className="bg-card rounded-xl border shadow-sm p-4">
                  <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-3">{tp('Export')}</h3>
                  <button type="button" onClick={handleExportProductCsv} disabled={csvBusy}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-background transition disabled:opacity-50 font-medium">
                    {csvBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Exporter en CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}

      <DigitalProductEbookModal
        open={showDigitalProductModal}
        productName={form.name}
        existingEbook={form._pageData?.ebook || form.productPageConfig?.ebook || null}
        loading={digitalProductLoading}
        error={digitalProductError}
        generatedResult={digitalProductResult}
        onClose={() => {
          if (!digitalProductLoading) {
            setShowDigitalProductModal(false);
            setDigitalProductResult(null);
          }
        }}
        onGenerate={handleGenerateDigitalProduct}
        onRegenerate={() => setDigitalProductResult(null)}
        onSave={async ({ addAsOffer }) => {
          setForm(prev => {
            const ebook = prev._pageData?.ebook || prev.productPageConfig?.ebook;
            if (!ebook) return prev;
            const updatedEbook = { ...ebook, addAsOffer };
            const updatedConfig = prev.productPageConfig
              ? { ...prev.productPageConfig, ebook: updatedEbook, digitalProductOfferEnabled: addAsOffer }
              : prev.productPageConfig;
            return {
              ...prev,
              _pageData: { ...(prev._pageData || {}), ebook: updatedEbook },
              productPageConfig: updatedConfig,
            };
          });
          setShowDigitalProductModal(false);
          // Persist immediately so the public page reflects the change
          try {
            const currentEbook = form._pageData?.ebook || form.productPageConfig?.ebook;
            if (currentEbook && id) {
              const updatedEbook = { ...currentEbook, addAsOffer };
              const updatedConfig = form.productPageConfig
                ? { ...form.productPageConfig, ebook: updatedEbook, digitalProductOfferEnabled: addAsOffer }
                : undefined;
              await storeProductsApi.updateProduct(id, {
                _pageData: { ...(form._pageData || {}), ebook: updatedEbook },
                ...(updatedConfig && { productPageConfig: updatedConfig }),
              });
              clearPublicStoreSessionCaches();
            }
          } catch {
            showToast('error', 'Impossible de sauvegarder la préférence');
          }
        }}
        onDelete={() => {
          if (!window.confirm("Supprimer l'ebook ? Cette action est irréversible.")) return;
          setForm(prev => {
            const newPageData = { ...(prev._pageData || {}) };
            delete newPageData.ebook;
            const newConfig = prev.productPageConfig ? { ...prev.productPageConfig } : prev.productPageConfig;
            if (newConfig) delete newConfig.ebook;
            return { ...prev, _pageData: newPageData, productPageConfig: newConfig };
          });
          setShowDigitalProductModal(false);
        }}
      />

      {showAlibabaModal && (
        <AlibabaImportModal onClose={() => setShowAlibabaModal(false)} onApply={handleAlibabaApply} />
      )}

      {/* AI Generation Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{tp('Générer avec l\'IA')}</h3>
                  <p className="text-[11px] text-muted-foreground">{tp('Fiche produit complète en quelques secondes')}</p>
                </div>
              </div>
              <button type="button" onClick={() => { setShowAiModal(false); setAiGenerated(null); setAiError(''); }}
                className="p-1.5 hover:bg-muted rounded-lg transition">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex gap-2">
                {[{ id: 'description', label: 'Description', icon: <FileText className="w-3.5 h-3.5" /> }, { id: 'url', label: 'URL source', icon: <Globe className="w-3.5 h-3.5" /> }].map(tab => (
                  <button key={tab.id} type="button" onClick={() => setAiInputType(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition ${
                      aiInputType === tab.id
                        ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                        : 'border-border text-muted-foreground hover:bg-background'
                    }`}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {aiInputType === 'description' ? (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2">{tp('Décrivez votre produit')}</label>
                  <textarea autoFocus value={aiInput} onChange={(e) => setAiInput(e.target.value)}
                    placeholder={tp('Ex: Robe en wax africain 100% coton, taille 38-42, disponible en rouge/bleu/vert, produite artisanalement au Cameroun…')}
                    rows={5} className={textareaCls} />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2">{tp('URL de la source produit')}</label>
                  <input autoFocus type="url" value={aiInput} onChange={(e) => setAiInput(e.target.value)}
                    placeholder="https://www.alibaba.com/product/..." className={inputCls} />
                  <p className="text-[11px] text-muted-foreground mt-1">{tp('Alibaba, Amazon, AliExpress, site fournisseur…')}</p>
                </div>
              )}

              {aiError && (
                <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {aiError}
                </div>
              )}

              {aiGenerated && (
                <div className="border border-violet-200 bg-violet-50 rounded-xl p-4 space-y-3">
                  <p className="text-[11px] font-bold text-violet-600 uppercase tracking-wide">{tp('Prévisualisation')}</p>
                  <div><p className="text-[11px] text-muted-foreground mb-0.5">{tp('Nom')}</p><p className="text-sm font-bold text-foreground">{aiGenerated.name}</p></div>
                  {aiGenerated.category && <div><p className="text-[11px] text-muted-foreground mb-0.5">{tp('Catégorie')}</p><p className="text-sm text-foreground">{aiGenerated.category}</p></div>}
                  {aiGenerated.suggestedPrice > 0 && <div><p className="text-[11px] text-muted-foreground mb-0.5">{tp('Prix suggéré')}</p><p className="text-sm font-bold text-primary">{aiGenerated.suggestedPrice.toLocaleString()} XAF</p></div>}
                  <div><p className="text-[11px] text-muted-foreground mb-0.5">{tp('Description')}</p><p className="text-sm text-muted-foreground line-clamp-3">{aiGenerated.description}</p></div>
                  {aiGenerated.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {aiGenerated.tags.map((t, i) => <span key={i} className="px-2 py-0.5 bg-card border border-violet-200 text-violet-700 text-[11px] rounded-full font-medium">{t}</span>)}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-border flex gap-3">
              {!aiGenerated ? (
                <button type="button" onClick={handleAiGenerate} disabled={!aiInput.trim() || aiGenerating}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 transition shadow-sm">
                  {aiGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> {tp('Génération…')}</> : <><Sparkles className="w-4 h-4" /> {tp('Générer')}</>}
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => { setAiGenerated(null); setAiError(''); }}
                    className="px-4 py-2.5 border border-border text-sm font-semibold text-muted-foreground rounded-xl hover:bg-background transition">
                    {tp('Regénérer')}
                  </button>
                  <button type="button" onClick={applyAiGenerated}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-700 transition shadow-sm">
                    <CheckCircle className="w-4 h-4" /> Appliquer
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product Picker Modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">{tp('Choisir un produit du catalogue')}</h3>
              <button type="button" onClick={() => setShowPicker(false)} className="p-1.5 hover:bg-muted rounded-lg transition">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" autoFocus value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder={tp('Rechercher un produit…')}
                  className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {pickerLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 rounded-full border-2 border-border border-t-primary-600 animate-spin" />
                </div>
              ) : pickerProducts.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  {pickerSearch ? 'Aucun produit trouvé' : tp('Aucun produit dans le catalogue')}
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {pickerProducts.map(p => (
                    <li key={p._id}>
                      <button type="button" onClick={() => handlePickProduct(p)}
                        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-primary-50 text-left transition group">
                        <div>
                          <p className="text-sm font-semibold text-foreground group-hover:text-primary-800">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{p.status} · stock {p.stock}</p>
                        </div>
                        <span className="text-sm font-bold text-primary ml-3 flex-shrink-0">
                          {p.sellingPrice?.toLocaleString()} XAF
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreProductForm;
