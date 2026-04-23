import { none, Option, some } from "@sck/optres";
import { RichIterator } from "../src/RichIterator.ts";
import { asIterable, toIterator } from "../src/utilities.ts";

export type Order = "less" | "equal" | "greater";

export type Comparator<T> = (a: T, b: T) => number;

export function getDefaultComparator<T>(): Comparator<T> {
  return (a: T, b: T) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  };
}

export function cmp<T>(
  thisIterator: RichIterator<T>,
  otherIterator: RichIterator<T> | Iterator<T> | Iterable<T>,
  comparator?: Comparator<T>,
): Order {
  otherIterator = toIterator(otherIterator);

  const comparisonFn = comparator ?? getDefaultComparator();

  while (true) {
    const thisResult = thisIterator.next();
    const otherResult = otherIterator.next();

    if (thisResult.done && otherResult.done) {
      return "equal";
    }

    if (thisResult.done) {
      return "less";
    }

    if (otherResult.done) {
      return "greater";
    }

    const order = comparisonFn(thisResult.value, otherResult.value);
    if (order < 0) {
      return "less";
    }
    if (order > 0) {
      return "greater";
    }
  }
}

export function eqBy<T, U>(
  thisIterator: RichIterator<T>,
  otherIterator: Iterator<U> | Iterable<U> | RichIterator<U>,
  comparison: (left: T, right: U) => boolean,
): boolean {
  otherIterator = toIterator(otherIterator);

  while (true) {
    const thisResult = thisIterator.next();
    const otherResult = otherIterator.next();

    if (thisResult.done) {
      if (otherResult.done) {
        return true;
      }

      return false;
    }

    if (otherResult.done) {
      return false;
    }

    if (!comparison(thisResult.value, otherResult.value)) {
      return false;
    }
  }
}

export function lt<T>(
  thisIterator: RichIterator<T>,
  other: Iterator<T> | Iterable<T>,
  comparator?: Comparator<T>,
): boolean {
  const result = comparator === undefined
    ? cmp(thisIterator, other)
    : cmp(thisIterator, other, comparator);
  return result === "less";
}

export function le<T>(
  thisIterator: RichIterator<T>,
  other: Iterator<T> | Iterable<T>,
  comparator?: Comparator<T>,
): boolean {
  const result = comparator === undefined
    ? cmp(thisIterator, other)
    : cmp(thisIterator, other, comparator);
  return result !== "greater";
}

export function gt<T>(
  thisIterator: RichIterator<T>,
  other: Iterator<T> | Iterable<T>,
  comparator?: Comparator<T>,
): boolean {
  const result = comparator === undefined
    ? cmp(thisIterator, other)
    : cmp(thisIterator, other, comparator);
  return result === "greater";
}

export function ge<T>(
  thisIterator: RichIterator<T>,
  other: Iterator<T> | Iterable<T>,
  comparator?: Comparator<T>,
): boolean {
  const result = comparator === undefined
    ? cmp(thisIterator, other)
    : cmp(thisIterator, other, comparator);
  return result !== "less";
}

export function max<T>(
  iterator: RichIterator<T>,
  comparison: Comparator<T>,
): Option<T> {
  const first = iterator.next();

  if (first.done) {
    return none();
  }

  let maximum = first.value;

  for (const value of asIterable(iterator)) {
    if (comparison(value, maximum) > 0) {
      maximum = value;
    }
  }

  return some(maximum);
}

export function min<T>(
  iterator: RichIterator<T>,
  comparison: Comparator<T>,
): Option<T> {
  const first = iterator.next();

  if (first.done) {
    return none();
  }

  let minimum = first.value;

  for (const value of asIterable(iterator)) {
    if (comparison(value, minimum) < 0) {
      minimum = value;
    }
  }

  return some(minimum);
}
