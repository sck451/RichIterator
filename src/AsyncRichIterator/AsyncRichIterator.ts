import { err, none, ok, type Option, type Result, some } from "@sck/optres";
import type { ComparisonOrder } from "@sck/richiterator";
import {
  bareIteratorToAsyncIterable,
  hasMethod,
  isYieldable,
  type IteratorKind,
  iteratorToAsync,
} from "./utilities.ts";
import { toNumber } from "../RichIterator/numeric.ts";

type MaybePromise<T> = Promise<T> | T;

type AsyncComparator<T> = (a: T, b: T) => MaybePromise<number>;

export class AsyncRichIterator<T> {
  #iterator: AsyncIterator<T>;

  private constructor(source: AsyncIterable<T>) {
    this.#iterator = source[Symbol.asyncIterator]();
  }

  public static from<T>(
    source: IteratorKind<T>,
  ): AsyncRichIterator<T> {
    return new AsyncRichIterator(
      (async function* fromGenerator(): AsyncGenerator<T, undefined, never> {
        if (isYieldable(source)) {
          yield* source;
          return;
        }

        if (hasMethod(source, "next")) {
          yield* bareIteratorToAsyncIterable(
            source as Iterator<T> | AsyncIterator<T>,
          );
          return;
        }

        throw new TypeError("Cannot create async iterator");
      })(),
    );
  }

  public next(): Promise<IteratorResult<T, undefined>> {
    return this.#iterator.next();
  }

  public async nextOption(): Promise<Option<T>> {
    const { done, value } = await this.next();

    if (done) {
      return none();
    }

    return some(value);
  }

  public [Symbol.asyncIterator](): AsyncIterator<T> {
    return this;
  }

  public async toArray(): Promise<T[]> {
    const items: T[] = [];
    for await (const item of this) {
      items.push(item);
    }
    return items;
  }

  public enumerate(): AsyncRichIterator<[number, T]> {
    let index = 0;
    return this.map((item): [number, T] => [index++, item]);
  }

  public map<U>(mapper: (value: T) => MaybePromise<U>): AsyncRichIterator<U> {
    // deno-lint-ignore no-this-alias
    const outer = this;

    return new AsyncRichIterator(async function* asyncMapGenerator() {
      for await (const item of outer) {
        yield await mapper(item);
      }
    }());
  }

  public tryMap<U, E>(
    mapper: (value: T) => MaybePromise<Result<U, E>>,
  ): Promise<Result<U[], E>> {
    return this.tryFold<U[], E>(
      [],
      async (accumulator, value) =>
        (await mapper(value)).map((mapped) => {
          accumulator.push(mapped);
          return accumulator;
        }),
    );
  }

  public mapWhile<U>(
    mapper: (value: T) => MaybePromise<Option<U>>,
  ): AsyncRichIterator<U> {
    // deno-lint-ignore no-this-alias
    const outer = this;

    return new AsyncRichIterator(async function* asyncMapWhileGenerator() {
      for await (const item of outer) {
        const result = await mapper(item);

        if (result.isSome()) {
          yield result.unwrap();
        } else {
          return;
        }
      }
    }());
  }

  public filter<S extends T>(
    predicate: (value: T) => value is S,
  ): AsyncRichIterator<S>;
  public filter(
    predicate: (value: T) => MaybePromise<boolean>,
  ): AsyncRichIterator<T>;
  public filter(
    predicate: (value: T) => MaybePromise<boolean>,
  ): AsyncRichIterator<T> {
    // deno-lint-ignore no-this-alias
    const outer = this;

    return new AsyncRichIterator(async function* asyncFilterGenerator() {
      for await (const item of outer) {
        if (await predicate(item)) {
          yield item;
        }
      }
    }());
  }

  public take(limit: number): AsyncRichIterator<T> {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new RangeError();
    }

    // deno-lint-ignore no-this-alias
    const outer = this;

    return new AsyncRichIterator(
      (async function* () {
        let taken = 0;
        while (taken < limit) {
          const next = await outer.nextOption();

          if (next.isNone()) {
            return;
          }

          yield next.unwrap();
          taken++;
        }
      })(),
    );
  }

  public drop(count: number): AsyncRichIterator<T> {
    if (!Number.isInteger(count) || count < 0) {
      throw new RangeError();
    }

    // deno-lint-ignore no-this-alias
    const outer = this;

    return new AsyncRichIterator(
      (async function* () {
        let taken = 0;
        while (taken < count) {
          const next = await outer.nextOption();

          if (next.isNone()) {
            return;
          }

          taken++;
        }

        yield* outer;
      })(),
    );
  }

  public dropWhile(
    predicate: (value: T) => MaybePromise<boolean>,
  ): AsyncRichIterator<T> {
    // deno-lint-ignore no-this-alias
    const outer = this;

    return new AsyncRichIterator(async function* asyncDropWhileGenerator() {
      let skipping = true;

      while (skipping) {
        const next = await outer.nextOption();

        if (next.isNone()) {
          return;
        }

        const value = next.unwrap();

        if (!await predicate(value)) {
          yield value;
          skipping = false;
        }
      }

      yield* outer;
    }());
  }

  public takeWhile(
    predicate: (value: T) => MaybePromise<boolean>,
  ): AsyncRichIterator<T> {
    // deno-lint-ignore no-this-alias
    const outer = this;

    return new AsyncRichIterator(async function* asyncTakeWhileGenerator() {
      let result = await outer.nextOption();

      while (result.isSome() && await predicate(result.unwrap())) {
        yield result.unwrap();

        result = await outer.nextOption();
      }
    }());
  }

  public flatMap<U>(
    mapper: (
      value: T,
    ) => MaybePromise<IteratorKind<U>>,
  ): AsyncRichIterator<U> {
    // deno-lint-ignore no-this-alias
    const outer = this;

    return new AsyncRichIterator(async function* asyncFlatMapGenerator() {
      for await (const item of outer) {
        yield* iteratorToAsync(await mapper(item));
      }
    }());
  }

  public flatten<U>(
    this: AsyncRichIterator<IteratorKind<U>>,
  ): AsyncRichIterator<U> {
    return this.flatMap((value) => value);
  }

  public inspect(
    inspector: (value: T) => MaybePromise<void>,
  ): AsyncRichIterator<T> {
    // deno-lint-ignore no-this-alias
    const outer = this;

    return new AsyncRichIterator(async function* asyncInspectGenerator() {
      for await (const value of outer) {
        await inspector(value);
        yield value;
      }
    }());
  }

  public toResult<U, E>(
    this: AsyncRichIterator<Result<U, E>>,
  ): Promise<Result<U[], E>> {
    return this.tryMap((val) => val);
  }

  public async toOption<U>(
    this: AsyncRichIterator<Option<U>>,
  ): Promise<Option<U[]>> {
    return (await this.tryMap((val) => val.okOr(undefined))).ok();
  }

  public chunks(size: number): AsyncRichIterator<Result<T[], T[]>> {
    if (!Number.isInteger(size) || size <= 0) {
      throw new RangeError(`size must be greater than 0, given ${size}.`);
    }

    // deno-lint-ignore no-this-alias
    const outer = this;

    return new AsyncRichIterator(async function* asyncChunksGenerator() {
      let cache: T[] = [];

      for await (const value of outer) {
        cache.push(value);

        if (cache.length === size) {
          yield ok(cache);
          cache = [];
        }
      }
      console.log(cache.length);
      if (cache.length > 0) {
        yield err(cache);
      }
    }());
  }

  public chain(other: IteratorKind<T>): AsyncRichIterator<T> {
    // deno-lint-ignore no-this-alias
    const first = this;

    return new AsyncRichIterator(async function* asyncChainGenerator() {
      yield* first;
      yield* iteratorToAsync(other);
    }());
  }

  public filterMap<U>(
    mapper: (value: T) => MaybePromise<Option<U>>,
  ): AsyncRichIterator<U> {
    // deno-lint-ignore no-this-alias
    const outer = this;

    return new AsyncRichIterator(async function* asyncFilterMapGenerator() {
      for await (const item of outer) {
        for (const value of await mapper(item)) {
          yield value;
        }
      }
    }());
  }

  public zip<U>(other: IteratorKind<U>): AsyncRichIterator<[T, U]> {
    // deno-lint-ignore no-this-alias
    const outer = this;
    const otherIter = iteratorToAsync(other);

    return new AsyncRichIterator(async function* asyncZipGenerator() {
      while (true) {
        const thisResult = await outer.nextOption();
        if (thisResult.isNone()) {
          return;
        }

        const otherResult = await otherIter.nextOption();
        if (otherResult.isNone()) {
          return;
        }

        yield [thisResult.unwrap(), otherResult.unwrap()];
      }
    }());
  }

  public zipWith<U, R>(
    other: IteratorKind<U>,
    zipper: (left: T, right: U) => MaybePromise<R>,
  ): AsyncRichIterator<R> {
    return this.zip(other).map(([left, right]) => zipper(left, right));
  }

  public intersperse(separator: T): AsyncRichIterator<T> {
    return this.intersperseWith(() => separator);
  }

  public intersperseWith(
    separatorFn: () => MaybePromise<T>,
  ): AsyncRichIterator<T> {
    // deno-lint-ignore no-this-alias
    const outer = this;

    return new AsyncRichIterator(async function* () {
      const first = await outer.nextOption();

      if (first.isNone()) {
        return;
      }

      for (const value of first) {
        yield value;
      }

      for await (const item of outer) {
        yield await separatorFn();
        yield item;
      }
    }());
  }

  public eq(other: IteratorKind<T>): Promise<boolean> {
    return this.eqBy(other, Object.is);
  }

  public async eqBy<U>(
    other: IteratorKind<U>,
    comparisonFn: (left: T, right: U) => MaybePromise<boolean>,
  ): Promise<boolean> {
    const otherIter = iteratorToAsync(other);

    while (true) {
      const [first, second] = await Promise.all([
        this.nextOption(),
        otherIter.nextOption(),
      ]);

      if (first.isNone() || second.isNone()) {
        return first.isNone() === second.isNone();
      }

      if (!await comparisonFn(first.unwrap(), second.unwrap())) {
        return false;
      }
    }
  }

  public async cmp(
    comparisonIterator: IteratorKind<T>,
    comparator?: AsyncComparator<T>,
  ): Promise<ComparisonOrder> {
    const otherIterator = iteratorToAsync(comparisonIterator);

    const comparisonFn = comparator ?? ((a: T, b: T): number => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });

    while (true) {
      const [first, second] = await Promise.all([
        this.nextOption(),
        otherIterator.nextOption(),
      ]);

      if (first.isNone() && second.isNone()) {
        return "equal";
      }

      if (first.isNone()) {
        return "less";
      }

      if (second.isNone()) {
        return "greater";
      }

      const order = await comparisonFn(first.unwrap(), second.unwrap());
      if (order < 0) {
        return "less";
      }
      if (order > 0) {
        return "greater";
      }
    }
  }

  public async ne(other: IteratorKind<T>): Promise<boolean> {
    return !(await this.eq(other));
  }

  public async lt(
    other: IteratorKind<T>,
    comparator?: AsyncComparator<T>,
  ): Promise<boolean> {
    return await this.cmp(other, comparator) === "less";
  }

  public async le(
    other: IteratorKind<T>,
    comparator?: AsyncComparator<T>,
  ): Promise<boolean> {
    return await this.cmp(other, comparator) !== "greater";
  }

  public async gt(
    other: IteratorKind<T>,
    comparator?: AsyncComparator<T>,
  ): Promise<boolean> {
    return await this.cmp(other, comparator) === "greater";
  }

  public async ge(
    other: IteratorKind<T>,
    comparator?: AsyncComparator<T>,
  ): Promise<boolean> {
    return await this.cmp(other, comparator) !== "less";
  }

  public max(comparisonFn: AsyncComparator<T>): Promise<Option<T>> {
    return this.reduce(async (currentMaximum, value) =>
      await comparisonFn(value, currentMaximum) > 0 ? value : currentMaximum
    );
  }

  public min(comparisonFn: AsyncComparator<T>): Promise<Option<T>> {
    return this.reduce(async (currentMinimum, value) =>
      await comparisonFn(value, currentMinimum) < 0 ? value : currentMinimum
    );
  }

  public async fold<U>(
    initialValue: U,
    reducer: (accumulator: U, value: T) => MaybePromise<U>,
  ): Promise<U> {
    let accumulator = initialValue;

    for await (const item of this) {
      accumulator = await reducer(accumulator, item);
    }

    return accumulator;
  }

  public async tryFold<U, E>(
    initialValue: U,
    reducer: (accumulator: U, value: T) => MaybePromise<Result<U, E>>,
  ): Promise<Result<U, E>> {
    let accumulator = initialValue;
    let result: Option<T>;

    while ((result = await this.nextOption()).isSome()) {
      const reducerResult = await reducer(accumulator, result.unwrap());

      if (reducerResult.isErr()) {
        return reducerResult;
      }

      accumulator = reducerResult.unwrap();
    }

    return ok(accumulator);
  }

  public async reduce(
    reducer: (accumulator: T, value: T) => MaybePromise<T>,
  ): Promise<Option<T>> {
    return (await this.nextOption()).match<MaybePromise<Option<T>>>({
      Some: async (firstValue) => some(await this.fold(firstValue, reducer)),
      None: () => none(),
    });
  }

  public async tryReduce<E>(
    reducer: (accumulator: T, value: T) => MaybePromise<Result<T, E>>,
  ): Promise<Option<Result<T, E>>> {
    const first = await this.nextOption();

    return first.match<MaybePromise<Option<Result<T, E>>>>({
      Some: async (firstValue) => some(await this.tryFold(firstValue, reducer)),
      None: none,
    });
  }

  public async forEach(
    callback: (value: T) => MaybePromise<void>,
  ): Promise<void> {
    for await (const item of this) {
      await callback(item);
    }
  }

  public async advanceBy(limit: number): Promise<Result<void, number>> {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new RangeError();
    }

    let remaining = limit;

    while (remaining > 0) {
      if ((await this.nextOption()).isNone()) {
        return err(remaining);
      }

      remaining--;
    }

    return ok();
  }

  public async nextChunk(size: number): Promise<Result<T[], T[]>> {
    if (!Number.isInteger(size) || size <= 0) {
      throw new RangeError(`size must be greater than 0, given ${size}.`);
    }

    const chunk: T[] = [];

    while (chunk.length < size) {
      const result = await this.nextOption();

      if (result.isNone()) {
        return err(chunk);
      }

      chunk.push(result.unwrap());
    }

    return ok(chunk);
  }

  public async count(): Promise<number> {
    let count = 0;

    for await (const _ of this) {
      count++;
    }

    return count;
  }

  public async some(
    predicate: (value: T) => MaybePromise<boolean>,
  ): Promise<boolean> {
    for await (const value of this) {
      if (await predicate(value)) {
        return true;
      }
    }

    return false;
  }

  public async every(
    predicate: (value: T) => MaybePromise<boolean>,
  ): Promise<boolean> {
    for await (const item of this) {
      if (!await predicate(item)) {
        return false;
      }
    }

    return true;
  }

  public async find(
    predicate: (value: T) => MaybePromise<boolean>,
  ): Promise<Option<T>> {
    for await (const item of this) {
      if (await predicate(item)) {
        return some(item);
      }
    }

    return none();
  }

  public async findMap<U>(
    mapper: (value: T) => MaybePromise<Option<U>>,
  ): Promise<Option<U>> {
    for await (const item of this) {
      const result = await mapper(item);

      if (result.isSome()) {
        return result;
      }
    }

    return none();
  }

  public async position(
    predicate: (value: T) => MaybePromise<boolean>,
  ): Promise<Option<number>> {
    let index = 0;

    for await (const item of this) {
      if (await predicate(item)) {
        return some(index);
      }

      index++;
    }

    return none();
  }

  public last(): Promise<Option<T>> {
    return this.reduce((_, val) => val);
  }

  public async nth(position: number): Promise<Option<T>> {
    return (await this.advanceBy(position))
      .match<MaybePromise<Option<T>>>({
        Ok: () => this.nextOption(),
        Err: none,
      });
  }

  public async partition(
    predicate: (value: T) => MaybePromise<boolean>,
  ): Promise<[T[], T[]]> {
    const left: T[] = [];
    const right: T[] = [];

    for await (const item of this) {
      if (await predicate(item)) {
        left.push(item);
      } else {
        right.push(item);
      }
    }

    return [left, right];
  }

  public async unzip<U, V>(
    this: AsyncRichIterator<readonly [U, V]>,
  ): Promise<[U[], V[]]> {
    const left: U[] = [];
    const right: V[] = [];

    for await (const [lValue, rValue] of this) {
      left.push(lValue);
      right.push(rValue);
    }

    return [left, right];
  }

  public product(): Promise<Result<number, TypeError>> {
    return this.tryFold(
      1,
      (acc, entry) => toNumber(entry).map((val) => acc * val),
    );
  }

  public sum(): Promise<Result<number, TypeError>> {
    return this.tryFold(
      0,
      (acc, entry) => toNumber(entry).map((val) => acc + val),
    );
  }

  public productUnchecked(): Promise<number> {
    return this.fold(1, (acc, val) => acc * Number(val));
  }

  public sumUnchecked(): Promise<number> {
    return this.fold(0, (acc, val) => acc + Number(val));
  }
}
