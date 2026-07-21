import React from 'react';
import { useNavigate } from '@/lib/router-compat';
import { tp } from '../i18n/platform.js';

const OrderCard = ({
  order,
  expandedId,
  setExpandedId,
  getStatusColor,
  getStatusDot,
  getStatusLabel,
  getClientName,
  getClientPhone,
  getCity,
  getProductName,
  fmt,
  fmtDate,
  onStatusChange,
  onEdit,
  onDelete,
  deletingOrderId,
  isAdmin
}) => {
  const navigate = useNavigate();

  return (
    <div className={`bg-card rounded-xl shadow-sm border-l-4 ${getStatusDot(order.status)} overflow-hidden hover:shadow-md transition-all duration-200`}>
      <div className="p-4 cursor-pointer" onClick={() => navigate(`/ecom/orders/${order._id}`)}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="text-base font-semibold text-foreground truncate">{getClientName(order)}</h3>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getStatusColor(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
              {order.orderId && order.orderId !== `#${order.sheetRowId?.split('_')[1]}` && (
                <span className="text-xs font-mono text-muted-foreground bg-background px-2 py-1 rounded-md border border-border">
                  #{order.orderId}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
              {getClientPhone(order) && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                  {getClientPhone(order)}
                </span>
              )}
              {getCity(order) && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  {getCity(order)}
                </span>
              )}
            </div>

            {getProductName(order) && (
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-primary-100 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                  </svg>
                </div>
                <span className="text-sm text-foreground font-medium">{getProductName(order)}</span>
                {order.quantity > 1 && (
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">ù—{order.quantity}</span>
                )}
              </div>
            )}

            {(order.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {(order.tags || []).map(tag => (
                  <span key={tag} className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                    tag === 'Client' ? 'bg-primary-50 text-primary border-primary-200' :
                    tag === 'En attente' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    tag === 'Annulé' ? 'bg-red-50 text-red-700 border-red-200' :
                    tag === 'Confirmé' ? 'bg-primary-50 text-primary border-primary-200' :
                    tag === 'Expédié' ? 'bg-primary-50 text-primary-800 border-primary-200' :
                    tag === 'Retour' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    'bg-background text-muted-foreground border-border'
                  }`}>{tag}</span>
                ))}
              </div>
            )}
          </div>

          <div className="text-right flex-shrink-0 ml-4">
            {order.price > 0 && (
              <div className="mb-1">
                <p className="text-lg font-bold text-foreground">{fmt(order.price * (order.quantity || 1))}</p>
                {order.quantity > 1 && (
                  <p className="text-xs text-muted-foreground">{fmt(order.price)} unité</p>
                )}
              </div>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <span>{fmtDate(order.date)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expandedId === order._id && (
        <OrderDetails
          order={order}
          onStatusChange={onStatusChange}
          onEdit={onEdit}
          onDelete={onDelete}
          deletingOrderId={deletingOrderId}
          isAdmin={isAdmin}
          getStatusColor={getStatusColor}
          getClientName={getClientName}
          getClientPhone={getClientPhone}
          getCity={getCity}
          getProductName={getProductName}
          fmt={fmt}
          fmtDate={fmtDate}
        />
      )}
    </div>
  );
};

const OrderDetails = ({
  order,
  onStatusChange,
  onEdit,
  onDelete,
  deletingOrderId,
  isAdmin,
  getStatusColor,
  getClientName,
  getClientPhone,
  getCity,
  getProductName,
  fmt,
  fmtDate
}) => {
  const SL = { pending: 'En attente', confirmed: 'Confirmé', shipped: 'Expédié', delivered: 'Livré', returned: 'Retour', cancelled: 'Annulé', unreachable: 'Injoignable', called: 'Appelé', postponed: 'Reporté' };

  return (
    <div className="border-t border-border bg-gradient-to-br from-gray-50 to-gray-100/50 px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">{tp('Détails complets')}</h4>
        <div className="flex items-center gap-2">
          <select
            value={order.status}
            onChange={(e) => {
              if (e.target.value === '__custom') {
                const c = prompt('Entrez le statut personnalisé :');
                if (c && c.trim()) onStatusChange(order._id, c.trim());
              } else onStatusChange(order._id, e.target.value);
            }}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border cursor-pointer transition-all ${getStatusColor(order.status)}`}
          >
            {Object.entries(SL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            {!SL[order.status] && <option value={order.status}>{order.status}</option>}
            <option value="__custom">{tp('+ Personnalisé...')}</option>
          </select>
          {isAdmin && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(order); }}
                className="p-2 text-primary hover:text-primary hover:bg-primary-50 rounded-lg transition-all"
                title={tp('Modifier')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(order._id); }}
                disabled={deletingOrderId === order._id}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title={tp('Supprimer')}
              >
                {deletingOrderId === order._id ? (
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {order.rawData && Object.keys(order.rawData).length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
          {Object.entries(order.rawData).map(([key, val]) => (
            <div key={key} className="bg-card rounded-lg p-3 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{key}</p>
              <p className="text-sm text-foreground break-words" title={typeof val === 'object' ? JSON.stringify(val) : val}>
                {typeof val === 'object' ? JSON.stringify(val) : (val || '—')}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
          <div className="bg-card rounded-lg p-3 border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{tp('Client')}</p>
            <p className="text-sm text-foreground">{getClientName(order)}</p>
          </div>
          <div className="bg-card rounded-lg p-3 border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{tp('Téléphone')}</p>
            <p className="text-sm text-foreground">{getClientPhone(order) || '—'}</p>
          </div>
          <div className="bg-card rounded-lg p-3 border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{tp('Ville')}</p>
            <p className="text-sm text-foreground">{getCity(order) || '—'}</p>
          </div>
          <div className="bg-card rounded-lg p-3 border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{tp('Produit')}</p>
            <p className="text-sm text-foreground">{getProductName(order)}</p>
          </div>
          <div className="bg-card rounded-lg p-3 border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{tp('Prix')}</p>
            <p className="text-sm text-foreground">{order.price ? fmt(order.price) : '—'}</p>
          </div>
          <div className="bg-card rounded-lg p-3 border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{tp('Quantité')}</p>
            <p className="text-sm text-foreground">{order.quantity || 1}</p>
          </div>
          <div className="bg-card rounded-lg p-3 border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{tp('Date')}</p>
            <p className="text-sm text-foreground">{fmtDate(order.date)}</p>
          </div>
          {order.notes && (
            <div className="col-span-2 sm:col-span-3 lg:col-span-4 bg-card rounded-lg p-3 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{tp('Notes')}</p>
              <p className="text-sm text-foreground">{order.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderCard;
