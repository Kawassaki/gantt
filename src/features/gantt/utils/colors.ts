export const darkenHex = (hex: string, amount = 0.18): string => {
  const colorAsNumber = Number.parseInt(hex.replace("#", ""), 16);
  const red = Math.max(
    0,
    ((colorAsNumber >> 16) & 0xff) - Math.round(255 * amount)
  );
  const green = Math.max(
    0,
    ((colorAsNumber >> 8) & 0xff) - Math.round(255 * amount)
  );
  const blue = Math.max(0, (colorAsNumber & 0xff) - Math.round(255 * amount));
  return `rgb(${red},${green},${blue})`;
};
