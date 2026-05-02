import { assert, assertEquals } from "@std/assert";
import { RichIterator } from "../src/RichIterator.ts";

Deno.test("numeric: sum success", () => {
  const result = RichIterator.from([1, "2", 3]).sum();

  assert(result.isOk());
  assertEquals(result.unwrap(), 6);
});

Deno.test("numeric: sum failure", () => {
  const result = RichIterator.from([1, "x", 3]).sum();

  assert(!result.isOk());
  assert(result.unwrapErr() instanceof TypeError);
});

Deno.test("numeric: product success", () => {
  const result = RichIterator.from([2, "3", 4]).product();

  assert(result.isOk());
  assertEquals(result.unwrap(), 24);
});

Deno.test("numeric: product failure", () => {
  const result = RichIterator.from([2, "x", 4]).product();

  assert(!result.isOk());
  assert(result.unwrapErr() instanceof TypeError);
});

Deno.test("numeric: sumUnchecked", () => {
  const successResult = RichIterator.from([1, "2", 3]).sumUnchecked();
  const failResult = RichIterator.from([2, "x", 4]).sumUnchecked();

  assertEquals(successResult, 6);
  assertEquals(failResult, NaN);
});

Deno.test("numeric: productUnchecked", () => {
  const successResult = RichIterator.from([1, "2", 3]).productUnchecked();
  const failResult = RichIterator.from([2, "x", 4]).productUnchecked();

  assertEquals(successResult, 6);
  assertEquals(failResult, NaN);
});