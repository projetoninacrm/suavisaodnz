import assert from "node:assert/strict";
import test from "node:test";
import {
  assertCompleteScheduleMonth,
  getExpectedScheduleDates,
  parseSchedulePreviewResponse,
} from "../supabase/functions/_shared/schedule-import.ts";

function buildCompleteRows(year: number, month: number) {
  return getExpectedScheduleDates(year, month).map((date, index) => ({
    sheet_name: "Escala",
    date,
    day_of_week: "",
    morning_shift: index === 0 ? "  ANA  MARIA " : "",
    afternoon_shift: "",
  }));
}

test("a prévia completa preserva todos os dias exceto domingos e nomes", () => {
  const rows = parseSchedulePreviewResponse({ rows: buildCompleteRows(2026, 10).reverse() }, 2026, 10);

  assert.equal(rows.length, 27);
  assert.equal(rows[0].date, "2026-10-01");
  assert.equal(rows[0].day_of_week, "QUI");
  assert.equal(rows[0].morning_shift, "ANA  MARIA");
  assert.equal(rows[0].morning_shift_professional_id, null);
  assert.equal(rows.at(-1)?.date, "2026-10-31");
  assert.ok(rows.every((row) => new Date(`${row.date}T00:00:00Z`).getUTCDay() !== 0));
});

test("a prévia incompleta bloqueia a substituição do mês", () => {
  const rows = buildCompleteRows(2026, 10).slice(1);

  assert.throws(
    () => parseSchedulePreviewResponse({ rows }, 2026, 10),
    /26 de 27 dias previstos/,
  );
});

test("a confirmação exige o conjunto completo e único de datas do mês", () => {
  const rows = buildCompleteRows(2026, 10);
  const duplicateRows = rows.map((row, index) => index === 1 ? { ...row, date: rows[0].date } : row);

  assert.throws(() => assertCompleteScheduleMonth(duplicateRows, 2026, 10), /dias repetidos/);
  assert.throws(() => assertCompleteScheduleMonth([{ date: "2026-10-04" }], 2026, 10), /domingo/);
  assert.throws(() => assertCompleteScheduleMonth([{ date: "2026-11-02" }], 2026, 10), /fora do mês selecionado/);
});

test("respostas vazias e nomes fora do contrato são rejeitados", () => {
  assert.throws(() => parseSchedulePreviewResponse({ rows: [] }, 2026, 10), /não encontrou dias/);
  assert.throws(
    () => parseSchedulePreviewResponse({ rows: [{ ...buildCompleteRows(2026, 10)[0], morning_shift: 123 }] }, 2026, 10),
    /nome de profissional inválido/,
  );
});
