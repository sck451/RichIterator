import { RichIterator } from "./RichIterator.ts";
import { err, ok, type Result } from "@sck/optres";

export function product<T>(
  iterator: RichIterator<T>,
): Result<number, TypeError> {
  return iterator.tryFold(1, (acc, val) => {
    const value = Number(val);
    if (Number.isNaN(value)) {
      return err(new TypeError(`Cannot convert "${val}" to a number`));
    }
    return ok(acc * value);
  });
}

export function sum<T>(iterator: RichIterator<T>): Result<number, TypeError> {
  return iterator.tryFold(0, (acc, val) => {
    const value = Number(val);

    if (Number.isNaN(value)) {
      return err(new TypeError(`Cannot convert "${val}" to a number`));
    }

    return ok(acc + value);
  });
}
