import { err, none, ok, type Option, type Result, some } from "@sck/optres";
import type { ComparisonOrder } from "@sck/richiterator";
import {
  type AsyncComparator,
  bareIteratorToAsyncIterable,
  hasMethod,
  isYieldable,
  type IteratorKind,
  iteratorToAsync,
  type MaybePromise,
} from "./utilities.ts";
import { toNumber } from "../RichIterator/numeric.ts";

export type { AsyncComparator, IteratorKind, MaybePromise };

/**
 * An asynchronous iterator wrapper that provides a rich collection of lazy and terminal
 * iterator combinators for transforming, filtering, comparing, consuming, and collecting
 * values from an async or sync iterator-like source.
 *
 * @typeparam T - The type of values yielded by the iterator.
 *
 * @example
 * ```ts
 * const values = await AsyncRichIterator.from([1, 2, 3])
 *   .map((value) => value * 2)
 *   .toArray();
 *
 * // values: [2, 4, 6]
 * ```
 */
export class AsyncRichIterator<T> {
  #iterator: AsyncIterator<T>;

  private constructor(source: AsyncIterable<T>) {
    this.#iterator = source[Symbol.asyncIterator]();
  }

  /**
   * Creates an {@link AsyncRichIterator} from an iterator-like source.
   *
   * The source may be any supported {@link IteratorKind} and will be normalized into an
   * asynchronous rich iterator so that the rest of the combinator API can be used.
   *
   * @typeparam T - The type of values produced by the source iterator.
   * @param source - The iterator-like source to wrap.
   * @returns A new {@link AsyncRichIterator} that yields values from `source`.
   *
   * @example
   * ```ts
   * const iterator = AsyncRichIterator.from([1, 2, 3]);
   * const values = await iterator.toArray();
   * // values: [1, 2, 3]
   * ```
   */
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

  /**
   * Advances the iterator by one element and returns the native async iterator result.
   *
   * @returns A promise that resolves to the next {@link IteratorResult}. When the iterator
   * is exhausted, `done` is `true` and the result value is `undefined`.
   *
   * @example
   * ```ts
   * const iterator = AsyncRichIterator.from(["a"]);
   * const first = await iterator.next();
   * // first: { value: "a", done: false }
   * const second = await iterator.next();
   * // second: { value: undefined, done: true }
   * ```
   */
  public next(): Promise<IteratorResult<T, undefined>> {
    return this.#iterator.next();
  }

  /**
   * Advances the iterator by one element and returns it as an {@link Option}.
   *
   * This is a convenience method for consumers that prefer `Option<T>` over native
   * iterator result objects.
   *
   * @returns A promise that resolves to `Some<T>` when a value is available, or `None`
   * when the iterator is exhausted.
   *
   * @example
   * ```ts
   * const iterator = AsyncRichIterator.from([10]);
   * const value = await iterator.nextOption();
   * // value: Some(10)
   * ```
   */
  public async nextOption(): Promise<Option<T>> {
    const { done, value } = await this.next();

    if (done) {
      return none();
    }

    return some(value);
  }

  /**
   * Returns this object as an async iterator.
   *
   * This enables `AsyncRichIterator` instances to be consumed with `for await..of`.
   *
   * @returns An async iterator over the values in this iterator.
   *
   * @example
   * ```ts
   * const iterator = AsyncRichIterator.from([1, 2, 3]);
   *
   * for await (const value of iterator) {
   *   console.log(value);
   * }
   * ```
   */
  public [Symbol.asyncIterator](): AsyncIterator<T> {
    return this;
  }

  /**
   * Collects all remaining values from the iterator into an array.
   *
   * This is a terminal operation and consumes the iterator.
   *
   * @returns A promise that resolves to an array containing all remaining values.
   *
   * @example
   * ```ts
   * const values = await AsyncRichIterator.from([1, 2, 3]).toArray();
   * // values: [1, 2, 3]
   * ```
   */
  public async toArray(): Promise<T[]> {
    const items: T[] = [];
    for await (const item of this) {
      items.push(item);
    }
    return items;
  }

  /**
   * Pairs each value with its zero-based index.
   *
   * @returns A lazy iterator yielding `[index, value]` tuples.
   *
   * @example
   * ```ts
   * const values = await AsyncRichIterator.from(["a", "b"])
   *   .enumerate()
   *   .toArray();
   * // values: [[0, "a"], [1, "b"]]
   * ```
   */
  public enumerate(): AsyncRichIterator<[number, T]> {
    let index = 0;
    return this.map((item): [number, T] => [index++, item]);
  }

  /**
   * Lazily transforms each value using the provided mapper function.
   *
   * The mapper may return either a value or a promise for a value.
   *
   * @typeparam U - The type of values produced by the mapper.
   * @param mapper - A function that maps each input value to an output value.
   * It may return synchronously or asynchronously.
   * @returns A lazy iterator over mapped values.
   *
   * @example
   * ```ts
   * const values = await AsyncRichIterator.from([1, 2, 3])
   *   .map((value) => value * 2)
   *   .toArray();
   * // values: [2, 4, 6]
   * ```
   */
  public map<U>(mapper: (value: T) => MaybePromise<U>): AsyncRichIterator<U> {
    // deno-lint-ignore no-this-alias
    const outer = this;

    return new AsyncRichIterator(async function* asyncMapGenerator() {
      for await (const item of outer) {
        yield await mapper(item);
      }
    }());
  }

  /**
   * Maps each value with a fallible mapper and collects successful outputs.
   *
   * Iteration stops at the first error result. If every mapper call succeeds, the returned
   * result contains an array of all mapped values.
   *
   * @typeparam U - The success value type produced by the mapper.
   * @typeparam E - The error type produced by the mapper.
   * @param mapper - A function that maps each value to a {@link Result}, synchronously or asynchronously.
   * @returns A promise resolving to `Ok<U[]>` if all mappings succeed, or the first `Err<E>`.
   *
   * @example
   * ```ts
   * const result = await AsyncRichIterator.from(["1", "2"])
   *   .tryMap((value) => Result.ok(Number(value)));
   * // result: Ok([1, 2])
   * ```
   */
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

  /**
   * Lazily maps values while the mapper returns an {@link Option} containing a value.
   *
   * Iteration stops the first time the mapper returns `None`.
   *
   * @typeparam U - The type of mapped values yielded while mapping continues.
   * @param mapper - A function that maps each input value to an optional output value.
   * @returns A lazy iterator over mapped values until the first empty option.
   *
   * @example
   * ```ts
   * const values = await AsyncRichIterator.from([1, 2, 3, 4])
   *   .mapWhile((value) => value < 3 ? Option.some(value * 10) : Option.none())
   *   .toArray();
   * // values: [10, 20]
   * ```
   */
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

  /**
   * Lazily keeps only values accepted by a type-guard predicate.
   *
   * @typeparam S - The narrowed subtype yielded by the returned iterator.
   * @param predicate - A type guard that determines whether a value should be kept.
   * The predicate may only be synchronous.
   * @returns A lazy iterator over values narrowed to `S`.
   *
   * @example
   * ```ts
   * const values = await AsyncRichIterator.from<string | number>([1, "two", 3])
   *   .filter((value): value is number => typeof value === "number")
   *   .toArray();
   * // values: [1, 3]
   * ```
   */
  public filter<S extends T>(
    predicate: (value: T) => value is S,
  ): AsyncRichIterator<S>;
  /**
   * Lazily keeps only values for which the predicate returns `true`.
   *
   * The predicate may be synchronous or asynchronous.
   *
   * @param predicate - A function that returns whether each value should be included.
   * @returns A lazy iterator over values that satisfy `predicate`.
   *
   * @example
   * ```ts
   * const values = await AsyncRichIterator.from([1, 2, 3, 4])
   *   .filter((value) => value % 2 === 0)
   *   .toArray();
   * // values: [2, 4]
   * ```
   */
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

  /**
   * Lazily yields at most `limit` values from the iterator.
   *
   * @param limit - The maximum number of values to yield. Must be an integer 0 or greater.
   * @returns A lazy iterator that stops after yielding `limit` values or when the source is exhausted.
   * @throws `RangeError` if a negative number or non-integer is passed as `limit`.
   *
   * @example
   * ```ts
   * const values = await AsyncRichIterator.from([1, 2, 3])
   *   .take(2)
   *   .toArray();
   * // values: [1, 2]
   * ```
   */
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

  /**
   * Lazily skips the first `count` values, then yields the remaining values.
   *
   * @param count - The number of values to skip before yielding. Must be an integer 0 or greater.
   * @returns A lazy iterator over the remaining values after the initial skipped segment.
   * @throws `RangeError` if a negative number or non-integer is passed as `limit`.
   *
   * @example
   * ```ts
   * const values = await AsyncRichIterator.from([1, 2, 3])
   *   .drop(1)
   *   .toArray();
   * // values: [2, 3]
   * ```
   */
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

  /**
   * Lazily skips values while the predicate returns `true`, then yields the rest.
   *
   * Once the predicate returns `false`, all subsequent values are yielded without further
   * skipping checks.
   *
   * @param predicate - A function that determines whether each leading value should be skipped.
   * May be synchronous or asynchronous.
   * @returns A lazy iterator over values after the skipped prefix.
   *
   * @example
   * ```ts
   * const values = await AsyncRichIterator.from([1, 2, 3, 1])
   *   .dropWhile((value) => value < 3)
   *   .toArray();
   * // values: [3, 1]
   * ```
   */
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

  /**
   * Lazily yields values while the predicate returns `true`.
   *
   * Iteration stops at the first value for which the predicate returns `false`.
   *
   * @param predicate - A function that determines whether each value should continue to be yielded.
   * May be synchronous or asynchronous.
   * @returns A lazy iterator over the leading values accepted by `predicate`.
   *
   * @example
   * ```ts
   * const values = await AsyncRichIterator.from([1, 2, 3, 1])
   *   .takeWhile((value) => value < 3)
   *   .toArray();
   * // values: [1, 2]
   * ```
   */
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

  /**
   * Lazily maps each value to an iterator-like source and flattens the produced sources.
   *
   * @typeparam U - The type of values yielded by each mapped iterator-like source.
   * @param mapper - A function that maps each value to an {@link IteratorKind} of output values.
   * May be synchronous or asynchronous.
   * @returns A lazy iterator over all values yielded by the mapped sources.
   *
   * @example
   * ```ts
   * const values = await AsyncRichIterator.from([1, 2])
   *   .flatMap((value) => [value, value * 10])
   *   .toArray();
   * // values: [1, 10, 2, 20]
   * ```
   */
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

  /**
   * Lazily flattens an iterator whose values are themselves iterator-like sources.
   *
   * Sources that are not iterator-like will cause a type error.
   *
   * @typeparam U - The type of values yielded by the nested iterator-like sources.
   * @returns A lazy iterator over the concatenated values of each nested source.
   *
   * @example
   * ```ts
   * const values = await AsyncRichIterator.from([[1, 2], [3]])
   *   .flatten()
   *   .toArray();
   * // values: [1, 2, 3]
   * ```
   */
  public flatten<U>(
    this: AsyncRichIterator<IteratorKind<U>>,
  ): AsyncRichIterator<U> {
    return this.flatMap((value) => value);
  }

  /**
   * Lazily calls an inspector function for each value without changing the yielded values.
   *
   * Asynchronous `inspector` functions will be awaited.
   *
   * This is useful for logging, debugging, metrics, or other side effects in a pipeline.
   *
   * @param inspector - A function called with each value before that value is yielded.
   * May be synchronous or asynchronous.
   * @returns A lazy iterator yielding the original values unchanged.
   *
   * @example
   * ```ts
   * const values = await AsyncRichIterator.from([1, 2])
   *   .inspect((value) => console.log("saw", value))
   *   .toArray();
   * // values: [1, 2]
   * ```
   */
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

  /**
   * Converts an iterator of {@link Result} values into a single result containing an array.
   *
   * Iteration stops at the first error result. If every result is successful, the returned
   * result contains all success values.
   *
   * @typeparam U - The success value type contained by each result.
   * @typeparam E - The error type contained by each result.
   * @returns A promise resolving to `Ok<U[]>` when all items are successful, or the first `Err<E>`.
   *
   * @example
   * ```ts
   * const result = await AsyncRichIterator.from([
   *   ok(1),
   *   ok(2),
   * ]).toResult();
   * // result: ok([1, 2])
   * ```
   */
  public toResult<U, E>(
    this: AsyncRichIterator<Result<U, E>>,
  ): Promise<Result<U[], E>> {
    return this.tryMap((val) => val);
  }

  /**
   * Converts an iterator of {@link Option} values into a single option containing an array.
   *
   * Iteration stops at the first empty option. If every option contains a value, the returned
   * option contains all unwrapped values.
   *
   * @typeparam U - The value type contained by each option.
   * @returns A promise resolving to `Some<U[]>` when all items are present, or `None` otherwise.
   *
   * @example
   * ```ts
   * const option = await AsyncRichIterator.from([
   *   some("a"),
   *   some("b"),
   * ]).toOption();
   * // option: some(["a", "b"])
   * ```
   */
  public async toOption<U>(
    this: AsyncRichIterator<Option<U>>,
  ): Promise<Option<U[]>> {
    return (await this.tryMap((val) => val.okOr(undefined))).ok();
  }

  /**
   * Lazily groups values into fixed-size chunks.
   *
   * Full chunks are returned as successful results. A final incomplete chunk, when present,
   * is returned as an error result containing the partial chunk.
   *
   * @param size - The desired chunk size.
   * @returns A lazy iterator over `Result<T[], T[]>` chunk results.
   *
   * @example
   * ```ts
   * const chunks = await AsyncRichIterator.from([1, 2, 3])
   *   .chunks(2)
   *   .toArray();
   * // chunks: [ok([1, 2]), err([3])]
   * ```
   */
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

      if (cache.length > 0) {
        yield err(cache);
      }
    }());
  }

  /**
   * Lazily yields all remaining values from this iterator followed by values from another source.
   *
   * @param other - The iterator-like source to yield after this iterator is exhausted. The other
   * iterator may be synchronous or asynchronous or any other type accepted by @linkcode{AsyncRichIterator.from}
   * @returns A lazy iterator over values from this iterator followed by `other`.
   *
   * @example
   * ```ts
   * const values = await AsyncRichIterator.from([1, 2])
   *   .chain([3, 4])
   *   .toArray();
   * // values: [1, 2, 3, 4]
   * ```
   */
  public chain(other: IteratorKind<T>): AsyncRichIterator<T> {
    // deno-lint-ignore no-this-alias
    const first = this;

    return new AsyncRichIterator(async function* asyncChainGenerator() {
      yield* first;
      yield* iteratorToAsync(other);
    }());
  }

  /**
   * Lazily maps values to options and yields only the values contained by non-empty options.
   *
   * @typeparam U - The type of values yielded by non-empty mapper results.
   * @param mapper - A function that maps each input value to an output value that is an `Option`.
   * @returns A lazy iterator over unwrapped mapped values for which the mapper returned `Some`.
   *
   * @example
   * ```ts
   * const values = await AsyncRichIterator.from(["1", "no", "2"])
   *   .filterMap((value) => {
   *     const parsed = Number(value);
   *     return Number.isNaN(parsed) ? none() : some(parsed);
   *   })
   *   .toArray();
   * // values: [1, 2]
   * ```
   */
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

  /**
   * Lazily pairs values from this iterator with values from another iterator-like source.
   *
   * The returned iterator stops when either input is exhausted.
   *
   * @typeparam U - The type of values yielded by the other source.
   * @param other - The iterator-like source to zip with this iterator.
   * @returns A lazy iterator over `[left, right]` pairs.
   *
   * @example
   * ```ts
   * const values = await AsyncRichIterator.from([1, 2])
   *   .zip(["a", "b", "c"])
   *   .toArray();
   * // values: [[1, "a"], [2, "b"]]
   * ```
   */
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

  /**
   * Lazily combines values from this iterator and another source with a zipper function.
   *
   * The returned iterator stops when either input is exhausted.
   *
   * @typeparam U - The type of values yielded by the other source.
   * @typeparam R - The type of values produced by the zipper function.
   * @param other - The iterator-like source to zip with this iterator.
   * @param zipper - A function that combines corresponding values from both sources. The
   * zipper function can be synchronous or asynchronous.
   * @returns A lazy iterator over zipped values produced by `zipper`.
   *
   * @example
   * ```ts
   * const values = await AsyncRichIterator.from([1, 2])
   *   .zipWith([10, 20], (left, right) => left + right)
   *   .toArray();
   * // values: [11, 22]
   * ```
   */
  public zipWith<U, R>(
    other: IteratorKind<U>,
    zipper: (left: T, right: U) => MaybePromise<R>,
  ): AsyncRichIterator<R> {
    return this.zip(other).map(([left, right]) => zipper(left, right));
  }

  /**
   * Lazily inserts a separator value between adjacent values from the iterator.
   *
   * No separator is yielded before the first value or after the last value.
   *
   * @param separator - The value to insert between adjacent source values.
   * @returns A lazy iterator with separators interleaved between source values.
   *
   * @example
   * ```ts
   * const values = await AsyncRichIterator.from(["a", "b", "c"])
   *   .intersperse(",")
   *   .toArray();
   * // values: ["a", ",", "b", ",", "c"]
   * ```
   */
  public intersperse(separator: T): AsyncRichIterator<T> {
    return this.intersperseWith(() => separator);
  }

  /**
   * Lazily inserts separator values produced by a function between adjacent values.
   *
   * The separator function is called each time a separator is needed. No separator is yielded
   * before the first value or after the last value.
   *
   * @param separatorFn - A function that produces the separator value to insert. This function
   * may be synchronous or asynchronous.
   * @returns A lazy iterator with generated separators interleaved between source values.
   *
   * @example
   * ```ts
   * const values = await AsyncRichIterator.from(["a", "b", "c"])
   *   .intersperseWith(() => "|")
   *   .toArray();
   * // values: ["a", "|", "b", "|", "c"]
   * ```
   */
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

  /**
   * Tests whether this iterator and another source yield the same values in the same order.
   *
   * Equality is determined using `Object.is`.
   *
   * @param other - The iterator-like source to compare with this iterator.
   * @returns A promise resolving to `true` when both sources are equal, otherwise `false`.
   *
   * @example
   * ```ts
   * const equal = await AsyncRichIterator.from([1, 2]).eq([1, 2]);
   * // equal: true
   * ```
   */
  public eq(other: IteratorKind<T>): Promise<boolean> {
    return this.eqBy(other, Object.is);
  }

  /**
   * Tests whether this iterator and another source are equal using a custom comparison function.
   *
   * Both iterators are consumed until the comparison function returns `false`, their lengths
   * differ, or both are exhausted.
   *
   * @typeparam U - The type of values yielded by the other source.
   * @param other - The iterator-like source to compare with this iterator.
   * @param comparisonFn - A function that returns whether corresponding values are equal, either
   * synchronously or asynchronously.
   * @returns A promise resolving to `true` when both sources are equal according to `comparisonFn`.
   *
   * @example
   * ```ts
   * const equal = await AsyncRichIterator.from(["A", "B"])
   *   .eqBy(["a", "b"], (left, right) => left.toLowerCase() === right);
   * // equal: true
   * ```
   */
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

  /**
   * Lexicographically compares this iterator with another source.
   *
   * Values are compared pairwise using the provided comparator, or the default comparator when
   * omitted. The first non-equal pair determines the result; if all compared values are equal,
   * the shorter iterator sorts before the longer iterator.
   *
   * @param comparisonIterator - The iterator-like source to compare against this iterator.
   * @param comparator - An optional comparator used to order values.
   * @returns A promise resolving to the lexicographic {@link ComparisonOrder}.
   *
   * @example
   * ```ts
   * const order = await AsyncRichIterator.from([1, 2]).cmp([1, 3]);
   * // order: less
   * ```
   */
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

  /**
   * Tests whether this iterator and another source are not equal using `Object.is`.
   *
   * This is the logical negation of {@link AsyncRichIterator.eq}.
   *
   * @param other - The iterator-like source to compare with this iterator.
   * @returns A promise resolving to `true` when the sources differ, otherwise `false`.
   *
   * @example
   * ```ts
   * const notEqual = await AsyncRichIterator.from([1, 2]).ne([1, 3]);
   * // notEqual: true
   * ```
   */
  public async ne(other: IteratorKind<T>): Promise<boolean> {
    return !(await this.eq(other));
  }

  /**
   * Tests whether this iterator is lexicographically less than another source.
   *
   * @param other - The iterator-like source to compare against this iterator.
   * @param comparator - An optional comparator used to order values.
   * @returns A promise resolving to `true` when this iterator sorts before `other`.
   *
   * @example
   * ```ts
   * const isLess = await AsyncRichIterator.from([1, 2]).lt([1, 3]);
   * // isLess: true
   * ```
   */
  public async lt(
    other: IteratorKind<T>,
    comparator?: AsyncComparator<T>,
  ): Promise<boolean> {
    return await this.cmp(other, comparator) === "less";
  }

  /**
   * Tests whether this iterator is lexicographically less than or equal to another source.
   *
   * @param other - The iterator-like source to compare against this iterator.
   * @param comparator - An optional comparator used to order values.
   * @returns A promise resolving to `true` when this iterator sorts before or equal to `other`.
   *
   * @example
   * ```ts
   * const isLessOrEqual = await AsyncRichIterator.from([1, 2]).le([1, 2]);
   * // isLessOrEqual: true
   * ```
   */
  public async le(
    other: IteratorKind<T>,
    comparator?: AsyncComparator<T>,
  ): Promise<boolean> {
    return await this.cmp(other, comparator) !== "greater";
  }

  /**
   * Tests whether this iterator is lexicographically greater than another source.
   *
   * @param other - The iterator-like source to compare against this iterator.
   * @param comparator - An optional comparator used to order values.
   * @returns A promise resolving to `true` when this iterator sorts after `other`.
   *
   * @example
   * ```ts
   * const isGreater = await AsyncRichIterator.from([2]).gt([1, 9]);
   * // isGreater: true
   * ```
   */
  public async gt(
    other: IteratorKind<T>,
    comparator?: AsyncComparator<T>,
  ): Promise<boolean> {
    return await this.cmp(other, comparator) === "greater";
  }

  /**
   * Tests whether this iterator is lexicographically greater than or equal to another source.
   *
   * @param other - The iterator-like source to compare against this iterator.
   * @param comparator - An optional comparator used to order values.
   * @returns A promise resolving to `true` when this iterator sorts after or equal to `other`.
   *
   * @example
   * ```ts
   * const isGreaterOrEqual = await AsyncRichIterator.from([2]).ge([2]);
   * // isGreaterOrEqual: true
   * ```
   */
  public async ge(
    other: IteratorKind<T>,
    comparator?: AsyncComparator<T>,
  ): Promise<boolean> {
    return await this.cmp(other, comparator) !== "less";
  }

  /**
   * Finds the maximum value yielded by the iterator according to a comparator.
   *
   * This is a terminal operation and consumes the iterator.
   *
   * @param comparisonFn - A comparator used to order values. This function may be synchronous
   * or asynchronous.
   * @returns A promise resolving to `Some<T>` containing the maximum value, or `None` if empty.
   *
   * @example
   * ```ts
   * const max = await AsyncRichIterator.from([3, 1, 2])
   *   .max((left, right) => left - right);
   * // max: Some(3)
   * ```
   */
  public max(comparisonFn: AsyncComparator<T>): Promise<Option<T>> {
    return this.reduce(async (currentMaximum, value) =>
      await comparisonFn(value, currentMaximum) > 0 ? value : currentMaximum
    );
  }

  /**
   * Finds the minimum value yielded by the iterator according to a comparator.
   *
   * This is a terminal operation and consumes the iterator.
   *
   * @param comparisonFn - A comparator used to order values.
   * @returns A promise resolving to `Some<T>` containing the minimum value, or `None` if empty.
   *
   * @example
   * ```ts
   * const min = await AsyncRichIterator.from([3, 1, 2])
   *   .min((left, right) => left - right);
   * // min: Some(1)
   * ```
   */
  public min(comparisonFn: AsyncComparator<T>): Promise<Option<T>> {
    return this.reduce(async (currentMinimum, value) =>
      await comparisonFn(value, currentMinimum) < 0 ? value : currentMinimum
    );
  }

  /**
   * Accumulates all values into a single value using an initial accumulator and reducer.
   *
   * This is a terminal operation and consumes the iterator.
   *
   * @typeparam U - The accumulator and return value type.
   * @param initialValue - The initial accumulator value.
   * @param reducer - A function that combines the accumulator with each value. The reducer function
   * may be synchronous or asynchronous.
   * @returns A promise resolving to the final accumulator value.
   *
   * @example
   * ```ts
   * const sum = await AsyncRichIterator.from([1, 2, 3])
   *   .fold(0, (accumulator, value) => accumulator + value);
   * // sum: 6
   * ```
   */
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

  /**
   * Fallibly accumulates all values into a single value using a reducer that returns a result.
   *
   * Iteration stops at the first error result.
   *
   * @typeparam U - The accumulator success type.
   * @typeparam E - The error type that may be returned by the reducer.
   * @param initialValue - The initial accumulator value.
   * @param reducer - A function that combines the accumulator with each value into a {@link Result}.
   * The reducer function may be synchronous or asynchronous.
   * @returns A promise resolving to `Ok<U>` with the final accumulator or the first `Err<E>`.
   *
   * @example
   * ```ts
   * const result = await AsyncRichIterator.from([1, 2, 3])
   *   .tryFold(0, (accumulator, value) => Result.ok(accumulator + value));
   * // result: Ok(6)
   * ```
   */
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

  /**
   * Reduces all values into a single value using the first value as the initial accumulator.
   *
   * This is a terminal operation and consumes the iterator. Empty iterators produce `None`.
   *
   * @param reducer - A function that combines the accumulator with each subsequent value.
   * The reducer may be synchronous or asynchronous.
   * @returns A promise resolving to `Some<T>` with the reduced value, or `None` if empty.
   *
   * @example
   * ```ts
   * const total = await AsyncRichIterator.from([1, 2, 3])
   *   .reduce((accumulator, value) => accumulator + value);
   * // total: some(6)
   * ```
   */
  public async reduce(
    reducer: (accumulator: T, value: T) => MaybePromise<T>,
  ): Promise<Option<T>> {
    return (await this.nextOption()).match<MaybePromise<Option<T>>>({
      Some: async (firstValue) => some(await this.fold(firstValue, reducer)),
      None: () => none(),
    });
  }

  /**
   * Fallibly reduces all values using the first value as the initial accumulator.
   *
   * Empty iterators produce `None`. Non-empty iterators produce `Some<Result<T, E>>`, where
   * the result is either the final accumulator or the first reducer error.
   *
   * @typeparam E - The error type that may be returned by the reducer.
   * @param reducer - A function that combines the accumulator with each subsequent value into a {@link Result}.
   * The reducer may be synchronous or asynchronous.
   * @returns A promise resolving to `None` when empty, otherwise `Some<Ok<T>>` or `Some<Err<E>>`.
   *
   * @example
   * ```ts
   * const result = await AsyncRichIterator.from([1, 2, 3])
   *   .tryReduce((accumulator, value) => Result.ok(accumulator + value));
   * // result: Some(Ok(6))
   * ```
   */
  public async tryReduce<E>(
    reducer: (accumulator: T, value: T) => MaybePromise<Result<T, E>>,
  ): Promise<Option<Result<T, E>>> {
    const first = await this.nextOption();

    return first.match<MaybePromise<Option<Result<T, E>>>>({
      Some: async (firstValue) => some(await this.tryFold(firstValue, reducer)),
      None: none,
    });
  }

  /**
   * Calls a callback for each remaining value in the iterator.
   *
   * This is a terminal operation and consumes the iterator.
   *
   * @param callback - A function invoked once for each value. If it is
   * @returns A promise that resolves when all callbacks have completed.
   *
   * @example
   * ```ts
   * await AsyncRichIterator.from([1, 2, 3])
   *   .forEach((value) => console.log(value));
   * ```
   */
  public async forEach(
    callback: (value: T) => MaybePromise<void>,
  ): Promise<void> {
    for await (const item of this) {
      await callback(item);
    }
  }

  /**
   * Advances the iterator by up to `limit` values without yielding them.
   *
   * If the iterator contains at least `limit` remaining values, the result is successful.
   * If it is exhausted early, the error contains the number of values that could not be skipped.
   *
   * @param limit - The number of values to advance past.
   * @returns A promise resolving to `Ok<void>` when fully advanced, or `Err<number>` with the shortfall.
   *
   * @example
   * ```ts
   * const iterator = AsyncRichIterator.from([1, 2, 3]);
   * const result = await iterator.advanceBy(2);
   * const next = await iterator.nextOption();
   * // result: Ok(undefined)
   * // next: Some(3)
   * ```
   */
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

  /**
   * Reads the next fixed-size chunk from the iterator.
   *
   * A full chunk is returned as a successful result. If the iterator is exhausted before
   * `size` values are read, the partial chunk is returned as an error result.
   *
   * @param size - The number of values to read for a full chunk.
   * @returns A promise resolving to `Ok<T[]>` for a full chunk or `Err<T[]>` for a partial chunk.
   *
   * @example
   * ```ts
   * const iterator = AsyncRichIterator.from([1, 2, 3]);
   * const chunk = await iterator.nextChunk(2);
   * // chunk: Ok([1, 2])
   * ```
   */
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

  /**
   * Counts the number of remaining values in the iterator.
   *
   * This is a terminal operation and consumes the iterator.
   *
   * @returns A promise resolving to the number of remaining values.
   *
   * @example
   * ```ts
   * const count = await AsyncRichIterator.from(["a", "b", "c"]).count();
   * // count: 3
   * ```
   */
  public async count(): Promise<number> {
    let count = 0;

    for await (const _ of this) {
      count++;
    }

    return count;
  }

  /**
   * Tests whether at least one value satisfies the predicate.
   *
   * Iteration stops as soon as a matching value is found.
   *
   * @param predicate - A function that determines whether a value matches.
   * @returns A promise resolving to `true` if any value satisfies `predicate`, otherwise `false`.
   *
   * @example
   * ```ts
   * const hasEven = await AsyncRichIterator.from([1, 3, 4])
   *   .some((value) => value % 2 === 0);
   * // hasEven: true
   * ```
   */
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

  /**
   * Tests whether every value satisfies the predicate.
   *
   * Iteration stops as soon as a value fails the predicate.
   *
   * @param predicate - A function that determines whether a value matches.
   * @returns A promise resolving to `true` if all values satisfy `predicate`, otherwise `false`.
   *
   * @example
   * ```ts
   * const allPositive = await AsyncRichIterator.from([1, 2, 3])
   *   .every((value) => value > 0);
   * // allPositive: true
   * ```
   */
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

  /**
   * Finds the first value that satisfies the predicate.
   *
   * Iteration stops as soon as a matching value is found.
   *
   * @param predicate - A function that determines whether a value matches. The predicate may be synchronous
   * or asynchronous.
   * @returns A promise resolving to `Some<T>` with the first matching value, or `None` if no value matches.
   *
   * @example
   * ```ts
   * const found = await AsyncRichIterator.from([1, 2, 3])
   *   .find((value) => value > 1);
   * // found: Some(2)
   * ```
   */
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

  /**
   * Maps values to options and returns the first mapped value that is present.
   *
   * Iteration stops as soon as the mapper returns `Some`.
   *
   * @typeparam U - The type of value contained by the returned option.
   * @param mapper - A function that maps each input value to an optional output value. The function should
   * return an `Option` where a `Some` value will be returned and a `None` value will be discarded. The mapper
   * may be synchronous or asynchronous.
   * @returns A promise resolving to the first `Some<U>` returned by `mapper`, or `None`.
   *
   * @example
   * ```ts
   * const firstNumber = await AsyncRichIterator.from(["x", "42"])
   *   .findMap((value) => {
   *     const parsed = Number(value);
   *     return Number.isNaN(parsed) ? Option.none() : Option.some(parsed);
   *   });
   * // firstNumber: Some(42)
   * ```
   */
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

  /**
   * Finds the zero-based position of the first value that satisfies the predicate.
   *
   * Iteration stops as soon as a matching value is found.
   *
   * @param predicate - A function that determines whether a value matches. The predicate may be
   * synchronous or asynchronous.
   * @returns A promise resolving to `Some<number>` with the matching position, or `None` if the
   * predicate never passes.
   *
   * @example
   * ```ts
   * const index = await AsyncRichIterator.from(["a", "b", "c"])
   *   .position((value) => value === "b");
   * // index: Some(1)
   * ```
   */
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

  /**
   * Returns the last remaining value from the iterator.
   *
   * This is a terminal operation and consumes the iterator.
   *
   * @returns A promise resolving to `Some<T>` with the last value, or `None` if empty.
   *
   * @example
   * ```ts
   * const last = await AsyncRichIterator.from([1, 2, 3]).last();
   * // last: Some(3)
   * ```
   */
  public last(): Promise<Option<T>> {
    return this.reduce((_, val) => val);
  }

  /**
   * Returns the value at a zero-based position in the remaining iterator.
   *
   * The iterator is advanced up to and including the requested position when present.
   *
   * @param position - The zero-based position to retrieve.
   * @returns A promise resolving to `Some<T>` with the value at `position`, or `None` if out of range.
   *
   * @example
   * ```ts
   * const value = await AsyncRichIterator.from(["a", "b", "c"]).nth(1);
   * // value: Some("b")
   * ```
   */
  public async nth(position: number): Promise<Option<T>> {
    return (await this.advanceBy(position))
      .match<MaybePromise<Option<T>>>({
        Ok: () => this.nextOption(),
        Err: none,
      });
  }

  /**
   * Splits all remaining values into two arrays based on a predicate.
   *
   * Values for which the predicate returns `true` are placed in the first array. Values for
   * which it returns `false` are placed in the second array.
   *
   * @param predicate - A function that determines which partition receives each value. The predicate
   * may be synchronous or asynchronous.
   * @returns A promise resolving to a tuple of `[matchingValues, nonMatchingValues]`.
   *
   * @example
   * ```ts
   * const [evens, odds] = await AsyncRichIterator.from([1, 2, 3, 4])
   *   .partition((value) => value % 2 === 0);
   * // evens: [2, 4]
   * // odds: [1, 3]
   * ```
   */
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

  /**
   * Converts an iterator of pairs into a pair of arrays of the shape produced by {@linkcode AsyncRichIterator.prototype.zip}
   *
   * The first returned array contains the first element from each pair, and the second returned
   * array contains the second element from each pair.
   *
   * @typeparam U - The type of the first element in each input pair.
   * @typeparam V - The type of the second element in each input pair.
   * @returns A promise resolving to `[firstValues, secondValues]`.
   *
   * @example
   * ```ts
   * const [numbers, letters] = await AsyncRichIterator.from([[1, "a"], [2, "b"]] as const)
   *   .unzip();
   * // numbers: [1, 2]
   * // letters: ["a", "b"]
   * ```
   */
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

  /**
   * Multiplies all remaining numeric values in the iterator.
   *
   * If a non-number value is encountered, the returned result contains a {@link TypeError}.
   * This is a terminal operation and consumes the iterator.
   *
   * @returns A promise resolving to `Ok<number>` with the product, or `Err<TypeError>` for non-number input.
   *
   * @example
   * ```ts
   * const product = await AsyncRichIterator.from([2, 3, 4]).product();
   * // product: Ok(24)
   * ```
   */
  public product(): Promise<Result<number, TypeError>> {
    return this.tryFold(
      1,
      (acc, entry) => toNumber(entry).map((val) => acc * val),
    );
  }

  /**
   * Adds all remaining numeric values in the iterator.
   *
   * If a non-number value is encountered, the returned result contains a {@link TypeError}.
   * This is a terminal operation and consumes the iterator.
   *
   * @returns A promise resolving to `Ok<number>` with the sum, or `Err<TypeError>` for non-number input.
   *
   * @example
   * ```ts
   * const sum = await AsyncRichIterator.from([1, 2, 3]).sum();
   * // sum: Ok(6)
   * ```
   */
  public sum(): Promise<Result<number, TypeError>> {
    return this.tryFold(
      0,
      (acc, entry) => toNumber(entry).map((val) => acc + val),
    );
  }

  /**
   * Multiplies all remaining values without runtime type checking.
   *
   * This unchecked variant assumes the iterator yields values that can be correctly converted to a `Number`.
   * Behavior for non-number values follows JavaScript multiplication semantics, so the result can be `NaN`.
   *
   * @returns A promise resolving to the computed product.
   *
   * @example
   * ```ts
   * const product = await AsyncRichIterator.from([2, 3, 4]).productUnchecked();
   * // product: 24
   * ```
   * @example
   * ```ts
   * const product = await AsyncRichIterator.from([2, "x", 4]).productUnchecked();
   * // product: NaN
   * ```
   */
  public productUnchecked(): Promise<number> {
    return this.fold(1, (acc, val) => acc * Number(val));
  }

  /**
   * Adds all remaining values without runtime type checking.
   *
   * This unchecked variant assumes the iterator yields values that can be correctly converted to a `Number`.
   * Behavior for non-number values follows JavaScript addition semantics, so the result can be `NaN`.
   *
   * @returns A promise resolving to the computed sum.
   *
   * @example
   * ```ts
   * const sum = await AsyncRichIterator.from([1, 2, 3]).sumUnchecked();
   * // sum: 6
   * ```
   * @example
   * ```ts
   * const sum = await AsyncRichIterator.from([1, "x", 3]).sumUnchecked();
   * // sum: NaN
   * ```
   */
  public sumUnchecked(): Promise<number> {
    return this.fold(0, (acc, val) => acc + Number(val));
  }
}
