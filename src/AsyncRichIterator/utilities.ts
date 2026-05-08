import { AsyncRichIterator, type RichIterator } from "@sck/richiterator";

export type IteratorKind<T> =
  | Iterator<T>
  | Iterable<T>
  | RichIterator<T>
  | AsyncRichIterator<T>
  | AsyncIterable<T>
  | AsyncIterator<T>;

export function iteratorToAsync<T>(
  iterator: IteratorKind<T>,
): AsyncRichIterator<T> {
  if (iterator instanceof AsyncRichIterator) {
    return iterator;
  }

  if (isAsyncIterable<T>(iterator)) {
    return AsyncRichIterator.from(iterator);
  }

  if (isAsyncIterator<T>(iterator)) {
    return AsyncRichIterator.from({
      [Symbol.asyncIterator]: () => iterator,
    });
  }

  if (isIterable<T>(iterator)) {
    return AsyncRichIterator.from(iterator);
  }

  throw new TypeError("Value is not an iterator or iterable");
}

export function isYieldable<T>(
  value: unknown,
): value is AsyncIterable<T> | Iterable<T> {
  return isAsyncIterable(value) || isIterable(value);
}

export function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    Symbol.asyncIterator in value &&
    typeof (value as AsyncIterable<T>)[Symbol.asyncIterator] === "function"
  );
}

// Note that sync iterators also pass this test, but that's always fine
export function isAsyncIterator<T>(value: unknown): value is AsyncIterator<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "next" in value &&
    typeof (value as AsyncIterator<T>).next === "function"
  );
}

export function isIterable<T>(value: unknown): value is Iterable<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    Symbol.iterator in value &&
    typeof (value as Iterable<T>)[Symbol.iterator] === "function"
  );
}

export function hasMethod<TMethod extends PropertyKey>(
  object: unknown,
  method: TMethod,
): object is Record<TMethod, (...args: never[]) => unknown> {
  if (typeof object !== "object" || object === null) {
    return false;
  }

  if (!(method in object)) {
    return false;
  }

  const record = object as Record<PropertyKey, unknown>;

  return typeof record[method] === "function";
}

export function bareIteratorToAsyncIterable<T, TReturn = unknown>(
  source: Iterator<T, TReturn> | AsyncIterator<T, TReturn>,
): AsyncGenerator<T, TReturn> {
  return (async function* () {
    let result = await source.next();

    while (!result.done) {
      yield result.value;
      result = await source.next();
    }

    return result.value;
  }());
}
