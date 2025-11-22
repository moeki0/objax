export function generateCoolId(length = 17): string {
  const chars = "ABCDEFGHJKMNPQRSTUWXYZabcdefghjkmnpqrstuwxyz23456789";
  let result = "";
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}
