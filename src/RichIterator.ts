import { none, type Option, type Result, some } from "@sck/optres";
import * as comparison from "./comparison.ts";
import { asIterable, toIterator } from "./utilities.ts";
import * as transform from "./transform.ts";
import * as consume from "./consume.ts";
import * as search from "./search.ts";
import * as numeric from "./numeric.ts";

/**
 * The type returned by {@linkcode RichIterator.prototype.cmp}.
 *
 * The possible values are `"equal"`, `"less"`, and `"greater"`
 */
export type ComparisonOrder = comparison.Order;

/**
 * A comparison function. This takes two values and returns a number. If the number is `0`, the values
 * are considered equal. If the number is less than `0`, the first value is less than the second. If the
 * number is greater than `0`, the first value is greater than the second.
 *
 * @typeparam T The type of the values to compare
 */
export type Comparator<T> = comparison.Comparator<T>;

/**
 * `RichIterator` is a wrapper class around Javascript/Typescript iterators and iterables
 * that allows a rich, functional, declarative approach to iteration modelled after Rust's
 * `Iterator` trait.
 *
 * @typeparam T The type of the contents of the iterator
 * @typeparam TReturn The type returned by the iterator's last iteration (i.e. when `done` is `true`).
 * Normally this is unused and so `unknown`.
 */
export class RichIterator<T, TReturn = unknown> {
  private readonly source: Iterator<T, TReturn, unknown>;

  /**
   * Create a new `RichIterator`.
   *
   * Generally, prefer to use the more flexible [RichIterator.from].
   * @param source The native `Iterator` or `Iterable`
   */
  public constructor(source: Iterator<T, TReturn> | Iterable<T>) {
    this.source = toIterator(source);
  }

  /**
   * Create a new `RichIterator` from a native Javascript `Iterator` or `Iterable`.
   * @param source The source to base the RichIterator on
   * @returns A new RichIterator object
   */
  public static from<T, TReturn = unknown>(
    source: Iterator<T, TReturn> | Iterable<T>,
  ): RichIterator<T, TReturn> {
    return new RichIterator(source);
  }

  /**
   * Get the next value from the iterator and consume it
   * @param args A value to pass to the iterator. Generally ignored.
   * @returns An `IteratorResult`, i.e. `{ done: boolean, value: T }`.
   */
  public next(...args: [] | [unknown]): IteratorResult<T, TReturn> {
    if (args.length === 0) {
      return this.source.next();
    }
    return this.source.next(args[0]);
  }

  /**
   * Get the next value from the iterator as an `Option` and consume it.
   * @returns `Some<T>` if a value is present, or `None` if the iterator is exhausted.
   */
  public nextOption(): Option<T> {
    const { done, value } = this.next();

    if (done) {
      return none();
    }

    return some(value);
  }

  /**
   * End the iterator and call any destructor methods.
   */
  public return(): IteratorResult<T, TReturn | undefined>;
  public return(value: TReturn): IteratorResult<T, TReturn>;
  public return(value?: TReturn): IteratorResult<T, TReturn | undefined> {
    if (typeof this.source.return === "function") {
      return this.source.return(value);
    }

    return {
      done: true,
      value: value,
    };
  }

  /**
   * End the iterator and throw an error
   * @param e The error to throw
   * @returns A result, but normally throws an error
   */
  public throw(e?: unknown): IteratorResult<T, TReturn> {
    if (typeof this.source.throw === "function") {
      return this.source.throw(e);
    }

    throw e;
  }

  /**
   * Iterate through the `RichIterator` with `for..of`
   * @returns `RichIterator`
   */
  public [Symbol.iterator](): RichIterator<T, TReturn> {
    return this;
  }

  /**
   * Label for `Object.prototype.toString.call`
   */
  get [Symbol.toStringTag](): string {
    return "RichIterator";
  }

  /**
   * Tidy up when `using` and the source has a `return` method
   */
  public [Symbol.dispose](): void {
    if (typeof this.source.return === "function") {
      this.source.return();
    }
  }

  /**
   * Get a native `Iterator`
   * @returns A native `Iterator`
   */
  public asNative(): IteratorObject<T> {
    return Iterator.from<T>(this);
  }

  /**
   * Consume the iterator and return the contents as an array.
   * @returns T[] The contents of the iterator as an array
   */
  public toArray(): T[] {
    return Array.from(asIterable(this));
  }

  /**
   * Add a `0`-based index to the iterator, transforming it into an iterator of
   * tuples, where each is `[n, T]`, where `n` is the index.
   * @returns A new RichIterator over `[number, T]`.
   */
  public enumerate(): RichIterator<[number, T]> {
    let index = 0;
    return this.map((val): [number, T] => [index++, val]);
  }

  /**
   * Lazily apply a function to each item in the iterator and return the result
   * @param mapper A function that takes an item from the iterator and maps it to another value
   * @returns A RichIterator over the new value
   * @typeparam U The return type of the mapping function
   */
  public map<U>(
    mapper: (value: T) => U,
  ): RichIterator<U> {
    return transform.map(this, mapper);
  }

  /**
   * Apply a function to each item in the iterator. The result must be a `Result<U, E>`. If an
   * `Err` type is returned, `tryMap` short-circuits and returns that error. Otherwise, it consumes
   * the iterator and returns an array of the items after applying the mapper function.
   * @param mapper A function that takes a value from the iterator and returns a `Result<U, E>`
   * @returns A `Result` where the `Ok` value is an array of values after the mapper is called.
   * @typeparam U The success type from the mapper
   * @typeparam E The error type from the mapper
   */
  public tryMap<U, E>(mapper: (value: T) => Result<U, E>): Result<U[], E> {
    return transform.tryMap(this, mapper);
  }

  /**
   * Lazily apply a function to each item in the iterator. The result must be an `Option<U>`. If
   * `None` is returned from the mapper, `mapWhile` stops the iterator. Otherwise, it yields each
   * item in the iterator after the mapper function is applies.
   * @param mapper A function that takes a value from the iterator and returns an `Option<U>`
   * @typeparam U The type returned by the mapper
   * @returns A new RichIterator of the type returned from the mapper
   */
  public mapWhile<U>(mapper: (value: T) => Option<U>): RichIterator<U> {
    return transform.mapWhile(this, mapper);
  }

  /**
   * Lazily apply a function to each item in the iterator. If the result is `true`, the item is
   * yielded. If it is `false`, the value is dropped.
   * @param predicate A function to test if the value should be kept
   * @returns A new RichIterator after the filter is applied
   * @typeparam S If the `predicate` is a type-guard function, the resulting RichIterator will be
   * narrowed to the type of that type-guard
   */
  public filter<S extends T>(
    predicate: (value: T) => value is S,
  ): RichIterator<S>;
  public filter(
    predicate: (value: T) => boolean,
  ): RichIterator<T>;
  public filter(
    predicate: (value: T) => boolean,
  ): RichIterator<T> {
    return transform.filter(this, predicate);
  }

  /**
   * Create a new iterator that will yield up to `limit` items from the iterator
   * @param limit How many items to take from the iterator
   * @returns A new RichIterator of the items taken
   */
  public take(limit: number): RichIterator<T> {
    return transform.take(this, limit);
  }

  /**
   * Consume and discard `count` items from the iterator
   * @param count How many items to discard
   * @returns A new RichIterator of the items left after the discard
   */
  public drop(count: number): RichIterator<T> {
    return transform.drop(this, count);
  }

  /**
   * Consume and discard items from the iterator while a predicate function returns `true`
   * @param predicate A function that returns `true` if the item should be dropped and `false`
   * if that item (and all subsequent items) should be yielded.
   * @returns A new iterator after the operation is executed
   */
  public dropWhile(predicate: (value: T) => boolean): RichIterator<T> {
    return transform.dropWhile(this, predicate);
  }

  /**
   * Create a new iterator that will yield items from the iterator while a predicate function
   * returns `true`.
   * @param predicate A function that returns `true` if the item should be yielded and `false`
   * when you wish to cease consuming the iterator
   * @returns A new iterator after the operation is executed
   */
  public takeWhile(predicate: (value: T) => boolean): RichIterator<T> {
    return transform.takeWhile(this, predicate);
  }

  /**
   * Apply a function to each item in the iterator. The function must return an `Iterator` or
   * an `Iterable`. A new RichIterator is returned that yields the result of all the contents of
   * all the iterators
   * @param mapper A function that takes a value from the `RichIterator` and returns an `Iterator`
   * or `Iterable`
   * @returns A new RichIterator over all the contents of all the iterators returned by the mapper
   * function
   * @typeparam U The type contained in the `Iterator` or `Iterable`
   */
  public flatMap<U>(
    mapper: (
      value: T,
    ) => Iterator<U, unknown, unknown> | Iterable<U> | RichIterator<U>,
  ): RichIterator<U> {
    return transform.flatMap(this, mapper);
  }

  /**
   * If the RichIterator contains `Iterator` or `Iterable` objects, flatten the contents and yield
   * them in turn.
   * @returns A new iterator over the items contained in the inner iterators
   * @typedef U The type of the items in the inner iterators/iterables
   */
  public flatten<U>(
    this: RichIterator<Iterator<U> | Iterable<U>>,
  ): RichIterator<U> {
    return transform.flatten(this);
  }

  /**
   * Lazily call a function on each item in the iterator. Any results are discarded. Use this for
   * side-effects or to inspect the values contained
   * @param inspector A function run on each item in the iterator
   * @returns The unchanged iterator
   */
  public inspect(inspector: (value: T) => void): RichIterator<T> {
    return transform.inspect(this, inspector);
  }

  /**
   * If the RichIterator contains `Result` types, consume it. If all the items are `Ok`, collect their
   * values into an array and return that value as `Ok`. If any item is `Err`, return that error immediately.
   * @returns A `Result` of either an array of items or the first error type encountered
   * @typeparam U The `Ok` type of the `Result` objects
   * @typeparam E The `Err` type of the `Result` objects
   */
  public toResult<U, E>(this: RichIterator<Result<U, E>>): Result<U[], E> {
    return transform.toResult(this);
  }

  /**
   * If the RichIterator contains `Option` typoes, consume it. If all the items are `Some`, collect their
   * values into an array and return that value as `Ok`. If any item is `None`, return `None`
   * @returns An `Option` of an array of items
   * @typeparam U The `Some` type of the `Option` objects
   */
  public toOption<U>(this: RichIterator<Option<U>>): Option<U[]> {
    return transform.toOption(this);
  }

  /**
   * Change the iterator so it returns items in chunks of `size`, rather than one by one.
   *
   * While filled chunks are returned, these are `Ok`. When the final chunk is reached (which will contain
   * 0 or less than `size` items), this is `Err`.
   * @param size The size of the chunks to return
   * @returns A `Result`: `Ok` means the chunk is complete, `Err` means the iterator is exhausted before
   * completing the chunk.
   */
  public chunks(size: number): RichIterator<T[], T[]> {
    return transform.chunks(this, size);
  }

  /**
   * Chain this iterator with another
   * @param other The other iterator to add to the end of this one
   * @returns A new RichIterator of the two iterators together
   */
  public chain(
    other: Iterator<T> | Iterable<T> | RichIterator<T>,
  ): RichIterator<T> {
    return transform.chain(this, other);
  }

  /**
   * Run a function on each item in the iterator. If the result of the function is `Some`, the result of that
   * function is yielded. If it is `None`, that item is discarded.
   * @param mapper The function to run on each item in the iterator, returning an `Option`
   * @returns An iterator over the `Some` value of the function
   * @typeparam U The type returned inside the `Option`
   */
  public filterMap<U>(mapper: (value: T) => Option<U>): RichIterator<U> {
    return transform.filterMap(this, mapper);
  }

  /**
   * Zip this iterator with another iterator and yield tuples as long as neither iterator is exhausted.
   * @param other The other iterator to zip with this one
   * @returns A RichIterator of tuples
   * @typeparam U The type contained in the other iterator
   */
  public zip<U>(
    other: Iterator<U> | Iterable<U> | RichIterator<U>,
  ): RichIterator<[T, U]> {
    return transform.zip(this, other);
  }

  /**
   * Zip this iterator with another and call a zipping function on the values yielded from each iterator
   * as long as neither is exhausted.
   * @param other The other iterator to zip with this one
   * @param zipper The function to combine the two values
   * @returns A RichIterator of the values returned by the zipper function
   * @typeparam U The type of the other iterator
   * @typeparam R The type returned by the zipper function
   */
  public zipWith<U, R>(
    other: Iterable<U> | Iterator<U> | RichIterator<U>,
    zipper: (left: T, right: U) => R,
  ): RichIterator<R> {
    return transform.zipWith(this, other, zipper);
  }

  /**
   * Intersperse a separator item between each item in the iterator
   * @param separator The item to intersperse
   * @returns A RichIterator with the separator inserted between each item
   */
  public intersperse(separator: T): RichIterator<T> {
    return transform.intersperse(this, separator);
  }

  /**
   * Intersperse a separator item between each item in the iterator. The separator item is generated
   * each time by calling `separatorFn`.
   * @param separatorFn The function to give the separator item
   * @returns A RichIterator with the separator inserted between each item
   */
  public intersperseWith(separatorFn: () => T): RichIterator<T> {
    return transform.intersperseWith(this, separatorFn);
  }

  /**
   * Test if the iterator is equal to another using `Object.is` to determine equality.
   * @param other The iterator to test against
   * @returns `true` if the iterators are equal, otherwise `false`
   */
  public eq(other: Iterator<T> | Iterable<T> | RichIterator<T>): boolean {
    return this.eqBy(other, Object.is);
  }

  /**
   * Test if the iterator is equal to another using a custom comparison function.
   * @param other The iterator to test against
   * @param comparisonFn The function that takes the two values and tests them for equality
   * @returns `true` if the `comparisonFn` always returns `true` and the iterators are the same length, otherwise `false`
   * @typeparam U The type of the other iterator
   */
  public eqBy<U>(
    other: Iterator<U> | Iterable<U> | RichIterator<U>,
    comparisonFn: (left: T, right: U) => boolean,
  ): boolean {
    return comparison.eqBy(this, other, comparisonFn);
  }

  /**
   * Check if the iterator is not equal
   * @param other The iterator to test against
   * @returns `true` if they are not equal, `false` if they are
   */
  public ne(other: Iterator<T> | Iterable<T> | RichIterator<T>): boolean {
    return !this.eq(other);
  }

  /**
   * Check if the iterator is less than another iterator, consuming both.
   * @param other The iterator to test against
   * @param comparator A comparison function
   * @returns `boolean` whether the RichIterator is less than the other iterator
   */
  public lt(
    other: Iterator<T> | Iterable<T> | RichIterator<T>,
    comparator?: Comparator<T>,
  ): boolean {
    return comparison.lt(this, other, comparator);
  }

  /**
   * Check if the iterator is less than or equal to another iterator, consuming both.
   * @param other The iterator to test against
   * @param comparator A comparison function
   * @returns `boolean` whether the RichIterator is less than or equal to the other iterator
   */
  public le(
    other: Iterator<T> | Iterable<T> | RichIterator<T>,
    comparator?: Comparator<T>,
  ): boolean {
    return comparison.le(this, other, comparator);
  }

  /**
   * Check if the iterator is greater than another iterator, consuming both.
   * @param other The iterator to test against
   * @param comparator A comparison function
   * @returns `boolean` whether the RichIterator is greater than the other iterator
   */
  public gt(
    other: Iterator<T> | Iterable<T> | RichIterator<T>,
    comparator?: Comparator<T>,
  ): boolean {
    return comparison.gt(this, other, comparator);
  }

  /**
   * Check if the iterator is greater than or equal to another iterator, consuming both.
   * @param other The iterator to test against
   * @param comparator A comparison function
   * @returns `boolean` whether the RichIterator is greater than or equal to the other iterator
   */
  public ge(
    other: Iterator<T> | Iterable<T> | RichIterator<T>,
    comparator?: Comparator<T>,
  ): boolean {
    return comparison.ge(this, other, comparator);
  }

  /**
   * Compare this iterator with another.
   * @param other The iterator to compare with
   * @param comparator A comparison function
   * @returns `"equal"`, `"less"` or `"greater"`
   */
  public cmp(
    other: Iterator<T> | Iterable<T> | RichIterator<T>,
    comparator?: Comparator<T>,
  ): ComparisonOrder {
    return comparison.cmp(this, other, comparator);
  }

  /**
   * Consume the iterator and get the maximum value from it
   * @param comparisonFn A comparison function
   * @returns Option<T> Either `Some` with the maximum value from the iterator, or `None` if the iterator is empty
   */
  public max(comparisonFn: Comparator<T>): Option<T> {
    return comparison.max(this, comparisonFn);
  }

  /**
   * Consume the iterator and get the minimum value from it
   * @param comparisonFn A comparison function
   * @returns Option<T> Either `Some` with the minimum value from the iterator, or `None` if the iterator is empty
   */
  public min(comparisonFn: Comparator<T>): Option<T> {
    return comparison.min(this, comparisonFn);
  }

  /**
   * Fold the iterator into an initial value. If the iterator is empty, that value is returned. Otherwise, the reducer
   * function is called on each value in turn, passing the result of that function call to the next one.
   * @param initialValue The initial value passed to the reducer on the first function call
   * @param reducer A function that takes an accumulator and a new value from the iterator and returns the new accumulator
   * @returns The final accumulator value
   * @typeparam U The type of the initial value and both the the accumulator value passed to the reducer and the return value
   * of the reducer
   */
  public fold<U>(initialValue: U, reducer: (accumulator: U, value: T) => U): U {
    return consume.fold(this, initialValue, reducer);
  }

  /**
   * Fold the iterator into an initial value like {@linkcode RichIterator.prototype.fold} but in a fallible way. The return value of each
   * reducer call gives a `Result<U, E>`. If the Result is `Err`, `tryFold` short-circuits and returns that `Err` value.
   * Otherwise, the `Ok` value is passed to the next reducer call.
   * @param initialValue U The initial value passed to the reducer on the first function call
   * @param reducer A function that takes an accumulator and a new value from the iterator and returns a `Result` of either
   * a new value or an error
   * @returns A `Result<U, E>` where `U` is the result of the last reducer call or `E` is the first error encountered
   * @typeparam U The type of the initial value and the argument to the reducer function, and the `Ok` branch of the return
   * value of the reducer and `tryFold` itself
   * @typeparam E The type of the error returned by the reducer function
   */
  public tryFold<U, E>(
    initialValue: U,
    reducer: (accumulator: U, value: T) => Result<U, E>,
  ): Result<U, E> {
    return consume.tryFold(this, initialValue, reducer);
  }

  /**
   * Reduce the iterator with the first item being used as the initial value. If the iterator is empty, returns `None`. Otherwise,
   * calls the `reducer` function on each item in the iterator, passing an accumulator value along, and returns the final value as
   * `Some`.
   * @param reducer A reducer function that takes an accumulator value and a new value from the iterator and returns a new
   * accumulator value
   * @returns An `Option` of either `None` if the iterator is empty or `Some<T>` with the result of the final function call
   */
  public reduce(
    reducer: (accumulator: T, value: T) => T,
  ): Option<T> {
    return consume.reduce(this, reducer);
  }

  /**
   * Reducer the iterator with the first item being used as the initial value, but in a fallible way.
   *
   * If the iterator is empty, returns `None`.
   *
   * Then a reducer function is called on each item in the array.
   *
   * If an `Err` is returned from any reducer function, return that error as `Some(Err(error))`.
   *
   * Otherwise, return the last value as `Some(Ok(value))`.
   * @param reducer A function that takes an accumulator value and a new item from the iterator and returns a new accumulator
   * value
   * @returns `Option<Result<T, E>>`: `None` if the iterator is empty, `Some(Err())` if an error was encountered, otherwise
   * `Some(Ok(value))`.
   */
  public tryReduce<E>(
    reducer: (accumulator: T, value: T) => Result<T, E>,
  ): Option<Result<T, E>> {
    return consume.tryReduce(this, reducer);
  }

  /**
   * Call a function on each item in the iterator and discard the result of the function. Used as the end of a chain of
   * operations.
   *
   * Consumes the iterator. Equivalent to calling `for..of` on the iterator.
   * @param callback A function to call on each item in the iterator
   * @returns
   */
  public forEach(callback: (value: T) => void): void {
    return consume.forEach(this, callback);
  }

  /**
   * Call a function on each item on the iterator. The function must return a `Result<void, E>`. If an error is encountered,
   * that error is returned as `Err`. Otherwise, `Ok<void>` is returned.
   *
   * Consumes the iterator. Equivalent to calling `for..of` on the iterator but allowing `break`.
   * @param callback A function that takes a value from the iterator and returns `Ok(void)` or `Err`.
   * @returns `Result<void, E>`: `Ok()` if no errors were encountered, otherwise the first error as `Err`
   * @typedef E The error type of the callback
   */
  public tryForEach<E>(
    callback: (value: T) => Result<void, E>,
  ): Result<void, E> {
    return consume.tryForEach(this, callback);
  }

  /**
   * Advance the iterator by `limit` items and discard them. If this is successful, `Ok()` is returned. If the iterator
   * is exhausted before `limit` steps are taken, `Err` is returned with the number of steps remaining as the error value
   * @param limit How many items to advance by
   * @returns `Ok()` if successful, otherwise `Err(num)` where `num` is the number of steps remaining when the iterator
   * was exhausted
   */
  public advanceBy(limit: number): Result<void, number> {
    return consume.advanceBy(this, limit);
  }

  /**
   * Get a chunk of `size` items from the iterator. If successful, return that as `Ok`. If the iterator is exhausted before
   * a full chunk is returned, get the partial chunk as `Err`.
   * @param size The number of items to get in the chunk
   * @returns A `Result` where the `Ok` branch is a chunk of `size` items, and the `Err` branch is a chunk of less than `size`
   * items
   */
  public nextChunk(size: number): Result<T[], T[]> {
    return consume.nextChunk(this, size);
  }

  /**
   * Consume the iterator and return the number of items in it
   * @returns The number of items in the iterator
   */
  public count(): number {
    return consume.count(this);
  }

  /**
   * Test every item in the iterator. If any item returns `true`, return `true` immediately. Otherwise, return `false`.
   *
   * Consumes the iterator
   * @param predicate A function that takes the item and returns a boolean value
   * @returns `true` if any item in the iterator passes the predicate, otherwise `false`
   */
  public some(predicate: (value: T) => boolean): boolean {
    return search.someImpl(this, predicate);
  }

  /**
   * Test every item in the iterator. If every item returns `true`, return `true`. If any item returns `false`,
   * return `false` immediately.
   * @param predicate A function that takes the item and returns a boolean value
   * @returns `true` if every item in the iterator passes the predicate, otherwise `false`
   */
  public every(predicate: (value: T) => boolean): boolean {
    return search.every(this, predicate);
  }

  /**
   * Search the iterator for the first value that passes a predicate and return it as `Some`. If no item is found, returns `None`.
   * Consumes the iterator.
   * @param predicate A function that returns `true` if the item is found, otherwise `false`.
   * @returns `Option<T>` `Some` if the item is found, otherwise `None`
   * @typeparam S If the predicate is a typeguard for a type `S`, the `Option` returned will be `Option<S>`
   */
  public find<S extends T>(
    predicate: (value: T) => value is S,
  ): Option<S>;
  public find(
    predicate: (value: T) => boolean,
  ): Option<T>;
  public find(
    predicate: (value: T) => boolean,
  ): Option<T> {
    return search.find(this, predicate);
  }

  /**
   * Search the iterator for the first value. Apply a function to each item and return it as `Option<U>`. If `Some` is returned,
   * return that `Some`. If applying the mapper function to every items in the iterator gives `None`, return `None`. Consumes the iterator.
   * @param mapper A function that takes a value from the iterator and returns `Option<U>`
   * @returns `Some` if any value is found, otherwise `None`
   */
  public findMap<U>(mapper: (value: T) => Option<U>): Option<U> {
    return search.findMap(this, mapper);
  }

  /**
   * Apply a function to each item in the iterator. The first time `true` is returned by that function, return that item's position
   * in the iterator (`0`-based) as `Some`. If no item passes the predicate, return `None`. Consumes the iterator.
   * @param predicate A function that takes an item from the iterator and returns a boolean value for it
   * @returns `Some(num)` if an item is found, where `num` is the item's position in the iterator. Otherwise, `None`
   */
  public position(predicate: (value: T) => boolean): Option<number> {
    return search.position(this, predicate);
  }

  /**
   * Get the last item from the iterator. Consumes the iterator,
   * @returns The last item yielded by the iterator as `Some`. If the iterator is empty, `None`.
   */
  public last(): Option<T> {
    return search.last(this);
  }

  /**
   * Get the nth item from the iterator. Consumes the iterator up to that point.
   * @param position The position of the element to select
   * @returns `Some()` if the element is present, otherwise `None`
   */
  public nth(position: number): Option<T> {
    return search.nth(this, position);
  }

  /**
   * Consume the iterator and divide its contents into two based on a predicate.
   * @param predicate The test function to run on each item in the iterator
   * @returns A tuple where the first element is an array of items that pass the predicate and the second element is an array
   * of items that fail the predicate.
   * @typeparam S If the predicate is a type-guard on a type `S`, the first element in the returned tuple is `S[]` and the second is
   * `Exclude<T, S>`, so elements of `T` that are not `S`.
   */
  public partition<S extends T>(
    predicate: (value: T) => value is S,
  ): [S[], Exclude<T, S>[]];
  public partition(predicate: (value: T) => boolean): [T[], T[]];
  public partition(predicate: (value: T) => boolean): [T[], T[]] {
    return search.partition(this, predicate);
  }

  /**
   * Take an iterator that is the return type of {@linkcode RichIterator.prototype.zip} and divide it into two arrays.
   * @returns A tuple of arrays, the first being the first element in each pair and the second array being the second element in
   * each pair
   * @typeparam U The type of the first element in each pair
   * @typeparam V The type of the second element in each pair
   * @example
   * ```typescript
   * const range = function* () {
   *   for (let i = 0; i < 5; i++) yield i;
   * };
   * const letters = function* () {
   *   yield "a";
   *   yield "b";
   *   yield "c";
   * };
   * const zipped = RichIterator.from(range()).zip(letters());
   * const unzipped = zipped.unzip(); // [[0, 1, 2], ["a", "b", "c"]]
   * ```
   */
  public unzip<U, V>(this: RichIterator<readonly [U, V]>): [U[], V[]] {
    return search.unzip(this);
  }

  /**
   * Calculate the product of the iterator, i.e. multiply all the elements together. Each element is converted to a `number`. If
   * this fails (i.e. the conversion produces `NaN`), return `Err(TypeError)`. If it is successful, returns `Ok(number)`.
   * @returns `Ok(number)` if the operation is successful, otherwise `Err(TypeError)`.
   */
  public product(): Result<number, TypeError> {
    return numeric.product(this);
  }

  /**
   * Calculate the sum of the iterator, i.e. add all the elements together. Each element is converted to a `number`. If
   * this fails (i.e. the conversion produces `NaN`), return `Err(TypeError)`. If it is successful, returns `Ok(number)`.
   * @returns `Ok(number)` if the operation is successful, otherwise `Err(TypeError)`.
   */
  public sum(): Result<number, TypeError> {
    return numeric.sum(this);
  }

  /**
   * Calculate the product of the iterator, i.e. multiply all the elements together. Each element is converted to a `number`.
   * No checks for `NaN` are done, so if any item does not convert to a number, the result will be `NaN`.
   * @returns `number` The product of all the elements in the iterator
   */
  public productUnchecked(): number {
    return numeric.productUnchecked(this);
  }

  /**
   * Calculate the sum of the iterator, i.e. add all the elements together. Each element is converted to a `number`.
   * No checks for `NaN` are done, so if any item does not convert to a number, the result will be `NaN`.
   * @returns `number` The sum of all the elements in the iterator
   */
  public sumUnchecked(): number {
    return numeric.sumUnchecked(this);
  }
}
