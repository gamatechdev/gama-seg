export interface Unidade {
  id: number;
  nome_unidade: string;
}

export interface Procedimento {
  id: number;
  nome: string;
  idcategoria: number;
}

export interface Aluno {
  id: number;
  nome: string;
  cpf: string;
  contato: string;
  empresa: number;
  user_id?: string;
  unidades?: Unidade; // Mapped relation
}

export interface DocSeg {
  id: number;
  created_at: string;
  mes: number;
  empresa: number;
  doc: number;
  valor: number | null;
  status: string;
  data_recebimento: string;
  prazo: string;
  data_entrega: string;
  enviado: boolean;
  unidades?: Unidade;
  procedimento?: Procedimento;
}

export interface Treinamento {
  id: number;
  created_at: string;
  aluno: number;
  treinamento: number;
  data_realizacao: string;
  horario: string;
  modelo: string;
  valor: number | null;
  participou: boolean | null;
  url_certificado: string | null;
  certificado_enviado: boolean | null;
  aluno_data?: Aluno; // Mapped manually or via view
  procedimento?: Procedimento;
  aluno_rel?: Aluno; // Supabase relation alias might vary
}

// For UI State
export type ViewState = 'documents' | 'students' | 'trainings';

export const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];