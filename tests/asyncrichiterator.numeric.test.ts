import { AsyncRichIterator } from "@sck/richiterator";
import { assert, assertEquals, assertInstanceOf } from "@std/assert";
import { ok } from "@sck/optres";

Deno.test(`AsyncRichIterator product`, async (t) => {
  await t.step(`success`, async () => {
    const result = await AsyncRichIterator.from([1, "2", 3]).product();

    assert(result.equals(ok(6)));
  });
  await t.step(`failure`, async () => {
    const result = await AsyncRichIterator.from([1, "x", 3]).product();

    assert(result.isErr());
    assertInstanceOf(result.unwrapErr(), TypeError);
  });
});

Deno.test(`AsyncRichIterator sum`, async (t) => {
  await t.step(`success`, async () => {
    const result = await AsyncRichIterator.from([1, "2", 3]).sum();

    assert(result.equals(ok(6)));
  });
  await t.step(`failure`, async () => {
    const result = await AsyncRichIterator.from([1, "x", 3]).sum();

    assert(result.isErr());
    assertInstanceOf(result.unwrapErr(), TypeError);
  });
});

Deno.test(`AsyncRichIterator productUnchecked`, async (t) => {
  await t.step(`success`, async () => {
    const result = await AsyncRichIterator.from([1, "2", 3]).productUnchecked();

    assertEquals(result, 6);
  });
  await t.step(`failure`, async () => {
    const result = await AsyncRichIterator.from([1, "x", 3]).productUnchecked();

    assertEquals(result, NaN);
  });
});

Deno.test(`AsyncRichIterator sumUnchecked`, async (t) => {
  await t.step(`success`, async () => {
    const result = await AsyncRichIterator.from([1, "2", 3]).sumUnchecked();

    assertEquals(result, 6);
  });
  await t.step(`failure`, async () => {
    const result = await AsyncRichIterator.from([1, "x", 3]).sumUnchecked();

    assertEquals(result, NaN);
  });
});
