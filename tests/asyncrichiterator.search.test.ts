import { AsyncRichIterator } from "@sck/richiterator";
import { assert, assertEquals, assertFalse, assertRejects } from "@std/assert";
import { none, some } from "@sck/optres";

Deno.test(`AsyncRichIterator some`, async (t) => {
  await t.step(`some sync`, async () => {
    assert(
      await AsyncRichIterator.from([1, 2, 3]).some((x) => x > 2),
    );
  });
  await t.step(`some async`, async () => {
    assert(
      await AsyncRichIterator.from([1, 2, 3]).some(async (x) => await x > 2),
    );
  });
  await t.step(`none sync`, async () => {
    assertFalse(
      await AsyncRichIterator.from([1, 2, 3]).some((x) => x > 3),
    );
  });
  await t.step(`none async`, async () => {
    assertFalse(
      await AsyncRichIterator.from([1, 2, 3]).some(async (x) => await x > 3),
    );
  });
});

Deno.test(`AsyncRichIterator every`, async (t) => {
  await t.step(`true sync`, async () => {
    assert(await AsyncRichIterator.from([2, 4, 6]).every((x) => x % 2 === 0));
  });
  await t.step(`true async`, async () => {
    assert(
      await AsyncRichIterator.from([2, 4, 6]).every(async (x) =>
        await x % 2 === 0
      ),
    );
  });
  await t.step(`false sync`, async () => {
    assertFalse(
      await AsyncRichIterator.from([1, 2, 3]).every((x) => x % 2 === 0),
    );
  });
  await t.step(`false async`, async () => {
    assertFalse(
      await AsyncRichIterator.from([1, 2, 3]).every(async (x) =>
        await x % 2 === 0
      ),
    );
  });
});

Deno.test(`AsyncRichIterator find`, async (t) => {
  await t.step(`success sync`, async () => {
    const result = await AsyncRichIterator.from([1, 3, 4, 6]).find((x) =>
      x % 2 === 0
    );

    assert(result.equals(some(4)));
  });
  await t.step(`success async`, async () => {
    const result = await AsyncRichIterator.from([1, 3, 4, 6]).find(async (x) =>
      await x % 2 === 0
    );

    assert(result.equals(some(4)));
  });
  await t.step(`failure sync`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3]).find((val) =>
      val === 4
    );
    assert(result.equals(none()));
  });
  await t.step(`failure async`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3]).find(async (val) =>
      await val === 4
    );
    assert(result.equals(none()));
  });
});

Deno.test(`AsyncRichIterator findMap`, async (t) => {
  await t.step(`success sync`, async () => {
    const result = await AsyncRichIterator.from(["x", "y", "42", "7"]).findMap(
      (s) => {
        const n = Number(s);
        return Number.isNaN(n) ? none() : some(n);
      },
    );

    assert(result.equals(some(42)));
  });
  await t.step(`success async`, async () => {
    const result = await AsyncRichIterator.from(["x", "y", "42", "7"]).findMap(
      async (s) => {
        const n = await Number(s);
        return Number.isNaN(n) ? none() : some(n);
      },
    );

    assert(result.equals(some(42)));
  });
  await t.step(`failure sync`, async () => {
    const result = await AsyncRichIterator.from(["x", "y"]).findMap((s) => {
      const n = Number(s);
      return Number.isNaN(n) ? none() : some(n);
    });

    assert(result.isNone());
  });
  await t.step(`failure async`, async () => {
    const result = await AsyncRichIterator.from(["x", "y"]).findMap(
      async (s) => {
        const n = await Number(s);
        return Number.isNaN(n) ? none() : some(n);
      },
    );

    assert(result.isNone());
  });
});

Deno.test(`AsyncRichIterator position`, async (t) => {
  await t.step(`success sync`, async () => {
    const result = await AsyncRichIterator.from([10, 20, 30, 40]).position((
      x,
    ) => x === 30);
    assert(result.equals(some(2)));
  });
  await t.step(`success async`, async () => {
    const result = await AsyncRichIterator.from([10, 20, 30, 40]).position(
      async (
        x,
      ) => await x === 30,
    );
    assert(result.equals(some(2)));
  });
  await t.step(`failure sync`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3]).position((val) =>
      val === 4
    );

    assert(result.isNone());
  });
  await t.step(`failure async`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3]).position(async (
      val,
    ) => await val === 4);

    assert(result.isNone());
  });
});

Deno.test(`AsyncRichIterator last`, async (t) => {
  await t.step(`non-empty`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3]).last();

    assert(result.equals(some(3)));
  });
  await t.step(`empty`, async () => {
    const result = await AsyncRichIterator.from([]).last();

    assert(result.isNone());
  });
});

Deno.test(`AsyncRichIterator nth`, async (t) => {
  await t.step(`found`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3]).nth(1);

    assert(result.equals(some(2)));
  });
  await t.step(`empty`, async () => {
    const result = await AsyncRichIterator.from([1, 2, 3]).nth(3);

    assert(result.isNone());
  });
  await t.step(`invalid parameter`, () => {
    assertRejects(() => AsyncRichIterator.from([1, 2, 3]).nth(-1));
    assertRejects(() => AsyncRichIterator.from([1, 2, 3]).nth(0.5));
  });
});

Deno.test(`AsyncRichIterator partition`, async () => {
  const [evens, odds] = await AsyncRichIterator.from([1, 2, 3, 4, 5, 6])
    .partition((x) => x % 2 === 0);

  assertEquals(evens, [2, 4, 6]);
  assertEquals(odds, [1, 3, 5]);
});

Deno.test(`AsyncRichIterator unzip`, async () => {
  const [left, right] = await AsyncRichIterator.from<readonly [number, string]>(
    [
      [1, "a"],
      [2, "b"],
      [3, "c"],
    ],
  ).unzip();

  assertEquals(left, [1, 2, 3]);
  assertEquals(right, ["a", "b", "c"]);
});
