/** Arredondamento financeiro HALF_UP com 2 casas decimais */
export function roundHalfUp(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round(Number(value) * factor) / factor;
}
