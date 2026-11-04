import { describe, test, expect } from "bun:test";
import { classifyInput } from "./classify";
import { detectFinance, parseAmount } from "./finance-intent";

// Sexta, 23/10/2026 ao meio-dia.
const now = new Date(2026, 9, 23, 12);
const fin = (t) => classifyInput(t, now);

/** Every financial interpretation must stay out of tasks/notes/events. */
function expectNoAutoSave(r) {
  expect(r.category).toBeNull();
  expect(r.finance).toBeDefined();
}

describe("Interpretação financeira do Atlas", () => {
  test("1. entrada recebida", () => {
    const r = fin("Recebi R$ 150 de um corte no PicPay.");
    expectNoAutoSave(r);
    expect(r.finance).toMatchObject({ kind: "entrada", amount: 150, description: "Corte" });
  });
  test("2. salário recebido", () => {
    expect(fin("Caiu meu salário de R$ 2.500.").finance).toMatchObject({ kind: "entrada", amount: 2500, category: "Salário" });
  });
  test("3. gorjeta recebida", () => {
    expect(fin("Ganhei R$ 40 de gorjeta.").finance).toMatchObject({ kind: "entrada", amount: 40, category: "Gorjeta" });
  });
  test("4. saída por compra", () => {
    expect(fin("Comprei gasolina por R$ 50.").finance).toMatchObject({ kind: "saida", amount: 50, category: "Transporte" });
  });
  test("5. pagamento de conta", () => {
    expect(fin("Paguei R$ 80 de aluguel.").finance).toMatchObject({ kind: "saida", amount: 80, category: "Moradia" });
  });
  test("6. transferência entre contas próprias não vira entrada nem saída", () => {
    const r = fin("Transferi R$ 100 do Nubank para o PicPay.");
    expectNoAutoSave(r);
    expect(r.finance.kind).toBe("transferencia");
    expect(fin("Mandei 50 pro Nubank").finance.kind).toBe("transferencia");
  });
  test("7. Pix para outra pessoa não é presumido como transferência própria", () => {
    expect(fin("Fiz um Pix de R$ 50 para a Maria").finance).toMatchObject({ kind: "saida", amount: 50, target: "Maria" });
  });
  test("8. saque não é despesa", () => {
    expect(fin("Saquei R$ 200 no caixa").finance.kind).toBe("saque");
  });
  test("9. investimento não é despesa", () => {
    expect(fin("Investi R$ 300 no CDB").finance.kind).toBe("investimento");
  });
  test("10. intenção de guardar dinheiro não é movimentação", () => {
    const r = fin("Quero guardar R$ 50 no PicPay.");
    expect(r.finance).toBeUndefined();
    expect(r).toMatchObject({ category: null, financial: "intencao", amount: 50 });
    expect(fin("Quero investir R$ 300").financial).toBe("intencao");
  });
  test("11. objetivo financeiro segue para Objetivos", () => {
    const r = fin("Quero juntar R$ 2.000 para comprar uma moto.");
    expect(r).toMatchObject({ category: "objetivo", financial: "objetivo", amount: 2000 });
    expect(r.finance).toBeUndefined();
  });
  test("12. conta pendente", () => {
    expect(fin("Minha conta de luz vence dia 10").finance).toMatchObject({ kind: "conta", date: "2026-11-10", description: "Conta de luz" });
    expect(fin("Devo R$ 300 para João").finance).toMatchObject({ kind: "conta", amount: 300, description: "Dívida com João" });
  });
  test("13. pagamento realizado de boleto é saída, não nova conta", () => {
    expect(fin("Paguei o boleto de R$ 150").finance).toMatchObject({ kind: "saida", amount: 150 });
  });
  test("14. entrada futura não é entrada realizada", () => {
    expect(fin("Vou receber R$ 50 amanhã").finance).toMatchObject({ kind: "entrada_prevista", amount: 50, date: "2026-10-24" });
  });
  test("15. saída futura vira obrigação pendente", () => {
    expect(fin("Vou pagar R$ 50 amanhã").finance).toMatchObject({ kind: "conta", amount: 50, date: "2026-10-24" });
    expect(fin("Preciso pagar R$ 50").finance).toMatchObject({ kind: "conta", amount: 50 });
    expect(fin("Tenho uma parcela de R$ 200 amanhã").finance).toMatchObject({ kind: "conta", amount: 200, date: "2026-10-24" });
  });
  test("16. consulta de saldo", () => {
    expect(fin("Quanto tenho?").finance).toMatchObject({ kind: "consulta", query: "saldo" });
    expect(fin("Qual meu saldo?").finance).toMatchObject({ kind: "consulta", query: "saldo" });
    expect(fin("Qual conta tem mais dinheiro?").finance.query).toBe("conta_maior");
  });
  test("17. consulta de despesas", () => {
    expect(fin("Quanto gastei este mês?").finance.query).toBe("gastos_mes");
    expect(fin("Quais são minhas despesas?").finance.query).toBe("despesas");
    expect(fin("Quanto recebi?").finance.query).toBe("entradas_mes");
    expect(fin("Quanto falta para minha meta?").finance.query).toBe("meta");
  });
  test("18. reembolso preserva a natureza", () => {
    expect(fin("Recebi um reembolso de R$ 60 da empresa").finance).toMatchObject({ kind: "entrada", amount: 60, refund: true, category: "Reembolso" });
  });
  test("19. valores em reais", () => {
    expect(parseAmount("R$ 1.234,56").value).toBe(1234.56);
    expect(parseAmount("R$ 2.500").value).toBe(2500);
    expect(parseAmount("10 mil reais").value).toBe(10000);
    expect(parseAmount("R$ 12,50").value).toBe(12.5);
  });
  test("20. valores informais (conto, pila, sem símbolo)", () => {
    expect(fin("Caiu 50 conto no PicPay").finance).toMatchObject({ kind: "entrada", amount: 50 });
    expect(fin("Fiz 100 pila hoje").finance).toMatchObject({ kind: "entrada", amount: 100, date: "2026-10-23" });
    expect(fin("Pingou 200 na conta").finance).toMatchObject({ kind: "entrada", amount: 200 });
    expect(fin("Gastei 30 conto de gasolina").finance).toMatchObject({ kind: "saida", amount: 30 });
    expect(fin("Entrou uma grana de 150").finance).toMatchObject({ kind: "entrada", amount: 150 });
  });
  test("21. frase ambígua pede esclarecimento", () => {
    const r = fin("Quero receber R$ 50");
    expectNoAutoSave(r);
    expect(r.finance.kind).toBe("ambigua");
  });
  test("22. mensagem sem valor financeiro não vira movimentação", () => {
    expect(detectFinance("Recebi 3 mensagens da Ana", now)).toBeNull();
    expect(detectFinance("Comprar pão", now)).toBeNull();
    expect(detectFinance("Correr toda segunda", now)).toBeNull();
    expect(detectFinance("Ganhei 2 kg", now)).toBeNull();
    expect(fin("Comprar pão").category).toBe("prioridade");
  });
  test("23. entrada sem conta identificada não inventa conta", () => {
    const r = fin("Recebi R$ 80 de comissão");
    expect(r.finance).toMatchObject({ kind: "entrada", amount: 80, category: "Comissão" });
    expect(r.finance.source).toBeUndefined();
    expect(r.finance.target).toBeUndefined();
  });
  test("24. mensagem financeira com data específica", () => {
    expect(fin("Paguei R$ 120 de internet ontem").finance).toMatchObject({ kind: "saida", amount: 120, date: "2026-10-22" });
    expect(fin("Recebi R$ 90 dia 20/10").finance).toMatchObject({ kind: "entrada", amount: 90, date: "2026-10-20" });
  });
  test("compra parcelada não confunde total com parcela", () => {
    const r = fin("Comprei um celular de R$ 1.200 em 12x").finance;
    expect(r).toMatchObject({ kind: "saida", amount: 1200, installments: 12 });
  });
  test("lembretes no infinitivo continuam tarefas", () => {
    expect(fin("Pagar R$ 200 do dentista quarta às 15h").category).toBe("compromisso");
    expect(fin("Transferir R$ 50 para o PicPay amanhã")).toMatchObject({ category: "prioridade", financial: "acao" });
  });
});
