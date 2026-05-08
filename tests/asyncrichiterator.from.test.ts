import { assertEquals, assertRejects } from "@std/assert";
import { AsyncRichIterator } from "../src/AsyncRichIterator/AsyncRichIterator.ts";
import { RichIterator } from "@sck/richiterator";

Deno.test("AsyncRichIterator.from", async (t) => {
  await t.step("Iterable<T>", async () => {
    const iterator = AsyncRichIterator.from([1, 2, 3]);

    assertEquals(await iterator.toArray(), [1, 2, 3]);
  });

  await t.step("Iterator<T>", async () => {
    const source = [1, 2, 3].values();

    const iterator = AsyncRichIterator.from(source);

    assertEquals(await iterator.toArray(), [1, 2, 3]);
  });

  await t.step("RichIterator<T>", async () => {
    const source = RichIterator.from([1, 2, 3]);

    const iterator = AsyncRichIterator.from(source);

    assertEquals(await iterator.toArray(), [1, 2, 3]);
  });

  await t.step("AsyncIterable<T>", async () => {
    async function* source() {
      yield 1;
      yield 2;
      yield 3;
    }

    const iterator = AsyncRichIterator.from(source());

    assertEquals(await iterator.toArray(), [1, 2, 3]);
  });

  await t.step("AsyncIterator<T>", async () => {
    async function* source() {
      yield 1;
      yield 2;
      yield 3;
    }

    const asyncIterator = source()[Symbol.asyncIterator]();

    const iterator = AsyncRichIterator.from(asyncIterator);

    assertEquals(await iterator.toArray(), [1, 2, 3]);
  });

  await t.step("AsyncRichIterator<T>", async () => {
    const source = AsyncRichIterator.from([1, 2, 3]);

    const iterator = AsyncRichIterator.from(source);

    assertEquals(await iterator.toArray(), [1, 2, 3]);
  });

  await t.step("custom async iterator", async () => {
    let count = 0;
    const source = {
      next: (): Promise<IteratorResult<number>> => {
        count++;
        if (count > 3) {
          return Promise.resolve({ done: true, value: undefined });
        }
        return Promise.resolve({ done: false, value: count });
      },
    };

    const iterator = AsyncRichIterator.from(source);

    assertEquals(await iterator.toArray(), [1, 2, 3]);
  });

  await t.step("custom sync iterator", async () => {
    let count = 0;
    const source = {
      next: (): IteratorResult<number> => {
        count++;
        if (count > 3) {
          return { done: true, value: undefined };
        }
        return { done: false, value: count };
      },
    };

    const iterator = AsyncRichIterator.from(source);

    assertEquals(await iterator.toArray(), [1, 2, 3]);
  });

  await t.step("rejects non-iterators at runtime", async () => {
    const iterator = AsyncRichIterator.from(123 as never);

    await assertRejects(
      () => iterator.toArray(),
      Error,
    );
  });
});
