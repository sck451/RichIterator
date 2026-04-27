import { RichIterator } from "../main.ts";
import { assert, assertEquals, assertThrows } from "@std/assert";

Deno.test("core: next", () => {
  const iterator = RichIterator.from([0, 1]);

  let { done, value } = iterator.next();
  assert(!done);
  assertEquals(value, 0);

  ({ done, value } = iterator.next());
  assert(!done);
  assertEquals(value, 1);

  ({ done, value } = iterator.next());
  assert(done);
  assertEquals(value, undefined);
});

Deno.test("core: next with parameter", () => {
  const iterator = RichIterator.from(
    function* (): Generator<number, undefined, number> {
      const provided = yield 0;
      yield provided;
      return;
    }(),
  );

  let { done, value } = iterator.next(2);
  assert(!done);
  assertEquals(value, 0);

  ({ done, value } = iterator.next(1));
  assert(!done);
  assertEquals(value, 1);

  ({ done, value } = iterator.next());
  assert(done);
  assertEquals(value, undefined);
});

Deno.test("core: return empty", () => {
  const iterator = RichIterator.from([1, 2, 3]);
  const { done, value } = iterator.return();

  assert(done);
  assertEquals(value, undefined);
});

Deno.test("core: return value on simple iterator", () => {
  const iterator = RichIterator.from<number, string>([1, 2, 3]);
  const { done, value } = iterator.return("returned early");

  assert(done);
  assertEquals(value, "returned early");
});

Deno.test("core: return value on iterator with return method", () => {
  const calls: unknown[] = [];

  const inner: Iterator<number> = {
    next() {
      return { done: false, value: 1 };
    },
    return(value?: unknown) {
      calls.push(value);
      return { done: true, value: 2 };
    },
  };

  const wrapped = new RichIterator(inner);

  const result = wrapped.return("returned early");

  assertEquals(calls, ["returned early"]);
  assertEquals(result, { done: true, value: 2 });
});

Deno.test("core: throwing on simple iterator", () => {
  const iterator = RichIterator.from([1, 2, 3]);
  assertThrows(() => iterator.throw());
});

Deno.test("core: throwing on iterator with throw method", () => {
  const inner: Iterator<number> = {
    next() {
      return { done: false, value: 1 };
    },
    throw(value?: unknown) {
      throw String(value);
    },
  };

  const wrapped = new RichIterator(inner);

  const result = (() => {
    try {
      wrapped.throw("thrown");
      return "success";
    } catch (e) {
      return String(e);
    }
  })();
  assertEquals(result, "thrown");
});

Deno.test("core: asNative", () => {
  const iterator = RichIterator.from([1, 2, 3]).asNative();

  assert(iterator instanceof Iterator);
});

Deno.test("core: toStringTag", () => {
  const iterator = RichIterator.from([1, 2, 3]);
  assertEquals(
    Object.prototype.toString.call(iterator),
    "[object RichIterator]",
  );
});
