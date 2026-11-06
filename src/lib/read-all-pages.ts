/** Exhaustive reads keep existing array consumers and calculations complete. */
export interface ReadPage<T> {
  data: T[] | null;
  error: unknown;
  count: number | null;
}

export interface RangeQuery<T> {
  range(from: number, to: number): PromiseLike<ReadPage<T>>;
}

const PAGE_SIZE = 1000;

/**
 * The factory must rebuild the same filtered query with a unique final order.
 * Count only the first page; advance by rows received, even with a smaller cap.
 * Never publish partially loaded results after a failed page.
 */
export async function readAllPages<T>(
  query: (count: "exact" | undefined) => RangeQuery<T>,
): Promise<T[]> {
  const rows: T[] = [];
  let total: number | null = null;
  while (true) {
    const { data, error, count } = await query(rows.length === 0 ? "exact" : undefined)
      .range(rows.length, rows.length + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    if (rows.length === 0) total = count;
    if (page.length === 0) {
      if (total !== null && rows.length < total)
        throw new Error("Os dados mudaram durante o carregamento. Tente novamente.");
      return rows;
    }
    rows.push(...page);
    if (total !== null && rows.length >= total) return rows;
    // Without a count, only an empty page proves that the read is complete.
  }
}