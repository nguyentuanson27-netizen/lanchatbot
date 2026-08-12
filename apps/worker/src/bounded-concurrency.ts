export async function mapWithBoundedConcurrency<Input, Output>(
  items: readonly Input[],
  concurrency: number,
  mapper: (item: Input, index: number) => Promise<Output>,
): Promise<Output[]> {
  if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
    throw new Error("BOUNDED_CONCURRENCY_INVALID");
  }
  if (items.length === 0) return [];

  const results = new Array<Output>(items.length);
  let nextIndex = 0;
  let failed = false;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (!failed) {
        const index = nextIndex;
        if (index >= items.length) return;
        nextIndex += 1;
        try {
          results[index] = await mapper(items[index]!, index);
        } catch (error) {
          failed = true;
          throw error;
        }
      }
    },
  );

  await Promise.all(workers);
  return results;
}
