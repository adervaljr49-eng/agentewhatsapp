import React, { useState } from 'react';
import { X, Upload, MessageSquare, Zap, ShieldAlert, CheckCircle, ChevronRight, FileText } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: "1. Importação",
      icon: <Upload size={20} />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Como importar seus contatos</h3>
          <p className="text-sm text-slate-600">
            O primeiro passo é carregar sua lista. Aceitamos arquivos <strong>.CSV</strong> ou <strong>Excel</strong>.
          </p>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
            <p className="font-semibold mb-2">Formato ideal das colunas:</p>
            <code className="block bg-slate-800 text-green-400 p-3 rounded mb-2 text-xs">
              Nome, Telefone, Contexto (Opcional)<br/>
              João Silva, 11999998888, Cliente Antigo<br/>
              Maria, +5511988887777, Novo Lead
            </code>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 mt-2">
              <li><strong>Brasil:</strong> Se o número tiver 10 ou 11 dígitos, adicionamos +55 automaticamente.</li>
              <li><strong>Internacional:</strong> Use o sinal de <strong>+</strong> antes do código do país (ex: +1...).</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "2. Mensagens",
      icon: <MessageSquare size={20} />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Configurando Mensagens Dinâmicas</h3>
          <p className="text-sm text-slate-600">
            Defina o que será enviado. Você pode criar múltiplas variações para evitar bloqueios.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <FileText size={18} className="mt-0.5 shrink-0" />
              <div>
                <strong>Variáveis Mágicas:</strong><br/>
                Use <code>{'{nome}'}</code> no texto. O sistema substituirá automaticamente pelo primeiro nome do contato (ex: "Olá João" ao invés de "Olá João da Silva").
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
              <Zap size={18} className="mt-0.5 shrink-0" />
              <div>
                <strong>Rotação de Texto (Anti-Spam):</strong><br/>
                Adicione 2 ou 3 variações de texto (ex: "Oi {'{nome}'}!" e "Olá {'{nome}'}, tudo bem?"). O sistema irá alternar entre elas a cada envio para parecer mais humano.
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "3. Disparo",
      icon: <Zap size={20} />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Painel de Controle e Automação</h3>
          <p className="text-sm text-slate-600">
            No Dashboard, você acompanha o status de cada envio.
          </p>
          <ul className="space-y-3 text-sm text-slate-700">
             <li className="flex items-center gap-2">
                <span className="bg-slate-200 p-1 rounded"><Zap size={14} /></span>
                <strong>Envio Rápido:</strong> Abre o WhatsApp Web já com a mensagem pronta. Basta clicar em enviar no Whats.
             </li>
             <li className="flex items-center gap-2">
                <span className="bg-green-100 text-green-700 p-1 rounded"><CheckCircle size={14} /></span>
                <strong>Modo Automático:</strong> O sistema abre as janelas sequencialmente, respeitando intervalos aleatórios.
             </li>
             <li className="flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-700 p-1 rounded"><ShieldAlert size={14} /></span>
                <strong>Pausa de Segurança:</strong> A cada X envios (padrão 10), o sistema faz uma pausa longa (cafézinho) para proteger sua conta.
             </li>
          </ul>
        </div>
      )
    },
    {
      title: "Segurança",
      icon: <ShieldAlert size={20} />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Dicas Anti-Bloqueio</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
             <div className="border p-3 rounded-lg border-red-100 bg-red-50">
                <h4 className="font-bold text-red-800 mb-1">Não faça isso:</h4>
                <ul className="list-disc pl-4 text-red-700 space-y-1">
                   <li>Enviar 500 mensagens no primeiro dia.</li>
                   <li>Usar um chip novo sem "aquecer".</li>
                   <li>Enviar spam para quem não te conhece.</li>
                </ul>
             </div>
             <div className="border p-3 rounded-lg border-green-100 bg-green-50">
                <h4 className="font-bold text-green-800 mb-1">Boas Práticas:</h4>
                <ul className="list-disc pl-4 text-green-700 space-y-1">
                   <li>Comece com 30-50 envios/dia.</li>
                   <li>Aumente gradualmente.</li>
                   <li>Responda as pessoas que retornarem.</li>
                </ul>
             </div>
          </div>
          <p className="text-xs text-slate-500 italic mt-2">
            *O WhatsAgent simula o comportamento humano, mas a responsabilidade pelo conteúdo e frequência é sua.
          </p>
        </div>
      )
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-slide">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 text-white rounded-lg">
                <CheckCircle size={20} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800">Como usar o WhatsAgent</h2>
                <p className="text-xs text-slate-500">Guia rápido de funcionalidades</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-1/3 bg-slate-50 border-r border-slate-100 p-2 space-y-1 overflow-y-auto">
            {steps.map((step, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all text-left ${
                  activeTab === index 
                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className={`${activeTab === index ? 'text-blue-600' : 'text-slate-400'}`}>
                    {step.icon}
                </div>
                <span>{step.title}</span>
                {activeTab === index && <ChevronRight size={14} className="ml-auto opacity-50" />}
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="w-2/3 p-6 overflow-y-auto bg-white">
            <div className="animate-fade-in-slide key-{activeTab}">
               {steps[activeTab].content}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          {activeTab > 0 && (
            <button 
                onClick={() => setActiveTab(p => p - 1)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
                Anterior
            </button>
          )}
          {activeTab < steps.length - 1 ? (
             <button 
                onClick={() => setActiveTab(p => p + 1)}
                className="px-6 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
             >
                Próximo
             </button>
          ) : (
             <button 
                onClick={onClose}
                className="px-6 py-2 text-sm font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm"
             >
                Começar a Usar
             </button>
          )}
        </div>
      </div>
    </div>
  );
};