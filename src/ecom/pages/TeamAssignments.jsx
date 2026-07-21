import React, { useState } from 'react';
import { useSearchParams } from '@/lib/router-compat';
import { Users, ClipboardList } from 'lucide-react';
import UserManagement from './UserManagement.jsx';
import AssignmentsManager from './AssignmentsManager.jsx';
import { tp } from '../i18n/platform.js';

// Page fusionnée « Équipe & Affectations » : un seul menu, deux onglets.
// L'onglet actif est reflété dans l'URL (?tab=equipe|affectations) pour les
// liens profonds (ex. /ecom/users?tab=affectations).
const TABS = [
  { id: 'equipe', label: 'Équipe', icon: Users },
  { id: 'affectations', label: 'Attributions', icon: ClipboardList },
];

const TeamAssignments = ({ initialTab = 'equipe' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams?.get?.('tab');
  const [tab, setTab] = useState(() =>
    (urlTab === 'affectations' || urlTab === 'equipe') ? urlTab : initialTab,
  );

  const changeTab = (id) => {
    setTab(id);
    try {
      setSearchParams(prev => {
        const p = new URLSearchParams(prev || undefined);
        p.set('tab', id);
        return p;
      }, { replace: true });
    } catch { /* noop */ }
  };

  return (
    <div>
      {/* Barre d'onglets (aligne le style soft de la page Équipe) */}
      <div className="px-4 pt-4 sm:px-6 lg:px-8">
        <div className="flex w-fit gap-1 rounded-full bg-card/60 p-1 ring-1 ring-gray-100">
          {TABS.map(t => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => changeTab(t.id)}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition ${
                  active ? 'bg-primary-50 text-primary shadow-sm shadow-primary-100/50' : 'text-muted-foreground hover:text-muted-foreground'
                }`}
              >
                <Icon size={16} />
                {tp(t.label)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenu de l'onglet */}
      {tab === 'equipe' ? <UserManagement /> : <AssignmentsManager />}
    </div>
  );
};

export default TeamAssignments;
