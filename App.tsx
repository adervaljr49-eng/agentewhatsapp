import React, { useState, useEffect, useRef } from 'react';
import { Contact, ContactStatus, CampaignConfig, AppBackup, AutomationSettings } from './types';
import { Importer } from './components/Importer';
import { CampaignSetup } from './components/CampaignSetup';
import { Dashboard } from './components/Dashboard';
import { TutorialModal } from './components/TutorialModal';
import { MessageSquare, Info, ShieldAlert, X, Trash2, Download, Upload, BookOpen, LogOut, LogIn, Lock, Settings, Users, Menu, LayoutDashboard } from 'lucide-react';
import { WhatsAppConnector } from './components/WhatsAppConnector';

const cleanObject = (obj: any) => {
  const newObj: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== null && obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
  });
  return newObj;
};

const App: React.FC = () => {
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);
  const [user, setUser] = useState<any>(null); // Keep user state for now to avoid breaking other parts, but nullify it
  const [isAuthReady, setIsAuthReady] = useState(true); // Always ready now
  const [isLocalAdmin, setIsLocalAdmin] = useState(false); // Changed to false
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLocalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUser === 'admin' && loginPass === 'fvxE3535@@@') {
      setIsLocalAdmin(true);
      setLoginError('');
    } else {
      setLoginError('Usuário ou senha incorretos.');
    }
  };

  const [contacts, setContacts] = useState<Contact[]>(() => {
    try {
      const saved = localStorage.getItem('whatsagent_contacts');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Use a ref to store the Map for faster updates without O(N) map building
  const contactsMapRef = useRef<Map<string, Contact>>(new Map());

  // Initialize the Map ref from the initial state
  useEffect(() => {
    if (contacts.length > 0 && contactsMapRef.current.size === 0) {
      contacts.forEach(c => contactsMapRef.current.set(c.id, c));
    }
  }, []);

  // Save contacts to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('whatsagent_contacts', JSON.stringify(contacts));
  }, [contacts]);

  // Inicializa configuração da campanha do localStorage (Backup Completo)
  const [campaignConfig, setCampaignConfig] = useState<CampaignConfig>(() => {
    try {
      const saved = localStorage.getItem('whatsagent_campaign_config');
      return saved ? JSON.parse(saved) : {
        goal: '',
        tone: '',
        templates: ['Olá {nome}, tudo bem? Gostaria de falar sobre...']
      };
    } catch {
      return {
        goal: '',
        tone: '',
        templates: ['']
      };
    }
  });

  const [automationSettings, setAutomationSettings] = useState<AutomationSettings>(() => {
    try {
      const saved = localStorage.getItem('whatsagent_automation_settings');
      return saved ? JSON.parse(saved) : {
        timeUnit: 'seconds',
        minInterval: 8,
        maxInterval: 15,
        batchSize: 200,
        longPauseDuration: 60,
        scheduledStartTime: '',
        scheduledEndTime: '',
        campaignSchedule: ''
      };
    } catch {
      return {
        timeUnit: 'seconds',
        minInterval: 8,
        maxInterval: 15,
        batchSize: 200,
        longPauseDuration: 60,
        scheduledStartTime: '',
        scheduledEndTime: '',
        campaignSchedule: ''
      };
    }
  });

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings' | 'users'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const backupInputRef = useRef<HTMLInputElement>(null);
  
  const [importStats, setImportStats] = useState<{ imported: number, duplicates: number } | null>(null);

  // Auth Listener - REMOVED
  useEffect(() => {
    setUser(null);
    setIsAuthReady(true);
    // setIsLocalAdmin(true); // Removed
  }, []);

  const formatErrorMessage = (err: any) => {
    let message = "Ocorreu um erro inesperado.";
    try {
      const errData = JSON.parse(err.message);
      if (errData.error.includes("resource-exhausted") || errData.error.includes("Quota exceeded")) {
        message = "Limite de uso do banco de dados atingido (Quota Exceeded). O limite gratuito do Firebase foi excedido para hoje. O serviço voltará ao normal amanhã ou você pode fazer upgrade para o plano Blaze no console do Firebase.";
      } else if (errData.error.includes("permission-denied")) {
        message = "Permissão negada no banco de dados. Verifique se você está logado corretamente.";
      } else if (errData.error.includes("client is offline") || errData.error.includes("offline")) {
        message = "Você está offline ou o banco de dados está inacessível. Verifique sua conexão com a internet.";
      } else {
        message = `Erro no banco de dados: ${errData.error}`;
      }
    } catch {
      if (err.message && (err.message.includes("client is offline") || err.message.includes("offline"))) {
        message = "Você está offline ou o banco de dados está inacessível. Verifique sua conexão com a internet.";
      } else {
        message = err.message || String(err);
      }
    }
    return message;
  };

  // Funções de atualização persistente
  const updateCampaignConfig = async (newConfig: CampaignConfig) => {
    setCampaignConfig(newConfig);
    localStorage.setItem('whatsagent_campaign_config', JSON.stringify(newConfig));
  };

  const updateAutomationSettings = async (newSettings: AutomationSettings) => {
    setAutomationSettings(newSettings);
    localStorage.setItem('whatsagent_automation_settings', JSON.stringify(newSettings));
  };

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 15000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Abre tutorial na primeira visita (se não tiver contatos)
  useEffect(() => {
      const hasSeenTutorial = localStorage.getItem('whatsagent_tutorial_seen');
      if (!hasSeenTutorial && contacts.length === 0) {
          setShowTutorial(true);
          localStorage.setItem('whatsagent_tutorial_seen', 'true');
      }
  }, []);

  // --- GERENCIAMENTO DE DADOS ---

  const handleClearContacts = () => {
    if (contacts.length === 0) {
        setSuccessMsg("A lista já está vazia.");
        return;
    }
    
    setTimeout(async () => {
        const confirm = window.confirm(
          "Tem certeza que deseja LIMPAR A LISTA de contatos?\n\nAs configurações da campanha (textos) serão mantidas, mas todos os contatos e status de envio serão apagados."
        );
    
        if (confirm) {
          try {
             localStorage.removeItem('whatsagent_contacts');
             contactsMapRef.current.clear();
          } catch(e) { console.error(e); }

          setContacts([]);
          setImportStats(null);
          setSuccessMsg("Lista de contatos limpa com sucesso. Você pode importar uma nova lista agora.");
        }
    }, 100);
  };

  const handleExportBackup = () => {
    const backupData: AppBackup = {
      version: 1,
      date: new Date().toISOString(),
      contacts: contacts,
      campaignConfig: campaignConfig
    };

    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `whatsagent-backup-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSuccessMsg("Backup completo (Contatos + Configurações) baixado com sucesso!");
  };

  const handleDownloadProject = async () => {
    try {
      setSuccessMsg("Preparando download do projeto completo (código fonte)...");
      const response = await fetch('/api/download-project');
      if (!response.ok) throw new Error('Falha ao baixar projeto');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'whatsagent-ai-completo.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccessMsg("Projeto completo (.zip) baixado com sucesso! Ideal para desenvolvedores.");
    } catch (err) {
      console.error(err);
      setError("Erro ao baixar o projeto. Tente novamente.");
    }
  };

  const handleDownloadHosting = async () => {
    try {
      setSuccessMsg("Preparando arquivos para hospedagem (HTML/JS/CSS)...");
      const response = await fetch('/api/download-dist');
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Falha ao baixar arquivos de hospedagem');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'whatsagent-ai-hospedagem.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccessMsg("Arquivos para hospedagem (.zip) baixados com sucesso! Basta extrair o conteúdo e subir para o seu servidor (FTP/Host).");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao baixar arquivos de hospedagem. Tente novamente.");
    }
  };

  const handleRestoreBackupClick = () => {
    backupInputRef.current?.click();
  };

  const handleRestoreBackupFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content);

        let newContacts: Contact[] = [];
        let newConfig: CampaignConfig | null = null;

        if (Array.isArray(parsedData)) {
           newContacts = parsedData;
        } else if (parsedData.contacts && Array.isArray(parsedData.contacts)) {
           newContacts = parsedData.contacts;
           if (parsedData.campaignConfig) {
             newConfig = parsedData.campaignConfig;
           }
        } else {
           throw new Error("Formato inválido");
        }

        const isValid = newContacts.every(c => c.id && c.name && c.phone && c.status);
        
        if (isValid) {
          if (contacts.length > 0) {
              const confirmReplace = window.confirm("Isso irá SUBSTITUIR sua lista atual e configurações pelos dados do backup. Deseja continuar?");
              if (!confirmReplace) return;
          }
          
          setContacts(newContacts);
          if (newConfig) {
            setCampaignConfig(newConfig);
          }
          
          setSuccessMsg(`Backup restaurado! ${newContacts.length} contatos carregados${newConfig ? ' e configurações aplicadas' : ''}.`);
          setError(null);
        } else {
          setError("O arquivo não contém uma lista de contatos válida.");
        }
      } catch (err) {
        console.error(err);
        setError("Erro ao ler arquivo. Certifique-se de que é um JSON de backup válido.");
      }
    };
    reader.readAsText(file);
    if (backupInputRef.current) backupInputRef.current.value = '';
  };

  // --- LÓGICA DA APP ---

  const handleImport = async (newContacts: Contact[]) => {
    setError(null);
    setSuccessMsg(null);
    setImportStats(null);

    const existingPhones = new Set(contacts.map(c => c.phone.replace(/\D/g, '')));
    
    const uniqueNewContacts = newContacts.filter(contact => {
      const cleanPhone = contact.phone.replace(/\D/g, '');
      if (existingPhones.has(cleanPhone)) return false;
      existingPhones.add(cleanPhone);
      return true;
    });

    const duplicatesCount = newContacts.length - uniqueNewContacts.length;
    setImportStats({ imported: uniqueNewContacts.length, duplicates: duplicatesCount });

    if (uniqueNewContacts.length === 0 && newContacts.length > 0) {
      setError(`Todos os ${newContacts.length} contatos importados já existem na lista.`);
      return;
    }

    if (uniqueNewContacts.length === 0) {
        setError("Nenhum contato válido encontrado.");
        return;
    }

    setContacts(prev => [...prev, ...uniqueNewContacts]);
    setSuccessMsg(`${uniqueNewContacts.length} contatos importados com sucesso.`);
  };

  // Helper para formatar nome (Primeiro nome + Title Case)
  const formatFirstName = (fullName: string): string => {
    if (!fullName) return '';
    
    let nameToProcess = fullName.trim();
    
    // Tratamento para contatos formato "Sobrenome, Nome" (comum em exports de email)
    // Se tiver vírgula, assume que o primeiro nome vem DEPOIS da vírgula.
    if (nameToProcess.includes(',')) {
        const split = nameToProcess.split(',');
        // Pega a segunda parte (Nome) se existir, senão mantém a primeira
        if (split.length > 1 && split[1].trim()) {
            nameToProcess = split[1].trim();
        }
    }

    // Pega o primeiro token da string (separado por espaço)
    const parts = nameToProcess.split(/\s+/);
    const firstName = parts[0];
    
    // Formata Title Case (ex: aderval -> Aderval)
    if (firstName.length > 1) {
        return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    }
    return firstName.toUpperCase();
  };

  const handleApplyTemplate = async (templates: string[]) => {
    const validTemplates = templates.filter(t => t.trim() !== '');
    if (validTemplates.length === 0) {
      setError("Defina pelo menos uma variação de texto.");
      return;
    }
    
    let templateIndex = 0;
    const updatedContacts = contacts.map(contact => {
      // Não sobrescrever contatos que já foram enviados ou que estão com erro
      if (
        contact.status === ContactStatus.SENT || 
        contact.status === ContactStatus.DELIVERED || 
        contact.status === ContactStatus.READ ||
        contact.status === ContactStatus.ERROR
      ) return contact;

      const currentTemplate = validTemplates[templateIndex % validTemplates.length];
      
      const firstName = formatFirstName(contact.name);
      
      let message = currentTemplate
        .replace(/{{nome}}|{nome}|{{name}}|{name}|{{cliente}}|{cliente}/gi, firstName)
        .replace(/{{telefone}}|{telefone}/gi, contact.phone)
        .replace(/{{contexto}}|{contexto}/gi, contact.context || '');
      
      templateIndex++;
      return { ...contact, generatedMessage: message, status: ContactStatus.READY };
    });

    setContacts(updatedContacts);
    
    setSuccessMsg(validTemplates.length > 1 
      ? `Aplicado ${validTemplates.length} variações rotativas.` 
      : "Modelo aplicado com sucesso.");
    setError(null);
  };

  const handleMarkSent = (id: string) => {
    const sentTime = new Date().toISOString();
    setContacts(prev => prev.map(c => c.id === id ? { ...c, status: ContactStatus.SENT, sentTime } : c));
  };

  const handleUpdateStatus = (id: string, status: ContactStatus) => {
     setContacts(prev => prev.map(c => c.id === id ? { ...c, status: status } : c));
  }

  const handleUpdateMessage = (id: string, newMessage: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, generatedMessage: newMessage, status: ContactStatus.READY } : c));
  };

  if (!isLocalAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-4 shadow-md transform rotate-3">
              <Lock size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Acesso Restrito</h1>
            <p className="text-slate-500 text-sm mt-2 text-center">Insira suas credenciais para acessar o sistema.</p>
          </div>
          <form onSubmit={handleLocalLogin} className="space-y-5">
            {loginError && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 text-center font-medium">
                {loginError}
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Usuário</label>
              <input 
                type="text" 
                value={loginUser} 
                onChange={e => setLoginUser(e.target.value)} 
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white" 
                placeholder="admin" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Senha</label>
              <input 
                type="password" 
                value={loginPass} 
                onChange={e => setLoginPass(e.target.value)} 
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white" 
                placeholder="••••••••" 
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors mt-2 shadow-md hover:shadow-lg"
            >
              Entrar no Sistema
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <TutorialModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} />

      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-600">
            <MessageSquare size={24} strokeWidth={2.5} />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">WhatsAgent AI</h1>
          </div>
          <button className="md:hidden text-slate-500" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <button
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          
          <button
            onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Settings size={18} /> Configurações
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">Admin</p>
                <p className="text-xs text-slate-500 truncate">Modo Local</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 md:hidden flex items-center justify-between p-4">
          <div className="flex items-center gap-2 text-green-600">
            <MessageSquare size={20} strokeWidth={2.5} />
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">WhatsAgent AI</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600">
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === 'dashboard' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="mb-8 flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestor de Campanhas WhatsApp</h1>
                  <p className="text-slate-600 text-lg">
                      Importe contatos, crie modelos personalizados e automatize seus envios.
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start justify-between gap-2 shadow-sm animate-fade-in-slide">
                   <div className="flex items-center gap-2"><Info size={20} className="shrink-0" /> <span>{error}</span></div>
                   <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X size={18} /></button>
                </div>
              )}

              {successMsg && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg flex items-start justify-between gap-2 shadow-sm animate-fade-in-slide">
                   <div className="flex items-center gap-2"><Info size={20} className="shrink-0" /> <span>{successMsg}</span></div>
                   <button onClick={() => setSuccessMsg(null)} className="text-green-600 hover:text-green-800"><X size={18} /></button>
                </div>
              )}

              <Importer onImport={handleImport} />
              
              <CampaignSetup 
                config={campaignConfig}
                onConfigChange={updateCampaignConfig}
                onApplyTemplate={handleApplyTemplate}
                contactCount={contacts.length}
                onError={setError}
              />
              
              <Dashboard 
                contacts={contacts} 
                importStats={importStats}
                onMarkSent={handleMarkSent}
                onUpdateStatus={handleUpdateStatus}
                onUpdateMessage={handleUpdateMessage}
                onRegenerateSingle={() => {}} 
                onClearContacts={handleClearContacts}
                automationSettings={automationSettings}
                onUpdateAutomationSettings={updateAutomationSettings}
                isWhatsAppConnected={isWhatsAppConnected}
                userId={'local-admin'}
              />

              <footer className="max-w-5xl mx-auto px-6 py-8 text-center text-slate-400 text-sm border-t border-slate-200 mt-12 space-y-6">
                <div>
                  <p>Esta ferramenta utiliza a API Click-to-Chat do WhatsApp. Ela abre o WhatsApp Web com texto pré-preenchido.</p>
                  <p className="mt-4 font-bold text-slate-500 uppercase tracking-widest text-xs">Criado por ACDCORP</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 p-6 rounded-xl inline-block text-left mx-auto max-w-lg shadow-sm">
                  <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <ShieldAlert size={18} /> Referência Segura de Envios
                  </h4>
                  <ul className="text-amber-900 space-y-2 text-sm">
                    <li className="flex justify-between items-center border-b border-amber-100 pb-1"><span>Conta nova:</span> <span className="font-bold">30–50 / dia</span></li>
                    <li className="flex justify-between items-center border-b border-amber-100 pb-1"><span>Conta aquecida:</span> <span className="font-bold">100–200 / dia</span></li>
                    <li className="flex justify-between items-center pt-1"><span>Muito aquecida:</span> <span className="font-bold">até 300 / dia</span></li>
                  </ul>
                </div>
              </footer>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Settings className="text-blue-600" /> Configurações do Sistema
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <WhatsAppConnector 
                    userId={'local-admin'} 
                    onStatusChange={(status) => setIsWhatsAppConnected(status === 'connected')}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-start gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                        <Download size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">Código Fonte</h3>
                        <p className="text-sm text-slate-500 mt-1">Baixe o projeto completo em React/Vite para desenvolvedores.</p>
                      </div>
                      <button onClick={handleDownloadProject} className="mt-auto w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors">
                        Baixar .zip
                      </button>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-start gap-4">
                      <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                        <Download size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">Arquivos de Hospedagem</h3>
                        <p className="text-sm text-slate-500 mt-1">Baixe os arquivos HTML/JS/CSS prontos para subir no seu servidor.</p>
                      </div>
                      <button onClick={handleDownloadHosting} className="mt-auto w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium rounded-lg transition-colors border border-emerald-100">
                        Baixar .zip
                      </button>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-start gap-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                        <Download size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">Backup de Dados</h3>
                        <p className="text-sm text-slate-500 mt-1">Salve seus contatos e configurações atuais em um arquivo JSON.</p>
                      </div>
                      <button onClick={handleExportBackup} className="mt-auto w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg transition-colors border border-blue-100">
                        Fazer Backup
                      </button>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-start gap-4">
                      <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
                        <Upload size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">Restaurar Backup</h3>
                        <p className="text-sm text-slate-500 mt-1">Carregue um arquivo JSON de backup para restaurar seus dados.</p>
                      </div>
                      <button onClick={handleRestoreBackupClick} className="mt-auto w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium rounded-lg transition-colors border border-purple-100">
                        Restaurar Dados
                      </button>
                      <input type="file" ref={backupInputRef} onChange={handleRestoreBackupFile} accept=".json" className="hidden" />
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-start gap-4 md:col-span-2">
                      <div className="flex items-center gap-4 w-full">
                        <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center text-yellow-600 shrink-0">
                          <BookOpen size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">Tutorial de Uso</h3>
                          <p className="text-sm text-slate-500 mt-1">Aprenda a usar todas as funcionalidades do sistema.</p>
                        </div>
                        <button onClick={() => setShowTutorial(true)} className="ml-auto px-6 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 font-medium rounded-lg transition-colors border border-yellow-200">
                          Abrir Tutorial
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-start gap-4 md:col-span-2">
                      <div className="flex items-center gap-4 w-full">
                        <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center text-red-600 shrink-0">
                          <Trash2 size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">Limpar Contatos</h3>
                          <p className="text-sm text-slate-500 mt-1">Apaga todos os contatos da lista atual. As configurações são mantidas.</p>
                        </div>
                        <button onClick={handleClearContacts} disabled={contacts.length === 0} className="ml-auto px-6 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-medium rounded-lg transition-colors border border-red-100 disabled:opacity-50">
                          Limpar Lista
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Info size={18} className="text-blue-500" /> Informações da Conta
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-400 uppercase font-bold">Usuário</p>
                        <p className="text-sm text-slate-700">Admin</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase font-bold">E-mail</p>
                        <p className="text-sm text-slate-700">admin@whatsagent.com</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase font-bold">ID do Usuário</p>
                        <p className="text-sm font-mono text-slate-500 truncate">local-admin</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
