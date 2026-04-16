import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { QrCode, CheckCircle, XCircle, RefreshCw, LogOut, Info } from 'lucide-react';

interface WhatsAppConnectorProps {
  userId: string;
  onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected' | 'loggedOut') => void;
}

export const WhatsAppConnector: React.FC<WhatsAppConnectorProps> = ({ userId, onStatusChange }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'loggedOut'>('disconnected');

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server via WebSocket');
      newSocket.emit('whatsapp-init', { userId });
      setStatus('connecting');
    });

    newSocket.on('whatsapp-qr', (data) => {
      if (data.userId === userId) {
        setQrCode(data.qr);
        setStatus('disconnected');
        onStatusChange?.('disconnected');
      }
    });

    newSocket.on('whatsapp-status', (data) => {
      if (data.userId === userId) {
        setStatus(data.status);
        onStatusChange?.(data.status);
        if (data.status === 'connected') {
          setQrCode(null);
        } else if (data.status === 'loggedOut' || data.status === 'disconnected') {
          // Keep QR code visible if it's just a disconnect, but clear if logged out
          if (data.status === 'loggedOut') {
             setQrCode(null);
          }
        }
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [userId]);

  const handleLogout = () => {
    if (socket) {
      socket.emit('whatsapp-logout', { userId });
    }
  };

  const handleReconnect = () => {
    if (socket) {
      setQrCode(null);
      setStatus('connecting');
      socket.emit('whatsapp-init', { userId });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <QrCode className="text-emerald-600" /> Conexão WhatsApp (QR Code)
          </h3>
          <p className="text-sm text-slate-500">Conecte seu WhatsApp para disparar mensagens diretamente pelo sistema.</p>
        </div>
        <div className="flex items-center gap-2">
          {status === 'connected' ? (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-wider">
              <CheckCircle size={14} /> Conectado
            </span>
          ) : status === 'connecting' ? (
            <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase tracking-wider animate-pulse">
              <RefreshCw size={14} className="animate-spin" /> Conectando...
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full uppercase tracking-wider">
              <XCircle size={14} /> Desconectado
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-4">
        {status === 'connected' ? (
          <div className="text-center">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={40} />
            </div>
            <p className="text-slate-700 font-medium mb-4">Seu WhatsApp está pronto para disparar!</p>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium mx-auto"
            >
              <LogOut size={16} /> Desconectar Sessão
            </button>
          </div>
        ) : qrCode ? (
          <div className="text-center">
            <p className="text-sm text-slate-600 mb-4">Escaneie o código abaixo com seu WhatsApp:</p>
            <div className="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-inner inline-block">
              <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
            </div>
            <p className="text-xs text-slate-400 mt-4 italic">O código expira em alguns segundos. Se não funcionar, clique em atualizar.</p>
            <button
              onClick={handleReconnect}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors text-sm font-medium mx-auto"
            >
              <RefreshCw size={16} /> Atualizar QR Code
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw size={32} className={status === 'connecting' ? 'animate-spin' : ''} />
            </div>
            <p className="text-slate-500">
              {status === 'connecting' ? 'Gerando QR Code...' : 'Clique no botão abaixo para iniciar a conexão.'}
            </p>
            {status !== 'connecting' && (
              <button
                onClick={handleReconnect}
                className="mt-4 px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
              >
                Iniciar Conexão
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
        <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
          <Info size={14} className="text-slate-400" /> Como funciona?
        </h4>
        <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
          <li>Esta conexão permite que o sistema envie mensagens sem abrir novas abas.</li>
          <li>A sessão fica salva no servidor, mas você pode desconectar a qualquer momento.</li>
          <li>Recomendamos usar um número secundário para evitar bloqueios.</li>
        </ul>
      </div>
    </div>
  );
};
