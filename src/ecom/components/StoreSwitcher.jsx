import React, { useState, useRef, useEffect } from 'react';
import { Link } from '@/lib/router-compat';
import { useStore } from '../contexts/StoreContext.jsx';
import DeleteStoreModal from './DeleteStoreModal.jsx';
import { tp } from '../i18n/platform.js';

const StoreSwitcher = ({ children }) => {
  const { stores, activeStore, switchStore } = useStore();
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if ((!stores || stores.length === 0) && !children) return null;

  const hasStores = stores && stores.length > 0;
  const displayName = activeStore?.storeSettings?.storeName || activeStore?.name || 'Ma boutique';
  const layoutAccentColor = '#0F6B4F';
  const layoutAccentSoft = '#0F6B4F20';

  return (
    <div ref={ref} className="relative">
      {children ? (
        <button type="button" onClick={() => setOpen(o => !o)} className="w-full text-left cursor-pointer">
          {children}
        </button>
      ) : (
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-background transition-all shadow-sm max-w-[200px]"
      >
        {/* Color dot */}
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: layoutAccentColor }}
        />
        <span className="truncate flex-1 text-left">{displayName}</span>
        {stores.length > 1 && (
          <svg className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 z-50 bg-card rounded-xl shadow-xl border border-border py-1.5 min-w-[220px]">
            <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{tp('Mes boutiques')}</p>
            {!hasStores && (
              <p className="px-3 py-3 text-sm text-muted-foreground text-center">{tp('Aucune boutique')}</p>
            )}
            {hasStores && stores.map(s => {
              const name = s.storeSettings?.storeName || s.name;
              const isActive = s._id === activeStore?._id;
              const canDelete = !s.legacyWorkspaceStore && s._id;

              return (
                <div key={s._id} className="relative group">
                  <button
                    onClick={() => { switchStore(s); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                      isActive ? 'bg-scalor-green/10 text-scalor-green' : 'text-foreground hover:bg-background'
                    }`}
                  >
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: layoutAccentSoft, color: layoutAccentColor }}
                    >
                      {name?.[0]?.toUpperCase() || '?'}
                    </span>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium truncate">{name}</p>
                      {s.subdomain && (
                        <p className="text-xs text-muted-foreground truncate">{s.subdomain}.scalor.net</p>
                      )}
                    </div>
                    {isActive && (
                      <svg className="w-4 h-4 text-scalor-green flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {canDelete && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); setOpen(false); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setDeleteTarget(s); setOpen(false); } }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                        title={tp('Supprimer cette boutique')}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </span>
                    )}
                  </button>
                </div>
              );
            })}

            <div className="border-t border-border mt-1 pt-1">
              {(stores?.length || 0) < 3 ? (
                <Link
                  to={hasStores ? "/ecom/boutique/nouvelle" : "/ecom/boutique/wizard"}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-scalor-green hover:bg-scalor-green/10 transition-colors"
                >
                  <span className="w-7 h-7 rounded-lg bg-scalor-green/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </span>
                  <span className="font-medium">{hasStores ? 'Nouvelle boutique' : tp('Créer une boutique')}</span>
                </Link>
              ) : (
                <p className="px-3 py-2 text-xs text-muted-foreground text-center">{tp('Maximum 3 boutiques atteint')}</p>
              )}
            </div>
          </div>
        </>
      )}

      {deleteTarget && (
        <DeleteStoreModal store={deleteTarget} onClose={() => setDeleteTarget(null)} />
      )}
    </div>
  );
};

export default StoreSwitcher;
