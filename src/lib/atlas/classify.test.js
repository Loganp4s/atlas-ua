import { describe, test, expect } from "bun:test";
import { classifyInput } from "./classify";
const now = new Date(2026, 9, 23, 12);
describe("Interpretação do Atlas", () => {
  test("separa título e período por nome do mês", () => {
    expect(classifyInput("Viagem para o Rio, do dia 20 de novembro até o dia 15 de dezembro", now)).toMatchObject({ category: "compromisso", title: "Viagem para o Rio", date: "2026-11-20", endDate: "2026-12-15" });
  });
  test("período numérico", () => {
    expect(classifyInput("Viagem para o Rio do dia 20/11 ao dia 15/12", now)).toMatchObject({ date: "2026-11-20", endDate: "2026-12-15", title: "Viagem para o Rio" });
  });
  test("virada de ano", () => expect(classifyInput("Viagem de 20 de dezembro até 15 de janeiro", now)).toMatchObject({ date: "2026-12-20", endDate: "2027-01-15" }));
  test("datas impossíveis não são normalizadas", () => expect(classifyInput("Viagem de 31 de novembro até 15 de dezembro", now).error).toBeTruthy());
  test("fevereiro bissexto", () => expect(classifyInput("Viagem de 29/02/2028 até 01/03/2028", now).date).toBe("2028-02-29"));
  test("fevereiro não bissexto", () => expect(classifyInput("Viagem de 29/02/2027 até 01/03/2027", now).error).toBeTruthy());
  test("dentista pontual", () => expect(classifyInput("Dentista quarta às 15h", now)).toMatchObject({ category: "compromisso", title: "Dentista", date: "2026-10-28", time: "15:00" }));
  test("recorrência explícita", () => expect(classifyInput("Correr toda segunda, quarta e sexta", now)).toMatchObject({ category: "rotina", days: ["seg", "qua", "sex"] }));
  test("dia da semana não implica hábito", () => expect(classifyInput("Correr quarta às 15h", now).category).toBe("compromisso"));
  test("compra cotidiana é tarefa", () => expect(classifyInput("Comprar pão", now).category).toBe("prioridade"));
  test("nota explícita", () => expect(classifyInput("Anotar ideia: criar um projeto novo", now).category).toBe("nota"));
  test("texto ambíguo pede categoria", () => expect(classifyInput("Talvez seja interessante pensar sobre aquela conversa de ontem", now).category).toBeNull());
  test("número no título permanece", () => expect(classifyInput("Viagem da turma 20 de 20/11 até 15/12", now).title).toBe("Viagem da turma 20"));
  test("horário inválido não é truncado", () => expect(classifyInput("Dentista quarta às 25h", now).error).toBeTruthy());
  test("ação financeira imediata vira tarefa, nunca movimentação", () => {
    expect(classifyInput("Guardar R$ 50 na conta PicPay", now)).toMatchObject({ category: "prioridade", financial: "acao", amount: 50 });
  });
  test("objetivo de economia com valor", () => {
    expect(classifyInput("Quero juntar R$ 2.000", now)).toMatchObject({ category: "objetivo", financial: "objetivo", amount: 2000 });
  });
  test("ação financeira com prazo", () => {
    expect(classifyInput("Transferir R$ 50 para o PicPay amanhã", now)).toMatchObject({ category: "prioridade", financial: "acao", amount: 50, date: "2026-10-24" });
  });
  test("economia recorrente pede esclarecimento", () => {
    expect(classifyInput("Guardar R$ 50 toda semana", now)).toMatchObject({ category: null, financial: "rotina", amount: 50 });
  });
  test("compromisso com valor continua compromisso", () => {
    expect(classifyInput("Pagar R$ 200 do dentista quarta às 15h", now).category).toBe("compromisso");
  });
  test("valor em reais por extenso", () => {
    expect(classifyInput("Quero juntar 10 mil reais", now)).toMatchObject({ category: "objetivo", financial: "objetivo", amount: 10000 });
  });
});