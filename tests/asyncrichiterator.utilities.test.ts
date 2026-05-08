import { AsyncRichIterator } from "@sck/richiterator";
import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import { some } from "@sck/optres";
import {
  hasMethod,
  iteratorToAsync,
} from "../src/AsyncRichIterator/utilities.ts";

Deno.test(`AsyncRichIterator utilities`, async (t) => {
  const iter = AsyncRichIterator.from([1, 2, 3]);

  await t.step(`next`, async () => {
    assertEquals(await iter.next(), { done: false, value: 1 });
  });

  await t.step(`nextOption`, async () => {
    assert((await iter.nextOption()).equals(some(2)));
  });

  await t.step(`toArray some`, async () => {
    assertEquals(await iter.toArray(), [3]);
  });

  await t.step(`toArray none`, async () => {
    assertEquals(await iter.toArray(), []);
  });
});

Deno.test(`AsyncRichIterator inside utilities`, async (t) => {
  await t.step(`AsyncIterable`, async () => {
    const iter = iteratorToAsync(async function* () {
      await Promise.resolve();
      yield 1;
    }());

    assertEquals(await iter.toArray(), [1]);
  });
  await t.step(`AsyncIterator`, async () => {
    class Counter {
      private i = 0;

      async next(): Promise<IteratorResult<number>> {
        await Promise.resolve();
        if (this.i < 3) {
          return {
            value: this.i++,
            done: false,
          };
        }

        return {
          value: undefined,
          done: true,
        };
      }
    }
    const iter = iteratorToAsync(new Counter());
    assertEquals(await iter.toArray(), [0, 1, 2]);
  });
  await t.step(`non-iterable`, () => {
    assertThrows(() => iteratorToAsync(5 as unknown as Iterator<number>));
  });
});

Deno.test(`hasMethod`, async (t) => {
  const obj = {
    "next": () => 0,
    [Symbol.for("test")]: () => 0,
  };

  await t.step(`has string method`, () => {
    assert(hasMethod(obj, "next"));
  });
  await t.step(`has symbol method`, () => {
    assert(hasMethod(obj, Symbol.for("test")));
  });
  await t.step(`no string method`, () => {
    assertFalse(hasMethod(obj, "nextTest"));
  });
  await t.step(`no symbol method`, () => {
    assertFalse(hasMethod(obj, Symbol.for("nextTest")));
  });
});
