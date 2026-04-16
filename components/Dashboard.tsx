
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Contact, ContactStatus, AutomationSettings } from '../types';
import { 
  Send, CheckCircle, Clock, Check, CheckCheck, 
  XCircle, Play, Square, Timer, 
  ChevronLeft, ChevronRight, Copy, Search, Filter, X, Zap, Settings, LayoutList, Coffee, Hourglass, Sparkles, UserPlus, Users, Pause, CalendarClock, AlertCircle, TriangleAlert, TrendingUp, Trash2, ExternalLink
} from 'lucide-react';

// WORKER: Mantém o relógio rodando mesmo em background
const WORKER_SCRIPT = `
let timer;
self.onmessage = function(e) {
  if (e.data === 'start') {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      self.postMessage('tick');
    }, 1000);
  } else if (e.data === 'stop') {
    if (timer) clearInterval(timer);
  }
};
`;

interface DashboardProps {
  contacts: Contact[];
  importStats?: { imported: number, duplicates: number } | null;
  onMarkSent: (id: string) => void;
  onUpdateStatus: (id: string, status: ContactStatus) => void;
  onUpdateMessage: (id: string, newMessage: string) => void;
  onRegenerateSingle: (id: string) => void;
  onClearContacts?: () => void;
  automationSettings: AutomationSettings;
  onUpdateAutomationSettings: (settings: AutomationSettings) => void;
  isWhatsAppConnected: boolean;
  userId: string;
}

const ITEMS_PER_PAGE = 15;

// Componentes de UI auxiliares
const getStatusBadge = (status: ContactStatus) => {
  const baseClasses = "flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border shadow-sm uppercase tracking-wide";
  switch (status) {
    case ContactStatus.READ: return <span className={`${baseClasses} text-blue-700 bg-blue-50 border-blue-200`}><CheckCheck size={14} className="text-blue-600" /> LIDO</span>;
    case ContactStatus.DELIVERED: return <span className={`${baseClasses} text-cyan-700 bg-cyan-50 border-cyan-200`}><CheckCheck size={14} className="text-cyan-600" /> ENTREGUE</span>;
    case ContactStatus.SENT: return <span className={`${baseClasses} text-emerald-700 bg-emerald-50 border-emerald-200`}><Check size={14} strokeWidth={3} className="text-emerald-600" /> ENVIADA</span>;
    case ContactStatus.READY: return <span className={`${baseClasses} text-amber-700 bg-amber-50 border-amber-200`}><Clock size={14} className="text-amber-600" /> PRONTO</span>;
    case ContactStatus.ERROR: return <span className={`${baseClasses} text-rose-700 bg-rose-50 border-rose-200`}><XCircle size={14} className="text-rose-600" /> FALHOU</span>;
    case ContactStatus.GENERATING: return <span className={`${baseClasses} text-purple-700 bg-purple-50 border-purple-200`}><Sparkles size={14} className="text-purple-600 animate-pulse" /> GERANDO</span>;
    default: return <span className={`${baseClasses} text-slate-600 bg-slate-100 border-slate-200`}><Hourglass size={14} className="text-slate-500" /> PENDENTE</span>;
  }
};

const getStatusColorClass = (status: ContactStatus) => {
  switch (status) {
    case ContactStatus.READ: return "bg-blue-50 text-blue-800 border-l-4 border-blue-500";
    case ContactStatus.DELIVERED: return "bg-cyan-50 text-cyan-800 border-l-4 border-cyan-500";
    case ContactStatus.SENT: return "bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500";
    case ContactStatus.READY: return "bg-amber-50 text-amber-800 border-l-4 border-amber-500";
    case ContactStatus.ERROR: return "bg-rose-50 text-rose-800 border-l-4 border-rose-500";
    default: return "bg-slate-50 text-slate-600 border-l-4 border-slate-400";
  }
};

const MessageEditor = React.memo(({ value, onSave }: { value: string, onSave: (val: string) => void }) => {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => { setLocalValue(value || ''); }, [value]);
  return (
    <textarea
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => { if (localValue !== value) onSave(localValue); }}
      placeholder="Digite a mensagem..."
      className={`w-full text-sm p-2 border rounded text-slate-900 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 h-20 transition-colors ${localValue ? 'bg-white border-slate-300' : 'bg-slate-50 border-dashed border-slate-300'}`}
    />
  );
});

const ContactRow = React.memo(({ contact, onUpdateMessage, onSendClick, onQuickSendClick, onUpdateStatus, isWhatsAppConnected, onDirectSendClick }: any) => {
  const handleCopy = () => { if (contact.generatedMessage) navigator.clipboard.writeText(contact.generatedMessage); };
  
  const formattedSentTime = useMemo(() => {
    if (!contact.sentTime) return null;
    try {
      const date = new Date(contact.sentTime);
      return {
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
    } catch { return null; }
  }, [contact.sentTime]);

  return (
    <tr className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${contact.status === ContactStatus.SENT ? 'bg-slate-50/50' : ''}`}>
      <td className="py-4 px-2 align-top">
        <div className="font-medium text-slate-900 truncate max-w-[150px]">{contact.name}</div>
        <div className="text-sm text-slate-500">{contact.phone}</div>
        <div className="mt-2">{getStatusBadge(contact.status)}</div>
      </td>
      <td className="py-4 px-2 align-top text-sm text-slate-600 italic">
        <div className="max-h-20 overflow-hidden text-ellipsis line-clamp-3">{contact.context || 'Nenhum contexto'}</div>
      </td>
      <td className="py-4 px-2 align-top">
        <MessageEditor value={contact.generatedMessage || ''} onSave={(newVal) => onUpdateMessage(contact.id, newVal)} />
      </td>
      <td className="py-4 px-2 align-top">
         {formattedSentTime ? (
            <div className="flex flex-col items-center justify-center h-full text-xs text-slate-500 bg-slate-100/50 rounded p-1.5 border border-slate-100">
               <span className="font-bold text-slate-700">{formattedSentTime.date}</span>
               <span className="font-mono text-[10px]">{formattedSentTime.time}</span>
            </div>
         ) : (<div className="flex justify-center mt-2"><span className="text-slate-300 text-xs">-</span></div>)}
      </td>
      <td className="py-4 px-2 align-top text-right">
        <div className="flex flex-col items-end gap-2">
          {isWhatsAppConnected ? (
            <button 
              onClick={() => onDirectSendClick(contact)} 
              disabled={!contact.generatedMessage} 
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all w-full justify-center ${contact.status !== ContactStatus.READY ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'} disabled:opacity-50`}
            >
              <Zap size={16} fill="currentColor" /> Enviar Direto
            </button>
          ) : (
            <>
              {contact.status === ContactStatus.READY && contact.generatedMessage ? (
                <button onClick={() => onQuickSendClick(contact)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                  <Zap size={16} fill="currentColor" /> Envio Rápido
                </button>
              ) : (
                <button onClick={() => onSendClick(contact)} disabled={!contact.generatedMessage} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all w-full justify-center ${contact.status !== ContactStatus.READY ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-green-600 hover:bg-green-700 text-white shadow-sm'} disabled:opacity-50`}>
                  <Send size={16} /> Abrir Whats
                </button>
              )}
            </>
          )}
          <button onClick={handleCopy} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-1"><Copy size={12} /> Copiar Texto</button>
        </div>
      </td>
    </tr>
  );
});

const STATUS_ORDER: Record<string, number> = { 
  [ContactStatus.READY]: 0, 
  [ContactStatus.PENDING]: 1, 
  [ContactStatus.SENT]: 2,
  [ContactStatus.DELIVERED]: 3,
  [ContactStatus.READ]: 4,
  [ContactStatus.ERROR]: 5
};

export const Dashboard: React.FC<DashboardProps> = ({ 
  contacts, 
  importStats, 
  onMarkSent, 
  onUpdateStatus, 
  onUpdateMessage, 
  onClearContacts,
  automationSettings,
  onUpdateAutomationSettings,
  isWhatsAppConnected,
  userId
}) => {
  const isAutoSending = automationSettings.isAutoSending || false;
  const isPaused = automationSettings.isPaused || false;
  
  const setIsAutoSending = (val: boolean) => updateSetting('isAutoSending', val);
  const setIsPaused = (val: boolean) => updateSetting('isPaused', val);

  const [groupByStatus, setGroupByStatus] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPopupWarning, setShowPopupWarning] = useState(false);
  
  // Destructure settings for easier use
  const {
    timeUnit,
    minInterval,
    maxInterval,
    batchSize,
    longPauseDuration,
    scheduledStartTime,
    scheduledEndTime,
    campaignSchedule
  } = automationSettings;

  const updateSetting = (key: keyof AutomationSettings, value: any) => {
    onUpdateAutomationSettings({
      ...automationSettings,
      [key]: value
    });
  };

  // Estados de controle
  const [countdown, setCountdown] = useState(0);
  const [remainingInQueue, setRemainingInQueue] = useState(0);
  const [isWaitingSchedule, setIsWaitingSchedule] = useState(false);
  const [isWaitingCampaignStart, setIsWaitingCampaignStart] = useState(false);
  const [isLongPausing, setIsLongPausing] = useState(false);
  
  // REFS
  const workerRef = useRef<Worker | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const externalWindowRef = useRef<Window | null>(null);
  const tickHandlerRef = useRef<() => void>(() => {});
  
  // Logic Refs
  const queueRef = useRef<string[]>([]);
  const processingRef = useRef<boolean>(false);
  const targetTimeRef = useRef<number>(0);
  const batchCounterRef = useRef(0);
  const isLongPausingRef = useRef(false);
  const retryCountRef = useRef(0);

  // Filters
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContactStatus | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [skippedDuplicates, setSkippedDuplicates] = useState(0);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const todaySends = useMemo(() => {
    if (contacts.length === 0) return 0;
    
    // Forçar fuso horário de Brasília (America/Sao_Paulo)
    const options: Intl.DateTimeFormatOptions = { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' };
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    const today = formatter.format(new Date());
    
    let count = 0;
    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      if (!c.sentTime) continue;
      if (c.status !== ContactStatus.SENT && c.status !== ContactStatus.DELIVERED && c.status !== ContactStatus.READ) continue;
      
      try {
        const date = new Date(c.sentTime);
        if (isNaN(date.getTime())) continue;
        if (formatter.format(date) === today) {
          count++;
        }
      } catch (e) {
        // Ignora erros de data
      }
    }
    return count;
  }, [contacts]);

  const stats = useMemo(() => {
    let pending = 0;
    let sent = 0;
    let error = 0;
    
    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      if (c.status === ContactStatus.PENDING || c.status === ContactStatus.READY) pending++;
      else if (c.status === ContactStatus.SENT || c.status === ContactStatus.DELIVERED || c.status === ContactStatus.READ) sent++;
      else if (c.status === ContactStatus.ERROR) error++;
    }
    
    return { pending, sent, error, total: contacts.length };
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    const searchLower = debouncedSearch.toLowerCase();
    return contacts.filter(c => {
      const matchesSearch = !searchLower || 
        c.name.toLowerCase().includes(searchLower) || 
        c.phone.includes(searchLower);
      
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      
      let matchesDate = true;
      if (dateFilter) {
        if (c.sentTime) {
          try {
            // Simple string comparison for performance if format matches
            if (c.sentTime.startsWith(dateFilter)) {
              matchesDate = true;
            } else {
              const date = new Date(c.sentTime);
              if (!isNaN(date.getTime())) {
                const localSentDate = date.toLocaleDateString('en-CA');
                matchesDate = localSentDate === dateFilter;
              } else {
                matchesDate = false;
              }
            }
          } catch (e) {
            matchesDate = false;
          }
        } else {
          matchesDate = false;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [contacts, debouncedSearch, statusFilter, dateFilter]);

  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      if (groupByStatus) {
        return (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
      }
      return (a.status === ContactStatus.READY ? -1 : 1);
    });
  }, [filteredContacts, groupByStatus]);

  const totalPages = Math.ceil(sortedContacts.length / ITEMS_PER_PAGE);
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedContacts.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedContacts, currentPage]);
  
  // --- AUDIO CONTEXT KEEP-ALIVE ---
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            const ctx = new AudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            gainNode.gain.value = 0.001; 
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.start();
            audioContextRef.current = ctx;
        }
      } catch (e) { console.error(e); }
    } else if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }
  }, []);

  useEffect(() => {
    const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    worker.onmessage = () => tickHandlerRef.current();
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    if (automationSettings.isAutoSending && !processingRef.current && !isPaused) {
      // Auto-resume on mount or when setting changes to true
      const timer = setTimeout(() => {
        startAutoSend();
      }, 2000); // Pequeno delay para garantir que tudo carregou
      return () => clearTimeout(timer);
    }
  }, [automationSettings.isAutoSending]);

  // --- LÓGICA DE ABERTURA DE JANELA ---
  const openInWhatsApp = useCallback((phone: string, message: string) => {
    const encodedMessage = encodeURIComponent(message);
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
    const windowName = 'whatsapp_automation_tab'; 

    try {
        // 1. Tenta usar a referência direta da janela se ela já estiver aberta.
        if (externalWindowRef.current && !externalWindowRef.current.closed) {
            try {
                // Se for apenas para vincular (sem telefone), não altera a URL se já estiver no WhatsApp
                if (!phone && externalWindowRef.current.location.hostname.includes('whatsapp.com')) {
                    externalWindowRef.current.focus();
                    return true;
                }
                externalWindowRef.current.location.href = url;
                try { externalWindowRef.current.focus(); } catch (e) {}
                return true;
            } catch (e) {
                console.warn("Falha ao atualizar aba existente via location.href, tentando window.open", e);
            }
        }

        // 2. Se não temos a referência (primeira vez), abre uma nova e guarda a referência
        const win = window.open(url, windowName);
        
        if (!win) {
             setShowPopupWarning(true);
             setTimeout(() => setShowPopupWarning(false), 8000); 
             return false;
        }

        externalWindowRef.current = win;
        try { win.focus(); } catch (e) {}
        return true;
    } catch (error) {
        console.error("Erro ao abrir WhatsApp:", error);
        return false;
    }
  }, []);

  const linkWhatsApp = () => {
    openInWhatsApp('', 'Vinculando aba para automação...');
  };

  const handleQuickSend = useCallback(async (contact: Contact) => {
    if (!contact.generatedMessage) return false;

    if (isWhatsAppConnected) {
      try {
        const response = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            phone: contact.phone,
            message: contact.generatedMessage
          })
        });
        const data = await response.json();
        if (data.success) {
          onMarkSent(contact.id);
          return true;
        } else {
          console.error('Erro ao enviar mensagem direta:', data.error);
          return false;
        }
      } catch (error) {
        console.error('Erro na requisição de envio direto:', error);
        return false;
      }
    } else {
      const success = openInWhatsApp(contact.phone, contact.generatedMessage);
      if (success) {
          onMarkSent(contact.id);
      }
      return success;
    }
  }, [onMarkSent, openInWhatsApp, isWhatsAppConnected, userId]);

  const getRandomInterval = useCallback(() => {
    const min = Math.min(minInterval, maxInterval);
    const max = Math.max(minInterval, maxInterval);
    const base = Math.floor(Math.random() * (max - min + 1) + min);
    return base * (timeUnit === 'minutes' ? 60 : 1);
  }, [minInterval, maxInterval, timeUnit]);

  const checkTimeWindow = useCallback((startStr: string, endStr: string): boolean => {
    if (!startStr && !endStr) return true; 
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    let startMins = 0;
    let endMins = 24 * 60; 
    if (startStr) { const [h, m] = startStr.split(':').map(Number); startMins = h * 60 + m; }
    if (endStr) { const [h, m] = endStr.split(':').map(Number); endMins = h * 60 + m; }
    if (startMins <= endMins) return currentMins >= startMins && currentMins < endMins;
    else return currentMins >= startMins || currentMins < endMins;
  }, []);

  // --- CORE AUTOMATION LOOP ---
  const runAutomationTick = useCallback(async () => {
    if (!processingRef.current) return;

    // Verifica agendamento de início da campanha
    if (campaignSchedule) {
      const scheduledDate = new Date(campaignSchedule);
      if (Date.now() < scheduledDate.getTime()) {
        setIsWaitingCampaignStart(true);
        const diff = Math.ceil((scheduledDate.getTime() - Date.now()) / 1000);
        setCountdown(diff);
        return;
      }
    }
    setIsWaitingCampaignStart(false);

    const isInsideWindow = checkTimeWindow(scheduledStartTime, scheduledEndTime);
    if (!isInsideWindow) {
      setIsWaitingSchedule(true);
      return; 
    }
    setIsWaitingSchedule(false);

    const now = Date.now();
    const delta = targetTimeRef.current - now;
    const timeLeft = Math.ceil(delta / 1000);

    setCountdown(timeLeft > 0 ? timeLeft : 0);
    if (timeLeft > 0) return;

    if (isLongPausingRef.current) {
        setIsLongPausing(false);
        isLongPausingRef.current = false;
        batchCounterRef.current = 0;
        targetTimeRef.current = Date.now() + (getRandomInterval() * 1000);
        return;
    }

    const nextId = queueRef.current[0];
    if (nextId) {
        const contact = contacts.find(c => c.id === nextId);
        
        // Verifica se o contato JÁ foi enviado (status changed via state update)
        if (contact && contact.status === ContactStatus.SENT) {
             queueRef.current.shift();
             return; // Pula este tick e processa o próximo imediatamente na próxima iteração
        }

        let success = false;
        if (contact) {
            success = await handleQuickSend(contact);
        } else {
            // Contato sumiu? Remove da fila
            queueRef.current.shift();
            return;
        }

        if (success) {
            retryCountRef.current = 0;
            queueRef.current.shift(); 
            setRemainingInQueue(queueRef.current.length);

            batchCounterRef.current += 1;
            if (batchCounterRef.current >= batchSize) {
                setIsLongPausing(true);
                isLongPausingRef.current = true;
                const pauseTime = longPauseDuration * (timeUnit === 'minutes' ? 60 : 1);
                targetTimeRef.current = Date.now() + (pauseTime * 1000);
            } else {
                targetTimeRef.current = Date.now() + (getRandomInterval() * 1000);
            }

            if (queueRef.current.length === 0) stopAutoSend();

        } else {
            retryCountRef.current += 1;
            const backoff = Math.min(retryCountRef.current * 1500, 10000);
            targetTimeRef.current = Date.now() + backoff;
            if (retryCountRef.current === 5) setShowPopupWarning(true);
        }
    } else {
        if (queueRef.current.length === 0) stopAutoSend();
    }
  }, [contacts, getRandomInterval, batchSize, longPauseDuration, timeUnit, scheduledStartTime, scheduledEndTime, checkTimeWindow, handleQuickSend]);

  useEffect(() => { tickHandlerRef.current = runAutomationTick; }, [runAutomationTick]);

  const startAutoSend = () => {
    initAudioContext();

    if (isPaused && queueRef.current.length > 0) {
      processingRef.current = true;
      setIsAutoSending(true);
      setIsPaused(false);
      retryCountRef.current = 0;
      targetTimeRef.current = Date.now() + 1000; 
      workerRef.current?.postMessage('start');
      return;
    }

    setSkippedDuplicates(0);
    // Pega APENAS quem ainda não foi enviado e está PRONTO
    const candidates = sortedContacts.filter(c => c.status === ContactStatus.READY);
    
    const uniqueIds: string[] = [];
    const seenPhones = new Set<string>();
    let dupsCount = 0;
    candidates.forEach(c => {
        const clean = c.phone.replace(/\D/g, '');
        if (clean && seenPhones.has(clean)) dupsCount++;
        else { if(clean) seenPhones.add(clean); uniqueIds.push(c.id); }
    });

    if (uniqueIds.length === 0) {
        alert("Não há contatos prontos para enviar.");
        return;
    }

    if (dupsCount > 0) {
        if (!window.confirm(`Ignorar ${dupsCount} duplicatas e enviar para ${uniqueIds.length}?`)) return;
        setSkippedDuplicates(dupsCount);
    }

    queueRef.current = uniqueIds;
    setRemainingInQueue(uniqueIds.length);
    batchCounterRef.current = 0;
    retryCountRef.current = 0;
    setIsLongPausing(false);
    isLongPausingRef.current = false;
    
    processingRef.current = true;
    setIsAutoSending(true);
    setIsPaused(false);
    
    targetTimeRef.current = Date.now() + 500;
    workerRef.current?.postMessage('start');
  };

  const pauseAutoSend = () => {
    processingRef.current = false;
    setIsAutoSending(false);
    setIsPaused(true);
    setIsWaitingSchedule(false);
    workerRef.current?.postMessage('stop');
    if (audioContextRef.current) audioContextRef.current.suspend();
  };

  const stopAutoSend = () => {
    processingRef.current = false;
    setIsAutoSending(false);
    setIsPaused(false);
    queueRef.current = [];
    setRemainingInQueue(0);
    setCountdown(0);
    batchCounterRef.current = 0;
    retryCountRef.current = 0;
    setIsLongPausing(false);
    isLongPausingRef.current = false;
    workerRef.current?.postMessage('stop');
    if (audioContextRef.current) audioContextRef.current.suspend();
  };

  if (contacts.length === 0) return null;

  // Lógica de Classes para Branco/Clean
  let statusBorderClass = 'border-slate-200';
  let statusIconColor = 'text-slate-400';
  
  if (isAutoSending) {
     if (isWaitingSchedule) {
        statusBorderClass = 'border-slate-400 border-l-4';
        statusIconColor = 'text-slate-600';
     } else if (isLongPausing) {
        statusBorderClass = 'border-indigo-500 border-l-4';
        statusIconColor = 'text-indigo-600';
     } else if (retryCountRef.current > 0) {
        statusBorderClass = 'border-amber-400 border-l-4';
        statusIconColor = 'text-amber-500';
     } else {
        statusBorderClass = 'border-green-500 border-l-4';
        statusIconColor = 'text-green-600';
     }
  } else if (isPaused) {
      statusBorderClass = 'border-amber-300 border-l-4';
      statusIconColor = 'text-amber-500';
  }

  return (
    <div className="space-y-6 mt-6 relative">
      <style>{`
        @keyframes fadeInSlide { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-slide { animation: fadeInSlide 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
      `}</style>
      
      {showPopupWarning && (
        <div className="fixed top-24 right-6 z-50 bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg shadow-xl flex items-start gap-3 animate-fade-in-slide max-w-sm">
           <TriangleAlert size={24} className="shrink-0 text-red-600 mt-0.5" />
           <div>
             <strong className="font-bold block mb-1">Pop-up Bloqueado!</strong>
             <span className="text-sm leading-tight block">O navegador está bloqueando a abertura. O sistema está <strong>retentando</strong>. Por favor, libere Pop-ups para este site.</span>
           </div>
           <button onClick={() => setShowPopupWarning(false)} className="text-red-500 hover:text-red-800 -mt-1 -mr-1"><X size={18} /></button>
        </div>
      )}

      {/* Resumo de Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pendente', count: stats.pending, color: 'text-slate-600', bg: 'bg-white' },
          { label: 'Enviada', count: stats.sent, color: 'text-emerald-600', bg: 'bg-white' },
          { label: 'Falhou', count: stats.error, color: 'text-rose-600', bg: 'bg-white' },
          { label: 'Total', count: stats.total, color: 'text-blue-600', bg: 'bg-white' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} p-4 rounded-xl border border-slate-200 shadow-sm`}>
            <div className="text-xs font-bold uppercase text-slate-400 mb-1">{stat.label}</div>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.count}</div>
          </div>
        ))}
      </div>

      {/* Control Panel (WHITE THEME) */}
      <div className={`rounded-xl border bg-white shadow-sm transition-all overflow-hidden ${statusBorderClass}`}>
        <div className="p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-slate-50 ${statusIconColor}`}>
              {isWaitingSchedule ? <CalendarClock size={24} /> : (isLongPausing ? <Coffee size={24} className="animate-bounce" /> : <Timer size={24} className={isAutoSending && !isPaused ? 'animate-pulse' : ''} />)}
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                {isAutoSending 
                   ? (isWaitingCampaignStart
                       ? 'Aguardando Início Agendado'
                       : (isWaitingSchedule 
                           ? 'Aguardando Horário'
                           : (isLongPausing ? 'Pausa de Segurança' : (retryCountRef.current > 0 ? `Retentando... (${retryCountRef.current})` : 'Disparo em Andamento')))
                     ) 
                   : (isPaused ? 'Disparo Pausado' : 'Disparo Automático')
                }
              </h3>
              <div className="text-xs text-slate-500">
                <p>
                  {isAutoSending 
                    ? (isWaitingCampaignStart
                        ? `Início agendado para ${new Date(campaignSchedule).toLocaleString('pt-BR')}. Faltam ${countdown}s.`
                        : (isWaitingSchedule
                            ? `Fora da janela (${scheduledStartTime || '00:00'} - ${scheduledEndTime || '24:00'}).`
                            : (isLongPausing 
                                ? `Pausa ativa. Retoma em ${countdown}s.` 
                                : (retryCountRef.current > 0 ? `Bloqueio detectado. Próxima em ${countdown}s.` : `Enviando... Próximo em ${countdown}s.`)))
                      )
                    : (isPaused ? `Pausado. Restam ${remainingInQueue} contatos.` : 'Abre o WhatsApp Web simulando comportamento humano.')
                  }
                </p>
                <div className="mt-1 flex items-center gap-1.5 font-medium text-slate-600">
                  <TrendingUp size={14} />
                  <span>Envios hoje: <strong>{todaySends}</strong> | Fila: <strong>{remainingInQueue}</strong></span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
             <button 
               onClick={linkWhatsApp} 
               title="Vincular aba do WhatsApp"
               className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2 text-xs font-bold"
             >
               <ExternalLink size={16} /> 
               <span className="hidden sm:inline">VINCULAR WHATSAPP</span>
             </button>
             <button onClick={() => setShowSettings(!showSettings)} disabled={isAutoSending && !isWaitingSchedule} className={`p-2 rounded-lg border transition-colors ${showSettings ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'} disabled:opacity-50`}><Settings size={20} /></button>
            {!isAutoSending && !isPaused && (<button onClick={startAutoSend} className="bg-slate-900 text-white px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-slate-800 transition-colors"><Play size={16} fill="currentColor" /> INICIAR</button>)}
            {isAutoSending && (<button onClick={pauseAutoSend} className="bg-amber-500 text-white px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-amber-600 transition-colors shadow-sm"><Pause size={16} fill="currentColor" /> PAUSAR</button>)}
            {isPaused && (<button onClick={startAutoSend} className="bg-green-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-green-700 transition-colors"><Play size={16} fill="currentColor" /> CONTINUAR</button>)}
            {(isAutoSending || isPaused) && (<button onClick={stopAutoSend} className="border px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors bg-white text-red-700 border-red-200 hover:bg-red-50"><Square size={16} fill="currentColor" /> RESETAR</button>)}
          </div>
        </div>

        {showSettings && (
            <div className={`px-4 pb-4 pt-0 border-t bg-slate-50 border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-slide text-slate-600`}>
                <div className="mt-3 p-3 rounded-lg border border-dashed border-slate-300 bg-white">
                     <label className="block text-xs font-bold uppercase mb-2 flex items-center gap-1 text-slate-500"><CalendarClock size={14} /> Agendar Início</label>
                     <input 
                       type="datetime-local" 
                       value={campaignSchedule} 
                       onChange={(e) => updateSetting('campaignSchedule', e.target.value)} 
                       className="w-full p-1.5 text-sm font-bold bg-slate-50 border rounded text-slate-900" 
                     />
                     <label className="block text-[10px] font-bold uppercase mt-3 mb-1 text-slate-400">Janela Diária</label>
                     <div className="flex items-center gap-2">
                         <input type="time" value={scheduledStartTime} onChange={(e) => updateSetting('scheduledStartTime', e.target.value)} className="w-full p-1.5 text-sm font-bold bg-slate-50 border rounded text-slate-900" />
                         <input type="time" value={scheduledEndTime} onChange={(e) => updateSetting('scheduledEndTime', e.target.value)} className="w-full p-1.5 text-sm font-bold bg-slate-50 border rounded text-slate-900" />
                     </div>
                </div>
                <div className="mt-3">
                    <label className="block text-xs font-bold uppercase mb-2 text-slate-500">Unidade</label>
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border"><button onClick={() => updateSetting('timeUnit', 'seconds')} className={`flex-1 py-1.5 px-2 text-xs font-bold rounded ${timeUnit === 'seconds' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Segundos</button><button onClick={() => updateSetting('timeUnit', 'minutes')} className={`flex-1 py-1.5 px-2 text-xs font-bold rounded ${timeUnit === 'minutes' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Minutos</button></div>
                </div>
                <div className="mt-3">
                    <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Intervalo ({timeUnit === 'minutes' ? 'MIN' : 'SEG'})</label>
                    <div className="flex items-center gap-2"><input type="number" min="1" value={minInterval} onChange={e => updateSetting('minInterval', Number(e.target.value))} className="w-full p-2 text-sm font-bold border rounded text-center text-slate-900 bg-white" /><span className="text-slate-400 font-bold">-</span><input type="number" min="1" value={maxInterval} onChange={e => updateSetting('maxInterval', Number(e.target.value))} className="w-full p-2 text-sm font-bold border rounded text-center text-slate-900 bg-white" /></div>
                </div>
                <div className="mt-3">
                    <div className="flex gap-2">
                        <div className="flex-1"><label className="block text-xs font-bold uppercase mb-1 text-slate-500">Bloco (Qtd)</label><input type="number" min="1" value={batchSize} onChange={e => updateSetting('batchSize', Number(e.target.value))} className="w-full p-2 text-sm font-bold border rounded text-slate-900 bg-white" /></div>
                        <div className="flex-1"><label className="block text-xs font-bold uppercase mb-1 text-slate-500">Pausa (s/m)</label><input type="number" min="1" value={longPauseDuration} onChange={e => updateSetting('longPauseDuration', Number(e.target.value))} className="w-full p-2 text-sm font-bold border rounded text-slate-900 bg-white" /></div>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-white border-b border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-black" />
            </div>
            <div className="flex items-center gap-3">
              {onClearContacts && (
                <button 
                  onClick={() => {
                    if(window.confirm('Tem certeza que deseja limpar toda a lista de contatos?')) {
                      onClearContacts();
                    }
                  }} 
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border bg-white text-red-600 border-red-200 hover:bg-red-50 transition-colors"
                  title="Limpar Lista"
                >
                  <Trash2 size={16} /> Limpar Lista
                </button>
              )}
              <input 
                type="date" 
                value={dateFilter} 
                onChange={(e) => setDateFilter(e.target.value)} 
                className="px-3 py-2 border rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                title="Filtrar por data de envio"
              />
              <button onClick={() => setGroupByStatus(!groupByStatus)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border ${groupByStatus ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white text-slate-600'}`}><LayoutList size={16} /> {groupByStatus ? 'Desagrupar' : 'Agrupar Status'}</button>
              <div className="h-6 w-px bg-slate-200"></div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                <Filter size={16} className="text-slate-400 flex-shrink-0" />
                <button onClick={() => setStatusFilter('ALL')} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>Todos</button>
                {Object.values(ContactStatus).map(s => (<button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${statusFilter === s ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>{s}</button>))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2"><h2 className="font-bold text-slate-700 text-sm">Listando {filteredContacts.length} contatos</h2></div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors"><ChevronLeft size={20} /></button>
              
              {/* Pagination Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (totalPages <= 7 || page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold transition-all ${
                          page === currentPage 
                            ? 'bg-slate-800 text-white shadow-sm' 
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                      (page === 2 && currentPage > 3) || 
                      (page === totalPages - 1 && currentPage < totalPages - 2)
                  ) {
                     // Mostra reticências apenas uma vez em cada ponta
                     if (page === 2 || page === totalPages - 1) {
                         return <span key={page} className="text-slate-400 text-xs px-1">...</span>;
                     }
                  }
                  return null;
                })}
              </div>

              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors"><ChevronRight size={20} /></button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100 bg-slate-50/50">
                <th className="py-3 px-4 font-bold">Contato</th>
                <th className="py-3 px-2 font-bold">Contexto</th>
                <th className="py-3 px-2 w-1/3 font-bold">Mensagem</th>
                <th className="py-3 px-2 text-center font-bold">Enviado em</th>
                <th className="py-3 px-4 text-right font-bold">Ação</th>
              </tr>
            </thead>
            <tbody key={currentPage} className="animate-fade-in-slide">
              {paginatedContacts.map((contact, index) => {
                const showGroupHeader = groupByStatus && (index === 0 || contact.status !== paginatedContacts[index - 1].status);
                return (
                  <React.Fragment key={contact.id}>
                    {showGroupHeader && (<tr className="bg-white"><td colSpan={5} className="p-0"><div className={`px-4 py-2 font-bold text-xs uppercase flex items-center gap-2 shadow-sm ${getStatusColorClass(contact.status)}`}>{getStatusBadge(contact.status)}<span className="opacity-70 ml-auto">Grupo</span></div></td></tr>)}
                    <ContactRow 
                      contact={contact} 
                      onUpdateMessage={onUpdateMessage} 
                      onSendClick={openInWhatsApp} 
                      onQuickSendClick={handleQuickSend} 
                      onUpdateStatus={onUpdateStatus} 
                      isWhatsAppConnected={isWhatsAppConnected}
                      onDirectSendClick={handleQuickSend}
                    />
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
