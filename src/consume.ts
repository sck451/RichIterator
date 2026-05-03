import type { RichIterator } from "./RichIterator.ts";
import { err, ok, type Option, type Result } from "@sck/optres";
import { asIterable } from "./utilities.ts";

export function fold<T, U>(
  iterator: RichIterator<T>,
  initialValue: U,
  reducer: (accumulator: U, value: T) => U,
): U {
  let accumulator = initialValue;

  for (const value of asIterable(iterator)) {
    accumulator = reducer(accumulator, value);
  }

  return accumulator;
}

export function tryFold<T, U, E>(
  iterator: RichIterator<T>,
  initialValue: U,
  reducer: (accumulator: U, value: T) => Result<U, E>,
): Result<U, E> {
  let accumulator = initialValue;
  let result = iterator.nextOption();

  while (result.isSome()) {
    const reducerResult = reducer(accumulator, result.unwrap());

    if (reducerResult.isOk()) {
      accumulator = reducerResult.unwrap();
    } else {
      return reducerResult;
    }

    result = iterator.nextOption();
  }

  return ok(accumulator);
}

export function reduce<T>(
  iterator: RichIterator<T>,
  reducer: (accumulator: T, value: T) => T,
): Option<T> {
  return iterator.nextOption().map((firstValue) => {
    let accumulator = firstValue;

    for (const value of asIterable(iterator)) {
      accumulator = reducer(accumulator, value);
    }

    return accumulator;
  });
}

export function tryReduce<T, E>(
  iterator: RichIterator<T>,
  reducer: (accumulator: T, value: T) => Result<T, E>,
): Option<Result<T, E>> {
  return iterator.nextOption().map((firstValue) => {
    let accumulator = firstValue;

    for (const value of asIterable(iterator)) {
      const result = reducer(accumulator, value);

      if (!result.isOk()) {
        return result;
      }

      accumulator = result.unwrap();
    }

    return ok(accumulator);
  });
}

export function forEach<T>(
  iterator: RichIterator<T>,
  callback: (value: T) => void,
): void {
  for (const value of asIterable(iterator)) {
    callback(value);
  }
}

export function tryForEach<T, E>(
  iterator: RichIterator<T>,
  callback: (value: T) => Result<void, E>,
): Result<void, E> {
  for (const value of asIterable(iterator)) {
    const result = callback(value);

    if (!result.isOk()) {
      return result;
    }
  }

  return ok();
}

export function advanceBy<T>(
  iterator: RichIterator<T>,
  limit: number,
): Result<void, number> {
  if (!Number.isInteger(limit) || limit < 0) {
    throw new RangeError();
  }

  let remaining = limit;

  while (remaining > 0) {
    if (iterator.nextOption().isNone()) {
      return err(remaining);
    }
    remaining--;
  }

  return ok();
}

export function nextChunk<T>(
  iterator: RichIterator<T>,
  size: number,
): Result<T[], T[]> {
  if (!Number.isInteger(size) || size <= 0) {
    throw new RangeError(`size must be greater than 0, given ${size}.`);
  }

  const chunk: T[] = [];

  while (chunk.length < size) {
    const result = iterator.nextOption();

    if (result.isNone()) {
      return err(chunk);
    }

    chunk.push(result.unwrap());
  }

  return ok(chunk);
}

export function count(iterator: RichIterator<unknown>): number {
  let count = 0;
  for (const _ of asIterable(iterator)) {
    count++;
  }
  return count;
}
