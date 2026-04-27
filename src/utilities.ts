import { RichIterator } from "./RichIterator.ts";

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
export type Disposable = {
  [Symbol.dispose]: () => void;
};
