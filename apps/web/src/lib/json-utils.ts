export function isValidJson(str: string): boolean {
  if (str.trim() === '') return false
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}
