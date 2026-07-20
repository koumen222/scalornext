import React, { useState, useCallback, useMemo } from 'react';
import { tp } from '../i18n/platform.js';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { BLOCK_TYPES, BLOCK_CATEGORIES, DEFAULT_EMPTY_SECTIONS } from '../data/exampleSections';
import {
  Plus, GripVertical, Eye, EyeOff, Edit3, Copy, Trash2, 
  Move, Type, Image, Star, HelpCircle, Phone, MousePointer,
  X, Settings, Save
} from 'lucide-react';

// Drag and drop item types
const ItemTypes = {
  BLOCK: 'block',
  SECTION: 'section',
};

// Block type icons mapping
const BLOCK_ICONS = {
  hero: '🎯',
  products: '🛍️',
  text: '📝',
  image: '🖼️',
  testimonials: '⭐',
  faq: '❓',
  contact: '📞',
  button: '🔘',
  spacer: '📏'
};

// Draggable block item from sidebar
function DraggableBlock({ blockType, blockInfo }) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.BLOCK,
    item: { type: blockType, blockInfo },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className={`p-3 bg-card border border-border rounded-lg cursor-move hover:border-blue-300 hover:shadow-sm transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{BLOCK_ICONS[blockType]}</span>
        <span className="text-sm font-medium text-foreground">{blockInfo.name}</span>
      </div>
      <p className="text-xs text-muted-foreground">{blockInfo.description}</p>
    </div>
  );
}

// Section item in the canvas
function SectionItem({ section, index, moveSection, onToggleVisibility, onEdit, onDuplicate, onDelete }) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.SECTION,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: ItemTypes.SECTION,
    hover: (draggedItem) => {
      if (draggedItem.index !== index) {
        moveSection(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  const blockInfo = BLOCK_TYPES[section.type];

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`group relative bg-card border border-border rounded-lg overflow-hidden ${
        isDragging ? 'opacity-50' : ''
      } ${!section.visible ? 'opacity-60 bg-background' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
          <span className="text-lg">{BLOCK_ICONS[section.type]}</span>
          <div>
            <h4 className="text-sm font-medium text-foreground">
              {blockInfo?.name || section.type}
            </h4>
            <p className="text-xs text-muted-foreground">
              {section.config?.title || 'Section sans titre'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onToggleVisibility(index)}
            className="p-1.5 hover:bg-muted rounded transition"
            title={section.visible ? 'Masquer' : 'Afficher'}
          >
            {section.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onEdit(index)}
            className="p-1.5 hover:bg-muted rounded transition"
            title={tp('Modifier')}
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDuplicate(index)}
            className="p-1.5 hover:bg-muted rounded transition"
            title={tp('Dupliquer')}
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(index)}
            className="p-1.5 hover:bg-red-100 text-red-600 rounded transition"
            title={tp('Supprimer')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview content */}
      <div className="p-4 bg-background">
        <SectionPreview section={section} />
      </div>
    </div>
  );
}

// Simple section preview component
function SectionPreview({ section }) {
  const { type, config } = section;

  switch (type) {
    case 'hero':
      return (
        <div className="text-center">
          <h3 className="text-lg font-bold mb-1">{config?.title || 'Titre Hero'}</h3>
          <p className="text-sm text-muted-foreground mb-2">{config?.subtitle || 'Sous-titre'}</p>
          <div className="inline-block px-3 py-1 bg-blue-500 text-white text-xs rounded">
            {config?.ctaText || 'Bouton CTA'}
          </div>
        </div>
      );
    case 'products':
      return (
        <div>
          <h4 className="font-medium mb-2">{config?.title || 'Nos Produits'}</h4>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2].map(i => (
              <div key={i} className="bg-card border border-border rounded p-2">
                <div className="bg-gray-200 h-12 mb-1 rounded"></div>
                <p className="text-xs font-medium">Produit {i}</p>
                <p className="text-xs text-muted-foreground">{tp('Prix')}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case 'text':
      return (
        <div>
          <h4 className="font-medium mb-2">{config?.title || 'Titre de section'}</h4>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {config?.content || 'Contenu de la section texte. Lorem ipsum dolor sit amet, consectetur adipiscing elit.'}
          </p>
        </div>
      );
    case 'testimonials':
      return (
        <div>
          <h4 className="font-medium mb-2">{config?.title || 'Témoignages'}</h4>
          <div className="bg-card border border-border rounded p-2">
            <div className="flex items-center gap-1 mb-1">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
            </div>
            <p className="text-xs text-muted-foreground">{tp('Excellent service !')}</p>
            <p className="text-xs font-medium mt-1">{tp('Client satisfait')}</p>
          </div>
        </div>
      );
    case 'faq':
      return (
        <div>
          <h4 className="font-medium mb-2">{config?.title || 'Questions fréquentes'}</h4>
          <div className="space-y-1">
            <div className="bg-card border border-border rounded p-2">
              <p className="text-xs font-medium">{tp('Question exemple ?')}</p>
              <p className="text-xs text-muted-foreground mt-1">{tp('Réponse à la question...')}</p>
            </div>
          </div>
        </div>
      );
    case 'contact':
      return (
        <div>
          <h4 className="font-medium mb-2">{config?.title || 'Contact'}</h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="w-3 h-3" />
            <span>{config?.whatsapp || '+237 6XX XXX XXX'}</span>
          </div>
        </div>
      );
    default:
      return (
        <div className="text-center text-xs text-muted-foreground">
          Aperçu de {type}
        </div>
      );
  }
}

// Drop zone for adding new blocks
function DropZone({ onDrop, isEmpty = false }) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.BLOCK,
    drop: (item) => {
      onDrop(item.type, item.blockInfo);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const isActive = isOver && canDrop;

  if (isEmpty) {
    return (
      <div
        ref={drop}
        className={`h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors ${
          isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-background'
        }`}
      >
        <div className="text-center">
          <div className="text-4xl mb-3">🎨</div>
          <h3 className="text-lg font-medium text-foreground mb-2">{tp('Page vide')}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Faites glisser des blocs depuis la sidebar pour commencer à construire votre page
          </p>
          {isActive && (
            <p className="text-sm font-medium text-blue-600">
              Relâchez pour ajouter le bloc
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={drop}
      className={`h-12 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${
        isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}
    >
      {isActive ? (
        <span className="text-sm font-medium text-blue-600">{tp('Relâchez pour ajouter')}</span>
      ) : (
        <Plus className="w-4 h-4 text-muted-foreground" />
      )}
    </div>
  );
}

// Section edit modal (simplified)
function SectionEditModal({ section, onClose, onSave }) {
  const [config, setConfig] = useState(section?.config || {});

  const handleSave = () => {
    onSave({ ...section, config });
    onClose();
  };

  if (!section) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">
            Modifier {BLOCK_TYPES[section.type]?.name || section.type}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-96 overflow-y-auto">
          {section.type === 'hero' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{tp('Titre')}</label>
                <input
                  type="text"
                  value={config.title || ''}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{tp('Sous-titre')}</label>
                <input
                  type="text"
                  value={config.subtitle || ''}
                  onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{tp('Texte du bouton')}</label>
                <input
                  type="text"
                  value={config.ctaText || ''}
                  onChange={(e) => setConfig({ ...config, ctaText: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          )}

          {section.type === 'text' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{tp('Titre')}</label>
                <input
                  type="text"
                  value={config.title || ''}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{tp('Contenu')}</label>
                <textarea
                  value={config.content || ''}
                  onChange={(e) => setConfig({ ...config, content: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          )}

          {section.type === 'contact' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{tp('Titre')}</label>
                <input
                  type="text"
                  value={config.title || ''}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">WhatsApp</label>
                <input
                  type="text"
                  value={config.whatsapp || ''}
                  onChange={(e) => setConfig({ ...config, whatsapp: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder={tp('+237 6XX XXX XXX')}
                />
              </div>
            </div>
          )}

          {/* Add more section types as needed */}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition"
          >
            <Save className="w-4 h-4 mr-2 inline" />
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}

// Main PageBuilder component
const PageBuilder = ({ sections = [], onUpdateSections }) => {
  const [editingSection, setEditingSection] = useState(null);

  // Generate unique ID for new sections
  const generateId = () => `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add new block to sections
  const addBlock = useCallback((blockType, blockInfo) => {
    const newSection = {
      id: generateId(),
      type: blockType,
      visible: true,
      config: { ...blockInfo.defaultConfig },
    };
    
    onUpdateSections([...sections, newSection]);
  }, [sections, onUpdateSections]);

  // Move section to new position
  const moveSection = useCallback((fromIndex, toIndex) => {
    const newSections = [...sections];
    const [moved] = newSections.splice(fromIndex, 1);
    newSections.splice(toIndex, 0, moved);
    onUpdateSections(newSections);
  }, [sections, onUpdateSections]);

  // Toggle section visibility
  const toggleVisibility = useCallback((index) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], visible: !newSections[index].visible };
    onUpdateSections(newSections);
  }, [sections, onUpdateSections]);

  // Duplicate section
  const duplicateSection = useCallback((index) => {
    const sectionToDuplicate = sections[index];
    const newSection = {
      ...sectionToDuplicate,
      id: generateId(),
    };
    const newSections = [...sections];
    newSections.splice(index + 1, 0, newSection);
    onUpdateSections(newSections);
  }, [sections, onUpdateSections]);

  // Delete section
  const deleteSection = useCallback((index) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette section ?')) {
      const newSections = sections.filter((_, i) => i !== index);
      onUpdateSections(newSections);
    }
  }, [sections, onUpdateSections]);

  // Save edited section
  const saveSection = useCallback((editedSection) => {
    const sectionIndex = sections.findIndex(s => s.id === editedSection.id);
    if (sectionIndex !== -1) {
      const newSections = [...sections];
      newSections[sectionIndex] = editedSection;
      onUpdateSections(newSections);
    }
  }, [sections, onUpdateSections]);

  // Group blocks by category
  const blocksByCategory = useMemo(() => {
    return BLOCK_CATEGORIES.reduce((acc, category) => {
      acc[category.id] = Object.entries(BLOCK_TYPES).filter(
        ([type, info]) => info.category.toLowerCase().replace(' ', '-') === category.id
      );
      return acc;
    }, {});
  }, []);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-full">
        {/* Sidebar with blocks */}
        <div className="w-80 bg-card border-r border-border flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">{tp('Blocs disponibles')}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Faites glisser les blocs vers la page pour les ajouter
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {BLOCK_CATEGORIES.map((category) => (
              <div key={category.id}>
                <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.name}
                </h3>
                <div className="space-y-2">
                  {blocksByCategory[category.id]?.map(([blockType, blockInfo]) => (
                    <DraggableBlock 
                      key={blockType} 
                      blockType={blockType} 
                      blockInfo={blockInfo} 
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas area */}
        <div className="flex-1 bg-background overflow-y-auto">
          <div className="p-6">
            <div className="max-w-2xl mx-auto space-y-4">
              {sections.length === 0 ? (
                <DropZone onDrop={addBlock} isEmpty />
              ) : (
                <>
                  {sections.map((section, index) => (
                    <SectionItem
                      key={section.id}
                      section={section}
                      index={index}
                      moveSection={moveSection}
                      onToggleVisibility={toggleVisibility}
                      onEdit={() => setEditingSection(section)}
                      onDuplicate={duplicateSection}
                      onDelete={deleteSection}
                    />
                  ))}
                  <DropZone onDrop={addBlock} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Edit modal */}
        {editingSection && (
          <SectionEditModal
            section={editingSection}
            onClose={() => setEditingSection(null)}
            onSave={saveSection}
          />
        )}
      </div>
    </DndProvider>
  );
};

export default PageBuilder;
