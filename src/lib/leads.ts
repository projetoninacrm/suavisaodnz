const normalizeChannel = (value?: string | null) =>
  (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

export const classifyCanal = (canal?: string | null): string => {
  const value = normalizeChannel(canal);
  if (value === "sua visao") return "Sua Visão";
  if (value === "loja") return "Loja";
  if (value === "du beneficios") return "Du Benefícios";
  if (value === "indique e ganhe" || value === "indique ganhe") return "Indique e Ganhe";
  if (value === "internet" || value === "google" || value === "facebook") return "Internet";
  return "Sem Canal";
};

export interface AttendanceLeadSource {
  patient_name?: string | null;
  patient_phone?: string | null;
  como_conheceu?: string | null;
  doctor_name?: string | null;
  venda?: string | null;
  obs?: string | null;
}

export interface AttendanceLeadDraft {
  nome: string;
  numero: string;
  canal: string;
  medico: string;
  venda: string;
  obs: string;
}

/** Copies what the attendance already knows; sellers fill the remaining lead fields. */
export const buildLeadFromAttendance = (record: AttendanceLeadSource): AttendanceLeadDraft => {
  const canal = classifyCanal(record.como_conheceu);
  return {
    nome: (record.patient_name || "").trim(),
    numero: (record.patient_phone || "").trim(),
    canal: canal === "Sem Canal" ? "" : canal,
    medico: (record.doctor_name || "").trim(),
    venda: normalizeChannel(record.venda) === "sim" ? "Sim" : "Não",
    obs: (record.obs || "").trim(),
  };
};

/** Same phone when the last 8 digits match, ignoring country/area code and formatting. */
export const isSamePhone = (a?: string | null, b?: string | null): boolean => {
  const da = (a || "").replace(/\D/g, "");
  const db = (b || "").replace(/\D/g, "");
  if (da.length < 8 || db.length < 8) return false;
  return da.slice(-8) === db.slice(-8);
};
