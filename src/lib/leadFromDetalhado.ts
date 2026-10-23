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
