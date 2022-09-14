const parsePrimitive = (v) => {
  if (/^[0-9.-]/) return parseFloat(v)

  return v
}

export const SearchParams = (pathString) => {
  let out = {}
  new URLSearchParams(pathString).forEach((v, k) => out[k] = parsePrimitive(v))
  return out
}

export const $ = (a, b) => {
  let res = undefined
  if (typeof a === 'string') res = document.querySelectorAll(a)
  if (a && a instanceof Element && typeof b == 'string') {
    res = a.querySelectorAll(`:scope ${b}`)
  }
  if (res && res.length < 1) return null
  if (res && res.length === 1) return res[0]
  return res
}

export const fillArray = (n, val) => [...(new Array(n))].map(_ => typeof val === 'function' ? val() : val)

export const newElement = ({type, className, style, content, dataAttr}) => {
  const el = document.createElement(type)
  className && (el.className = className)
  style && (el.style = style)
  content && (el.innerHTML = content)
  dataAttr && Object.entries(dataAttr).forEach(([key, value])=>{
    el.dataset[key] = value
  })
  return el
}

export const loop = (n, cb) => {while (n--) cb(n)}

export const stepper = (previous, lower, upper) => {
  let d = Math.round(3*Math.random() - 3*Math.random())
  if (d < lower) d = lower
  if (d > upper) d = upper
  return d
}

