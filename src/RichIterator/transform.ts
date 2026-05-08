import { RichIterator } from "./RichIterator.ts";
import { err, ok, type Option, type Result } from "@sck/optres";
import { asIterable, toIterator } from "./utilities.ts";

export function map<T, U>(
  iterator: RichIterator<T>,
  mapper: (value: T, index: number) => U,
): RichIterator<U> {
  let index = 0;

  return new RichIterator(
    function* mapGenerator(): Generator<U, undefined, unknown> {
      for (const value of asIterable(iterator)) {
        yield mapper(value, index++);
      }
    }(),
  );
}

export function tryMap<T, E, U>(
  iterator: RichIterator<T>,
  mapper: (value: T) => Result<U, E>,
): Result<U[], E> {
  return iterator.tryFold<U[], E>(
    [],
    (accumulator, value) =>
      mapper(value).map((mapped) => {
        accumulator.push(mapped);
        return accumulator;
      }),
  );
}

export function filter<T, S extends T>(
  iterator: RichIterator<T>,
  predicate: (value: T, index: number) => value is S,
): RichIterator<S>;
export function filter<T>(
  iterator: RichIterator<T>,
  predicate: (value: T, index: number) => boolean,
): RichIterator<T>;
export function filter<T>(
  iterator: RichIterator<T>,
  predicate: (value: T, index: number) => boolean,
): RichIterator<T> {
  return new RichIterator(
    function* filterGenerator(): Generator<T, undefined, unknown> {
      let index = 0;
      for (const value of asIterable(iterator)) {
        if (predicate(value, index++)) {
          yield value;
        }
      }
    }(),
  );
}

export function take<T>(
  iterator: RichIterator<T>,
  limit: number,
): RichIterator<T> {
  if (!Number.isInteger(limit) || limit < 0) {
    throw new RangeError();
  }

  return new RichIterator(
    function* takeGenerator(): Generator<T, undefined, unknown> {
      let taken = 0;

      while (taken < limit) {
        const { done, value } = iterator.next();

        if (done) {
          break;
        }

        yield value;
        taken++;
      }
    }(),
  );
}

export function drop<T>(
  iterator: RichIterator<T>,
  count: number,
): RichIterator<T> {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError();
  }

  return new RichIterator(
    function* dropGenerator(): Generator<T, undefined, unknown> {
      for (let i = 0; i < count; i++) {
        if (iterator.next().done) {
          return;
        }
      }

      yield* asIterable(iterator);
    }(),
  );
}

export function dropWhile<T>(
  iterator: RichIterator<T>,
  predicate: (value: T) => boolean,
): RichIterator<T> {
  return new RichIterator(
    function* dropWhileGenerator(): Generator<T, undefined, unknown> {
      let skipping = true;

      while (skipping) {
        const { done, value } = iterator.next();
        if (done) {
          return;
        }

        if (!predicate(value)) {
          yield value;
          skipping = false;
        }
      }

      yield* asIterable(iterator);
    }(),
  );
}

export function takeWhile<T>(
  iterator: RichIterator<T>,
  predicate: (value: T) => boolean,
): RichIterator<T> {
  return new RichIterator(
    function* takeWhileGenerator(): Generator<T, undefined, unknown> {
      let result = iterator.next();

      while (!result.done && predicate(result.value)) {
        yield result.value;
        result = iterator.next();
      }
    }(),
  );
}

export function flatMap<T, U>(
  iterator: RichIterator<T>,
  mapper: (
    value: T,
    index: number,
  ) => Iterator<U, unknown, unknown> | Iterable<U> | RichIterator<U>,
): RichIterator<U> {
  return new RichIterator(
    function* flatMapGenerator(): Generator<U, undefined, unknown> {
      let index = 0;
      for (const value of asIterable(iterator)) {
        yield* asIterable(RichIterator.from(mapper(value, index++)));
      }
    }(),
  );
}

export function chain<T>(
  iterator: RichIterator<T>,
  other: Iterator<T> | Iterable<T> | RichIterator<T>,
): RichIterator<T> {
  const otherIterator = RichIterator.from(other);

  return new RichIterator(
    function* chainGenerator(): Generator<T, undefined, unknown> {
      yield* asIterable(iterator);
      yield* asIterable(otherIterator);
    }(),
  );
}

export function filterMap<T, U>(
  iterator: RichIterator<T>,
  mapper: (value: T) => Option<U>,
): RichIterator<U> {
  return new RichIterator(
    function* filterMapGenerator(): Generator<U, undefined, unknown> {
      for (const item of asIterable(iterator)) {
        for (const value of mapper(item)) {
          yield value;
        }
      }
    }(),
  );
}

export function intersperseWith<T>(
  iterator: RichIterator<T>,
  separatorFn: () => T,
): RichIterator<T> {
  return new RichIterator(
    function* intersperseWithGenerator(): Generator<T, undefined, unknown> {
      const { done, value: firstValue } = iterator.next();

      if (done) {
        return;
      }

      yield firstValue;

      for (const value of asIterable(iterator)) {
        yield separatorFn();
        yield value;
      }
    }(),
  );
}

export function intersperse<T>(
  iterator: RichIterator<T>,
  separator: T,
): RichIterator<T> {
  return intersperseWith(iterator, () => separator);
}

export function mapWhile<T, U>(
  iterator: RichIterator<T>,
  mapper: (value: T) => Option<U>,
): RichIterator<U> {
  return new RichIterator(
    function* mapWhileGenerator(): Generator<U, undefined, unknown> {
      for (const value of asIterable(iterator)) {
        const result = mapper(value);

        if (result.isSome()) {
          yield result.unwrap();
        } else {
          return;
        }
      }
    }(),
  );
}

export function chunks<T>(
  iterator: RichIterator<T>,
  size: number,
): RichIterator<Result<T[], T[]>> {
  if (!Number.isInteger(size) || size <= 0) {
    throw new RangeError(`size must be greater than 0, given ${size}.`);
  }

  const iterable = asIterable(iterator);

  return new RichIterator(
    function* chunksGenerator() {
      let cache: T[] = [];

      for (const value of iterable) {
        cache.push(value);

        if (cache.length === size) {
          yield ok(cache);
          cache = [];
        }
      }

      if (cache.length > 0) {
        yield err(cache);
      }
    }(),
  );
}

export function zip<T, U>(
  thisIterator: RichIterator<T>,
  other: Iterator<U> | Iterable<U> | RichIterator<U>,
): RichIterator<[T, U]> {
  const otherIterator = toIterator(other);

  return new RichIterator(
    function* zipGenerator(): Generator<[T, U], undefined, unknown> {
      while (true) {
        const thisResult = thisIterator.next();
        if (thisResult.done) {
          return;
        }

        const otherResult = otherIterator.next();
        if (otherResult.done) {
          return;
        }

        yield [thisResult.value, otherResult.value];
      }
    }(),
  );
}

export function zipWith<T, U, R>(
  thisIterator: RichIterator<T>,
  other: Iterable<U> | Iterator<U> | RichIterator<U>,
  zipper: (left: T, right: U) => R,
): RichIterator<R> {
  return zip(thisIterator, other).map(([left, right]) => zipper(left, right));
}

export function flatten<T>(
  thisIterator: RichIterator<Iterator<T> | Iterable<T>>,
): RichIterator<T> {
  return thisIterator.flatMap((inner) => inner);
}

export function inspect<T>(
  iterator: RichIterator<T>,
  inspector: (value: T) => void,
): RichIterator<T> {
  return new RichIterator(
    function* inspectGenerator(): Generator<T, undefined, unknown> {
      for (const value of asIterable(iterator)) {
        inspector(value);
        yield value;
      }
    }(),
  );
}

export function toResult<T, E>(
  iterator: RichIterator<Result<T, E>>,
): Result<T[], E> {
  return iterator.tryMap((val) => val);
}

export function toOption<T>(
  iterator: RichIterator<Option<T>>,
): Option<T[]> {
  return iterator.tryMap((val) => val.okOr(undefined)).ok();
}
