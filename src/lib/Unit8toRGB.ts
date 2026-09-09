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

  const color = `rgb(
    ${Math.round(r / pixels)}
    ${Math.round(g / pixels)}
    ${Math.round(b / pixels)}
    )`

  return {color}
}
