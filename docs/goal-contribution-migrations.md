# Goal contributions — migration and recovery workflow

## Official source for future changes

Use the Lovable Cloud migration tool. It creates a **custom SQL Drizzle migration**, verifies its journal and applies it to the connected database. It regenerates the generated client types. Do not generate ORM models from `drizzle/schema.ts`; it is intentionally blank.

The new migration is `drizzle/migrations/0002_strict_goal_contribution_idempotency.sql`. Prior migrations must remain byte-exact. Do not copy the new SQL into `supabase/migrations`, rename journal entries, or introduce a second production migration runner.

The legacy baseline remains in `supabase/migrations`. The current delta history is in `drizzle/migrations`, with applied hashes and timestamps in `drizzle.__drizzle_migrations`. Neither a file nor a successful build proves application: inspect the migration history and the installed function/column/trigger in the connected database.

## Reproducing a separate environment

### Transfer recovery delta (1.4.1)

`drizzle/migrations/0004_transfer_replay_after_archive.sql` replaces only `create_fin_transfer`, using the same Cloud custom migration flow. It checks authenticated strict replay before active-account validation and serializes matching user/request keys with a transaction advisory lock; new requests still lock both owned accounts in ID order. `0003` remains unchanged. Transfers retain `ON DELETE RESTRICT` on both account references; transactions retain their separate `SET NULL` rule. The UI offers archival for either kind of linked history.

Summary and Accounts reuse `TransferDialog`. Abandonment first requires explicit confirmation and an authenticated lookup of the request key. Only a matching persisted transfer reconciles and clears local state; a missing row, network failure or mismatched payload remains blocked because absence cannot exclude an in-flight commit. Normal retry continues to use the same key. This is not cancellation, reversal or cross-device recovery.

1. Provision an isolated PostgreSQL environment with the platform's auth schema, roles and policies (a bare PostgreSQL installation is not the full app).
2. Apply the legacy baseline once using its original migration history; do not replay it into an existing populated baseline. Supabase CLI alone does **not** apply the Drizzle deltas.
3. Apply the existing Drizzle custom SQL deltas in journal order through the infrastructure's migration flow, preserving each tag, hash and timestamp. This project's tool targets its connected Cloud database; it is **not** an exporter or a verified arbitrary-target provisioning command.
4. Compare each environment's journal/applied history and installed objects. Never register a migration as applied merely because its SQL exists. Never manually mark unapplied deltas as applied.

No arbitrary-target deployment/restore pipeline has been executed in this task. A clean app environment reproduction therefore remains a separately verified acceptance item, not a claimed result. `package.json` contains no migration script and needs no second runner for the current Cloud flow.

## Reproducible isolated integration suite

Use a disposable local PostgreSQL 17 database named `atlas_contribution_test`. Supply its local connection (without real credentials) in `ATLAS_TEST_DATABASE_URL` and run:

```sh
ATLAS_TEST_DATABASE_URL=postgres://atlas_test@127.0.0.1:55431/atlas_contribution_test bun test src/lib/financeiro/contribution.integration.test.js
```

The suite refuses any non-localhost or differently named database. It creates a minimal auth/RLS fixture, applies the actual 0001/0002 SQL files, and resets only that disposable fixture between tests. The fixture proves PostgreSQL behavior, **not** a full fresh Atlas install or exact Cloud provisioning. Production/catalog verification and browser verification are separate evidence.

## Guarantees and limitations

- The unique user/request index arbitrates competing inserts. `ON CONFLICT` targets only that index; a subsequent READ COMMITTED statement reads the committed original. Goal row locks serialize different keys for the same goal. Stronger isolation may return a serialization error; retry the **same** operation/key, never invent a replacement.
- Strict replay compares goal, amount, date and note. New contributions persist their resulting balance; pre-existing rows keep NULL and return the current balance on replay because their historic snapshot is unknowable without rewriting old records.
- Browser recovery uses a versioned localStorage record per user/goal. Date and note remain unchanged after reload or midnight. No short expiry. Web Locks reject overlapping submissions from another tab instead of queueing a new operation after success. Browsers without storage or Web Locks fail closed.
- Local storage survives a normal browser restart, but clearing site data, private browsing disposal, another device/origin, eviction or user manipulation can remove/change it. No client storage is an authentication or permission source. Fully guaranteed cross-device recovery would need a separately scoped server-backed operation lifecycle.
- Network/ambiguous outcomes retain the pending record; confirmed conflicts remain blocked for investigation. There is no automatic cancel, expiry or financial reversal. Legacy callers without request IDs remain supported but do not gain idempotence.
- The app disables goal deletion while its contribution remains pending, avoiding orphaning an unresolved operation. Deletion through a separate device or direct API remains outside the local recovery guarantee.
- Existing contribution table write policies were preserved as requested. They permit owner-scoped direct history writes; this task does not claim protection against a malicious owner editing their own history through the Data API. No history was rewritten and no user grants weakened.
- Initial goal amounts need not have contribution rows: balance integrity is **initial balance + subsequent contributions**, not the sum of history alone.