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
