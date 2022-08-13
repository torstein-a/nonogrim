import {$, fillArray, loop, newElement, SearchParams, stepper} from "./utils.js"

let boardOptions = {
  "size": 10,
  "cellSize": 25
}
const baseCell = {guess: 0, state: false}
const baseHintGroup = {value: 0, covered: false}

let board = []
let target = 99, correct = 0, wrong = 0

window.addEventListener('load', () => {
  boardOptions = {...boardOptions, ...SearchParams(location.search)}
  $('select[name=size]').value = boardOptions.size
  $('[name="grid-size"] option[value="5"]')?.setAttribute('selected', 'selected')
  switch (boardOptions.size) {
    case 5:
      $('[name="grid-size"] option[value="2"], [name="grid-size"] option[value="3"]').forEach(x =>
        x.setAttribute('disabled', 'disabled')
      )
      break
    default:
    case 10:
      $('[name="grid-size"] option[value="3"]').setAttribute('disabled', 'disabled')
      break
    case 15:
      $('[name="grid-size"] option[value="2"]').setAttribute('disabled', 'disabled')
      break

  }

  board = initBoard(boardOptions)
  target = board.filter(c => c.state).length
  $('.stats .toFind').innerText = target

  console.log(board)
  drawBoard(board, boardOptions)

})


$('table.board')?.addEventListener('click', (e) => {
  let index = e.target?.dataset.index
  if (index >= 0 && board[index]?.guess === 0) {
    let cellEl = $(`[data-index="${index}"]`)
    board[index].guess = 1

    if (!board[index].state) {
      updateStats({badGuesses: ++wrong})
      cellEl.classList.add('err')
    } else {
      updateStats({correctGuesses: ++correct})
    }
    board = resolveRowCol(index, board, boardOptions)
    updateCheckedCells(board)
    if (correct >= target) alert("HUZZAH!")
  }
})

$('select[name="grid-size"]')?.addEventListener('change', (e) => {
  let add = ''
  switch (parseInt(e.target.value)) {
    case 2:
      add = 'two-grid'
      break;
    case 3:
      add = 'three-grid'
      break;
    case 5:
    default:
      add = 'five-grid'
      break;
  }
  console.log('asd', add, e.target.value, $('table.board'))
  $('table.board')?.classList.remove('two-grid', 'three-grid', 'five-grid')
  $('table.board')?.classList.add(add)
})


const initBoard = (options) => {
  let b = fillArray(options.size * options.size, () => ({...baseCell}))
  for (var i = 0; i < options.size; i++) {
    let d = 0
    b.slice(i * options.size, i * options.size + options.size).forEach(c => {
      d = stepper(d, -4, 1)
      c.state += d>0
    })
  }
  for (var i = 0; i < options.size; i++) {
    let d = 0
    b.filter((c, j) => (j - i) % options.size === 0).forEach(c => {
      d = stepper(d, -4, 1)
      c.state = c.state || d > 0
    })
  }
  return b
}

const drawBoard = (board, options) => {
  const boardContainer = $('table.board')
  const header = newElement({type: 'tr'})
  let [xHint, yHint] = counter(board, boardOptions)

  // headers
  header.appendChild(newElement({type: 'td'}))
  for (let i = 0; i < options.size; i++) {
    header.appendChild(newElement(
      {
        type: 'th',
        content: yHint[i].map(h => `<span>${h.value}</span>`).join('')
      }))
  }
  boardContainer.appendChild(header)

  for (let i = 0, c = 0; i < options.size; i++) {
    let row = newElement({type: 'tr'})
    row.appendChild(newElement({
      type: 'th',
      content: xHint[i].map(h => `<span>${h.value}</span>`).join('-')
    }))

    for (let j = 0; j < options.size; j++, c++) {
      let cell = board[c]
      let classes = ['cell']
      if (cell.guess !== 0) {
        classes.push(cell.state ? 'x' : 'o')
        if ((cell.state && cell.guess != 1) || (!cell.state && cell.guess == 1)) classes.push('err')
      }

      row.append(newElement({
        type: 'td',
        className: classes.join(' '),
        style: `width: ${options.cellSize}px; height:${options.cellSize}px;`,
        //content:  board[c]?.state,
        dataAttr: {index: c}
      }))

    }
    boardContainer.appendChild(row)
  }
}

const updateCheckedCells = (board) => {
  board.forEach((c, i) => {
    if (c.guess) $(`[data-index="${i}"]`)?.classList.add('checked', board[i].state ? 'Y' : 'N')
  })
}

const counter = (board, options) => {
  let x = [], y = []
  const comp = (c) => !!c.state
  for (let i = 0; i < options.size; i++) {
    x.push(groupCount(board.slice(i * options.size, i * options.size + options.size), comp))
    y.push(groupCount(board.filter((c, j) => (j - i) % options.size === 0), comp))
  }
  return [x, y]
}

const groupCount = (arr, comp) => {
  let groups = [], tmp = 0
  arr.forEach((n) => {
    if (comp(n)) tmp++
    else {
      if (tmp) groups.push({...baseHintGroup, value: tmp})
      tmp = 0
    }
  })
  if (tmp) groups.push({...baseHintGroup, value: tmp})
  return groups
}


const resolveRowCol = (index, board, options) => {
  let lower = Math.floor(index / options.size)
  let x = board.slice(lower * options.size, lower * options.size + options.size)
  let y = board.filter((c, j) => (j - index) % options.size === 0)

  if (x.filter(c => c.state).every(c => c.guess)) x.forEach(c => c.guess = 1)
  if (y.filter(c => c.state).every(c => c.guess)) y.forEach(c => c.guess = 1)

  return board
}

const updateStats = ({badGuesses = 0, correctGuesses = 0}) => {
  badGuesses && ($('.stats .errorCounter').innerText = badGuesses)
  correctGuesses && ($('.stats .correctCounter').innerText = correctGuesses)
}