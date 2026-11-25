// Real PostgreSQL tests, never a mock and never the project's Cloud database.
// Opt-in: ATLAS_TEST_DATABASE_URL=postgres://atlas_test@127.0.0.1:55431/atlas_contribution_test bun test src/lib/financeiro/contribution.integration.test.js
import { describe, test, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import postgres from "postgres";
import { readFile } from "node:fs/promises";

const url = process.env["ATLAS_TEST_DATABASE_URL"];
if (url) {
  const parsed = new URL(url);
  if (parsed.hostname !== "127.0.0.1" || parsed.pathname !== "/atlas_contribution_test") {
    throw new Error("Integration tests require an isolated localhost atlas_contribution_test database.");
  }
}
const suite = url ? describe : describe.skip;
const U1 = "10000000-0000-4000-8000-000000000001";
const U2 = "10000000-0000-4000-8000-000000000002";
const G1 = "20000000-0000-4000-8000-000000000001";
const G2 = "20000000-0000-4000-8000-000000000002";
const G3 = "20000000-0000-4000-8000-000000000003";
const key = () => crypto.randomUUID();

suite("aportes — PostgreSQL real isolado", () => {
  let db;
  beforeAll(async () => {
    if (!url) return;
    db = postgres(url, { max: 12, ssl: false, onnotice: () => {} });
    // Disposable fixture, NOT a migration for the managed database.
    await db.unsafe(`
      DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE ROLE service_role; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA public, auth TO authenticated, anon, service_role;
      GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon, service_role;
      CREATE TABLE IF NOT EXISTS public.fin_goals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
        name text NOT NULL DEFAULT 'test', target_amount numeric NOT NULL DEFAULT 1000,
        current_amount numeric NOT NULL DEFAULT 0
      );
      GRANT SELECT,INSERT,UPDATE,DELETE ON public.fin_goals TO authenticated;
      GRANT ALL ON public.fin_goals TO service_role;
      ALTER TABLE public.fin_goals ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS own_goals ON public.fin_goals;
      CREATE POLICY own_goals ON public.fin_goals TO authenticated USING (auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
      CREATE TABLE IF NOT EXISTS public.fin_goal_contributions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
        goal_id uuid NOT NULL REFERENCES public.fin_goals(id) ON DELETE CASCADE,
        amount numeric NOT NULL, contribution_date date NOT NULL, note text,
        created_at timestamptz DEFAULT now()
      );
      GRANT SELECT,INSERT,UPDATE,DELETE ON public.fin_goal_contributions TO authenticated;
      GRANT ALL ON public.fin_goal_contributions TO service_role;
      ALTER TABLE public.fin_goal_contributions ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS own_history ON public.fin_goal_contributions;
      CREATE POLICY own_history ON public.fin_goal_contributions TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
      CREATE OR REPLACE FUNCTION public.test_fail_history() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF current_setting('test.fail_history',true)='on' THEN RAISE EXCEPTION 'injected history failure'; END IF; RETURN NEW; END $$;
      CREATE OR REPLACE FUNCTION public.test_fail_goal() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF current_setting('test.fail_goal',true)='on' THEN RAISE EXCEPTION 'injected goal failure'; END IF;
        IF current_setting('test.skip_goal',true)='on' THEN RETURN NULL; END IF; RETURN NEW; END $$;
      CREATE OR REPLACE FUNCTION public.test_fail_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF current_setting('test.fail_snapshot',true)='on' THEN RAISE EXCEPTION 'injected snapshot failure'; END IF; RETURN NEW; END $$;
      DROP TRIGGER IF EXISTS test_history_failure ON public.fin_goal_contributions;
      CREATE TRIGGER test_history_failure BEFORE INSERT ON public.fin_goal_contributions FOR EACH ROW EXECUTE FUNCTION public.test_fail_history();
      DROP TRIGGER IF EXISTS test_goal_failure ON public.fin_goals;
      CREATE TRIGGER test_goal_failure BEFORE UPDATE ON public.fin_goals FOR EACH ROW EXECUTE FUNCTION public.test_fail_goal();
      DROP TRIGGER IF EXISTS test_snapshot_failure ON public.fin_goal_contributions;
      CREATE TRIGGER test_snapshot_failure BEFORE UPDATE ON public.fin_goal_contributions FOR EACH ROW EXECUTE FUNCTION public.test_fail_snapshot();
    `);
    for (const file of ["0001_goal_contribution_idempotency_and_guard.sql", "0002_strict_goal_contribution_idempotency.sql"]) {
      await db.unsafe(await readFile(new URL(`../../../drizzle/migrations/${file}`, import.meta.url), "utf8"));
    }
  });
  beforeEach(async () => {
    await db.unsafe("TRUNCATE public.fin_goal_contributions, public.fin_goals CASCADE");
    await db`INSERT INTO fin_goals(id,user_id,current_amount) VALUES (${G1},${U1},100),(${G2},${U1},100),(${G3},${U2},100)`;
  });
  afterAll(async () => { if (db) await db.end(); });

  async function asUser(user, action, flags = []) {
    return db.begin(async (tx) => {
      await tx.unsafe("SET LOCAL ROLE authenticated");
      await tx`SELECT set_config('test.uid',${user ?? ""},true)`;
      for (const flag of flags) await tx`SELECT set_config(${flag},'on',true)`;
      return action(tx);
    });
  }
  const call = (id, amount = 10, goal = G1, user = U1, flags = [], date = "2026-11-25", note = null) =>
    asUser(user, async (tx) => (await tx`SELECT add_fin_goal_contribution(${goal}::uuid,${amount}::numeric,${date}::date,${note}::text,${id}::uuid) AS result`)[0].result, flags);
  const state = async (goal = G1) => {
    const [row] = await db`SELECT current_amount::text AS balance, (SELECT count(*)::int FROM fin_goal_contributions WHERE goal_id=${goal}) AS count, (SELECT coalesce(sum(amount),0)::text FROM fin_goal_contributions WHERE goal_id=${goal}) AS history FROM fin_goals WHERE id=${goal}`;
    return row;
  };
  async function rejected(promise, code) {
    try { await promise; throw new Error("expected database rejection"); }
    catch (e) { expect(e.code).toBe(code); }
  }

  test("1 — nova chave registra histórico e crédito uma vez", async () => {
    const r = await call(key()); expect(r.duplicate).toBe(false); expect(r.current_amount).toBe(110);
    expect(await state()).toEqual({ balance: "110", count: 1, history: "10" });
  });
  test("2 — repetição exata retorna identificador e saldo originais", async () => {
    const id = key(); const first = await call(id); await call(key(),20);
    expect(await call(id)).toEqual({ ...first, duplicate: true }); expect((await state()).balance).toBe("130");
  });
  test("3 — mesma chave, outra meta é conflito sem crédito", async () => {
    const id = key(); await call(id); await rejected(call(id,10,G2),"PT409"); expect((await state(G2)).balance).toBe("100");
  });
  test("4 — mesma chave, outro valor é conflito sem crédito", async () => {
    const id = key(); await call(id); await rejected(call(id,20),"PT409"); expect((await state()).balance).toBe("110");
  });
  test("5 — mesma chave de usuários diferentes é isolada", async () => {
    const id = key(); const a = await call(id); const b = await call(id,10,G3,U2);
    expect(b.contribution_id).not.toBe(a.contribution_id);
    const rows = await asUser(U2, (tx) => tx`SELECT user_id FROM fin_goal_contributions`); expect(rows.map(r => r.user_id)).toEqual([U2]);
  });
  test("6 — chamadas simultâneas iguais creditam uma vez", async () => {
    const id = key(); const results = await Promise.all(Array.from({length:8},()=>call(id)));
    expect(results.filter(r=>!r.duplicate)).toHaveLength(1); expect(new Set(results.map(r=>r.contribution_id)).size).toBe(1);
    expect(await state()).toEqual({ balance:"110", count:1, history:"10" });
  });
  test("7 — chave concorrente com metas diferentes distingue conflito", async () => {
    const id = key(); const results = await Promise.allSettled([call(id,10,G1),call(id,10,G2)]);
    expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    expect(results.find(r=>r.status==="rejected").reason.code).toBe("PT409");
    expect(Number((await state()).history)+Number((await state(G2)).history)).toBe(10);
  });
  test("7b — chave concorrente com valores diferentes distingue conflito", async () => {
    const id = key(); const r = await Promise.allSettled([call(id,10),call(id,20)]);
    expect(r.filter(x=>x.status==="fulfilled")).toHaveLength(1); expect(r.find(x=>x.status==="rejected").reason.code).toBe("PT409");
    expect((await state()).count).toBe(1);
  });
  test("8 — chaves diferentes concorrentes não perdem incrementos", async () => {
    await Promise.all(Array.from({length:8},()=>call(key(),10))); expect(await state()).toEqual({balance:"180",count:8,history:"80"});
  });
  test("9/11 — falha ao inserir histórico faz rollback completo", async () => {
    await rejected(call(key(),10,G1,U1,["test.fail_history"]),"P0001"); expect(await state()).toEqual({balance:"100",count:0,history:"0"});
  });
  test("10/11 — falha ao atualizar meta reverte histórico", async () => {
    await rejected(call(key(),10,G1,U1,["test.fail_goal"]),"P0001"); expect(await state()).toEqual({balance:"100",count:0,history:"0"});
  });
  test("11b — update suprimido não retorna sucesso falso", async () => {
    await rejected(call(key(),10,G1,U1,["test.skip_goal"]),"P0002"); expect(await state()).toEqual({balance:"100",count:0,history:"0"});
  });
  test("11c — falha no snapshot reverte incremento e histórico", async () => {
    await rejected(call(key(),10,G1,U1,["test.fail_snapshot"]),"P0001"); expect(await state()).toEqual({balance:"100",count:0,history:"0"});
  });
  test("12/13 — sucessivos e retries mantêm saldo inicial + histórico", async () => {
    const a=key(), b=key(); await call(a,10); await call(b,20); await call(a,10); await call(b,20);
    const s=await state(); expect(Number(s.balance)).toBe(100+Number(s.history)); expect(s.count).toBe(2);
  });
  test("20 — sem usuário autenticado é rejeitado", async () => {
    await rejected(call(key(),10,G1,null),"28000"); expect((await state()).count).toBe(0);
  });
  test("21 — meta de outro usuário não pode ser creditada", async () => {
    await rejected(call(key(),10,G3,U1),"P0002"); expect((await state(G3)).balance).toBe("100");
  });
  test("22 — update direto de current_amount continua bloqueado", async () => {
    await rejected(asUser(U1,tx=>tx`UPDATE fin_goals SET current_amount=999 WHERE id=${G1}`),"42501"); expect((await state()).balance).toBe("100");
  });
  test("23 — anon não executa RPC, authenticated pode executar", async () => {
    const [r]=await db`SELECT has_function_privilege('anon','public.add_fin_goal_contribution(uuid,numeric,date,text,uuid)','EXECUTE') AS anon, has_function_privilege('authenticated','public.add_fin_goal_contribution(uuid,numeric,date,text,uuid)','EXECUTE') AS signed_in`;
    expect(r.anon).toBe(false); expect(r.signed_in).toBe(true);
    await rejected(db.begin(async tx=>{await tx.unsafe("SET LOCAL ROLE anon"); return tx`SELECT add_fin_goal_contribution(${G1}::uuid,10,'2026-11-25',null,${key()}::uuid)`;}),"42501");
  });
  test("data diferente não reutiliza chave", async () => {const id=key();await call(id);await rejected(call(id,10,G1,U1,[],"2026-11-26"),"PT409");});
  test("nota diferente não reutiliza chave", async () => {const id=key();await call(id);await rejected(call(id,10,G1,U1,[],"2026-11-25","changed"),"PT409");});
  test("API legada sem chave e saldo inicial seguem compatíveis", async () => {
    await call(null); await call(null); expect(await state()).toEqual({balance:"120",count:2,history:"20"});
  });
  test("valores inválidos não alteram histórico ou saldo", async () => {
    for (const amount of [0,-1,1.005,"NaN","Infinity"]) await rejected(call(key(),amount),"22023");
    expect(await state()).toEqual({balance:"100",count:0,history:"0"});
  });
  test("editar nome e valor-alvo não altera saldo inicial", async () => {
    await asUser(U1,tx=>tx`UPDATE fin_goals SET name='edited',target_amount=2000 WHERE id=${G1}`); expect((await state()).balance).toBe("100");
  });
});