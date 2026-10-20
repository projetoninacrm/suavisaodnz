export interface ConsolidatedReportTotals {
  atendimentos: number;
  receitas: number;
  visitou_dnz: number;
  vendas: number;
  faturamento: number;
}

export function calculateConsolidatedReportMetrics(totals: ConsolidatedReportTotals, salesFromLeads: number) {
  const potencial = totals.atendimentos > 0 ? (totals.receitas / totals.atendimentos) * 100 : 0;
  const taxa_presenca = totals.receitas > 0 ? (totals.visitou_dnz / totals.receitas) * 100 : 0;
  const conversao = totals.visitou_dnz > 0 ? (salesFromLeads / totals.visitou_dnz) * 100 : 0;
  const ticket = salesFromLeads > 0 ? totals.faturamento / salesFromLeads : 0;

  return {
    ...totals,
    vendas: salesFromLeads,
    potencial,
    taxa_presenca,
    conversao,
    ticket,
  };
}

/** Calendar week within the month, using Sunday-based weeks as the current report does. */
export function getCalendarWeekOfMonth(date: Date): number {
  const firstDayWeekday = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  return Math.ceil((date.getDate() + firstDayWeekday) / 7);
}

export interface MonthlyGoalInputs {
  periodos: number;
  mediaAtendimentos: number;
  percentualReceita: number;
  percentualComparecimento: number;
  percentualConversao: number;
  metaFaturamentoMensal: number;
  vendasLoja: number;
  vendasInternet: number;
}

export function calculateMonthlyGoalMetrics(config: MonthlyGoalInputs, pesoDistribuicao: number) {
  const totalPacientes = config.periodos * config.mediaAtendimentos;
  const pacientesComReceita = totalPacientes * (config.percentualReceita / 100);
  const pacientesComparecem = pacientesComReceita * (config.percentualComparecimento / 100);
  const metaVendasSuaVisao = pacientesComparecem * (config.percentualConversao / 100);
  const metaVendas = metaVendasSuaVisao + (config.vendasLoja || 0) + (config.vendasInternet || 0);

  const superMeta = metaVendas * 1.2;
  const metaMensal = metaVendas;
  const metaDiariaBase = pesoDistribuicao > 0 ? metaVendas / pesoDistribuicao : 0;
  const metaDiariaCompleta = metaDiariaBase;
  const metaDiariaMeio = metaDiariaBase * 0.5;
  const metaDiaria = metaDiariaCompleta;
  const metaSemanal = metaVendas / 4;
  const superMetaMensal = superMeta;
  const superMetaDiariaCompleta = pesoDistribuicao > 0 ? superMeta / pesoDistribuicao : 0;
  const superMetaDiariaMeio = superMetaDiariaCompleta * 0.5;
  const superMetaDiaria = superMetaDiariaCompleta;
  const superMetaSemanal = superMeta / 4;

  const ticketMedio = metaVendas > 0 ? config.metaFaturamentoMensal / metaVendas : 0;
  const faturamentoMensal = config.metaFaturamentoMensal;
  const faturamentoDiarioBase = pesoDistribuicao > 0 ? faturamentoMensal / pesoDistribuicao : 0;
  const faturamentoDiarioCompleto = faturamentoDiarioBase;
  const faturamentoDiarioMeio = faturamentoDiarioBase * 0.5;
  const faturamentoDiario = faturamentoDiarioCompleto;
  const faturamentoSemanal = faturamentoMensal / 4;
  const superFaturamentoMensal = faturamentoMensal * 1.2;
  const superFaturamentoDiarioCompleto = pesoDistribuicao > 0 ? superFaturamentoMensal / pesoDistribuicao : 0;
  const superFaturamentoDiarioMeio = superFaturamentoDiarioCompleto * 0.5;
  const superFaturamentoDiario = superFaturamentoDiarioCompleto;
  const superFaturamentoSemanal = superFaturamentoMensal / 4;

  return {
    totalPacientes,
    pacientesComReceita,
    pacientesComparecem,
    metaVendas,
    metaVendasSuaVisao,
    superMeta,
    metaMensal,
    metaDiaria,
    metaDiariaCompleta,
    metaDiariaMeio,
    metaSemanal,
    superMetaMensal,
    superMetaDiaria,
    superMetaDiariaCompleta,
    superMetaDiariaMeio,
    superMetaSemanal,
    ticketMedio,
    faturamentoMensal,
    faturamentoDiario,
    faturamentoDiarioCompleto,
    faturamentoDiarioMeio,
    faturamentoSemanal,
    superFaturamentoMensal,
    superFaturamentoDiario,
    superFaturamentoDiarioCompleto,
    superFaturamentoDiarioMeio,
    superFaturamentoSemanal,
  };
}

export function calculateWeightedDailyTarget(monthlyTarget: number, dayWeight: number, totalWeight: number) {
  return totalWeight > 0 ? (monthlyTarget * dayWeight) / totalWeight : 0;
}

export interface GoalSimulatorInputs {
  vendas: number;
  ticketMedio: number;
  potencial: number;
  taxaPresenca: number;
  conversao: number;
}

export function calculateGoalSimulatorResults({ vendas, ticketMedio, potencial, taxaPresenca, conversao }: GoalSimulatorInputs) {
  const faturamento = vendas * ticketMedio;
  const visitouDnz = conversao > 0 ? vendas / (conversao / 100) : 0;
  const receitas = taxaPresenca > 0 ? visitouDnz / (taxaPresenca / 100) : 0;
  const atendimentos = potencial > 0 ? receitas / (potencial / 100) : 0;
  return {
    faturamento,
    visitouDnz: Math.round(visitouDnz),
    receitas: Math.round(receitas),
    atendimentos: Math.round(atendimentos),
  };
}
