import React from 'react';
import { Settings, TrendingUp, MessageSquare, Palette, ListChecks } from 'lucide-react';
import { tp } from '../../i18n/platform.js';

const tabs = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'conversion', label: 'Conversion', icon: TrendingUp },
  { id: 'automation', label: 'Automation', icon: MessageSquare },
  { id: 'design', label: 'Design', icon: Palette },
  { id: 'form', label: 'Form', icon: ListChecks },
];

const Sidebar = ({ activeTab, onTabChange }) => (
  <nav className="w-56 shrink-0 bg-card rounded-2xl border shadow-sm p-3 flex flex-col gap-1 h-fit sticky top-6">
    <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-2">{tp('Product Settings')}</h3>
    {tabs.map(({ id, label, icon: Icon }) => {
      const active = activeTab === id;
      return (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            active
              ? 'bg-[#0F6B4F] text-white shadow-sm'
              : 'text-muted-foreground hover:bg-background hover:text-foreground'
          }`}
        >
          <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
          {label}
        </button>
      );
    })}
  </nav>
);

export default Sidebar;
