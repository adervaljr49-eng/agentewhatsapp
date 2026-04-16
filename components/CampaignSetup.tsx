import React from 'react';
import { LayoutTemplate, Zap, MessageSquare, Plus, Trash2, RefreshCw } from 'lucide-react';
import { CampaignConfig } from '../types';

interface CampaignSetupProps {
  config: CampaignConfig;
  onConfigChange: (newConfig: CampaignConfig) => void;
  onApplyTemplate: (templates: string[]) => void;
  onError: (message: string) => void;
  contactCount: number;
}

export const CampaignSetup: React.FC<CampaignSetupProps> = ({ 
  config, 
  onConfigChange,
  onApplyTemplate, 
  onError,
  contactCount 
}) => {

  const handleAddTemplate = () => {
    if (config.templates.length < 10) {
      onConfigChange({ ...config, templates: [...config.templates, ''] });
    }
  };

  const handleRemoveTemplate = (index: number) => {
    if (config.templates.length > 1) {
      const newTemplates = config.templates.filter((_, i) => i !== index);
      onConfigChange({ ...config, templates: newTemplates });
    }
  };

  const handleUpdateTemplate = (index: number, value: string) => {
    const newTemplates = [...config.templates];
    newTemplates[index] = value;
    onConfigChange({ ...config, templates: newTemplates });
  };

  // Validação antes de aplicar
  const handleApplyClick = () => {
    const hasContent = config.templates.some(t => t.trim().length > 0);
    if (!hasContent) {
      onError("Por favor, preencha pelo menos uma variação de texto antes de aplicar a campanha.");
      return;
    }
    onApplyTemplate(config.templates);
  };

  if (contactCount === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
          <MessageSquare size={24} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-800">2. Configurar Mensagens</h2>
          <p className="text-xs text-slate-500">Crie variações de texto para seus contatos.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <LayoutTemplate size={16} />
            Variações de Texto ({config.templates.length}/10)
            </label>
            {config.templates.length < 10 && (
            <button 
                onClick={handleAddTemplate}
                className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 px-2 py-1 rounded transition-colors"
            >
                <Plus size={14} /> Adicionar Variação
            </button>
            )}
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {config.templates.map((template, index) => (
            <div key={index} className="relative group">
                <span className="absolute left-3 top-3 text-[10px] font-bold text-slate-400 border border-slate-200 px-1.5 rounded">
                Opção {index + 1}
                </span>
                <textarea
                value={template}
                onChange={(e) => handleUpdateTemplate(index, e.target.value)}
                className="w-full h-24 p-3 pt-8 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm bg-white text-slate-900 resize-none transition-all"
                placeholder={`Digite a variação ${index + 1}... Use {nome} para substituir.`}
                />
                {config.templates.length > 1 && (
                <button
                    onClick={() => handleRemoveTemplate(index)}
                    className="absolute right-2 top-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Remover esta variação"
                >
                    <Trash2 size={14} />
                </button>
                )}
            </div>
            ))}
        </div>

        <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Variáveis Disponíveis:</p>
            <div className="flex flex-wrap gap-2">
                <code className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-blue-600 font-bold">{"{{nome}}"}</code>
                <code className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-blue-600 font-bold">{"{{telefone}}"}</code>
                <code className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-blue-600 font-bold">{"{{contexto}}"}</code>
            </div>
            <p className="mt-2 text-[10px] text-slate-400 italic">
                O sistema substituirá estes códigos pelos dados reais de cada contato.
            </p>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="pt-4 border-t border-slate-100 mt-6">
        <button
          onClick={handleApplyClick}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-lg hover:bg-slate-900 transition-colors font-medium shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-yellow-400" />
            <RefreshCw size={14} className="text-slate-400" />
          </div>
          <div className="text-left">
            <div className="leading-none text-sm font-semibold">Aplicar Campanha</div>
            <div className="text-[10px] text-slate-300 font-normal mt-0.5">Configura texto para {contactCount} contatos.</div>
          </div>
        </button>
      </div>
    </div>
  );
};