import type { RichIterator } from "./RichIterator.ts";

export function toIterator<T, TReturn = undefined>(
  source: Iterator<T> | Iterable<T>,
): Iterator<T, TReturn> {
  if (isIterator<T>(source)) {
    return source;
  }

  return source[Symbol.iterator]() as Iterator<T, TReturn>;
}

export function isIterator<T>(
  value: Iterator<T> | Iterable<T>,
): value is Iterator<T> {
  return typeof (value as Iterator<T>).next === "function";
}

export function asIterable<T>(iterator: RichIterator<T>): Iterable<T> {
  return {
    *[Symbol.iterator](): Iterator<T, undefined, unknown> {
      while (true) {
        const result = iterator.next();
        if (result.done) {
          return;
        }
        yield result.value;
      }
    },
  };
}

/**
 * The type returned by {@linkcode RichIterator.prototype.cmp}.
 *
 * The possible values are `"equal"`, `"less"`, and `"greater"`
 */
export type ComparisonOrder = "less" | "equal" | "greater";

/**
 * A comparison function. This takes two values and returns a number. If the number is `0`, the values
 * are considered equal. If the number is less than `0`, the first value is less than the second. If the
 * number is greater than `0`, the first value is greater than the second.
 *
 * @typeparam T The type of the values to compare
 */
export type Comparator<T> = (a: T, b: T) => number;
