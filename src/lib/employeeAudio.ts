export const normalizeEmployeeName = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();

export function getEmployeeAudioKey(
  audios: Record<string, string> | null | undefined,
  employeeName: string | null | undefined,
) {
  if (!audios || !employeeName) return null;
  const employeeKey = normalizeEmployeeName(employeeName);
  return Object.keys(audios).find((key) => normalizeEmployeeName(key) === employeeKey) || null;
}

export function getEmployeeAudioUrl(
  audios: Record<string, string> | null | undefined,
  employeeName: string | null | undefined,
) {
  const key = getEmployeeAudioKey(audios, employeeName);
  return key ? audios?.[key] || null : null;
}
