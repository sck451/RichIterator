// rich_iterator.types.test.ts
//
// Run with deno check
//
// This file is for type-checking only. It does not need to execute and will cause errors if it does.

import { RichIterator } from "../RichIterator.ts";
import { err, none, type Option, type Result, some } from "@sck/optres";

// Minimal type assertion helpers
function expectType<T>(_value: T): void {}
function expectAssignable<T>(_value: T): void {}

// Basic constructor / from
{
  const it = RichIterator.from([1, 2, 3]);
  expectType<RichIterator<number>>(it);

  //deno-lint-ignore no-inner-declarations
  function* gen(): Generator<number, "done", unknown> {
    yield 1;
    return "done";
  }

  const it2 = RichIterator.from(gen());
  expectType<RichIterator<number, "done">>(it2);
}

// map
{
  const it = RichIterator.from([1, 2, 3]).map((x) => x.toString());
  expectType<RichIterator<string>>(it);
}

// enumerate
{
  const it = RichIterator.from(["a", "b"]).enumerate();
  expectType<RichIterator<[number, string]>>(it);
}

// filter with type guard
{
  const values = RichIterator.from(["a", 1, "b", 2]);
  const strings = values.filter((x): x is string => typeof x === "string");
  expectType<RichIterator<string>>(strings);

  const mixed = RichIterator.from(["a", 1]).filter(() => true);
  expectType<RichIterator<string | number>>(mixed);
}

// flatten
{
  const nested = RichIterator.from<Iterable<number>>([[1, 2], [3]]);
  const flat = nested.flatten();
  expectType<RichIterator<number>>(flat);

  const nested2 = RichIterator.from<Iterator<number> | Iterable<number>>([
    [1, 2],
    [3, 4],
  ]);
  const flat2 = nested2.flatten();
  expectType<RichIterator<number>>(flat2);

  // @ts-expect-error flatten is only valid for iterators of iterables/iterators
  RichIterator.from([1, 2, 3]).flatten();
}

// mapWhile / filterMap / findMap
{
  const mapped = RichIterator.from(["1", "x", "2"]).filterMap((
    s,
  ) => (Number.isNaN(Number(s)) ? none() : some(Number(s))));
  expectType<RichIterator<number>>(mapped);

  const found = RichIterator.from(["1", "x"]).findMap((_s) => none());
  expectType<Option<number>>(found);

  const mw = RichIterator.from(["1", "2"]).mapWhile((_s) => none());
  expectType<RichIterator<number>>(mw);
}

// zip / zipWith / unzip
{
  const zipped = RichIterator.from([1, 2]).zip(["a", "b"]);
  expectType<RichIterator<[number, string]>>(zipped);

  const zippedWith = RichIterator.from([1, 2]).zipWith(
    ["a", "b"],
    (n, s) => `${n}:${s}`,
  );
  expectType<RichIterator<string>>(zippedWith);

  const tuples = RichIterator.from<readonly [number, string]>([
    [1, "a"],
    [2, "b"],
  ]);
  const unzipped = tuples.unzip();
  expectType<[number[], string[]]>(unzipped);

  //@ts-expect-error unzip only works for tuple iterators
  RichIterator.from([1, 2, 3]).unzip();
}

// fold / tryFold
{
  const sum = RichIterator.from([1, 2, 3]).fold(0, (acc, x) => acc + x);
  expectType<number>(sum);

  const tf = RichIterator.from([1, 2, 3]).tryFold(
    0,
    (_acc, _x) => err("error"),
  );
  expectType<Result<number, string>>(tf);
}

// reduce / tryReduce
{
  const reduced = RichIterator.from([1, 2, 3]).reduce((a, b) => a + b);
  expectType<Option<number>>(reduced);

  const tr = RichIterator.from([1, 2, 3]).tryReduce((_a, _b) => err("error"));
  expectType<Option<Result<number, string>>>(tr);
}

// find with type guard
{
  const found = RichIterator.from(["a", 1, "b"]).find(
    (x): x is string => typeof x === "string",
  );
  expectType<Option<string>>(found);

  const found2 = RichIterator.from(["a", 1]).find(() => true);
  expectType<Option<string | number>>(found2);
}

// partition with type guard
{
  const [strings, rest] = RichIterator.from([
    "a",
    1,
    "b",
    2,
  ]).partition(
    (x): x is string => typeof x === "string",
  );

  expectType<string[]>(strings);
  expectType<number[]>(rest);

  const [left, right] = RichIterator.from([1, 2, 3]).partition((x) =>
    x % 2 === 0
  );
  expectType<number[]>(left);
  expectType<number[]>(right);
}

// comparison methods
{
  const it = RichIterator.from([1, 2, 3]);

  expectType<boolean>(it.eq([1, 2, 3]));
  expectType<boolean>(it.ne([1, 2, 3]));
  expectType<boolean>(it.lt([1, 2, 3]));
  expectType<boolean>(it.le([1, 2, 3]));
  expectType<boolean>(it.gt([1, 2, 3]));
  expectType<boolean>(it.ge([1, 2, 3]));
  expectType<"less" | "equal" | "greater">(it.cmp([1, 2, 3]));

  expectType<boolean>(it.lt([1, 2, 3], (a, b) => a - b));
  expectType<boolean>(it.le([1, 2, 3], (a, b) => a - b));
  expectType<boolean>(it.gt([1, 2, 3], (a, b) => a - b));
  expectType<boolean>(it.ge([1, 2, 3], (a, b) => a - b));
  expectType<"less" | "equal" | "greater">(it.cmp([1, 2, 3], (a, b) => a - b));
}

// max / min
{
  const mx = RichIterator.from([1, 2, 3]).max((a, b) => a - b);
  const mn = RichIterator.from([1, 2, 3]).min((a, b) => a - b);
  expectType<Option<number>>(mx);
  expectType<Option<number>>(mn);
}

// numeric helpers
{
  const s = RichIterator.from([1, 2, 3]).sum();
  const p = RichIterator.from([1, 2, 3]).product();
  expectType<Result<number, TypeError>>(s);
  expectType<Result<number, TypeError>>(p);
}

// iterator protocol core
{
  const it = RichIterator.from([1, 2, 3]);

  expectAssignable<Iterator<number>>(it);
  expectAssignable<Iterable<number>>(it);

  const r1 = it.next();
  expectType<IteratorResult<number, unknown>>(r1);

  const r2 = it.return();
  expectType<IteratorResult<number, unknown>>(r2);
}

// from preserves TReturn
{
  //deno-lint-ignore no-inner-declarations
  function* gen(): Generator<number, "finished", unknown> {
    yield 1;
    return "finished";
  }

  const it = RichIterator.from(gen());
  expectType<RichIterator<number, "finished">>(it);

  const r = it.return();
  expectType<IteratorResult<number, "finished" | undefined>>(r);
}

// negative tests
{
  // @ts-expect-error mapper must accept the iterator element type
  RichIterator.from([1, 2, 3]).map((x: string) => x);

  // @ts-expect-error comparator must compare the right type
  RichIterator.from([1, 2, 3]).max((a: string, b: string) =>
    a.localeCompare(b)
  );

  RichIterator.from([1, 2, 3]).zipWith(
    ["a"],
    // @ts-expect-error zipper left side is number, not string
    (left: string, right) => `${left}${right}`,
  );
}
