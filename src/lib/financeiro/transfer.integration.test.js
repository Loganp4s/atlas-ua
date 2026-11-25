// Real PostgreSQL tests against a disposable local database — never the project's Cloud database.
// Opt-in: ATLAS_TRANSFER_TEST_DATABASE_URL=postgres://atlas_test@127.0.0.1:55431/atlas_transfer_test bun test src/lib/financeiro/transfer.integration.test.js
import { describe, test, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import postgres from "postgres";
import { readFile } from "node:fs/promises";
const { computeBalanceBreakdown } = await import("@/lib/financeiro/api");
const { accountBalance } = await import("@/lib/atlas/finance-query");

const url = process.env["ATLAS_TRANSFER_TEST_DATABASE_URL"];
if (url) {
  const u = new URL(url);
  if (u.hostname !== "127.0.0.1" || u.pathname !== "/atlas_transfer_test") {
    throw new Error("Integration tests require an isolated localhost atlas_transfer_test database.");
  }
}
const suite = url ? describe : describe.skip;
const U1 = "10000000-0000-4000-8000-000000000001";
const U2 = "10000000-0000-4000-8000-000000000002";
const PIC = "30000000-0000-4000-8000-000000000001";
const NU = "30000000-0000-4000-8000-000000000002";
const WAL = "30000000-0000-4000-8000-000000000003";
const ARC = "30000000-0000-4000-8000-000000000004";
const CARD = "30000000-0000-4000-8000-000000000005";
const OTHER = "30000000-0000-4000-8000-000000000006";
const MISSING = "30000000-0000-4000-8000-0000000000ff";
const key = () => crypto.randomUUID();

suite("transferências — PostgreSQL real isolado", () => {
  let db;
  const as = (uid, fn) => db.begin(async (t) => {
    await t.unsafe("SET LOCAL ROLE authenticated");
    await t`SELECT set_config('test.uid', ${uid ?? ""}, true)`;
    return fn(t);
  });
  const transfer = (uid, src, dst, amount, date = "2026-11-25", desc = null, req = key()) =>
    as(uid, (t) => t`SELECT public.create_fin_transfer(${src}, ${dst}, ${amount}::numeric, ${date}::date, ${desc}, ${req}::uuid) AS r`)
      .then((rows) => rows[0].r);
  const rows = async () => db`SELECT * FROM fin_transfers ORDER BY created_at, id`;
  const balances = async () => {
    const accounts = (await db`SELECT * FROM fin_accounts WHERE user_id=${U1}`).map((a) => ({ ...a, initial_balance: Number(a.initial_balance) }));
    const tx = (await db`SELECT * FROM fin_transactions WHERE user_id=${U1}`).map((t) => ({ ...t, amount: Number(t.amount) }));
    const tr = (await db`SELECT * FROM fin_transfers WHERE user_id=${U1}`).map((t) => ({ ...t, amount: Number(t.amount) }));
    const by = Object.fromEntries(accounts.map((a) => [a.id, accountBalance(a, tx, tr)]));
    return { by, bd: computeBalanceBreakdown(accounts, tx, tr) };
  };

  beforeAll(async () => {
    if (!url) return;
    db = postgres(url, { max: 12, ssl: false, onnotice: () => {} });
    // Disposable fixture mirroring the managed schema; NOT a migration.
    await db.unsafe(`
      DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE ROLE service_role; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA public, auth TO authenticated, anon, service_role;
      GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon, service_role;
      DO $$ BEGIN CREATE TYPE public.fin_account_type AS ENUM ('corrente','poupanca','carteira','cartao','investimento');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE TYPE public.fin_tx_type AS ENUM ('entrada','saida'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      CREATE TABLE IF NOT EXISTS public.fin_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, name text NOT NULL,
        type public.fin_account_type NOT NULL DEFAULT 'corrente', initial_balance numeric NOT NULL DEFAULT 0,
        archived boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
      );
      GRANT SELECT,INSERT,UPDATE,DELETE ON public.fin_accounts TO authenticated;
      ALTER TABLE public.fin_accounts ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS own_acc ON public.fin_accounts;
      CREATE POLICY own_acc ON public.fin_accounts TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
      CREATE TABLE IF NOT EXISTS public.fin_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, account_id uuid REFERENCES public.fin_accounts(id) ON DELETE SET NULL,
        type public.fin_tx_type NOT NULL, amount numeric NOT NULL, tx_date date NOT NULL DEFAULT current_date
      );
    `);
    const exists = await db`SELECT to_regclass('public.fin_transfers') AS t`;
    if (!exists[0].t) await db.unsafe(await readFile(new URL("../../../drizzle/migrations/0003_fin_transfers.sql", import.meta.url), "utf8"));
    await db.unsafe(await readFile(new URL("../../../drizzle/migrations/0004_transfer_replay_after_archive.sql", import.meta.url), "utf8"));
    await db.unsafe(`
      CREATE OR REPLACE FUNCTION public.test_fail_transfer() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF current_setting('test.fail_transfer',true)='on' THEN RAISE EXCEPTION 'injected failure'; END IF; RETURN NEW; END $$;
      DROP TRIGGER IF EXISTS test_transfer_failure ON public.fin_transfers;
      CREATE TRIGGER test_transfer_failure AFTER INSERT ON public.fin_transfers FOR EACH ROW EXECUTE FUNCTION public.test_fail_transfer();
    `);
  });
  beforeEach(async () => {
    await db.unsafe("TRUNCATE public.fin_transfers, public.fin_transactions, public.fin_accounts CASCADE");
    await db`INSERT INTO fin_accounts(id,user_id,name,type,initial_balance,archived) VALUES
      (${PIC},${U1},'PicPay','corrente',100,false),(${NU},${U1},'Nubank','corrente',200,false),
      (${WAL},${U1},'Carteira','carteira',0,false),(${ARC},${U1},'Antiga','corrente',40,true),
      (${CARD},${U1},'Cartão','cartao',0,false),(${OTHER},${U2},'Outro','corrente',500,false)`;
    await db`INSERT INTO fin_transactions(user_id,account_id,type,amount) VALUES (${U1},${PIC},'entrada',10),(${U1},${NU},'saida',5)`;
  });
  afterAll(async () => { if (db) await db.end(); });

  test("1/11/14/15/16/17 transferência simples: saldos mudam, receitas/despesas e total não", async () => {
    const before = await balances();
    const r = await transfer(U1, PIC, NU, 50);
    expect(r.duplicate).toBe(false);
    const after = await balances();
    expect(after.by[PIC]).toBe(before.by[PIC] - 50);
    expect(after.by[NU]).toBe(before.by[NU] + 50);
    expect(after.bd.active.entradas).toBe(before.bd.active.entradas);
    expect(after.bd.active.saidas).toBe(before.bd.active.saidas);
    expect(after.bd.consolidated).toBe(before.bd.consolidated);
    expect(after.bd.active.balance).toBe(before.bd.active.balance);
  });
  test("2/3 sucessivas e centavos", async () => {
    await transfer(U1, PIC, NU, 10.25);
    await transfer(U1, NU, PIC, 0.75);
    await transfer(U1, PIC, NU, 0.01);
    const { by } = await balances();
    expect(by[PIC]).toBeCloseTo(110 - 10.25 + 0.75 - 0.01, 10);
    expect(by[NU]).toBeCloseTo(195 + 10.25 - 0.75 + 0.01, 10);
    expect((await rows()).length).toBe(3);
  });
  test("4 origem igual ao destino", async () => {
    await expect(transfer(U1, PIC, PIC, 10)).rejects.toThrow(/diferentes/);
  });
  test("5/6/7 valores inválidos", async () => {
    for (const v of [0, -5, 1.234]) await expect(transfer(U1, PIC, NU, v)).rejects.toThrow(/inválido/);
    expect((await rows()).length).toBe(0);
  });
  test("8 conta inexistente e 9 de outro usuário", async () => {
    await expect(transfer(U1, PIC, MISSING, 10)).rejects.toThrow(/não encontrada/);
    await expect(transfer(U1, PIC, OTHER, 10)).rejects.toThrow(/não encontrada/);
    await expect(transfer(U2, OTHER, PIC, 10)).rejects.toThrow(/não encontrada/);
    expect((await rows()).length).toBe(0);
  });
  test("10 conta arquivada e cartão recusados", async () => {
    await expect(transfer(U1, ARC, NU, 10)).rejects.toThrow(/arquivadas/);
    await expect(transfer(U1, NU, ARC, 10)).rejects.toThrow(/arquivadas/);
    await expect(transfer(U1, NU, CARD, 10)).rejects.toThrow(/cartão/);
  });
  test("12/13 saque e depósito com carteira", async () => {
    await transfer(U1, NU, WAL, 50);
    await transfer(U1, WAL, PIC, 30);
    const { by } = await balances();
    expect(by[NU]).toBe(145);
    expect(by[WAL]).toBe(20);
    expect(by[PIC]).toBe(140);
  });
  test("18 mesma chave e mesmos dados não duplica", async () => {
    const k = key();
    const a = await transfer(U1, PIC, NU, 50, "2026-11-25", "x", k);
    const b = await transfer(U1, PIC, NU, 50, "2026-11-25", "x", k);
    expect(b.duplicate).toBe(true);
    expect(b.transfer_id).toBe(a.transfer_id);
    expect((await rows()).length).toBe(1);
  });
  test("19 mesma chave com dados diferentes → conflito", async () => {
    const k = key();
    await transfer(U1, PIC, NU, 50, "2026-11-25", null, k);
    for (const args of [[NU, PIC, 50, "2026-11-25"], [PIC, WAL, 50, "2026-11-25"], [PIC, NU, 51, "2026-11-25"], [PIC, NU, 50, "2026-11-26"]]) {
      const err = await transfer(U1, ...args, null, k).catch((e) => e);
      expect(err.code).toBe("PT409");
    }
    expect((await rows()).length).toBe(1);
  });
  test("1.4.1 replay após arquivar ambas as contas retorna o registro original", async () => {
    const k = key();
    const original = await transfer(U1, PIC, NU, 50, "2026-11-25", "recuperar", k);
    await db`UPDATE fin_accounts SET archived=true WHERE id IN (${PIC},${NU})`;
    const replay = await transfer(U1, PIC, NU, 50, "2026-11-25", "recuperar", k);
    expect(replay).toEqual({ transfer_id: original.transfer_id, duplicate: true });
    expect((await rows()).length).toBe(1);
  });
  test("1.4.1 nova chave após arquivar continua recusada", async () => {
    await transfer(U1, PIC, NU, 50);
    await db`UPDATE fin_accounts SET archived=true WHERE id=${PIC}`;
    await expect(transfer(U1, PIC, NU, 50)).rejects.toThrow(/arquivadas/);
    expect((await rows()).length).toBe(1);
  });
  test("1.4.1 chave com dados diferentes continua conflito após arquivar", async () => {
    const k = key();
    await transfer(U1, PIC, NU, 50, "2026-11-25", null, k);
    await db`UPDATE fin_accounts SET archived=true WHERE id=${PIC}`;
    const error = await transfer(U1, PIC, NU, 51, "2026-11-25", null, k).catch((e) => e);
    expect(error.code).toBe("PT409");
    expect((await rows()).length).toBe(1);
  });
  test("20 requisições simultâneas: mesma chave grava uma; chaves distintas gravam todas", async () => {
    const k = key();
    const same = await Promise.allSettled(Array.from({ length: 8 }, () => transfer(U1, PIC, NU, 5, "2026-11-25", null, k)));
    expect(same.filter((s) => s.status === "fulfilled").length).toBe(8);
    expect((await rows()).length).toBe(1);
    await Promise.all(Array.from({ length: 8 }, () => transfer(U1, NU, PIC, 1)));
    expect((await rows()).length).toBe(9);
    const { by, bd } = await balances();
    expect(by[PIC]).toBe(110 - 5 + 8);
    expect(bd.consolidated).toBe(100 + 200 + 40 + 10 - 5);
  });
  test("21 falha durante a operação: rollback completo", async () => {
    await db.unsafe("ALTER DATABASE atlas_transfer_test SET test.fail_transfer = 'on'");
    const fresh = postgres(url, { max: 1, ssl: false, onnotice: () => {} });
    try {
      const err = await fresh.begin(async (t) => {
        await t.unsafe("SET LOCAL ROLE authenticated");
        await t`SELECT set_config('test.uid', ${U1}, true)`;
        return t`SELECT public.create_fin_transfer(${PIC}, ${NU}, 10, '2026-11-25', null, ${key()}::uuid)`;
      }).catch((e) => e);
      expect(String(err.message)).toMatch(/injected/);
    } finally {
      await fresh.end();
      await db.unsafe("ALTER DATABASE atlas_transfer_test RESET test.fail_transfer");
    }
    expect((await rows()).length).toBe(0);
  });
  test("22 histórico preservado após arquivar; exclusão da conta bloqueada", async () => {
    await transfer(U1, PIC, NU, 30);
    await db`UPDATE fin_accounts SET archived=true WHERE id=${PIC}`;
    expect((await rows()).length).toBe(1);
    const { bd } = await balances();
    expect(bd.archived.transferOut).toBe(30);
    await expect(db`DELETE FROM fin_accounts WHERE id=${PIC}`).rejects.toThrow(/foreign key/);
    await expect(transfer(U1, PIC, NU, 1)).rejects.toThrow(/arquivadas/);
  });
  test("23/24 isolamento e ausência de edição/exclusão direta (RLS)", async () => {
    await transfer(U1, PIC, NU, 30);
    expect((await as(U2, (t) => t`SELECT * FROM fin_transfers`)).length).toBe(0);
    expect((await as(U1, (t) => t`SELECT * FROM fin_transfers`)).length).toBe(1);
    await expect(as(U1, (t) => t`UPDATE fin_transfers SET amount=1`)).rejects.toThrow(/permission denied/);
    await expect(as(U1, (t) => t`DELETE FROM fin_transfers`)).rejects.toThrow(/permission denied/);
    await expect(as(U1, (t) => t`INSERT INTO fin_transfers(user_id,source_account_id,destination_account_id,amount,transfer_date) VALUES (${U1},${PIC},${NU},1,'2026-11-25')`)).rejects.toThrow(/permission denied/);
    await expect(transfer(null, PIC, NU, 10)).rejects.toThrow(/autenticada/);
    await expect(db.begin(async (t) => { await t.unsafe("SET LOCAL ROLE anon"); return t`SELECT public.create_fin_transfer(${PIC}, ${NU}, 1, '2026-11-25', null, null)`; })).rejects.toThrow(/permission denied/);
  });
});
