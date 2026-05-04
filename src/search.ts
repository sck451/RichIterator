import type { RichIterator } from "./RichIterator.ts";
import { none, type Option, some } from "@sck/optres";
import { asIterable } from "./utilities.ts";

export function find<T, S extends T>(
  iterator: RichIterator<T>,
  predicate: (value: T) => value is S,
): Option<S>;
export function find<T>(
  iterator: RichIterator<T>,
  predicate: (value: T) => boolean,
): Option<T>;
export function find<T>(
  iterator: RichIterator<T>,
  predicate: (value: T) => boolean,
): Option<T> {
  for (const value of asIterable(iterator)) {
    if (predicate(value)) {
      return some(value);
    }
  }
  return none();
}

export function findMap<T, U>(
  iterator: RichIterator<T>,
  mapper: (value: T) => Option<U>,
): Option<U> {
  for (const value of asIterable(iterator)) {
    const result = mapper(value);

    if (result.isSome()) {
      return result;
    }
  }

  return none();
}

export function position<T>(
  iterator: RichIterator<T>,
  predicate: (value: T) => boolean,
): Option<number> {
  let index = 0;
  for (const value of asIterable(iterator)) {
    if (predicate(value)) {
      return some(index);
    }
    index++;
  }
  return none();
}

export function last<T>(iterator: RichIterator<T>): Option<T> {
  return iterator.reduce((_, value) => value);
}

export function nth<T>(
  iterator: RichIterator<T>,
  position: number,
): Option<T> {
  return iterator.advanceBy(position).match({
    Ok: () => iterator.nextOption(),
    Err: () => none(),
  });
}

export function partition<T, S extends T>(
  iterator: RichIterator<T>,
  predicate: (value: T) => value is S,
): [S[], Exclude<T, S>[]];
export function partition<T>(
  iterator: RichIterator<T>,
  predicate: (value: T) => boolean,
): [T[], T[]];
export function partition<T>(
  iterator: RichIterator<T>,
  predicate: (value: T) => boolean,
): [T[], T[]] {
  const left: T[] = [];
  const right: T[] = [];

  for (const value of asIterable(iterator)) {
    if (predicate(value)) {
      left.push(value);
    } else {
      right.push(value);
    }
  }

  return [left, right];
}

export function unzip<T, U>(
  iterator: RichIterator<readonly [T, U]>,
): [T[], U[]] {
  const left: T[] = [];
  const right: U[] = [];

  for (const [lValue, rValue] of asIterable(iterator)) {
    left.push(lValue);
    right.push(rValue);
  }

  return [left, right];
}

export function someImpl<T>(
  iterator: RichIterator<T>,
  predicate: (value: T) => boolean,
): boolean {
  for (const value of asIterable(iterator)) {
    if (predicate(value)) {
      return true;
    }
  }
  return false;
}

export function every<T>(
  iterator: RichIterator<T>,
  predicate: (value: T) => boolean,
): boolean {
  for (const value of asIterable(iterator)) {
    if (!predicate(value)) {
      return false;
    }
  }
  return true;
}
