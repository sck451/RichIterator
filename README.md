# RichIterator

A powerful, composable iterator utility for TypeScript/Deno inspired by Rust’s
`Iterator` trait.

RichIterator wraps native iterators and iterables, providing a rich set of
transformation, consumption, comparison, and search operations, all lazily
evaluated where possible.

Features:

- Lazy iterator transformations (`map`, `filter`, `flatMap`, etc.)
- Functional-style chaining Rust-inspired Option and Result integration using
  [`@sck/optres](https://jsr.io/@sck/optres)
- Advanced utilities (`zip`, `chunks`, `partition`, `enumerate`, etc.)
- Safe and unsafe numeric operations
- Full iterator consumption APIs (`fold`, `reduce`, `sum`, etc.)
- Comparison and ordering operations
- Works with both `Iterator` and `Iterable`

# Installation

```typescript
import { RichIterator } from "./mod.ts";
```

# Quick example

```typescript
import { RichIterator } from "./mod.ts";

const result = RichIterator.from([1, 2, 3, 4]).map((x) => x * 2).filter((x) =>
  x > 4
).toArray();

console.log(result); // [6, 8]
```

# Core Concepts

## Lazy Evaluation

Most transformation methods (`map`, `filter`, etc.) are lazy and only executed
when consumed:

```typescript
RichIterator.from([1, 2, 3])
  .map((x) => {
    console.log(x);
    return x * 2;
  }); // Nothing logged until consumption Option & Result Integration
```

This library uses `@sck/optres` to provide `Option` and `Result` types

- `Option<T>`, representing a value that may or may not be present. Indicated by
  `some(value)` and `none()`
- `Result<T, E>`, representing success or failure. Indicated by `ok(value)` and
  `err(error)`

See [`@sck/optres](https://jsr.io/@sck/optres) for more details.

Example:

```typescript
const first = RichIterator.from([1, 2, 3]).find((x) => x > 1); // Option<number>
```

# API overview

## Creation

```typescript
RichIterator.from(iterable);
```

## Transformation

- `map(fn)`
- `filter(fn)`
- `filterMap(fn)`
- `flatMap(fn)`
- `flatten()`
- `take(n)`
- `drop(n)`
- `takeWhile(fn)`
- `dropWhile(fn)`
- `mapWhile(fn)`
- `inspect(fn)`
- `chain(other)`
- `zip(other)`
- `zipWith(other, fn)`
- `chunks(size)`
- `intersperse(value)`
- `intersperseWith(fn)`
- `enumerate()`

## Consumption

- `toArray()`
- `forEach(fn)`
- `fold(initial, fn)`
- `reduce(fn)`
- `count()`
- `advanceBy(n)`
- `nextChunk(size)`

## Search

- `find(fn)`
- `findMap(fn)`
- `some(fn)`
- `every(fn)`
- `position(fn)`
- `nth(n)`
- `last()`
- `partition(fn)`
- `unzip()`

## Comparison

- `eq(other)`
- `eqBy(other, fn)`
- `ne(other)`
- `lt(other)`
- `le(other)`
- `gt(other)`
- `ge(other)`
- `cmp(other)`
- `min(fn)`
- `max(fn)`

## Numeric

- `sum()`
- `product()`
- `sumUnchecked()`
- `productUnchecked()`

## `Result`/`Option` utilities

- `tryMap(fn)`
- `tryFold(initial, fn)`
- `tryReduce(fn)`
- `tryForEach(fn)`
- `toResult()`
- `toOption()`

# Examples

## Enumerate

```typescript
RichIterator.from(["a", "b", "c"]).enumerate().toArray();
// [[0, "a"], [1, "b"], [2, "c"]]
```

## Zip

```typescript
RichIterator.from([1, 2, 3]).zip(["a", "b", "c"]).toArray();
// [[1, "a"], [2, "b"], [3, "c"]]
```

## Fold

```typescript
const sum = RichIterator.from([1, 2, 3, 4]).fold(0, (acc, x) => acc + x);
// 10
```

## Safe numeric operations

```typescript
const result = RichIterator.from([1, 2, 3]).sum();
// Result<number, TypeError>
```

# Interoperability

## Convert to native iterator

```typescript
const native = RichIterator.from([1, 2, 3]).asNative();
```

## Use in `for...of`

```typescript
for (const value of RichIterator.from([1, 2, 3])) {
  console.log(value);
}
```

# Disposal

Supports explicit resource cleanup:

```typescript
using iter = RichIterator.from(source); // Automatically calls return() when disposed
```

# Design goals

- Zero-cost abstractions where possible
- Strong typing with TypeScript generics
- Functional, chainable API
- Predictable, explicit error handling via `Result`
- Close parity with Rust iterator ergonomics

# Licence

MIT
