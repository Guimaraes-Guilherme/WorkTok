// Profissões/áreas disponíveis na escolha inicial
export const AREAS = [
  'Design',
  'Tecnologia',
  'Marketing',
  'Saúde',
  'Engenharia',
  'Gastronomia',
  'Educação',
  'Direito',
  'Vendas',
  'Audiovisual',
  'Arquitetura',
  'Administração',
  'Finanças',
  'Recursos Humanos',
  'Logística',
  'Construção Civil',
] as const;

export const MAX_AREAS = 3;

export const WORK_MODES = [
  { value: 'remoto', label: 'Remoto' },
  { value: 'hibrido', label: 'Híbrido' },
  { value: 'presencial', label: 'Presencial' },
] as const;

export const CONTRACTS = [
  { value: 'clt', label: 'CLT' },
  { value: 'pj', label: 'PJ' },
  { value: 'estagio', label: 'Estágio' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'temporario', label: 'Temporário' },
] as const;

export const ACCOUNT_TYPES = [
  { value: 'profissional', label: 'Profissional' },
  { value: 'recrutador', label: 'Recrutador/RH' },
  { value: 'empresa', label: 'Empresa' },
] as const;

export function labelOf(list: readonly { value: string; label: string }[], value: string) {
  return list.find((i) => i.value === value)?.label ?? value;
}
