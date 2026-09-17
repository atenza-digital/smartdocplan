import { describe, expect, it } from "vitest";
import {
  brazilToday,
  calendarDays,
  deadlineDays,
  vacationDisplayStatus,
} from "../shared/vacations";
import { validateDocumentFile } from "./uploadFiles";

describe("Férias: calendário, prazos e validação de arquivos", () => {
  it("conta dias corridos inclusivos sem calcular saldo legal", () => {
    expect(calendarDays("2028-02-28", "2028-03-01")).toBe(3);
    expect(calendarDays("2026-12-31", "2027-01-01")).toBe(2);
    expect(calendarDays("2026-01-01", "2026-01-01")).toBe(1);
  });
  it("usa a data brasileira perto da meia-noite UTC", () => {
    expect(brazilToday(new Date("2026-09-17T01:00:00Z"))).toBe("2026-09-16");
  });
  it("deriva andamento e encerramento somente para períodos aprovados", () => {
    const dates = { startDate: "2026-09-10", endDate: "2026-09-20" };
    expect(
      vacationDisplayStatus({ ...dates, status: "pendente" }, "2026-09-17")
    ).toBe("pendente");
    expect(
      vacationDisplayStatus({ ...dates, status: "aprovado" }, "2026-09-09")
    ).toBe("aprovado");
    expect(
      vacationDisplayStatus({ ...dates, status: "aprovado" }, "2026-09-20")
    ).toBe("em_ferias");
    expect(
      vacationDisplayStatus({ ...dates, status: "aprovado" }, "2026-09-21")
    ).toBe("concluido");
    expect(deadlineDays(null)).toBeNull();
    expect(deadlineDays("2026-09-16", "2026-09-17")).toBe(-1);
  });
  it("verifica conteúdo e tamanho real do anexo", () => {
    expect(() => validateDocumentFile("!invalid!")).toThrow();
    expect(() =>
      validateDocumentFile(
        Buffer.from("<html>fake.pdf</html>").toString("base64")
      )
    ).toThrow();
    const large = Buffer.alloc(10 * 1024 * 1024 + 1);
    large.write("%PDF-1.4");
    expect(() => validateDocumentFile(large.toString("base64"))).toThrow();
    expect(
      validateDocumentFile(Buffer.from("%PDF-1.4\n%%EOF").toString("base64"))
    ).toBeTruthy();
  });
});
