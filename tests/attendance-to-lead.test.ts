import assert from "node:assert/strict";
import test from "node:test";
import { buildLeadFromAttendance, isSamePhone } from "../src/lib/leads.ts";

test("lead criado a partir do Detalhado copia nome, telefone, médico e canal", () => {
  const lead = buildLeadFromAttendance({
    patient_name: "ALESSANDRA COUTO",
    patient_phone: "(31) 98321-4694",
    como_conheceu: "INTERNET",
    doctor_name: "Vitor Porto",
    venda: "Não",
    obs: "",
  });
  assert.equal(lead.nome, "ALESSANDRA COUTO");
  assert.equal(lead.numero, "(31) 98321-4694");
  assert.equal(lead.canal, "Internet");
  assert.equal(lead.medico, "Vitor Porto");
  assert.equal(lead.venda, "Não");
});

test("origem que não é um canal de Leads fica em branco para o vendedor escolher", () => {
  assert.equal(buildLeadFromAttendance({ como_conheceu: "METROPAX" }).canal, "");
});

test("venda marcada como sim no Detalhado vai como Sim para Leads", () => {
  assert.equal(buildLeadFromAttendance({ venda: "sim" }).venda, "Sim");
});

test("telefones com formatos diferentes são reconhecidos como o mesmo cliente", () => {
  assert.equal(isSamePhone("(31) 98321-4694", "5531983214694"), true);
  assert.equal(isSamePhone("(31) 98321-4694", "(31) 99449-4565"), false);
});
