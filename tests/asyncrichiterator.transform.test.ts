import { AsyncRichIterator } from "@sck/richiterator";
import { assert, assertEquals, assertThrows } from "@std/assert";
import { err, none, ok, some } from "@sck/optres";

Deno.test(`AsyncRichIterator enumerate`, async (t) => {
  const iter = AsyncRichIterator.from(["1", "2", "3"]).enumerate();

  await t.step(`counts correctly`, async () => {
    assertEquals(await iter.nextOption(), some([0, "1"]));
    assertEquals(await iter.nextOption(), some([1, "2"]));
  });
});

Deno.test(`AsyncRichIterator map`, async (t) => {
  await t.step(`converts synchronously`, async () => {
    const iter = AsyncRichIterator.from(["1", "2", "3"]);
    const mapped = iter.map((value) => Number(value));
    assertEquals(await mapped.toArray(), [1, 2, 3]);
  });

  await t.step(`converts synchronously`, async () => {
    const iter = AsyncRichIterator.from(["1", "2", "3"]);
    const mapped = iter.map((value) => Promise.resolve(Number(value)));
    assertEquals(await mapped.toArray(), [1, 2, 3]);
  });
});

Deno.test(`AsyncRichIterator tryMap`, async (t) => {
  await t.step(`sync success`, async () => {
    const result = await AsyncRichIterator.from([0, 1, 2, 3]).tryMap((val) =>
      ok(val)
    );

    assert(result.isOk());
    assertEquals(result.unwrap(), [0, 1, 2, 3]);
  });

  await t.step(`async success`, async () => {
    const result = await AsyncRichIterator.from([0, 1, 2, 3]).tryMap(async (
      val,
    ) => await ok(val));

    assert(result.isOk());
    assertEquals(result.unwrap(), [0, 1, 2, 3]);
  });

  await t.step(`sync failure`, async () => {
    const result = await AsyncRichIterator.from([0, 1, 2, 3]).tryMap((val) =>
      val === 2 ? err("failure") : ok(val)
    );

    assert(result.isErr());
    assertEquals(result.unwrapErr(), "failure");
  });

  await t.step(`async failure`, async () => {
    const result = await AsyncRichIterator.from([0, 1, 2, 3]).tryMap(async (
      val,
    ) => await (val === 2 ? err("failure") : ok(val)));

    assert(result.isErr());
    assertEquals(result.unwrapErr(), "failure");
  });
});

Deno.test(`AsyncRichIterator mapWhile`, async (t) => {
  await t.step(`ends with None sync`, async () => {
    const result = await AsyncRichIterator.from(["1", "2", "x", "3"]).mapWhile(
      (val) => Number.isNaN(Number(val)) ? none() : some(val),
    ).toArray();

    assertEquals(result, ["1", "2"]);
  });

  await t.step(`ends with None async`, async () => {
    const result = await AsyncRichIterator.from(["1", "2", "x", "3"]).mapWhile(
      async (val) => await Number.isNaN(Number(val)) ? none() : some(val),
    ).toArray();

    assertEquals(result, ["1", "2"]);
  });

  await t.step(`exhaustion sync`, async () => {
    const result = await AsyncRichIterator.from([0, 1, 2, 3]).mapWhile(
      (val) => Number.isNaN(Number(val)) ? none() : some(val),
    ).toArray();

    assertEquals(result, [0, 1, 2, 3]);
  });

  await t.step(`exhaustion async`, async () => {
    const result = await AsyncRichIterator.from([0, 1, 2, 3]).mapWhile(
      async (val) => await Number.isNaN(Number(val)) ? none() : some(val),
    ).toArray();

    assertEquals(result, [0, 1, 2, 3]);
  });
});

Deno.test(`AsyncRichIterator filter`, async (t) => {
  await t.step(`sync`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3, 4, 5]).filter((x) =>
      x % 2 === 0
    ).toArray();

    assertEquals(result, [2, 4]);
  });

  await t.step(`async`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3, 4, 5]).filter(async (
      x,
    ) => await (x % 2 === 0)).toArray();

    assertEquals(result, [2, 4]);
  });
});

Deno.test(`AsyncRichIterator take`, async (t) => {
  const original = AsyncRichIterator.from([0, 1, 2, 3, 4]);

  await t.step(`taken iterator yields correct result`, async () => {
    const result = await original.take(2).toArray();
    assertEquals(result, [0, 1]);
  });
  await t.step(`take(0) gives empty iterator`, async () => {
    const result = await original.take(0).toArray();
    assertEquals(result, []);
  });
  await t.step(`original iterator yields remaining values`, async () => {
    const result = await original.toArray();
    assertEquals(result, [2, 3, 4]);
  });
  await t.step(`to exhaustion`, async () => {
    const result = await AsyncRichIterator.from([0, 1, 2, 3, 4]).take(6)
      .toArray();
    assertEquals(result, [0, 1, 2, 3, 4]);
  });
  await t.step(`invalid number`, () => {
    assertThrows(() => AsyncRichIterator.from([1, 2, 3]).take(-1));
    assertThrows(() => AsyncRichIterator.from([1, 2, 3]).take(0.5));
  });
});

Deno.test(`AsyncRichIterator drop`, async (t) => {
  await t.step(`correctly drops`, async () => {
    const result = await AsyncRichIterator.from([0, 1, 2, 3]).drop(2).toArray();
    assertEquals(result, [2, 3]);
  });
  await t.step(`drop past exhaustion`, async () => {
    const result = await AsyncRichIterator.from([0, 1, 2, 3]).drop(5).toArray();
    assertEquals(result, []);
  });
  await t.step(`invalid number`, () => {
    assertThrows(() => AsyncRichIterator.from([1, 2, 3]).drop(-1));
    assertThrows(() => AsyncRichIterator.from([1, 2, 3]).drop(0.5));
  });
});

Deno.test(`AsyncRichIterator dropWhile`, async (t) => {
  await t.step(`with remainder sync`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3, 0, 4]).dropWhile(
      (x) => x < 3,
    ).toArray();
    assertEquals(result, [3, 0, 4]);
  });
  await t.step(`with remainder async`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3, 0, 4]).dropWhile(
      async (x) => await x < 3,
    ).toArray();
    assertEquals(result, [3, 0, 4]);
  });
  await t.step(`to exhaustion sync`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3, 4, 5]).dropWhile(
      (x) => x < 6,
    ).toArray();
    assertEquals(result, []);
  });
  await t.step(`to exhaustion async`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3, 4, 5]).dropWhile(
      async (x) => await x < 6,
    ).toArray();
    assertEquals(result, []);
  });
});

Deno.test(`AsyncRichIterator takeWhile`, async (t) => {
  await t.step(`with remainder sync`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3, 0, 4]).takeWhile(
      (x) => x < 3,
    ).toArray();
    assertEquals(result, [1, 2]);
  });
  await t.step(`with remainder async`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3, 0, 4]).takeWhile(
      async (x) => await x < 3,
    ).toArray();
    assertEquals(result, [1, 2]);
  });
  await t.step(`to exhaustion sync`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3, 4, 5]).takeWhile(
      (x) => x < 6,
    ).toArray();
    assertEquals(result, [1, 2, 3, 4, 5]);
  });
  await t.step(`to exhaustion async`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3, 4, 5]).takeWhile(
      async (x) => await x < 6,
    ).toArray();
    assertEquals(result, [1, 2, 3, 4, 5]);
  });
});

Deno.test(`AsyncRichIterator flatMap`, async (t) => {
  await t.step(`sync map`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3]).flatMap(
      (x) => [x, x ** 2],
    ).toArray();
    assertEquals(result, [1, 1, 2, 4, 3, 9]);
  });
  await t.step(`async map`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3]).flatMap(
      async (x) => await [x, x ** 2],
    ).toArray();
    assertEquals(result, [1, 1, 2, 4, 3, 9]);
  });
});

Deno.test("AsyncRichIterator flatten", async (t) => {
  await t.step(`sync values`, async () => {
    const result = await AsyncRichIterator.from([
      [1, 2],
      [3],
      [
        4,
        5,
      ],
    ])
      .flatten()
      .toArray();

    assertEquals(result, [1, 2, 3, 4, 5]);
  });
  await t.step(`async values`, async () => {
    const result = await AsyncRichIterator.from([
      AsyncRichIterator.from([1, 2]),
      AsyncRichIterator.from([3]),
      AsyncRichIterator.from([
        4,
        5,
      ]),
    ])
      .flatten()
      .toArray();

    assertEquals(result, [1, 2, 3, 4, 5]);
  });
});

Deno.test(`AsyncRichIterator inspect`, async (t) => {
  const seen: number[] = [];
  const result = await AsyncRichIterator.from([1, 2, 3]).inspect((val) => {
    seen.push(val);
  }).toArray();
  await t.step(`preserves values`, () => {
    assertEquals(result, [1, 2, 3]);
  });
  await t.step(`runs inspector`, () => {
    assertEquals(seen, [1, 2, 3]);
  });
});

Deno.test(`AsyncRichIterator toResult`, async (t) => {
  await t.step(`ok`, async () => {
    const result = await AsyncRichIterator.from([ok(1), ok(2), ok(3)])
      .toResult();

    assert(result.isOk());
    assertEquals(result.unwrap(), [1, 2, 3]);
  });

  await t.step(`err`, async () => {
    const result = await AsyncRichIterator.from([ok(1), err("2"), ok(3)])
      .toResult();

    assert(result.isErr());
    assertEquals(result.unwrapErr(), "2");
  });
});

Deno.test(`AsyncRichIterator toOption`, async (t) => {
  await t.step(`some`, async () => {
    const result = await AsyncRichIterator.from([some(1), some(2), some(3)])
      .toOption();

    assert(result.isSome());
    assertEquals(result.unwrap(), [1, 2, 3]);
  });

  await t.step(`none`, async () => {
    const result = await AsyncRichIterator.from([some(1), none(), some(3)])
      .toOption();

    assert(result.isNone());
  });
});

Deno.test(`AsyncRichIterator chunks`, async (t) => {
  await t.step(`get full chunks as ok() and remainder as err()`, async () => {
    const iterator = AsyncRichIterator.from([1, 2, 3, 4, 5]).chunks(2);

    const first = (await iterator.nextOption()).unwrap();
    assertEquals(first.unwrap(), [1, 2]);

    const second = (await iterator.nextOption()).unwrap();
    assertEquals(second.unwrap(), [3, 4]);

    const third = (await iterator.nextOption()).unwrap();
    assertEquals(third.unwrapErr(), [5]);
    await iterator.nextOption();
  });

  await t.step(`get full chunks as ok() and nothing if completed`, async () => {
    const iterator = AsyncRichIterator.from([1, 2]).chunks(2);

    const first = (await iterator.nextOption()).unwrap();
    assertEquals(first.unwrap(), [1, 2]);

    const second = await iterator.nextOption();
    assert(second.isNone());
  });
  await t.step(`invalid parameter`, () => {
    assertThrows(() => AsyncRichIterator.from([1, 2, 3]).chunks(-1));
    assertThrows(() => AsyncRichIterator.from([1, 2, 3]).chunks(0.5));
  });
});

Deno.test(`AsyncRichIterator chain`, async (t) => {
  await t.step(`sync`, async () => {
    const result = await AsyncRichIterator.from([1, 2]).chain([3, 4]).toArray();
    assertEquals(result, [1, 2, 3, 4]);
  });
  await t.step(`async`, async () => {
    const result = await AsyncRichIterator.from([1, 2]).chain(
      AsyncRichIterator.from([3, 4]),
    ).toArray();
    assertEquals(result, [1, 2, 3, 4]);
  });
});

Deno.test(`AsyncRichIterator filterMap`, async (t) => {
  await t.step(`sync`, async () => {
    const result = await AsyncRichIterator.from(["1", "x", "2", "NaN", "3"])
      .filterMap((s) => {
        const n = Number(s);
        return Number.isNaN(n) ? none() : some(n);
      }).toArray();

    assertEquals(result, [1, 2, 3]);
  });
  await t.step(`async`, async () => {
    const result = await AsyncRichIterator.from(["1", "x", "2", "NaN", "3"])
      .filterMap(async (s) => {
        const n = Number(s);
        return await Number.isNaN(n) ? none() : some(n);
      }).toArray();

    assertEquals(result, [1, 2, 3]);
  });
});

Deno.test(`AsyncRichIterator zip`, async (t) => {
  await t.step(`sync`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3]).zip(["a", "b"])
      .toArray();
    assertEquals(result, [[1, "a"], [2, "b"]]);
  });
  await t.step(`async`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3]).zip(
      AsyncRichIterator.from(["a", "b"]),
    )
      .toArray();
    assertEquals(result, [[1, "a"], [2, "b"]]);
  });
  await t.step(`first exhausted`, async () => {
    const result = await AsyncRichIterator.from([1, 2]).zip(
      AsyncRichIterator.from(["a", "b", "c"]),
    )
      .toArray();
    assertEquals(result, [[1, "a"], [2, "b"]]);
  });
});

Deno.test(`AsyncRichIterator zipWith`, async (t) => {
  await t.step(`sync`, async () => {
    const iter = AsyncRichIterator.from([1, 2, 3]);
    const other = AsyncRichIterator.from(["a", "b"]);

    const zipped = await iter.zipWith(other, (l, r) => `${l}${r}`).toArray();
    assertEquals(zipped, ["1a", "2b"]);
  });
  await t.step(`async`, async () => {
    const iter = AsyncRichIterator.from([1, 2, 3]);
    const other = AsyncRichIterator.from(["a", "b"]);

    const zipped = await iter.zipWith(other, async (l, r) => await `${l}${r}`)
      .toArray();
    assertEquals(zipped, ["1a", "2b"]);
  });
  await t.step(`first exhausted`, async () => {
    const iter = AsyncRichIterator.from([1, 2]);
    const other = AsyncRichIterator.from(["a", "b", "c"]);

    const zipped = await iter.zipWith(other, async (l, r) => await `${l}${r}`)
      .toArray();
    assertEquals(zipped, ["1a", "2b"]);
  });
});

Deno.test(`AsyncRichIterator intersperse`, async (t) => {
  await t.step("transform: intersperse", async () => {
    const result = await AsyncRichIterator.from(["a", "b", "c"])
      .intersperse("-")
      .toArray();

    assertEquals(result, ["a", "-", "b", "-", "c"]);
  });

  await t.step("transform: intersperse one item iterator", async () => {
    const result = await AsyncRichIterator.from(["a"])
      .intersperse("-")
      .toArray();

    assertEquals(result, ["a"]);
  });

  await t.step("transform: intersperse empty iterator", async () => {
    const result = await AsyncRichIterator.from<string>([])
      .intersperse("-")
      .toArray();

    assertEquals(result, []);
  });
});

Deno.test("AsyncRichIterator intersperseWith", async (t) => {
  await t.step(`sync`, async () => {
    let i = 0;

    const result = await AsyncRichIterator.from(["a", "b", "c"])
      .intersperseWith(() => `sep${++i}`)
      .toArray();

    assertEquals(result, ["a", "sep1", "b", "sep2", "c"]);
  });
  await t.step(`async`, async () => {
    let i = 0;

    const result = await AsyncRichIterator.from(["a", "b", "c"])
      .intersperseWith(async () => await `sep${++i}`)
      .toArray();

    assertEquals(result, ["a", "sep1", "b", "sep2", "c"]);
  });
});
