import { test, expect } from 'bun:test';
import { incomeValue, expenseValue, isReversal } from './flows';
import { canDeletePlan, installmentState, planProgress, summarizeInstallments } from './installments';
import { answerFinanceQuery, accountBalance } from '@/lib/atlas/finance-query';
import { computeBalanceBreakdown } from './api';

const original = { id: 'payment', account_id: 'a', type: 'saida', amount: 40, category: 'Compras', tx_date: '2026-11-26' };
const refund = { id: 'refund', account_id: 'a', type: 'entrada', amount: 40, category: 'Compras', tx_date: '2026-11-26', reversal_of_transaction_id: original.id };
const account = { id: 'a', name: 'Conta', initial_balance: 120, archived: false };
const item = { id: 'i', plan_id: 'p', status: 'estornada', amount: 40, number: 1, due_date: '2026-11-26', paid_at: '2026-11-26', transaction_id: 'payment', refund_transaction_id: 'refund' };

test('R$120: pagar R$40 reduz saldo para R$80; estornar devolve R$120', () => {
 expect(computeBalanceBreakdown([account], [original]).active.balance).toBe(80);
 expect(computeBalanceBreakdown([account], [original, refund]).active.balance).toBe(120);
 expect(accountBalance(account, [original, refund])).toBe(120);
});
test('estorno de R$40 não vira receita comum', () => {
 expect(isReversal(refund)).toBe(true);
 expect(incomeValue(refund)).toBe(0);
 expect(incomeValue({type:'entrada',amount:40})).toBe(40);
});
test('estorno reduz a despesa original de R$40 para zero', () => {
 expect(expenseValue(original) + expenseValue(refund)).toBe(0);
 expect(expenseValue(refund)).toBe(-40);
});
test('parcelamento ativo sem pagamentos pode ser excluído', () => expect(canDeletePlan([{status:'aberta'}])).toBe(true));
test('parcelamento cancelado sem pagamentos pode ser excluído', () => expect(canDeletePlan([{status:'cancelada'}])).toBe(true));
test('parcela paga impede exclusão até ser estornada', () => expect(canDeletePlan([{status:'paga'},{status:'cancelada'}])).toBe(false));
test('parcelamento com estornos, sem pagamentos ativos, pode ser excluído', () => expect(canDeletePlan([item,{status:'cancelada'}])).toBe(true));
test('estornada não volta à previsão, nem aparece como pagamento ativo', () => {
 expect(installmentState(item, '2026-11-26')).toBe('estornada');
 const s=summarizeInstallments([{id:'p',status:'cancelado'}],[item],'2026-11-26',30);
 expect([s.commitments,s.paidInPeriod,s.next.length]).toEqual([0,0,0]);
 expect(planProgress([item])).toMatchObject({paid:0,remaining:0,refunded:40,paidCount:0,refundedCount:1});
});
test('consulta do Atlas não conta estorno como receita e desconta dos gastos', () => {
 const data={accounts:[account],transactions:[original,refund],goals:[]};
 const now=new Date(2026,10,26,12);
 expect(answerFinanceQuery('entradas_mes',data,now)).toBe('Você não registrou entradas neste mês.');
 const r=answerFinanceQuery('gastos_mes',data,now);
 expect(r).toContain('0,00');
 expect(r).not.toContain('40,00');
});
