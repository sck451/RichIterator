import { assert, assertEquals, assertFalse } from "@std/assert";
import { RichIterator } from "../src/RichIterator.ts";

Deno.test("comparison: eq true", () => {
  assert(
    RichIterator.from([1, 2, 3]).eq([1, 2, 3]),
  );
});

Deno.test("comparison: eq false on length mismatch", () => {
  assertFalse(
    RichIterator.from([1, 2]).eq([1, 2, 3]),
  );
});

Deno.test("comparison: eq uses Object.is semantics", () => {
  assert(
    RichIterator.from([NaN]).eq([NaN]),
  );
});

Deno.test("comparison: eqBy", () => {
  assert(
    RichIterator.from([1, 2, 3]).eqBy(
      ["1", "2", "3"],
      (a, b) => String(a) === b,
    ),
  );
  assertFalse(
    RichIterator.from([1, 2, 3]).eqBy(["1", "2"], (a, b) => String(a) === b),
  );
});

Deno.test("comparison: ne", () => {
  assert(
    RichIterator.from([1, 2, 3]).ne([1, 2, 4]),
  );
});

Deno.test("comparison: cmp equal", () => {
  assertEquals(
    RichIterator.from([1, 2, 3]).cmp([1, 2, 3], (a, b) => a - b),
    "equal",
  );
});

Deno.test("comparison: cmp less", () => {
  assertEquals(
    RichIterator.from([1, 2, 3]).cmp([1, 2, 4], (a, b) => a - b),
    "less",
  );
  assert(RichIterator.from([1, 2]).cmp([1, 2, 3], (a, b) => a - b), "less");
});

Deno.test("comparison: cmp greater", () => {
  assertEquals(
    RichIterator.from([1, 3]).cmp([1, 2, 9], (a, b) => a - b),
    "greater",
  );
  assertEquals(
    RichIterator.from([1, 2, 3]).cmp([1, 2], (a, b) => a - b),
    "greater",
  );
});

Deno.test("comparison: default comparator", () => {
  assertEquals(RichIterator.from([1, 3]).cmp([1, 2, 9]), "greater");
  assertEquals(RichIterator.from([1, 2, 3]).cmp([1, 2, 4]), "less");
});

Deno.test("comparison: lt le gt ge", () => {
  const less = RichIterator.from([1, 2]);
  const equal = RichIterator.from([1, 2]);
  const greater = RichIterator.from([1, 3]);
  const greater2 = RichIterator.from([1, 3]);

  assert(less.lt([1, 3], (a, b) => a - b));
  assert(equal.le([1, 2], (a, b) => a - b));
  assert(greater.gt([1, 2], (a, b) => a - b));
  assert(greater2.ge([1, 3], (a, b) => a - b));
});

Deno.test("comparison: max", () => {
  const result = RichIterator.from([3, 1, 5, 2]).max((a, b) => a - b);

  assert(result.isSome());
  assertEquals(result.unwrap(), 5);

  const emptyResult = RichIterator.from([]).max((a, b) => a - b);
  assert(emptyResult.isNone());
});

Deno.test("comparison: min", () => {
  const result = RichIterator.from([3, 1, 5, 2]).min((a, b) => a - b);

  assert(result.isSome());
  assertEquals(result.unwrap(), 1);

  const emptyResult = RichIterator.from([]).min((a, b) => a - b);
  assert(emptyResult.isNone());
});
