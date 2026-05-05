import type { Option } from "@sck/optres";
import { RichIterator } from "./RichIterator.ts";

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
  comparisonIterator: RichIterator<T> | Iterator<T> | Iterable<T>,
  comparator?: Comparator<T>,
): Order {
  const otherIterator = RichIterator.from(comparisonIterator);

  const comparisonFn = comparator ?? getDefaultComparator();

  while (true) {
    const thisResult = thisIterator.nextOption();
    const otherResult = otherIterator.nextOption();

    if (thisResult.isNone() && otherResult.isNone()) {
      return "equal";
    }

    if (thisResult.isNone()) {
      return "less";
    }

    if (otherResult.isNone()) {
      return "greater";
    }

    const order = comparisonFn(thisResult.unwrap(), otherResult.unwrap());
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
  comparisonIterator: Iterator<U> | Iterable<U> | RichIterator<U>,
  comparison: (left: T, right: U) => boolean,
): boolean {
  const otherIterator = RichIterator.from(comparisonIterator);

  while (true) {
    const thisResult = thisIterator.nextOption();
    const otherResult = otherIterator.nextOption();

    if (thisResult.isNone() || otherResult.isNone()) {
      return thisResult.isNone() === otherResult.isNone();
    }

    if (!comparison(thisResult.unwrap(), otherResult.unwrap())) {
      return false;
    }
  }
}

export function lt<T>(
  thisIterator: RichIterator<T>,
  other: Iterator<T> | Iterable<T> | RichIterator<T>,
  comparator?: Comparator<T>,
): boolean {
  return cmp(thisIterator, other, comparator) === "less";
}

export function le<T>(
  thisIterator: RichIterator<T>,
  other: Iterator<T> | Iterable<T> | RichIterator<T>,
  comparator?: Comparator<T>,
): boolean {
  return cmp(thisIterator, other, comparator) !== "greater";
}

export function gt<T>(
  thisIterator: RichIterator<T>,
  other: Iterator<T> | Iterable<T> | RichIterator<T>,
  comparator?: Comparator<T>,
): boolean {
  return cmp(thisIterator, other, comparator) === "greater";
}

export function ge<T>(
  thisIterator: RichIterator<T>,
  other: Iterator<T> | Iterable<T> | RichIterator<T>,
  comparator?: Comparator<T>,
): boolean {
  return cmp(thisIterator, other, comparator) !== "less";
}

export function max<T>(
  iterator: RichIterator<T>,
  comparison: Comparator<T>,
): Option<T> {
  return iterator.reduce((currentMaximum, value) =>
    comparison(value, currentMaximum) > 0 ? value : currentMaximum
  );
}

export function min<T>(
  iterator: RichIterator<T>,
  comparison: Comparator<T>,
): Option<T> {
  return iterator.reduce((currentMinimum, value) =>
    comparison(value, currentMinimum) < 0 ? value : currentMinimum
  );
}
