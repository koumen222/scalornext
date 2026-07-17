import React, { useState, useEffect } from 'react';
import { Smartphone, Check, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import ecomApi from '../services/ecommApi.js';
import { tp } from '../i18n/platform.js';
// WhatsAppConfigModal supprimé

const WhatsAppInstanceSelector = ({ onInstanceSelected, selectedInstanceId }) => {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(false); // États config WhatsApp
  const [waConfig, setWaConfig] = useState(null);
  const [showWhatsAppConfig, setShowWhatsAppConfig] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [showInstanceSelector, setShowInstanceSelector] = useState(false);
  const [error, setError] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const loadInstances = async () => {
    try {
      setLoading(true);
      const user = (() => { try { return JSON.parse(localStorage.getItem('ecomUser') || '{}'); } catch { return {}; } })();
      const userId = user._id || user.id;
      
      const response = await ecomApi.get(`/v1/external/whatsapp/instances?userId=${userId}`);
      if (response.data.success) {
        setInstances(response.data.instances);
      }
    } catch (err) {
      setError('Erreur chargement des instances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstances();
  }, []);

  const handleInstanceSelect = (instance) => {
    onInstanceSelected(instance);
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">{tp('Chargement...')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-red-200 rounded-lg p-4">
        <div className="flex items-center text-red-600">
          <AlertCircle className="w-4 h-4 mr-2" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4" data-instance-selector>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center">
          <Smartphone className="w-4 h-4 mr-2" />
          {tp('Instance WhatsApp')}
        </h3>
        <button
          onClick={() => setShowRegisterModal(true)}
          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition flex items-center"
        >
          <Plus className="w-3 h-3 mr-1" />
          {tp('Nouvelle')}
        </button>
      </div>

      {instances.length === 0 ? (
        <div className="text-center py-6">
          <Smartphone className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">{tp('Aucune instance enregistrée')}</p>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="text-xs bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition"
          >
            {tp('Enregistrer une instance')}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {instances.map((instance) => (
            <div
              key={instance._id}
              onClick={() => handleInstanceSelect(instance)}
              className={`p-3 border rounded-lg cursor-pointer transition ${
                selectedInstanceId === instance._id
                  ? 'border-green-500 bg-green-50'
                  : 'border-border hover:border-gray-300 hover:bg-background'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Smartphone className="w-4 h-4 text-muted-foreground mr-2" />
                  <div>
                    <div className="text-sm font-medium text-foreground">{instance.customName || instance.instanceName}</div>
                    <div className="text-xs text-muted-foreground">{instance.instanceName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    instance.status === 'connected' || instance.status === 'active'
                      ? 'bg-green-100 text-green-700' 
                      : instance.status === 'configured'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {instance.status === 'connected' || instance.status === 'active' ? 'Connecté' : instance.status === 'configured' ? 'Configuré' : tp('Déconnecté')}
                  </span>
                  {selectedInstanceId === instance._id && (
                    <Check className="w-4 h-4 text-green-600" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal d'enregistrement supprimé - rediriger vers la page de connexion */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card rounded-xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold mb-4">{tp('Configuration requise')}</h2>
            <p className="text-muted-foreground mb-6 text-sm">{tp('Veuillez configurer vos instances dans la page "Connexion WhatsApp" de la barre latérale.')}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowRegisterModal(false)} className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg">{tp('Fermer')}</button>
              <a href="/ecom/whatsapp/instances" className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-center">{tp('Y aller')}</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppInstanceSelector;
