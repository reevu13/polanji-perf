export function pickFirst(arr, predicate = () => true) {
  if (!Array.isArray(arr)) return null;
  for (const item of arr) if (predicate(item)) return item;
  return null;
}
