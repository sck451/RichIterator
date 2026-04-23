import { assert, assertEquals } from "@std/assert";
import { RichIterator } from "../src/RichIterator.ts";
import { err, ok } from "@sck/optres";

Deno.test("consume: fold", () => {
  const result = RichIterator.from([1, 2, 3, 4])
    .fold(0, (acc, x) => acc + x);

  assertEquals(result, 10);
});

Deno.test("consume: tryFold success", () => {
  const result = RichIterator.from(["2", "3", "4"])
    .tryFold(1, (acc, s) => {
      const n = Number(s);
      return Number.isNaN(n) ? err("bad") : ok(acc * n);
    });

  assert(result.isOk());
  assertEquals(result.unwrap(), 24);
});

Deno.test("consume: tryFold failure", () => {
  const result = RichIterator.from(["2", "x", "4"])
    .tryFold(1, (acc, s) => {
      const n = Number(s);
      return Number.isNaN(n) ? err(`bad:${s}`) : ok(acc * n);
    });

  assert(!result.isOk());
  assertEquals(result.unwrapErr(), "bad:x");
});

Deno.test("consume: reduce non-empty", () => {
  const result = RichIterator.from([1, 2, 3, 4])
    .reduce((acc, x) => acc + x);

  assert(result.isSome());
  assertEquals(result.unwrap(), 10);
});

Deno.test("consume: reduce empty", () => {
  const result = RichIterator.from<number>([])
    .reduce((acc, x) => acc + x);

  assert(!result.isSome());
});

Deno.test("consume: tryReduce success", () => {
  const result = RichIterator.from([100, 5, 2])
    .tryReduce((acc, x) => x === 0 ? err("zero") : ok(acc / x));

  assert(result.isSome());
  const inner = result.unwrap();
  assert(inner.isOk());
  assertEquals(inner.unwrap(), 10);
});

Deno.test("consume: tryReduce failure", () => {
  const result = RichIterator.from([100, 5, 0, 2])
    .tryReduce((acc, x) => x === 0 ? err("zero") : ok(acc / x));

  assert(result.isSome());
  const inner = result.unwrap();
  assert(!inner.isOk());
  assertEquals(inner.unwrapErr(), "zero");
});

Deno.test("consume: forEach", () => {
  const seen: number[] = [];

  const iter = RichIterator.from([1, 2, 3]);
  iter.forEach((x) => {
    seen.push(x * 2);
  });

  assertEquals(seen, [2, 4, 6]);
  assertEquals(iter.toArray(), []);
});

Deno.test("consume: tryForEach success", () => {
  const seen: number[] = [];

  const result = RichIterator.from([1, 2, 3]).tryForEach((x) => {
    seen.push(x);
    return ok();
  });

  assert(result.isOk());
  assertEquals(seen, [1, 2, 3]);
});

Deno.test("consume: tryForEach stops on first error", () => {
  const seen: number[] = [];

  const result = RichIterator.from([1, 2, 3, 4]).tryForEach((x) => {
    seen.push(x);
    return x < 3 ? ok() : err("stop");
  });

  assert(!result.isOk());
  assertEquals(result.unwrapErr(), "stop");
  assertEquals(seen, [1, 2, 3]);
});

Deno.test("consume: advanceBy success", () => {
  const it = RichIterator.from([10, 20, 30, 40]);

  const result = it.advanceBy(2);

  assert(result.isOk());
  assertEquals(it.next(), { done: false, value: 30 });
});

Deno.test("consume: advanceBy failure returns remaining count", () => {
  const it = RichIterator.from([10]);

  const result = it.advanceBy(3);

  assert(!result.isOk());
  assertEquals(result.unwrapErr(), 2);
});

Deno.test("consume: nextChunk full chunk", () => {
  const it = RichIterator.from([1, 2, 3, 4]);

  const result = it.nextChunk(2);

  assert(result.isOk());
  assertEquals(result.unwrap(), [1, 2]);
});

Deno.test("consume: nextChunk partial chunk on exhaustion", () => {
  const it = RichIterator.from([1, 2, 3]);

  it.nextChunk(2);
  const result = it.nextChunk(2);

  assert(!result.isOk());
  assertEquals(result.unwrapErr(), [3]);
});

Deno.test("consume: count", () => {
  const count = RichIterator.from([1, 2, 3, 4, 5]).count();
  assertEquals(count, 5);
});
