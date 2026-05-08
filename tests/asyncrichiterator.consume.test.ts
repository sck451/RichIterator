import { AsyncRichIterator } from "@sck/richiterator";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { err, none, ok, some } from "@sck/optres";

Deno.test(`AsyncRichIterator fold`, async (t) => {
  await t.step(`sync`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3, 4]).fold(
      0,
      (acc, x) => acc + x,
    );

    assertEquals(result, 10);
  });
  await t.step(`async`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3, 4]).fold(
      0,
      async (acc, x) => await acc + x,
    );

    assertEquals(result, 10);
  });
});

Deno.test(`AsyncRichIterator tryFold`, async (t) => {
  await t.step(`success sync`, async () => {
    const result = await AsyncRichIterator.from(["2", "3", "4"])
      .tryFold(1, (acc, s) => {
        const n = Number(s);
        return Number.isNaN(n) ? err("bad") : ok(acc * n);
      });

    assert(result.equals(ok(24)));
  });
  await t.step(`success async`, async () => {
    const result = await AsyncRichIterator.from(["2", "3", "4"])
      .tryFold(1, async (acc, s) => {
        const n = await Number(s);
        return Number.isNaN(n) ? err("bad") : ok(acc * n);
      });

    assert(result.equals(ok(24)));
  });
  await t.step(`failure sync`, async () => {
    const result = await AsyncRichIterator.from(["2", "x", "4"])
      .tryFold(1, (acc, s) => {
        const n = Number(s);
        return Number.isNaN(n) ? err("bad") : ok(acc * n);
      });

    assert(result.equals(err("bad")));
  });
  await t.step(`failure async`, async () => {
    const result = await AsyncRichIterator.from(["2", "x", "4"])
      .tryFold(1, async (acc, s) => {
        const n = await Number(s);
        return Number.isNaN(n) ? err("bad") : ok(acc * n);
      });

    assert(result.equals(err("bad")));
  });
});

Deno.test(`AsyncRichIterator reduce`, async (t) => {
  await t.step(`some sync`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3, 4]).reduce(
      (acc, x) => acc + x,
    );

    assert(result.equals(some(10)));
  });
  await t.step(`some async`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3, 4]).reduce(
      async (acc, x) => await acc + x,
    );

    assert(result.equals(some(10)));
  });
  await t.step(`none sync`, async () => {
    const result = await AsyncRichIterator.from<number>([]).reduce(
      (acc, x) => acc + x,
    );

    assert(result.equals(none()));
  });
  await t.step(`none async`, async () => {
    const result = await AsyncRichIterator.from<number>([]).reduce(
      async (acc, x) => await acc + x,
    );

    assert(result.equals(none()));
  });
});

Deno.test(`AsyncRichIterator tryReduce`, async (t) => {
  await t.step(`success sync`, async () => {
    const result = await AsyncRichIterator.from([100, 5, 2])
      .tryReduce((acc, x) => x === 0 ? err("zero") : ok(acc / x));

    assert(result.isSome());
    const inner = result.unwrap();
    assert(inner.equals(ok(10)));
  });
  await t.step(`success async`, async () => {
    const result = await AsyncRichIterator.from([100, 5, 2])
      .tryReduce(async (acc, x) => await x === 0 ? err("zero") : ok(acc / x));

    assert(result.isSome());
    const inner = result.unwrap();
    assert(inner.equals(ok(10)));
  });
  await t.step(`failure sync`, async () => {
    const result = await AsyncRichIterator.from([100, 5, 0, 2])
      .tryReduce((acc, x) => x === 0 ? err("zero") : ok(acc / x));

    assert(result.isSome());
    const inner = result.unwrap();
    assert(inner.equals(err("zero")));
  });
  await t.step(`failure async`, async () => {
    const result = await AsyncRichIterator.from([100, 5, 0, 2])
      .tryReduce(async (acc, x) => await x === 0 ? err("zero") : ok(acc / x));

    assert(result.isSome());
    const inner = result.unwrap();
    assert(inner.equals(err("zero")));
  });
  await t.step(`empty`, async () => {
    const result = await AsyncRichIterator.from<number>([]).tryReduce((
      accumulator,
      value,
    ) => ok(accumulator + value));

    assert(result.equals(none()));
  });
});

Deno.test(`AsyncRichIterator forEach`, async (t) => {
  await t.step(`sync`, async () => {
    let total = 0;

    await AsyncRichIterator.from([1, 2, 3]).forEach((val) => {
      total += val;
    });

    assertEquals(total, 6);
  });
  await t.step(`async`, async () => {
    let total = 0;

    await AsyncRichIterator.from([1, 2, 3]).forEach(async (val) => {
      await total;
      total += val;
    });

    assertEquals(total, 6);
  });
});

Deno.test(`AsyncRichIterator advanceBy`, async (t) => {
  await t.step(`success`, async () => {
    const iterator = AsyncRichIterator.from([10, 20, 30, 40]);
    assert((await iterator.advanceBy(2)).isOk());
    assert((await iterator.nextOption()).equals(some(30)));
  });
  await t.step(`failure`, async () => {
    const iterator = AsyncRichIterator.from([10]);
    assert((await iterator.advanceBy(3)).equals(err(2)));
  });
  await t.step(`invalid parameter`, () => {
    const iterator = AsyncRichIterator.from([1, 2, 3]);
    assertRejects(() => iterator.advanceBy(-1));
    assertRejects(() => iterator.advanceBy(0.5));
  });
});

Deno.test(`AsyncRichIterator nextChunk`, async (t) => {
  await t.step(`full chunk gives ok()`, async () => {
    const iterator = AsyncRichIterator.from([1, 2, 3]);
    const result = await iterator.nextChunk(2);

    assert(result.isOk());
    assertEquals(result.unwrap(), [1, 2]);
  });

  await t.step(`partial chunk gives err()`, async () => {
    const iterator = AsyncRichIterator.from([1, 2, 3]);
    const result = await iterator.nextChunk(4);

    assert(result.isErr());
    assertEquals(result.unwrapErr(), [1, 2, 3]);
  });

  await t.step(`error on invalid paramter`, () => {
    const iterator = AsyncRichIterator.from([1, 2, 3]);
    assertRejects(() => iterator.nextChunk(0));
    assertRejects(() => iterator.nextChunk(0.5));
  });
});

Deno.test(`AsyncRichIterator count`, async () => {
  const count = await AsyncRichIterator.from([1, 2, 3, 4, 5]).count();
  assertEquals(count, 5);
});
