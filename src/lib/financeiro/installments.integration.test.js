// Real PostgreSQL tests against a disposable local database — never the project's Cloud database.
// Opt-in: ATLAS_INSTALLMENT_TEST_DATABASE_URL=postgres://atlas_test@127.0.0.1:55431/atlas_inst_test bun test src/lib/financeiro/installments.integration.test.js
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import postgres from "postgres";
import { readFile, readdir } from "node:fs/promises";
const { computeBalanceBreakdown } = await import("@/lib/financeiro/api");
const { summarizeInstallments } = await import("@/lib/financeiro/installments");

const url = process.env["ATLAS_INSTALLMENT_TEST_DATABASE_URL"];
if (url) {
  const u = new URL(url);
  if (u.hostname !== "127.0.0.1" || u.pathname !== "/atlas_inst_test") {
    throw new Error("Integration tests require an isolated localhost atlas_inst_test database.");
  }
}
const suite = url ? describe : describe.skip;
const U1 = "10000000-0000-4000-8000-000000000001";
const U2 = "10000000-0000-4000-8000-000000000002";
const ACC = "30000000-0000-4000-8000-000000000001";
const ACC2 = "30000000-0000-4000-8000-000000000002";
const ARC = "30000000-0000-4000-8000-000000000003";
const OTHER = "30000000-0000-4000-8000-000000000004";
const key = () => crypto.randomUUID();

suite("parcelamentos — PostgreSQL real isolado", () => {
  let db;
  const as = (uid, fn) => db.begin(async (t) => {
    await t.unsafe("SET LOCAL ROLE authenticated");
    await t`SELECT set_config('test.uid', ${uid ?? ""}, true)`;
    return fn(t);
  });
  const create = (uid, o = {}) => {
    const p = { acc: ACC, desc: "Notebook", cat: "Eletrônicos", total: "100.00", n: 3, first: "2026-01-31", req: key(), ...o };
    return as(uid, (t) => t`SELECT public.create_fin_installment_plan(${p.acc}::uuid, ${p.desc}, ${p.cat}, ${p.total}::numeric, ${p.n}::int, ${p.first}::date, ${p.req}::uuid) AS r`).then((r) => r[0].r);
  };
  const pay = (uid, inst, acc = ACC, date = "2026-02-01", req = key()) =>
    as(uid, (t) => t`SELECT public.pay_fin_installment(${inst}::uuid, ${acc}::uuid, ${date}::date, ${req}::uuid) AS r`).then((r) => r[0].r);
  const insts = (plan) => db`SELECT * FROM fin_installments WHERE plan_id=${plan} ORDER BY number`;
  const txCount = async () => Number((await db`SELECT count(*) c FROM fin_transactions`)[0].c);
  const err = async (p) => { try { await p; return null; } catch (e) { return e; } };

  beforeAll(async () => {
    if (!url) return;
    db = postgres(url, { max: 12, ssl: false, onnotice: () => {} });
    await db.unsafe(`
      DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;
      DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE ROLE service_role; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA public, auth TO authenticated, anon, service_role;
      GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon, service_role;
      CREATE TYPE public.fin_account_type AS ENUM ('corrente','poupanca','carteira','cartao','investimento');
      CREATE TYPE public.fin_tx_type AS ENUM ('entrada','saida');
      CREATE TYPE public.fin_recurrence AS ENUM ('none','diaria','semanal','mensal','anual');
      CREATE TABLE public.fin_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, name text NOT NULL,
        type public.fin_account_type NOT NULL DEFAULT 'corrente', initial_balance numeric NOT NULL DEFAULT 0,
        archived boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
      GRANT SELECT,INSERT,UPDATE,DELETE ON public.fin_accounts TO authenticated;
      ALTER TABLE public.fin_accounts ENABLE ROW LEVEL SECURITY;
      CREATE POLICY own_acc ON public.fin_accounts TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
      CREATE TABLE public.fin_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
        account_id uuid REFERENCES public.fin_accounts(id) ON DELETE SET NULL,
        type public.fin_tx_type NOT NULL, amount numeric NOT NULL, category text, description text,
        tx_date date NOT NULL DEFAULT current_date, recurrence public.fin_recurrence NOT NULL DEFAULT 'none',
        installment_group uuid, installment_index integer, installment_total integer,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
      GRANT SELECT,INSERT,UPDATE,DELETE ON public.fin_transactions TO authenticated;
      ALTER TABLE public.fin_transactions ENABLE ROW LEVEL SECURITY;
      CREATE POLICY own_tx ON public.fin_transactions TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
    `);
    const dir = new URL("../../../drizzle/migrations/", import.meta.url);
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    const migrations = await Promise.all(files.map((f) => readFile(new URL(f, dir), "utf8")));
    const base = migrations.findIndex((s) => s.includes("CREATE OR REPLACE FUNCTION public.create_fin_installment_plan("));
    if (base < 0) throw new Error("installment migration not found");
    for (const sql of migrations.slice(base)) await db.unsafe(sql);
    await db`INSERT INTO fin_accounts (id,user_id,name,initial_balance,archived) VALUES
      (${ACC},${U1},'Nubank',2000,false),(${ACC2},${U1},'PicPay',0,false),(${ARC},${U1},'Velha',0,true),(${OTHER},${U2},'Alheia',0,false)`;
    // Legacy movement (pre-1.5.1) stays untouched.
    await db`INSERT INTO fin_transactions (user_id,account_id,type,amount,tx_date,recurrence,installment_total,installment_index)
      VALUES (${U1},${ACC},'saida',10,'2025-01-01','diaria',3,1)`;
  });
  afterAll(async () => { if (db) await db.end(); });

  test("cria a série completa com centavos exatos e vencimentos de fim de mês", async () => {
    const r = await create(U1, { first: "2027-01-31", n: 6, total: "1000.00" });
    expect(r.duplicate).toBe(false);
    const rows = await insts(r.plan_id);
    expect(rows.map((x) => x.amount)).toEqual(["166.67", "166.67", "166.67", "166.67", "166.66", "166.66"]);
    expect(rows.map((x) => x.due_date.toISOString().slice(0, 10))).toEqual(["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30", "2027-05-31", "2027-06-30"]);
    const leap = await insts((await create(U1, { first: "2027-12-31", n: 3 })).plan_id);
    expect(leap.map((x) => x.due_date.toISOString().slice(0, 10))).toEqual(["2027-12-31", "2028-01-31", "2028-02-29"]);
    const c = await insts((await create(U1, { total: "99.99", n: 4 })).plan_id);
    expect(c.map((x) => x.amount)).toEqual(["25.00", "25.00", "25.00", "24.99"]);
  });

  test("12 e 72 parcelas; 73 é rejeitado", async () => {
    expect((await insts((await create(U1, { n: 12, total: "1200" })).plan_id)).length).toBe(12);
    expect((await insts((await create(U1, { n: 72, total: "720" })).plan_id)).length).toBe(72);
    expect((await err(create(U1, { n: 73 })))?.code).toBe("22023");
  });

  test("rejeita valores e quantidades inválidos, sem deixar nada", async () => {
    const before = Number((await db`SELECT count(*) c FROM fin_installment_plans`)[0].c);
    for (const o of [{ total: "0" }, { total: "-5" }, { total: "10.001" }, { total: "1e12" }, { n: 1 }, { total: "0.02", n: 3 }, { desc: "  " }]) {
      expect((await err(create(U1, o)))?.code).toBe("22023");
    }
    expect(Number((await db`SELECT count(*) c FROM fin_installment_plans`)[0].c)).toBe(before);
  });

  test("sessão anônima, conta alheia e conta arquivada são recusadas", async () => {
    expect((await err(create(null)))?.code).toBe("28000");
    expect((await err(create(U1, { acc: OTHER })))?.code).toBe("P0002");
    expect((await err(create(U1, { acc: ARC })))?.code).toBe("22023");
  });

  test("rollback completo quando uma parcela falha", async () => {
    const before = Number((await db`SELECT count(*) c FROM fin_installment_plans`)[0].c);
    await db.unsafe(`CREATE OR REPLACE FUNCTION public.t_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.number = 3 THEN RAISE EXCEPTION 'boom'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER t_fail BEFORE INSERT ON public.fin_installments FOR EACH ROW EXECUTE FUNCTION public.t_fail();`);
    expect(await err(create(U1, { n: 5 }))).not.toBeNull();
    await db.unsafe("DROP TRIGGER t_fail ON public.fin_installments");
    expect(Number((await db`SELECT count(*) c FROM fin_installment_plans`)[0].c)).toBe(before);
  });

  test("idempotência: mesma chave devolve o original; dados diferentes = conflito; concorrência sem duplicar", async () => {
    const req = key();
    const a = await create(U1, { req });
    const b = await create(U1, { req });
    expect(b).toEqual({ plan_id: a.plan_id, duplicate: true });
    expect((await err(create(U1, { req, total: "101" })))?.code).toBe("PT409");
    expect((await err(create(U1, { req, n: 4 })))?.code).toBe("PT409");
    const req2 = key();
    const all = await Promise.all(Array.from({ length: 8 }, () => create(U1, { req: req2 })));
    expect(new Set(all.map((x) => x.plan_id)).size).toBe(1);
    expect(all.filter((x) => !x.duplicate).length).toBe(1);
    expect((await db`SELECT count(*) c FROM fin_installment_plans WHERE client_request_id=${req2}`)[0].c).toBe("1");
  });

  test("RLS: tabelas só leitura e só do dono", async () => {
    const { plan_id } = await create(U1);
    const seen = await as(U2, (t) => t`SELECT count(*) c FROM fin_installments WHERE plan_id=${plan_id}`);
    expect(seen[0].c).toBe("0");
    expect(await err(as(U1, (t) => t`UPDATE fin_installments SET amount=1 WHERE plan_id=${plan_id}`))).not.toBeNull();
    expect(await err(as(U1, (t) => t`DELETE FROM fin_installment_plans WHERE id=${plan_id}`))).not.toBeNull();
    expect(await err(as(U1, (t) => t`INSERT INTO fin_installments (user_id,plan_id,number,amount,due_date) VALUES (${U1},${plan_id},9,1,'2026-01-01')`))).not.toBeNull();
    const [i1] = await insts(plan_id);
    expect((await err(pay(U2, i1.id, OTHER)))?.code).toBe("P0002");
  });

  test("pagamento cria uma saída única, atômica e idempotente; saldo só muda após pagar", async () => {
    const { plan_id } = await create(U1, { total: "600", n: 3, first: "2026-01-10" });
    const [i1, i2] = await insts(plan_id);
    const accounts = async () => (await db`SELECT * FROM fin_accounts WHERE user_id=${U1}`).map((a) => ({ ...a, initial_balance: Number(a.initial_balance) }));
    const txs = async () => (await db`SELECT * FROM fin_transactions WHERE user_id=${U1}`).map((t) => ({ ...t, amount: Number(t.amount) }));
    const before = computeBalanceBreakdown(await accounts(), await txs()).active.balance;
    const req = key();
    const n0 = await txCount();
    const r = await pay(U1, i1.id, ACC, "2026-01-15", req);
    expect(r.duplicate).toBe(false);
    expect(await pay(U1, i1.id, ACC, "2026-01-15", req)).toEqual({ transaction_id: r.transaction_id, duplicate: true });
    expect((await err(pay(U1, i1.id, ACC, "2026-01-16", req)))?.code).toBe("PT409");
    expect((await err(pay(U1, i1.id)))?.code).toBe("PT410");
    expect(await txCount()).toBe(n0 + 1);
    const [tx] = await db`SELECT * FROM fin_transactions WHERE id=${r.transaction_id}`;
    expect(tx.amount).toBe("200.00");
    expect(tx.tx_date.toISOString().slice(0, 10)).toBe("2026-01-15");
    const [row] = await db`SELECT * FROM fin_installments WHERE id=${i1.id}`;
    expect(row.due_date.toISOString().slice(0, 10)).toBe("2026-01-10");
    expect(row.status).toBe("paga");
    expect(computeBalanceBreakdown(await accounts(), await txs()).active.balance).toBe(before - 200);
    // concurrent pays with distinct keys: exactly one wins
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => pay(U1, i2.id)));
    expect(results.filter((x) => x.status === "fulfilled").length).toBe(1);
    expect(await txCount()).toBe(n0 + 2);
  });

  test("pagamento: conta arquivada/alheia, data futura e falha na movimentação não deixam meio registro", async () => {
    const { plan_id } = await create(U1);
    const [i1] = await insts(plan_id);
    expect((await err(pay(U1, i1.id, ARC)))?.code).toBe("22023");
    expect((await err(pay(U1, i1.id, OTHER)))?.code).toBe("P0002");
    expect((await err(pay(U1, i1.id, ACC, "2099-01-01")))?.code).toBe("22023");
    const n0 = await txCount();
    await db.unsafe(`CREATE OR REPLACE FUNCTION public.t_fail2() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'boom'; END $$;
      CREATE TRIGGER t_fail2 BEFORE UPDATE ON public.fin_installments FOR EACH ROW EXECUTE FUNCTION public.t_fail2();`);
    expect(await err(pay(U1, i1.id))).not.toBeNull();
    await db.unsafe("DROP TRIGGER t_fail2 ON public.fin_installments");
    expect(await txCount()).toBe(n0);
    expect((await db`SELECT status FROM fin_installments WHERE id=${i1.id}`)[0].status).toBe("aberta");
    // paying from a different active account than the plan's origin
    const r = await pay(U1, i1.id, ACC2, "2026-03-01");
    expect((await db`SELECT account_id FROM fin_transactions WHERE id=${r.transaction_id}`)[0].account_id).toBe(ACC2);
    expect((await db`SELECT account_id FROM fin_installment_plans WHERE id=${plan_id}`)[0].account_id).toBe(ACC);
  });

  test("pagamento vinculado não pode ser editado nem excluído diretamente", async () => {
    const { plan_id } = await create(U1);
    const [i1] = await insts(plan_id);
    const { transaction_id } = await pay(U1, i1.id);
    expect((await err(as(U1, (t) => t`UPDATE fin_transactions SET amount=1 WHERE id=${transaction_id}`)))?.code).toBe("PT423");
    expect((await err(as(U1, (t) => t`DELETE FROM fin_transactions WHERE id=${transaction_id}`)))?.code).toBe("PT423");
    await as(U1, (t) => t`UPDATE fin_transactions SET description='Notebook novo' WHERE id=${transaction_id}`);
  });
  for (const offset of [-1, 0]) {
    test(`RPC direta permite pagamento ${offset === -1 ? "ontem" : "hoje"}, sem duplicação`, async () => {
      const [{ date }] = await db`SELECT to_char(current_date + ${offset}::int, 'YYYY-MM-DD') AS date`;
      const { plan_id } = await create(U1);
      const [item] = await insts(plan_id);
      const req = key();
      const before = await txCount();
      const result = await pay(U1, item.id, ACC, date, req);
      expect(result.duplicate).toBe(false);
      expect(await pay(U1, item.id, ACC, date, req)).toEqual({ transaction_id: result.transaction_id, duplicate: true });
      expect((await err(pay(U1, item.id, ACC, date)))?.code).toBe("PT410");
      expect(await txCount()).toBe(before + 1);
      expect((await db`SELECT to_char(paid_at,'YYYY-MM-DD') AS date FROM fin_installments WHERE id=${item.id}`)[0].date).toBe(date);
    });
  }
  test("RPC direta rejeita amanhã sem movimentação nem alteração da parcela", async () => {
    const [{ date }] = await db`SELECT to_char(current_date + 1, 'YYYY-MM-DD') AS date`;
    const { plan_id } = await create(U1);
    const [item] = await insts(plan_id);
    const before = await txCount();
    expect((await err(pay(U1, item.id, ACC, date)))?.code).toBe("22023");
    expect(await txCount()).toBe(before);
    const [row] = await db`SELECT status, paid_at, transaction_id, pay_request_id FROM fin_installments WHERE id=${item.id}`;
    expect([row.status, row.paid_at, row.transaction_id, row.pay_request_id]).toEqual(["aberta", null, null, null]);
  });

  test("edição sem pagas recalcula a série; com pagas preserva as pagas", async () => {
    const { plan_id } = await create(U1, { total: "100", n: 3 });
    const edit = (o = {}) => { const p = { acc: ACC, desc: "Notebook", cat: null, total: "90", n: 3, first: "2026-01-31", ...o };
      return as(U1, (t) => t`SELECT public.update_fin_installment_plan(${plan_id}::uuid, ${p.acc}::uuid, ${p.desc}, ${p.cat}, ${p.total}::numeric, ${p.n}::int, ${p.first}::date)`); };
    await edit({ n: 4, total: "10", first: "2026-02-28" });
    let rows = await insts(plan_id);
    expect(rows.map((x) => x.amount)).toEqual(["2.50", "2.50", "2.50", "2.50"]);
    expect(rows.map((x) => x.due_date.toISOString().slice(0, 10))).toEqual(["2026-02-28", "2026-03-28", "2026-04-28", "2026-05-28"]);
    await pay(U1, rows[0].id);
    expect((await err(edit({ first: "2026-03-01", total: "10", n: 4 })))?.code).toBe("PT422");
    expect((await err(edit({ first: "2026-02-28", total: "2.50", n: 4 })))?.code).toBe("PT422");
    await edit({ first: "2026-02-28", total: "10", n: 3 });
    rows = await insts(plan_id);
    expect(rows.map((x) => [x.number, x.amount, x.status])).toEqual([[1, "2.50", "paga"], [2, "3.75", "aberta"], [3, "3.75", "aberta"]]);
    expect(rows.reduce((s, x) => s + Math.round(Number(x.amount) * 100), 0)).toBe(1000);
    expect((await err(edit({ first: "2026-02-28", acc: ARC })))?.code).toBe("22023");
  });

  test("cancelamento preserva pagas, exige confirmação para vencidas e não cria movimentação", async () => {
    const { plan_id } = await create(U1, { first: "2020-01-10", n: 3 });
    const [i1] = await insts(plan_id);
    await pay(U1, i1.id);
    const n0 = await txCount();
    const cancel = (c) => as(U1, (t) => t`SELECT public.cancel_fin_installment_plan(${plan_id}::uuid, ${c}, null) AS r`).then((r) => r[0].r);
    expect((await err(cancel(false)))?.code).toBe("PT428");
    expect((await cancel(true)).cancelled).toBe(2);
    expect((await cancel(true)).duplicate).toBe(true);
    const rows = await insts(plan_id);
    expect(rows.map((x) => x.status)).toEqual(["paga", "cancelada", "cancelada"]);
    expect(await txCount()).toBe(n0);
    expect((await err(pay(U1, rows[1].id)))?.code).toBe("PT410");
    const sum = summarizeInstallments([{ id: plan_id, status: "cancelado" }], rows.map((r) => ({ ...r, amount: Number(r.amount), due_date: r.due_date.toISOString().slice(0, 10) })), "2026-01-01", 365);
    expect(sum.upcomingCount).toBe(0);
  });

  test("registro legado continua intacto", async () => {
    const [l] = await db`SELECT * FROM fin_transactions WHERE tx_date='2025-01-01'`;
    expect([l.recurrence, l.installment_total, l.installment_index, l.amount]).toEqual(["diaria", 3, 1, "10"]);
  });

  // ---- Etapa 1.5.1: exclusão e estorno ----
  const refund = (uid, inst, req = key()) =>
    as(uid, (t) => t`SELECT public.refund_fin_installment(${inst}::uuid, current_date, ${req}::uuid) AS r`).then((r) => r[0].r);
  const del = (uid, plan) => as(uid, (t) => t`SELECT public.delete_fin_installment_plan(${plan}::uuid) AS r`).then((r) => r[0].r);
  const balance = async () => {
    const accounts = (await db`SELECT * FROM fin_accounts WHERE user_id=${U1}`).map((a) => ({ ...a, initial_balance: Number(a.initial_balance) }));
    const txs = (await db`SELECT * FROM fin_transactions WHERE user_id=${U1}`).map((t) => ({ ...t, amount: Number(t.amount) }));
    return computeBalanceBreakdown(accounts, txs).active.balance;
  };

  test("exclui parcelamento ativo sem pagamentos, sem tocar movimentações", async () => {
    const { plan_id } = await create(U1);
    const n0 = await txCount();
    expect((await del(U1, plan_id)).deleted).toBe(true);
    expect((await insts(plan_id)).length).toBe(0);
    expect((await db`SELECT 1 FROM fin_installment_plans WHERE id=${plan_id}`).length).toBe(0);
    expect(await txCount()).toBe(n0);
    expect((await err(del(U1, plan_id)))?.code).toBe("P0002");
  });

  test("exclui parcelamento cancelado sem pagamentos", async () => {
    const { plan_id } = await create(U1, { first: "2030-01-10" });
    await as(U1, (t) => t`SELECT public.cancel_fin_installment_plan(${plan_id}::uuid, false, null)`);
    expect((await del(U1, plan_id)).deleted).toBe(true);
    expect((await insts(plan_id)).length).toBe(0);
  });

  test("não exclui com pagamento ativo nem parcelamento de outra pessoa", async () => {
    const { plan_id } = await create(U1);
    const [i1] = await insts(plan_id);
    await pay(U1, i1.id);
    expect((await err(del(U1, plan_id)))?.code).toBe("PT423");
    expect((await err(del(U2, plan_id)))?.code).toBe("P0002");
    expect((await err(refund(U2, i1.id)))?.code).toBe("P0002");
    expect((await err(refund(null, i1.id)))?.code).toBe("28000");
    expect((await insts(plan_id)).length).toBe(3);
  });

  test("estorno: entrada compensatória na mesma conta, saldo volta, original rastreável, sem duplicar", async () => {
    const { plan_id } = await create(U1, { total: "120", n: 3, first: "2026-01-10" });
    const [i1, i2] = await insts(plan_id);
    const before = await balance();
    const p = await pay(U1, i1.id, ACC2, "2026-01-12");
    expect(await balance()).toBe(before - 40);
    expect((await err(refund(U1, i2.id)))?.code).toBe("PT410"); // não paga
    const req = key();
    const r = await refund(U1, i1.id, req);
    expect(r.duplicate).toBe(false);
    expect(await refund(U1, i1.id, req)).toEqual({ transaction_id: r.transaction_id, duplicate: true });
    expect((await err(refund(U1, i1.id)))?.code).toBe("PT410"); // outra chave: já estornada
    expect(await balance()).toBe(before);
    const [rt] = await db`SELECT * FROM fin_transactions WHERE id=${r.transaction_id}`;
    expect([rt.type, rt.amount, rt.account_id, rt.reversal_of_transaction_id]).toEqual(["entrada", "40.00", ACC2, p.transaction_id]);
    const [orig] = await db`SELECT * FROM fin_transactions WHERE id=${p.transaction_id}`;
    expect([orig.type, orig.amount]).toEqual(["saida", "40.00"]);
    const [row] = await db`SELECT * FROM fin_installments WHERE id=${i1.id}`;
    expect([row.status, row.transaction_id, row.refund_transaction_id]).toEqual(["estornada", p.transaction_id, r.transaction_id]);
    expect((await err(pay(U1, i1.id)))?.code).toBe("PT410"); // estornada não volta a ser paga
    // pares protegidos contra edição/exclusão direta
    expect((await err(as(U1, (t) => t`DELETE FROM fin_transactions WHERE id=${r.transaction_id}`)))?.code).toBe("PT423");
    expect((await err(as(U1, (t) => t`UPDATE fin_transactions SET amount=1 WHERE id=${p.transaction_id}`)))?.code).toBe("PT423");
    // estorno falso direto é recusado
    expect((await err(as(U1, (t) => t`INSERT INTO fin_transactions (user_id,account_id,type,amount,reversal_of_transaction_id) VALUES (${U1},${ACC},'entrada',5,${p.transaction_id})`)))?.code).toBe("PT423");
    // editar fica bloqueado; cancelar e excluir funcionam; extrato preserva o par
    expect((await err(as(U1, (t) => t`SELECT public.update_fin_installment_plan(${plan_id}::uuid, ${ACC}::uuid, 'x', null, 120::numeric, 3, '2026-01-10'::date)`)))?.code).toBe("PT422");
    await as(U1, (t) => t`SELECT public.cancel_fin_installment_plan(${plan_id}::uuid, true, null)`);
    const rows = await insts(plan_id);
    expect(rows.map((x) => x.status)).toEqual(["estornada", "cancelada", "cancelada"]);
    const sum = summarizeInstallments([{ id: plan_id, status: "cancelado" }], rows.map((x) => ({ ...x, amount: Number(x.amount), due_date: x.due_date.toISOString().slice(0, 10) })), "2026-01-01", 36500);
    expect(sum.commitmentsCount).toBe(0);
    expect((await del(U1, plan_id)).refunded_kept).toBe(1);
    expect((await db`SELECT count(*)::int c FROM fin_transactions WHERE id IN (${p.transaction_id}, ${r.transaction_id})`)[0].c).toBe(2);
    expect((await err(as(U1, (t) => t`DELETE FROM fin_transactions WHERE id=${p.transaction_id}`)))?.code).toBe("PT423");
    expect(await balance()).toBe(before);
  });

  test("estornos concorrentes com chaves diferentes: exatamente um vence", async () => {
    const { plan_id } = await create(U1);
    const [i1] = await insts(plan_id);
    await pay(U1, i1.id);
    const n0 = await txCount();
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => refund(U1, i1.id)));
    expect(results.filter((x) => x.status === "fulfilled").length).toBe(1);
    expect(await txCount()).toBe(n0 + 1);
  });
});
