import { type Option, type Result } from "@sck/optres";
import * as comparison from "./comparison.ts";
import { asIterable, toIterator } from "./utilities.ts";
import * as transform from "./transform.ts";
import * as consume from "./consume.ts";
import * as search from "./search.ts";
import * as numeric from "./numeric.ts";

export class RichIterator<T, TReturn = unknown> {
  private readonly source: Iterator<T, TReturn, unknown>;

  public constructor(source: Iterator<T, TReturn> | Iterable<T>) {
    this.source = toIterator(source);
  }

  public static from<T, TReturn = unknown>(
    source: Iterator<T, TReturn> | Iterable<T>,
  ): RichIterator<T, TReturn> {
    return new RichIterator(source);
  }

  public next(...args: [] | [unknown]): IteratorResult<T, TReturn> {
    if (args.length === 0) {
      return this.source.next();
    }
    return this.source.next(args[0]);
  }

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

  public throw(e?: unknown): IteratorResult<T, TReturn> {
    if (typeof this.source.throw === "function") {
      return this.source.throw(e);
    }

    throw e;
  }

  public [Symbol.iterator](): RichIterator<T, TReturn> {
    return this;
  }

  get [Symbol.toStringTag]() {
    return "RichIterator";
  }

  public [Symbol.dispose](): void {
    if (typeof this.source.return === "function") {
      this.source.return();
    }
  }
  public asNative(): IteratorObject<T> {
    return Iterator.from<T>(this);
  }

  public toArray(): T[] {
    return Array.from(asIterable(this));
  }

  public enumerate(): RichIterator<[number, T]> {
    let index = 0;
    return this.map((val): [number, T] => [index++, val]);
  }

  public map<U>(
    mapper: (value: T) => U,
  ): RichIterator<U> {
    return transform.map(this, mapper);
  }

  public tryMap<U, E>(mapper: (value: T) => Result<U, E>): Result<U[], E> {
    return transform.tryMap(this, mapper);
  }

  public mapWhile<U>(mapper: (value: T) => Option<U>): RichIterator<U> {
    return transform.mapWhile(this, mapper);
  }

  public filter<S extends T>(
    predicate: (value: T) => value is S,
  ): RichIterator<S>;
  public filter(
    predicate: (value: T) => unknown,
  ): RichIterator<T>;
  public filter(
    predicate: (value: T) => unknown,
  ): RichIterator<T> {
    return transform.filter(this, predicate);
  }

  public take(limit: number): RichIterator<T> {
    return transform.take(this, limit);
  }

  public drop(count: number): RichIterator<T> {
    return transform.drop(this, count);
  }

  public dropWhile(predicate: (value: T) => boolean): RichIterator<T> {
    return transform.dropWhile(this, predicate);
  }

  public takeWhile(predicate: (value: T) => boolean): RichIterator<T> {
    return transform.takeWhile(this, predicate);
  }

  public flatMap<U>(
    mapper: (
      value: T,
    ) => Iterator<U, unknown, unknown> | Iterable<U>,
  ): RichIterator<U> {
    return transform.flatMap(this, mapper);
  }

  public flatten<U>(
    this: RichIterator<Iterator<U> | Iterable<U>>,
  ): RichIterator<U> {
    return transform.flatten(this);
  }

  public inspect(inspector: (value: T) => void): RichIterator<T> {
    return transform.inspect(this, inspector);
  }

  public toResult<U, E>(this: RichIterator<Result<U, E>>): Result<U[], E> {
    return transform.toResult(this);
  }

  public toOption<U>(this: RichIterator<Option<U>>): Option<U[]> {
    return transform.toOption(this);
  }

  public chunks(size: number): RichIterator<T[], T[]> {
    return transform.chunks(this, size);
  }

  public chain(
    other: Iterator<T> | Iterable<T>,
  ): RichIterator<T> {
    return transform.chain(this, other);
  }

  public filterMap<U>(mapper: (value: T) => Option<U>): RichIterator<U> {
    return transform.filterMap(this, mapper);
  }

  public zip<U>(other: Iterator<U> | Iterable<U>): RichIterator<[T, U]> {
    return transform.zip(this, other);
  }

  public zipWith<U, R>(
    other: Iterable<U> | Iterator<U>,
    zipper: (left: T, right: U) => R,
  ): RichIterator<R> {
    return transform.zipWith(this, other, zipper);
  }

  public intersperse(separator: T): RichIterator<T> {
    return transform.intersperse(this, separator);
  }

  public intersperseWith(separatorFn: () => T): RichIterator<T> {
    return transform.intersperseWith(this, separatorFn);
  }

  public eq(other: Iterator<T> | Iterable<T>): boolean {
    return this.eqBy(other, Object.is);
  }

  public eqBy<U>(
    other: Iterator<U> | Iterable<U>,
    comparisonFn: (left: T, right: U) => boolean,
  ): boolean {
    return comparison.eqBy(this, other, comparisonFn);
  }

  public ne(other: Iterator<T> | Iterable<T>): boolean {
    return !this.eq(other);
  }

  public lt(
    other: Iterator<T> | Iterable<T>,
    comparator?: comparison.Comparator<T>,
  ): boolean {
    return comparison.lt(this, other, comparator);
  }

  public le(
    other: Iterator<T> | Iterable<T>,
    comparator?: comparison.Comparator<T>,
  ): boolean {
    return comparison.le(this, other, comparator);
  }

  public gt(
    other: Iterator<T> | Iterable<T>,
    comparator?: comparison.Comparator<T>,
  ): boolean {
    return comparison.gt(this, other, comparator);
  }

  public ge(
    other: Iterator<T> | Iterable<T>,
    comparator?: comparison.Comparator<T>,
  ): boolean {
    return comparison.ge(this, other, comparator);
  }

  public cmp(
    other: Iterator<T> | Iterable<T>,
    comparator?: comparison.Comparator<T>,
  ): comparison.Order {
    return comparison.cmp(this, other, comparator);
  }

  public max(comparisonFn: comparison.Comparator<T>): Option<T> {
    return comparison.max(this, comparisonFn);
  }

  public min(comparisonFn: comparison.Comparator<T>): Option<T> {
    return comparison.min(this, comparisonFn);
  }

  public fold<U>(initialValue: U, reducer: (accumulator: U, value: T) => U): U {
    return consume.fold(this, initialValue, reducer);
  }

  public tryFold<U, E>(
    initialValue: U,
    reducer: (accumulator: U, value: T) => Result<U, E>,
  ): Result<U, E> {
    return consume.tryFold(this, initialValue, reducer);
  }

  public reduce(
    reducer: (accumulator: T, value: T) => T,
  ): Option<T> {
    return consume.reduce(this, reducer);
  }

  public tryReduce<E>(
    reducer: (accumulator: T, value: T) => Result<T, E>,
  ): Option<Result<T, E>> {
    return consume.tryReduce(this, reducer);
  }

  public forEach(callback: (value: T) => void): void {
    return consume.forEach(this, callback);
  }

  public tryForEach<E>(
    callback: (value: T) => Result<void, E>,
  ): Result<void, E> {
    return consume.tryForEach(this, callback);
  }

  public advanceBy(limit: number): Result<void, number> {
    return consume.advanceBy(this, limit);
  }

  public nextChunk(size: number): Result<T[], T[]> {
    return consume.nextChunk(this, size);
  }

  public count(): number {
    return consume.count(this);
  }

  public some(predicate: (value: T) => unknown): boolean {
    return search.someImpl(this, predicate);
  }

  public every(predicate: (value: T) => unknown): boolean {
    return search.every(this, predicate);
  }

  public find<S extends T>(
    predicate: (value: T) => value is S,
  ): Option<S>;
  public find(
    predicate: (value: T) => unknown,
  ): Option<T>;
  public find(
    predicate: (value: T) => unknown,
  ): Option<T> {
    return search.find(this, predicate);
  }

  public findMap<U>(mapper: (value: T) => Option<U>): Option<U> {
    return search.findMap(this, mapper);
  }

  public position(predicate: (value: T) => boolean): Option<number> {
    return search.position(this, predicate);
  }

  public last(): Option<T> {
    return search.last(this);
  }

  public nth(position: number): Option<T> {
    return search.nth(this, position);
  }

  public partition<S extends T>(
    predicate: (value: T) => value is S,
  ): [S[], Exclude<T, S>[]];
  public partition(predicate: (value: T) => boolean): [T[], T[]];
  public partition(predicate: (value: T) => boolean): [T[], T[]] {
    return search.partition(this, predicate);
  }

  public unzip<U, V>(this: RichIterator<readonly [U, V]>): [U[], V[]] {
    return search.unzip(this);
  }

  public product(): Result<number, TypeError> {
    return numeric.product(this);
  }

  public sum(): Result<number, TypeError> {
    return numeric.sum(this);
  }

  public productUnchecked(): number {
    return numeric.productUnchecked(this);
  }

  public sumUnchecked(): number {
    return numeric.sumUnchecked(this);
  }
}
