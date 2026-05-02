import type { RichIterator } from "./RichIterator.ts";
import { err, ok, type Result } from "@sck/optres";

function toNumber(n: unknown): Result<number, TypeError> {
  const converted = Number(n);

  if (Number.isNaN(converted)) {
    return err(new TypeError(`Cannot convert "${String(n)}" to a number`));
  }

  return ok(converted);
}

export function product<T>(
  iterator: RichIterator<T>,
): Result<number, TypeError> {
  return iterator.tryFold(1, (acc, entry) => {
    return toNumber(entry).map(val => acc * val);
  });
}

export function sum<T>(iterator: RichIterator<T>): Result<number, TypeError> {
  return iterator.tryFold(0, (acc, entry) => {
    return toNumber(entry).map(val => acc + val);
  });
}

export function productUnchecked<T>(
  iterator: RichIterator<T>
): number {
  return iterator.fold(1, (acc, val) => acc * Number(val));
}

export function sumUnchecked<T>(iterator: RichIterator<T>): number {
  return iterator.fold(0, (acc, val) => acc + Number(val));
}
