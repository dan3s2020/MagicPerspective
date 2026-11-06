// Evaluation length is a user-chosen maximum, not a fixed UI/engine cap.
// 0 means evaluate the full selected exercise; positive lengths are exact maxima.
export function requestedExerciseLength(value, fallback = 20000) {
  const n = value == null || value === "" ? fallback : Number(value);
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new RangeError("Lungimea evaluării trebuie să fie un număr întreg >= 0 (0 = întregul exercițiu).");
  }
  return n;
}
export function limitExerciseBytes(bytes, length) {
  return length === 0 ? bytes : bytes.slice(0, length);
}
