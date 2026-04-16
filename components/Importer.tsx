import React, { useState, useRef } from 'react';
import { Contact, ContactStatus } from '../types';
import { Upload, FileText, AlertCircle, TriangleAlert, FileUp, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImporterProps {
  onImport: (contacts: Contact[]) => void;
}

export const Importer: React.FC<ImporterProps> = ({ onImport }) => {
  const [inputText, setInputText] = useState(`Nome,Telefone,Contexto,Horario
Alice,5511999999999,"BR Completo",2023-10-27 14:00
Bob,11988887777,"BR Sem DDI (Auto +55)",
John,+14155552671,"EUA (Internacional)",
Maria,+351912345678,"Portugal (Internacional)",`);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Usamos FileReader com ArrayBuffer para todos os formatos (XLSX, XLS, CSV)
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (data) {
        try {
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          // Converte para CSV padrão
          const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
          setInputText(csvOutput);
        } catch (err) {
          console.error("Error parsing file", err);
          alert("Erro ao ler arquivo. Certifique-se que é um CSV ou Excel válido.");
        }
      }
    };
    reader.readAsArrayBuffer(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleParse = () => {
    const lines = inputText.trim().split('\n');
    const newContacts: Contact[] = [];
    
    if (lines.length === 0) return;

    // Detecta delimitador
    const firstLine = lines[0];
    const separator = firstLine.includes(';') && firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';

    // Identificação de colunas
    const headers = lines[0].toLowerCase().split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
    
    let nameIndex = headers.findIndex(h => h.includes('nome') || h.includes('name') || h.includes('cliente'));
    let phoneIndex = headers.findIndex(h => h.includes('tel') || h.includes('phone') || h.includes('cel') || h.includes('whats'));
    let contextIndex = headers.findIndex(h => h.includes('context') || h.includes('obs') || h.includes('info') || h.includes('nota'));
    let timeIndex = headers.findIndex(h => h.includes('hora') || h.includes('data') || h.includes('agend') || h.includes('time'));

    // FALLBACK ROBUSTO
    if (nameIndex === -1 && phoneIndex === -1) {
      nameIndex = 0;
      phoneIndex = 1;
      contextIndex = 2;
      timeIndex = 3;
    }

    const firstColIsPhone = /^\d+$/.test(headers[0]?.replace(/\D/g, '') || '');
    const hasHeader = (nameIndex > -1 || phoneIndex > -1) && !firstColIsPhone;
    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      let parts: string[] = [];
      
      if (separator === ',') {
         // Regex atualizado: [^",]+ permite espaços (antes era [^",\s]+ que quebrava nomes com espaço)
         const match = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
         if (match && match.length >= 2) {
             parts = match.map(m => m.replace(/^"|"$/g, '').replace(/,$/, ''));
         } else {
             parts = line.split(',');
         }
      } else {
         parts = line.split(';');
      }
      
      parts = parts.map(p => p ? p.trim().replace(/^"|"$/g, '') : '');

      if (parts.length > 0) {
        const rawName = parts[nameIndex] || 'Sem Nome';
        const rawPhone = parts[phoneIndex] || '';
        
        if (!rawName && !rawPhone) continue;

        const hasPlus = rawPhone.trim().startsWith('+');
        let cleanPhone = rawPhone.replace(/\D/g, '');
        let status = ContactStatus.PENDING;
        let errorMessage = undefined;

        if (!cleanPhone) {
           status = ContactStatus.ERROR;
           errorMessage = "Telefone não encontrado.";
        } 
        else if (hasPlus) {
            if (cleanPhone.length < 7 || cleanPhone.length > 15) {
                status = ContactStatus.ERROR;
                errorMessage = `Internacional inválido (${cleanPhone.length} d.).`;
            }
        }
        else {
            if (cleanPhone.length === 10 || cleanPhone.length === 11) {
                const ddd = parseInt(cleanPhone.substring(0, 2));
                if (ddd >= 11 && ddd <= 99) {
                    cleanPhone = '55' + cleanPhone;
                } else {
                    status = ContactStatus.ERROR;
                    errorMessage = "DDD inválido (BR).";
                }
            }
            else if (cleanPhone.startsWith('55') && (cleanPhone.length === 12 || cleanPhone.length === 13)) {
                 const ddd = parseInt(cleanPhone.substring(2, 4));
                 if (ddd < 11 || ddd > 99) {
                    status = ContactStatus.ERROR;
                    errorMessage = "DDD inválido (BR).";
                 }
            }
            else {
                 if (cleanPhone.length >= 7 && cleanPhone.length <= 15) {
                    // Aceita
                 } else {
                    status = ContactStatus.ERROR;
                    errorMessage = "Formato desconhecido.";
                 }
            }
        }
        
        newContacts.push({
          id: crypto.randomUUID(),
          name: rawName,
          phone: cleanPhone || rawPhone,
          context: parts[contextIndex] || '',
          scheduledTime: parts[timeIndex],
          status: status,
          errorMessage: errorMessage
        });
      }
    }

    onImport(newContacts);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
            <Upload size={24} />
          </div>
          <h2 className="text-xl font-semibold text-slate-800">1. Importar Contatos</h2>
        </div>
        
        <div>
          <input 
            type="file" 
            accept=".csv,.txt,.xlsx,.xls" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden" 
            id="csv-upload"
          />
          <label 
            htmlFor="csv-upload" 
            className="flex items-center gap-2 cursor-pointer bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
          >
            <FileUp size={16} />
            Carregar CSV/Excel
          </label>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Cole os dados ou carregue um arquivo (Colunas sugeridas: Nome, Telefone, Contexto)
        </label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="w-full h-48 p-4 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none bg-white text-slate-900"
          placeholder="Nome, Telefone, Contexto..."
        />
      </div>

      <div className="flex items-start gap-2 mb-6 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm">
        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p><strong>Internacional:</strong> Use o prefixo <strong>+</strong> (Ex: +1415...) para validar números de outros países.</p>
          <p><strong>Brasil:</strong> Números sem prefixo (10 ou 11 dígitos) recebem <strong>+55</strong> automaticamente.</p>
        </div>
      </div>

      <button
        onClick={handleParse}
        className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg hover:bg-slate-800 transition-colors font-medium"
      >
        <FileText size={18} />
        Processar Contatos
      </button>
    </div>
  );
};