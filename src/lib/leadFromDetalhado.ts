// Regras para transformar um atendimento do Detalhado em lead da aba Leads.

/** Chave de telefone para detectar duplicados: últimos 8 dígitos (ignora DDI, DDD e o 9 extra). */
export const phoneKey = (phone: string | null | undefined): string => {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(-8) : "";
};

/** Primeiro nome do médico, no mesmo padrão usado na coluna Médico dos Leads (ex.: "Natalia"). */
export const doctorFirstName = (doctor: string | null | undefined): string => {
  if (!doctor) return "";
  const parts = doctor
    .trim()
    .split(/\s+/)
    .filter((p) => !/^dr[a]?\.?$/i.test(p));
  const first = parts[0] || "";
  if (!first) return "";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};

interface ShiftRow {
  date: string;
  morning_shift: string | null;
  afternoon_shift: string | null;
}

/**
 * Médico de plantão segundo a Agenda para um atendimento ("dd/MM/yyyy" + "HH:mm").
 * Antes de 12:00 usa o turno da manhã; depois, o da tarde (com o outro turno como reserva).
 */
export const doctorOnDuty = (schedules: ShiftRow[], date: string, time: string): string => {
  const m = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const row = schedules.find((s) => s.date === iso);
  if (!row) return "";
  const hour = parseInt((time || "").split(":")[0], 10);
  const morning = (row.morning_shift || "").trim();
  const afternoon = (row.afternoon_shift || "").trim();
  const name = !isNaN(hour) && hour >= 12 ? afternoon || morning : morning || afternoon;
  return doctorFirstName(name);
};
