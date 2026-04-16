import { GoogleGenAI, Type } from "@google/genai";
import { Contact, GeneratedMessage, ContactStatus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Mantemos o BATCH_SIZE em 10 para garantir a integridade do JSON (evitar cortes)
const BATCH_SIZE = 10;

// NÚMERO DE REQUISIÇÕES SIMULTÂNEAS
// Aumentar isso acelera o processo, mas muito alto pode causar erro 429 (Too Many Requests)
const CONCURRENT_REQUESTS = 3;

export const generateBatchMessages = async (
  contacts: Contact[],
  goal: string,
  tone: string,
  template: string
): Promise<GeneratedMessage[]> => {
  
  // Filtra apenas contatos válidos (ignora ERRO)
  const validContacts = contacts.filter(c => c.status !== ContactStatus.ERROR);
  
  if (validContacts.length === 0) return [];

  // 1. Divide os contatos em lotes (Ex: 100 contatos -> 10 lotes de 10)
  const batches = [];
  for (let i = 0; i < validContacts.length; i += BATCH_SIZE) {
    batches.push(validContacts.slice(i, i + BATCH_SIZE));
  }

  let allMessages: GeneratedMessage[] = [];

  // 2. Processa os lotes em grupos paralelos (Chunks)
  // Em vez de esperar um lote acabar para começar o outro, mandamos 3 de uma vez.
  for (let i = 0; i < batches.length; i += CONCURRENT_REQUESTS) {
    const batchChunk = batches.slice(i, i + CONCURRENT_REQUESTS);
    
    try {
      // Cria um array de Promises para execução simultânea
      const promises = batchChunk.map(batch => processSingleBatch(batch, goal, tone, template));
      
      // Aguarda todas as requisições deste grupo terminarem
      const results = await Promise.all(promises);
      
      // Adiciona os resultados ao array principal
      results.forEach(msgs => {
        allMessages = [...allMessages, ...msgs];
      });

    } catch (error) {
      console.error(`Erro ao processar grupo de lotes ${i}:`, error);
      // Continua para o próximo grupo mesmo se houver erro parcial
    }
  }

  return allMessages;
};

// Helper simples de formatação de nome (duplicado para não depender de context React)
const formatFirstName = (fullName: string): string => {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0];
    if (firstName.length > 1) {
        return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    }
    return firstName;
};

const processSingleBatch = async (
  batchContacts: Contact[],
  goal: string,
  tone: string,
  template: string
): Promise<GeneratedMessage[]> => {
  const contactData = batchContacts.map(c => ({
    id: c.id,
    // Envia apenas o primeiro nome formatado para a IA
    name: formatFirstName(c.name), 
    context: c.context
  }));

  const prompt = `
    Você é um assistente CRM rápido e eficiente.
    OBJETIVO: ${goal}
    TOM: ${tone}
    TEMPLATE: "${template}"

    Instruções Críticas:
    1. Gere mensagens curtas para WhatsApp (PT-BR).
    2. Substitua {nome} pelo nome do contato (Use o nome fornecido nos dados EXATAMENTE como está).
    3. Seja direto. Evite floreios desnecessários para economizar tempo.
    4. Retorne APENAS o JSON.

    Dados:
    ${JSON.stringify(contactData)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.7, // Um pouco menos criativo para ser mais rápido/direto
        topK: 40,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              message: { type: Type.STRING },
            },
            required: ["id", "message"],
          },
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as GeneratedMessage[];
    }
    return [];
  } catch (error) {
    console.error("Erro ao gerar mensagens do batch:", error);
    // Retorna array vazio em caso de erro para não quebrar o Promise.all
    return []; 
  }
};