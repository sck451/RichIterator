import { AsyncRichIterator } from "@sck/richiterator";
import { assert, assertEquals, assertFalse } from "@std/assert";
import { none, some } from "@sck/optres";
import { getDefaultComparator } from "../src/RichIterator/comparison.ts";

Deno.test(`AsyncRichIterator eq`, async (t) => {
  await t.step(`true sync`, async () => {
    const iter = AsyncRichIterator.from([1, 2, 3]);
    assert(await iter.eq([1, 2, 3]));
  });
  await t.step(`true async`, async () => {
    const iter = AsyncRichIterator.from([1, 2, 3]);
    assert(await iter.eq(AsyncRichIterator.from([1, 2, 3])));
  });
  await t.step(`false on length sync`, async () => {
    const iter = AsyncRichIterator.from([1, 2, 3]);
    assertFalse(await iter.eq([1, 2, 3, 4]));
  });
  await t.step(`false on length async`, async () => {
    const iter = AsyncRichIterator.from([1, 2, 3]);
    assertFalse(await iter.eq(AsyncRichIterator.from([1, 2, 3, 4])));
  });
  await t.step(`false on value sync`, async () => {
    const iter = AsyncRichIterator.from([1, 2, 3]);
    assertFalse(await iter.eq([1, 2, 4]));
  });
  await t.step(`false on value async`, async () => {
    const iter = AsyncRichIterator.from([1, 2, 3]);
    assertFalse(await iter.eq(AsyncRichIterator.from([1, 2, 4])));
  });
  await t.step(`uses Object.is semantics`, async () => {
    assert(await AsyncRichIterator.from([NaN]).eq([NaN]));
    assertFalse(await AsyncRichIterator.from([0]).eq([-0]));
  });
});

Deno.test("AsyncRichIterator eqBy", async (t) => {
  await t.step(`sync`, async () => {
    assert(
      await AsyncRichIterator.from([1, 2, 3]).eqBy(
        ["1", "2", "3"],
        (a, b) => String(a) === b,
      ),
    );
    assertFalse(
      await AsyncRichIterator.from([1, 2, 3]).eqBy(
        ["1", "2"],
        (a, b) => String(a) === b,
      ),
    );
  });
  await t.step(`async`, async () => {
    assert(
      await AsyncRichIterator.from([1, 2, 3]).eqBy(
        ["1", "2", "3"],
        async (a, b) => await String(a) === b,
      ),
    );
    assertFalse(
      await AsyncRichIterator.from([1, 2, 3]).eqBy(
        ["1", "2"],
        async (a, b) => await String(a) === b,
      ),
    );
  });
});

Deno.test("AsyncRichIterator: cmp", async (t) => {
  await t.step(`equal sync`, async () => {
    assertEquals(
      await AsyncRichIterator.from([1, 2, 3]).cmp([1, 2, 3], (a, b) => a - b),
      "equal",
    );
  });
  await t.step(`equal async other`, async () => {
    assertEquals(
      await AsyncRichIterator.from([1, 2, 3]).cmp(
        AsyncRichIterator.from([1, 2, 3]),
        (a, b) => a - b,
      ),
      "equal",
    );
  });
  await t.step(`equal async function`, async () => {
    assertEquals(
      await AsyncRichIterator.from([1, 2, 3]).cmp(
        [1, 2, 3],
        async (a, b) => await a - b,
      ),
      "equal",
    );
  });
  await t.step(`less sync`, async () => {
    assertEquals(
      await AsyncRichIterator.from([1, 2, 3]).cmp([1, 2, 4], (a, b) => a - b),
      "less",
    );
    assertEquals(await AsyncRichIterator.from<number>([]).cmp([1]), "less");
  });
  await t.step(`less async other`, async () => {
    assertEquals(
      await AsyncRichIterator.from([1, 2, 3]).cmp(
        AsyncRichIterator.from([1, 2, 4]),
        (a, b) => a - b,
      ),
      "less",
    );
  });
  await t.step(`less async function`, async () => {
    assertEquals(
      await AsyncRichIterator.from([1, 2, 3]).cmp(
        [1, 2, 4],
        async (a, b) => await a - b,
      ),
      "less",
    );
  });
  await t.step(`greater sync`, async () => {
    assertEquals(
      await AsyncRichIterator.from([1, 2, 3]).cmp([1, 2], (a, b) => a - b),
      "greater",
    );
    assertEquals(
      await AsyncRichIterator.from([1, 2, 3]).cmp([1, 2, 0], (a, b) => a - b),
      "greater",
    );
  });
  await t.step(`greater async other`, async () => {
    assertEquals(
      await AsyncRichIterator.from([1, 2, 3]).cmp(
        AsyncRichIterator.from([1, 2]),
        (a, b) => a - b,
      ),
      "greater",
    );
  });
  await t.step(`greater async function`, async () => {
    assertEquals(
      await AsyncRichIterator.from([1, 2, 3]).cmp(
        [1, 2],
        async (a, b) => await a - b,
      ),
      "greater",
    );
  });
  await t.step(`default comparator`, async () => {
    assertEquals(
      await AsyncRichIterator.from([1, 2, 3]).cmp([1, 2, 3]),
      "equal",
    );
    assertEquals(
      await AsyncRichIterator.from([1, 2, 3]).cmp([1, 2, 4]),
      "less",
    );
    assertEquals(
      await AsyncRichIterator.from([1, 2, 3]).cmp([1, 2, 0]),
      "greater",
    );
  });
});

Deno.test("AsyncRichIterator: ne", async (t) => {
  await t.step(`sync`, async () => {
    assert(await AsyncRichIterator.from([1, 2, 3]).ne([1, 2]));
    assertFalse(await AsyncRichIterator.from([1, 2, 3]).ne([1, 2, 3]));
  });
  await t.step(`async`, async () => {
    assert(
      await AsyncRichIterator.from([1, 2, 3]).ne(
        AsyncRichIterator.from([1, 2]),
      ),
    );
    assertFalse(
      await AsyncRichIterator.from([1, 2, 3]).ne(
        AsyncRichIterator.from([1, 2, 3]),
      ),
    );
  });
});

Deno.test("AsyncRichIterator: lt", async (t) => {
  await t.step(`sync`, async () => {
    assert(await AsyncRichIterator.from([1, 2, 3]).lt([1, 2, 4]));
    assertFalse(await AsyncRichIterator.from([1, 2, 3]).lt([1, 2]));
    assertFalse(await AsyncRichIterator.from([1, 2, 3]).lt([1, 2, 3]));
  });
  await t.step(`async`, async () => {
    assert(
      await AsyncRichIterator.from([1, 2, 3]).lt(
        AsyncRichIterator.from([1, 2, 4]),
      ),
    );
    assertFalse(
      await AsyncRichIterator.from([1, 2, 3]).lt(
        AsyncRichIterator.from([1, 2]),
      ),
    );
    assertFalse(
      await AsyncRichIterator.from([1, 2, 3]).lt(
        AsyncRichIterator.from([1, 2, 3]),
      ),
    );
  });
});

Deno.test("AsyncRichIterator: le", async (t) => {
  await t.step(`sync`, async () => {
    assert(await AsyncRichIterator.from([1, 2, 3]).le([1, 2, 4]));
    assertFalse(await AsyncRichIterator.from([1, 2, 3]).le([1, 2]));
    assert(await AsyncRichIterator.from([1, 2, 3]).le([1, 2, 3]));
  });
  await t.step(`async`, async () => {
    assert(
      await AsyncRichIterator.from([1, 2, 3]).le(
        AsyncRichIterator.from([1, 2, 4]),
      ),
    );
    assertFalse(
      await AsyncRichIterator.from([1, 2, 3]).le(
        AsyncRichIterator.from([1, 2]),
      ),
    );
    assert(
      await AsyncRichIterator.from([1, 2, 3]).le(
        AsyncRichIterator.from([1, 2, 3]),
      ),
    );
  });
});

Deno.test("AsyncRichIterator: gt", async (t) => {
  await t.step(`sync`, async () => {
    assert(await AsyncRichIterator.from([1, 2, 3]).gt([1, 2]));
    assertFalse(await AsyncRichIterator.from([1, 2]).gt([1, 2, 3]));
    assertFalse(await AsyncRichIterator.from([1, 2, 3]).gt([1, 2, 3]));
  });
  await t.step(`async`, async () => {
    assert(
      await AsyncRichIterator.from([1, 2, 3]).gt(
        AsyncRichIterator.from([1, 2]),
      ),
    );
    assertFalse(
      await AsyncRichIterator.from([1, 2]).gt(
        AsyncRichIterator.from([1, 2, 3]),
      ),
    );
    assertFalse(
      await AsyncRichIterator.from([1, 2, 3]).gt(
        AsyncRichIterator.from([1, 2, 3]),
      ),
    );
  });
});

Deno.test("AsyncRichIterator: ge", async (t) => {
  await t.step(`sync`, async () => {
    assert(await AsyncRichIterator.from([1, 2, 3]).ge([1, 2]));
    assertFalse(await AsyncRichIterator.from([1, 2]).ge([1, 2, 3]));
    assert(await AsyncRichIterator.from([1, 2, 3]).ge([1, 2, 3]));
  });
  await t.step(`async`, async () => {
    assert(
      await AsyncRichIterator.from([1, 2, 3]).ge(
        AsyncRichIterator.from([1, 2]),
      ),
    );
    assertFalse(
      await AsyncRichIterator.from([1, 2]).ge(
        AsyncRichIterator.from([1, 2, 3]),
      ),
    );
    assert(
      await AsyncRichIterator.from([1, 2, 3]).ge(
        AsyncRichIterator.from([1, 2, 3]),
      ),
    );
  });
});

Deno.test(`AsyncRichIterator.max`, async (t) => {
  await t.step(`sync some`, async () => {
    assert(
      (await AsyncRichIterator.from([1, 2, 3]).max(getDefaultComparator()))
        .equals(some(3)),
    );
  });

  await t.step(`async some`, async () => {
    const comparator = async (a: number, b: number): Promise<number> => {
      if (a < b) return -1;
      if (a > b) return 1;
      return await 0;
    };

    assert(
      (await AsyncRichIterator.from([1, 3, 2]).max(comparator)).equals(some(3)),
    );
  });

  await t.step(`sync none`, async () => {
    assert(
      (await AsyncRichIterator.from([]).max(getDefaultComparator()))
        .equals(none()),
    );
  });
  await t.step(`async none`, async () => {
    const comparator = async (a: number, b: number): Promise<number> => {
      if (a < b) return -1;
      if (a > b) return 1;
      return await 0;
    };

    assert(
      (await AsyncRichIterator.from([]).max(comparator)).equals(none()),
    );
  });
});

Deno.test(`AsyncRichIterator.min`, async (t) => {
  await t.step(`sync`, async () => {
    assert(
      (await AsyncRichIterator.from([1, 2, 3]).min(getDefaultComparator()))
        .equals(some(1)),
    );
  });

  await t.step(`async`, async () => {
    const comparator = async (a: number, b: number): Promise<number> => {
      if (a < b) return -1;
      if (a > b) return 1;
      return await 0;
    };

    assert(
      (await AsyncRichIterator.from([2, 3, 1]).min(comparator)).equals(some(1)),
    );
  });
});
