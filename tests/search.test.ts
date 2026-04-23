import { assert, assertEquals } from "@std/assert";
import { RichIterator } from "../src/RichIterator.ts";
import { none, some } from "@sck/optres";

Deno.test("search: some", () => {
  assertEquals(
    RichIterator.from([1, 2, 3]).some((x) => x > 2),
    true,
  );
  assertEquals(
    RichIterator.from([1, 2, 3]).some((x) => x > 5),
    false,
  );
});

Deno.test("search: every", () => {
  assertEquals(
    RichIterator.from([2, 4, 6]).every((x) => x % 2 === 0),
    true,
  );
  assertEquals(
    RichIterator.from([2, 3, 6]).every((x) => x % 2 === 0),
    false,
  );
});

Deno.test("search: find", () => {
  const result = RichIterator.from([1, 3, 4, 6]).find((x) => x % 2 === 0);

  assert(result.isSome());
  assertEquals(result.unwrap(), 4);
});

Deno.test("search: findMap", () => {
  const result = RichIterator.from(["x", "y", "42", "7"]).findMap((s) => {
    const n = Number(s);
    return Number.isNaN(n) ? none() : some(n);
  });

  assert(result.isSome());
  assertEquals(result.unwrap(), 42);
});

Deno.test("search: findMap failure", () => {
  const result = RichIterator.from(["x", "y"]).findMap((s) => {
    const n = Number(s);
    return Number.isNaN(n) ? none() : some(n);
  });

  assert(result.isNone());
});

Deno.test("search: position", () => {
  const result = RichIterator.from([10, 20, 30, 40]).position((x) => x === 30);

  assert(result.isSome());
  assertEquals(result.unwrap(), 2);
});

Deno.test("search: last", () => {
  const result = RichIterator.from([1, 2, 3]).last();

  assert(result.isSome());
  assertEquals(result.unwrap(), 3);
});

Deno.test("search: last on empty iterator", () => {
  const result = RichIterator.from<number>([]).last();
  assert(result.isNone());
});

Deno.test("search: nth", () => {
  const result = RichIterator.from([5, 6, 7, 8]).nth(2);

  assert(result.isSome());
  assertEquals(result.unwrap(), 7);
});

Deno.test("search: nth out of range", () => {
  const result = RichIterator.from([5, 6]).nth(5);
  assert(result.isNone());
});

Deno.test("search: partition", () => {
  const [evens, odds] = RichIterator.from([1, 2, 3, 4, 5, 6])
    .partition((x) => x % 2 === 0);

  assertEquals(evens, [2, 4, 6]);
  assertEquals(odds, [1, 3, 5]);
});

Deno.test("search: unzip", () => {
  const [left, right] = RichIterator.from<readonly [number, string]>([
    [1, "a"],
    [2, "b"],
    [3, "c"],
  ]).unzip();

  assertEquals(left, [1, 2, 3]);
  assertEquals(right, ["a", "b", "c"]);
});
