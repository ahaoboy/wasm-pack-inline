
export function assert<T>(cond: T, msg: string): asserts  cond is NonNullable<T> {
  if (!cond) {
    throw new Error(msg)
  }
}
