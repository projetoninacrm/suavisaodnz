import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateConsolidatedReportMetrics,
  calculateGoalSimulatorResults,
  calculateMonthlyGoalMetrics,
  calculateWeightedDailyTarget,
  getCalendarWeekOfMonth,
} from "../src/lib/reportCalculations.ts";

function assertClose(actual: number, expected: number, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `esperado ${expected}, recebido ${actual}`);
}

test("semanas do relatório preservam o agrupamento de domingo a sábado", () => {
  assert.equal(getCalendarWeekOfMonth(new Date(2026, 9, 1)), 1);
  assert.equal(getCalendarWeekOfMonth(new Date(2026, 9, 3)), 1);
  assert.equal(getCalendarWeekOfMonth(new Date(2026, 9, 4)), 2);
  assert.equal(getCalendarWeekOfMonth(new Date(2026, 10, 7)), 1);
  assert.equal(getCalendarWeekOfMonth(new Date(2026, 10, 8)), 2);
});

test("consolidado mantém as fontes e taxas registradas na auditoria", () => {
  const result = calculateConsolidatedReportMetrics({
    atendimentos: 6,
    receitas: 4,
    visitou_dnz: 3,
    vendas: 2,
    faturamento: 1700,
  }, 4);

  assert.equal(result.vendas, 4);
  assertClose(result.potencial, 66.66666666666666);
  assert.equal(result.taxa_presenca, 75);
  assertClose(result.conversao, 133.33333333333331);
  assert.equal(result.ticket, 425);
});

test("metas reproduzem o cenário sintético documentado", () => {
  const result = calculateMonthlyGoalMetrics({
    periodos: 10,
    mediaAtendimentos: 3,
    percentualReceita: 60,
    percentualComparecimento: 50,
    percentualConversao: 66,
    metaFaturamentoMensal: 60_000,
    vendasLoja: 2,
    vendasInternet: 3,
  }, 10);

  assert.equal(result.totalPacientes, 30);
  assert.equal(result.pacientesComReceita, 18);
  assert.equal(result.pacientesComparecem, 9);
  assertClose(result.metaVendasSuaVisao, 5.94);
  assertClose(result.metaVendas, 10.94);
  assertClose(result.superMeta, 13.128);
  assertClose(result.superMetaDiariaCompleta, 1.3128);
  assertClose(result.superMetaDiariaMeio, 0.6564);
  assertClose(result.superMetaSemanal, 3.282);
  assertClose(result.ticketMedio, 60_000 / 10.94);
  assertClose(result.metaDiariaCompleta, 1.094);
  assertClose(result.metaDiariaMeio, 0.547);
  assertClose(result.metaSemanal, 2.735);
  assert.equal(result.faturamentoMensal, 60_000);
  assert.equal(result.faturamentoDiarioCompleto, 6_000);
  assert.equal(result.faturamentoDiarioMeio, 3_000);
  assert.equal(result.faturamentoSemanal, 15_000);
  assert.equal(result.superFaturamentoMensal, 72_000);
  assert.equal(result.superFaturamentoDiarioCompleto, 7_200);
  assert.equal(result.superFaturamentoDiarioMeio, 3_600);
  assert.equal(result.superFaturamentoSemanal, 18_000);
});

test("metas sem peso de escala não produzem valores diários inválidos", () => {
  const result = calculateMonthlyGoalMetrics({
    periodos: 10,
    mediaAtendimentos: 3,
    percentualReceita: 60,
    percentualComparecimento: 50,
    percentualConversao: 66,
    metaFaturamentoMensal: 60_000,
    vendasLoja: 2,
    vendasInternet: 3,
  }, 0);

  assert.equal(result.metaDiariaCompleta, 0);
  assert.equal(result.superMetaDiariaCompleta, 0);
  assert.equal(result.faturamentoDiarioCompleto, 0);
  assert.equal(result.superFaturamentoDiarioCompleto, 0);
  assertClose(result.metaSemanal, 2.735);
});

test("distribuição ponderada e simulador mantêm os resultados de referência", () => {
  assert.equal(calculateWeightedDailyTarget(60_000, 0.5, 10), 3_000);
  assert.equal(calculateWeightedDailyTarget(60_000, 1, 0), 0);

  const result = calculateGoalSimulatorResults({
    vendas: 8,
    ticketMedio: 400,
    potencial: 75,
    taxaPresenca: 60,
    conversao: 50,
  });

  assert.equal(result.faturamento, 3_200);
  assert.equal(result.visitouDnz, 16);
  assert.equal(result.receitas, 27);
  assert.equal(result.atendimentos, 36);
});

test("simulador retorna zero quando as taxas denominadoras são zero", () => {
  assert.deepEqual(calculateGoalSimulatorResults({
    vendas: 8,
    ticketMedio: 400,
    potencial: 0,
    taxaPresenca: 0,
    conversao: 0,
  }), {
    faturamento: 3_200,
    visitouDnz: 0,
    receitas: 0,
    atendimentos: 0,
  });
});
