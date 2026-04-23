import { assertEquals } from "@std/assert";
import { RichIterator } from "../RichIterator.ts";

Deno.test("comparison: eq true", () => {
  assertEquals(
    RichIterator.from([1, 2, 3]).eq([1, 2, 3]),
    true,
  );
});

Deno.test("comparison: eq false on length mismatch", () => {
  assertEquals(
    RichIterator.from([1, 2]).eq([1, 2, 3]),
    false,
  );
});

Deno.test("comparison: eq uses Object.is semantics", () => {
  assertEquals(
    RichIterator.from([NaN]).eq([NaN]),
    true,
  );
});

Deno.test("comparison: eqBy", () => {
  assertEquals(
    RichIterator.from([1, 2, 3]).eqBy(
      ["1", "2", "3"],
      (a, b) => String(a) === b,
    ),
    true,
  );
});

Deno.test("comparison: ne", () => {
  assertEquals(
    RichIterator.from([1, 2, 3]).ne([1, 2, 4]),
    true,
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
});

Deno.test("comparison: cmp greater", () => {
  assertEquals(
    RichIterator.from([1, 3]).cmp([1, 2, 9], (a, b) => a - b),
    "greater",
  );
});

Deno.test("comparison: lt le gt ge", () => {
  const less = RichIterator.from([1, 2]);
  const equal = RichIterator.from([1, 2]);
  const greater = RichIterator.from([1, 3]);
  const greater2 = RichIterator.from([1, 3]);

  assertEquals(less.lt([1, 3], (a, b) => a - b), true);
  assertEquals(equal.le([1, 2], (a, b) => a - b), true);
  assertEquals(greater.gt([1, 2], (a, b) => a - b), true);
  assertEquals(greater2.ge([1, 3], (a, b) => a - b), true);
});

Deno.test("comparison: max", () => {
  const result = RichIterator.from([3, 1, 5, 2]).max((a, b) => a - b);

  assertEquals(result.isSome(), true);
  assertEquals(result.unwrap(), 5);
});

Deno.test("comparison: min", () => {
  const result = RichIterator.from([3, 1, 5, 2]).min((a, b) => a - b);

  assertEquals(result.isSome(), true);
  assertEquals(result.unwrap(), 1);
});
