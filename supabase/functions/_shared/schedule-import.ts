export type ScheduleDateEntry = {
  date: string;
};

export type SchedulePreviewRow = {
  sheet_name: string;
  date: string;
  day_of_week: string;
  morning_shift: string;
  afternoon_shift: string;
  morning_shift_professional_id: string | null;
  afternoon_shift_professional_id: string | null;
};

const DAY_NAMES = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];

export class ScheduleImportValidationError extends Error {
  readonly status = 422;

  constructor(message: string) {
    super(message);
    this.name = "ScheduleImportValidationError";
  }
}

export function getExpectedScheduleDates(year: number, month: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new ScheduleImportValidationError("Informe um mês e ano válidos para a escala.");
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: daysInMonth }, (_, index) => index + 1)
    .filter((day) => new Date(Date.UTC(year, month - 1, day)).getUTCDay() !== 0)
    .map((day) => `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
}

export function assertCompleteScheduleMonth(entries: ScheduleDateEntry[], year: number, month: number) {
  const expectedDates = getExpectedScheduleDates(year, month);
  const expected = new Set(expectedDates);
  const seen = new Set<string>();

  for (const entry of entries) {
    const match = typeof entry?.date === "string" ? entry.date.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
    if (!match) throw new ScheduleImportValidationError("A prévia contém uma data inválida. Gere outra prévia.");

    const [, dateYear, dateMonth, dateDay] = match;
    const day = Number(dateDay);
    const date = new Date(Date.UTC(Number(dateYear), Number(dateMonth) - 1, day));
    if (date.getUTCFullYear() !== year || Number(dateMonth) !== month || date.getUTCDate() !== day) {
      throw new ScheduleImportValidationError("A prévia contém uma data fora do mês selecionado. Gere outra prévia.");
    }
    if (date.getUTCDay() === 0) throw new ScheduleImportValidationError("A prévia contém domingo. Revise a escala.");
    if (!expected.has(entry.date)) throw new ScheduleImportValidationError("A prévia contém uma data fora do mês selecionado. Gere outra prévia.");
    if (seen.has(entry.date)) throw new ScheduleImportValidationError("A prévia contém dias repetidos. Gere outra prévia.");
    seen.add(entry.date);
  }

  if (seen.size !== expected.size) {
    throw new ScheduleImportValidationError(
      `A leitura encontrou ${seen.size} de ${expected.size} dias previstos. Revise a imagem antes de substituir a escala.`,
    );
  }
}

export function parseSchedulePreviewResponse(
  payload: unknown,
  year: number,
  month: number,
  sheetName = "Escala",
): SchedulePreviewRow[] {
  const expectedDates = getExpectedScheduleDates(year, month);
  const rows = typeof payload === "object" && payload !== null && "rows" in payload
    ? (payload as { rows?: unknown }).rows
    : null;

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ScheduleImportValidationError("A análise não encontrou dias para a escala. Tente uma imagem mais nítida.");
  }
  if (rows.length > expectedDates.length) {
    throw new ScheduleImportValidationError("A prévia contém mais dias do que o mês selecionado. Gere outra prévia.");
  }

  const parsedRows = rows.map((value): SchedulePreviewRow => {
    if (typeof value !== "object" || value === null) {
      throw new ScheduleImportValidationError("A prévia contém uma linha inválida. Gere outra prévia.");
    }

    const row = value as Record<string, unknown>;
    if (typeof row.date !== "string") {
      throw new ScheduleImportValidationError("A prévia contém uma data inválida. Gere outra prévia.");
    }
    if (typeof row.morning_shift !== "string" || typeof row.afternoon_shift !== "string"
      || row.morning_shift.length > 200 || row.afternoon_shift.length > 200) {
      throw new ScheduleImportValidationError("A prévia contém um nome de profissional inválido. Gere outra prévia.");
    }

    const dateMatch = row.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateMatch) throw new ScheduleImportValidationError("A prévia contém uma data inválida. Gere outra prévia.");
    const date = new Date(Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3])));

    return {
      sheet_name: sheetName,
      date: row.date,
      day_of_week: DAY_NAMES[date.getUTCDay()],
      morning_shift: row.morning_shift.trim(),
      afternoon_shift: row.afternoon_shift.trim(),
      morning_shift_professional_id: null,
      afternoon_shift_professional_id: null,
    };
  });

  assertCompleteScheduleMonth(parsedRows, year, month);
  return parsedRows.sort((left, right) => left.date.localeCompare(right.date));
}
