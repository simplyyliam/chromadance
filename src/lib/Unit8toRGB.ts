export const Unit8ToRGB = (data: Uint8ClampedArray) => {
  let r = 0
  let g = 0
  let b = 0

  for (let i = 0; i < data.length; i += 4) {
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
  }

  const pixels = data.length / 4

  const rVal = Math.round(r / pixels);
  const gVal = Math.round(g / pixels);
  const bVal = Math.round(b / pixels);

  const color = `rgb(${rVal} ${gVal} ${bVal})`;

  return { r: rVal, g: gVal, b: bVal, color };
}
