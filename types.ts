export enum ContactStatus {
  PENDING = 'PENDENTE',
  GENERATING = 'GERANDO',
  READY = 'PRONTO',
  SENT = 'ENVIADO',
  DELIVERED = 'ENTREGUE',
  READ = 'LIDO',
  ERROR = 'ERRO',
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  context: string; // Notas sobre a pessoa ou detalhes específicos
  scheduledTime?: string; // Data/Hora agendada para envio
  status: ContactStatus;
  generatedMessage?: string;
  errorMessage?: string; // Motivo do erro, se houver
  sentTime?: string; // Data e hora do envio realizado
}

export interface CampaignConfig {
  goal: string;
  tone: string;
  templates: string[];
}

export interface AutomationSettings {
  timeUnit: 'seconds' | 'minutes';
  minInterval: number;
  maxInterval: number;
  batchSize: number;
  longPauseDuration: number;
  scheduledStartTime: string;
  scheduledEndTime: string;
  campaignSchedule: string;
  userId: string;
  isAutoSending?: boolean;
  isPaused?: boolean;
}

export interface AppBackup {
  version: number;
  date: string;
  contacts: Contact[];
  campaignConfig: CampaignConfig;
}

export interface GenerationRequest {
  goal: string;
  tone: string;
  template: string;
  contacts: Contact[];
}

export interface GeneratedMessage {
  id: string;
  message: string;
}