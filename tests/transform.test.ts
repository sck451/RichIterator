import { assert, assertEquals, assertThrows } from "@std/assert";
import { RichIterator } from "@sck/richiterator";
import { err, none, ok, some } from "@sck/optres";

Deno.test("transform: map", () => {
  const result = RichIterator.from([1, 2, 3])
    .map((x) => x * 2)
    .toArray();

  assertEquals(result, [2, 4, 6]);
});

Deno.test("transform: filter", () => {
  const result = RichIterator.from([1, 2, 3, 4, 5])
    .filter((x) => x % 2 === 0)
    .toArray();

  assertEquals(result, [2, 4]);
});

Deno.test("transform: take", () => {
  const result = RichIterator.from([1, 2, 3, 4])
    .take(2)
    .toArray();

  assertEquals(result, [1, 2]);
});

Deno.test("transform: take (leftover)", () => {
  const iterator = RichIterator.from([1, 2, 3, 4]);
  iterator.take(2).toArray();
  assertEquals(iterator.toArray(), [3, 4]);
});

Deno.test("transform: take to exhaustion", () => {
  const iterator = RichIterator.from([1, 2, 3]);
  const result = iterator.take(5).toArray();
  assertEquals(result, [1, 2, 3]);
});

Deno.test("transform: take invalid parameter", () => {
  assertThrows(() => RichIterator.from([1, 2, 3]).take(-1));
  assertThrows(() => RichIterator.from([1, 2, 3]).take(0.5));
});

Deno.test("transform: drop", () => {
  const result = RichIterator.from([1, 2, 3, 4])
    .drop(2)
    .toArray();

  assertEquals(result, [3, 4]);
});

Deno.test("transform: drop to exhaustion", () => {
  const result = RichIterator.from([1, 2, 3]).drop(4).toArray();
  assertEquals(result, []);
});

Deno.test("transform: drop invalid parameter", () => {
  assertThrows(() => RichIterator.from([1, 2, 3]).drop(-1));
  assertThrows(() => RichIterator.from([1, 2, 3]).drop(0.5));
});

Deno.test("transform: dropWhile", () => {
  const result = RichIterator.from([1, 2, 3, 0, 4])
    .dropWhile((x) => x < 3)
    .toArray();

  assertEquals(result, [3, 0, 4]);
});

Deno.test("transform: dropWhile to exhaustion", () => {
  const result = RichIterator.from([1, 2, 3]).dropWhile((x) => x < 4).toArray();
  assertEquals(result, []);
});

Deno.test("transform: takeWhile", () => {
  const result = RichIterator.from([1, 2, 3, 0, 4])
    .takeWhile((x) => x > 0)
    .toArray();

  assertEquals(result, [1, 2, 3]);
});

Deno.test("transform: flatMap", () => {
  const result = RichIterator.from([1, 2, 3])
    .flatMap((x) => [x, x * 10])
    .toArray();

  assertEquals(result, [1, 10, 2, 20, 3, 30]);
});

Deno.test("transform: flatten", () => {
  const result = RichIterator.from<Iterable<number>>([[1, 2], [3], [4, 5]])
    .flatten()
    .toArray();

  assertEquals(result, [1, 2, 3, 4, 5]);
});

Deno.test("transform: inspect preserves values", () => {
  const seen: number[] = [];

  const result = RichIterator.from([1, 2, 3])
    .inspect((x) => seen.push(x))
    .map((x) => x + 1)
    .toArray();

  assertEquals(seen, [1, 2, 3]);
  assertEquals(result, [2, 3, 4]);
});

Deno.test("transform: chunks returns full chunks and remainder as return value", () => {
  const it = RichIterator.from([1, 2, 3, 4, 5]).chunks(2);

  assertEquals(it.next(), { done: false, value: [1, 2] });
  assertEquals(it.next(), { done: false, value: [3, 4] });

  const final = it.next();
  assertEquals(final.done, true);
  assertEquals(final.value, [5]);

  assertThrows(() => RichIterator.from([1, 2, 3]).chunks(0));
  assertThrows(() => RichIterator.from([1, 2, 3]).chunks(-1));
  assertThrows(() => RichIterator.from([1, 2, 3]).chunks(0.5));
});

Deno.test("transform: chain", () => {
  const result = RichIterator.from([1, 2])
    .chain([3, 4])
    .toArray();

  assertEquals(result, [1, 2, 3, 4]);
});

Deno.test("transform: filterMap", () => {
  const result = RichIterator.from(["1", "x", "2", "NaN", "3"])
    .filterMap((s) => {
      const n = Number(s);
      return Number.isNaN(n) ? none() : some(n);
    })
    .toArray();

  assertEquals(result, [1, 2, 3]);
});

Deno.test("transform: mapWhile stops on first none", () => {
  const result = RichIterator.from(["1", "2", "x", "3"])
    .mapWhile((s) => {
      const n = Number(s);
      return Number.isNaN(n) ? none() : some(n);
    })
    .toArray();

  assertEquals(result, [1, 2]);
});

Deno.test("transform: mapWhile to exhaustion", () => {
  const result = RichIterator.from(["1", "2", "3"]).mapWhile((s) => {
    const n = Number(s);
    return Number.isNaN(n) ? none() : some(n);
  }).toArray();

  assertEquals(result, [1, 2, 3]);
});

Deno.test("transform: zip", () => {
  const result = RichIterator.from([1, 2, 3])
    .zip(["a", "b"])
    .toArray();

  assertEquals(result, [[1, "a"], [2, "b"]]);
});

Deno.test("transform: zip (first exhausted)", () => {
  const result = RichIterator.from(["a", "b"])
    .zip([1, 2, 3])
    .toArray();

  assertEquals(result, [["a", 1], ["b", 2]]);
});

Deno.test("transform: zipWith", () => {
  const result = RichIterator.from([1, 2, 3])
    .zipWith(["a", "b"], (n, s) => `${n}:${s}`)
    .toArray();

  assertEquals(result, ["1:a", "2:b"]);
});

Deno.test("transform: zipWith (first exhausted)", () => {
  const result = RichIterator.from(["a", "b"])
    .zipWith([1, 2, 3], (n, s) => `${n}:${s}`)
    .toArray();

  assertEquals(result, ["a:1", "b:2"]);
});

Deno.test("transform: intersperse", () => {
  const result = RichIterator.from(["a", "b", "c"])
    .intersperse("-")
    .toArray();

  assertEquals(result, ["a", "-", "b", "-", "c"]);
});

Deno.test("transform: intersperse one item iterator", () => {
  const result = RichIterator.from(["a"])
    .intersperse("-")
    .toArray();

  assertEquals(result, ["a"]);
});

Deno.test("transform: intersperse empty iterator", () => {
  const result = RichIterator.from<string>([])
    .intersperse("-")
    .toArray();

  assertEquals(result, []);
});

Deno.test("transform: intersperseWith", () => {
  let i = 0;

  const result = RichIterator.from(["a", "b", "c"])
    .intersperseWith(() => `sep${++i}`)
    .toArray();

  assertEquals(result, ["a", "sep1", "b", "sep2", "c"]);
});

Deno.test("transform: toResult ok", () => {
  const result = RichIterator.from([ok(0), ok(1), ok(2)]).toResult();

  assertEquals(result.isOk(), true);
  assertEquals(result.unwrap(), [0, 1, 2]);
});

Deno.test("transform: toResult err", () => {
  const result = RichIterator.from([ok(0), err("1"), ok(2), err("3")])
    .toResult();

  assertEquals(result.isErr(), true);
  assertEquals(result.unwrapErr(), "1");
});

Deno.test("transform: toOption some", () => {
  const result = RichIterator.from([some(0), some(1), some(2)]).toOption();

  assert(result.isSome());
  assertEquals(result.unwrap(), [0, 1, 2]);
});

Deno.test("transform: toOption none", () => {
  const result = RichIterator.from([some(0), none(), some(2)]).toOption();

  assert(result.isNone());
});

Deno.test("transform: tryMap success", () => {
  const result = RichIterator.from([0, 1, 2, 3]).tryMap((val) => ok(val));

  assert(result.isOk());
  assertEquals(result.unwrap(), [0, 1, 2, 3]);
});

Deno.test("transform: tryMap failure", () => {
  const result = RichIterator.from([0, 1, 2, 3]).tryMap((val) => {
    if (val === 2) {
      return err("two");
    } else {
      return ok(val);
    }
  });

  assert(result.isErr());
  assertEquals(result.unwrapErr(), "two");
});

Deno.test("transform: enumerate", () => {
  const result = RichIterator.from(["a", "b", "c", "d"]).enumerate().toArray();

  assertEquals(result, [[0, "a"], [1, "b"], [2, "c"], [3, "d"]]);
});
