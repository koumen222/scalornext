import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@/lib/router-compat';
import ecomApi from '../services/ecommApi.js';
import { tp } from '../i18n/platform.js';

const ClientForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    source: 'other',
    status: 'prospect',
    notes: '',
    tags: ''
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      const load = async () => {
        try {
          const res = await ecomApi.get(`/clients/${id}`);
          const c = res.data.data;
          setFormData({
            firstName: c.firstName || '',
            lastName: c.lastName || '',
            phone: c.phone || '',
            email: c.email || '',
            city: c.city || '',
            address: c.address || '',
            source: c.source || 'other',
            status: c.status || 'prospect',
            notes: c.notes || '',
            tags: (c.tags || []).join(', ')
          });
        } catch {
          setError('Client introuvable');
        } finally {
          setFetchLoading(false);
        }
      };
      load();
    }
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.firstName.trim()) {
      setError(tp('Le prénom est requis'));
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      };

      if (isEdit) {
        await ecomApi.put(`/clients/${id}`, payload);
      } else {
        await ecomApi.post('/clients', payload);
      }

      navigate('/ecom/clients');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const inputClass = "block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {isEdit ? 'Modifier le client' : tp('Nouveau client')}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEdit ? 'Modifiez les informations du client' : tp('Ajoutez un nouveau client ù  votre base')}
          </p>
        </div>
        <button
          onClick={() => navigate('/ecom/clients')}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
        >
          {tp('Annuler')}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        {/* Identité */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">{tp('Identité')}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className={labelClass}>{tp('Prénom *')}</label>
              <input id="firstName" name="firstName" type="text" required value={formData.firstName} onChange={handleChange} className={inputClass} placeholder={tp('Prénom du client')} />
            </div>
            <div>
              <label htmlFor="lastName" className={labelClass}>{tp('Nom')}</label>
              <input id="lastName" name="lastName" type="text" value={formData.lastName} onChange={handleChange} className={inputClass} placeholder={tp('Nom de famille')} />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">{tp('Contact')}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="phone" className={labelClass}>{tp('Téléphone')}</label>
              <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} className={inputClass} placeholder="+225 07 00 00 00" />
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>Email</label>
              <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className={inputClass} placeholder={tp('client@email.com')} />
            </div>
            <div>
              <label htmlFor="city" className={labelClass}>{tp('Ville')}</label>
              <input id="city" name="city" type="text" value={formData.city} onChange={handleChange} className={inputClass} placeholder={tp('Abidjan, Douala...')} />
            </div>
            <div>
              <label htmlFor="address" className={labelClass}>{tp('Adresse')}</label>
              <input id="address" name="address" type="text" value={formData.address} onChange={handleChange} className={inputClass} placeholder={tp('Adresse de livraison')} />
            </div>
          </div>
        </div>

        {/* Infos */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">{tp('Informations')}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="source" className={labelClass}>{tp('Source')}</label>
              <select id="source" name="source" value={formData.source} onChange={handleChange} className={inputClass}>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="site">{tp('Site web')}</option>
                <option value="referral">{tp('Parrainage')}</option>
                <option value="other">{tp('Autre')}</option>
              </select>
            </div>
            <div>
              <label htmlFor="status" className={labelClass}>{tp('Statut')}</label>
              <select id="status" name="status" value={formData.status} onChange={handleChange} className={inputClass}>
                <option value="prospect">{tp('Prospect')}</option>
                <option value="confirmed">{tp('Confirmé')}</option>
                <option value="delivered">{tp('Livré')}</option>
                <option value="returned">{tp('Retour')}</option>
                <option value="blocked">{tp('Bloqué')}</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label htmlFor="tags" className={labelClass}>{tp('Tags (séparés par des virgules)')}</label>
            <input id="tags" name="tags" type="text" value={formData.tags} onChange={handleChange} className={inputClass} placeholder={tp('vip, fidèle, nouveau...')} />
          </div>
          <div className="mt-3">
            <label htmlFor="notes" className={labelClass}>{tp('Notes')}</label>
            <textarea id="notes" name="notes" rows={3} value={formData.notes} onChange={handleChange} className={inputClass} placeholder={tp('Notes internes sur ce client...')} />
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium disabled:opacity-50"
          >
            {loading ? (isEdit ? 'Modification...' : 'Création...') : (isEdit ? 'Enregistrer les modifications' : 'Créer le client')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/ecom/clients')}
            className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
          >
            {tp('Annuler')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClientForm;
