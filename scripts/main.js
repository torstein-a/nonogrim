import {$, fillArray, newElement, recall, stepper, store} from "./utils.js"

let continuousClickingActive = false

let boardOptions = recall('board-options', {
  "size": 10,
  "cellSize": 25
})
store('board-options', boardOptions)

let a11yOptions = recall('a11y-options', {
  'gridSize': 5,
  'theme': 0,
  'continousClick': true,
  'confirmClick': false,
})
if (a11yOptions.continousClick) {
  $('input[name="auto-click"]')?.setAttribute('checked', 'checked')
}
store('a11y-options', a11yOptions)

// set menus
$(`select[name="size"] option[value="${boardOptions.size}"]`)?.setAttribute('selected', 'selected')
$(`select[name="grid-size"] option[value="${a11yOptions.gridSize}"]`)?.setAttribute('selected', 'selected')
$(`select[name="theme"] option[value="${a11yOptions.theme}"]`)?.setAttribute('selected', 'selected')
a11yOptions.continousClick && $(`checkbox[name="auto-click"]`)?.setAttribute('checked', 'checked')

const baseCell = {guess: 0, state: false}
const baseHintGroup = {value: 0, covered: false}

// dialog handling
$('.dialog-container').forEach(el => {
  const dialog = $(el, 'dialog')
  const button = $(el, 'header button')
  button && button.addEventListener('click', () => {
    if (!dialog.open) dialog.showModal()
  })
})

$('.dialog-container.game-settings button[value="create"], .dialog-container.score-card button[value="create"]').forEach((el) => {
  el.addEventListener('click', ev => {
    boardOptions.size = parseInt($('select[name="size"]').value)
    store('board-options', boardOptions)
    createBoard(boardOptions)
    drawBoard(gameBoard, boardOptions)
  })
})

const calcStats = (board) => {
  return {
    goal: board.filter(c => c.state).length,
    correct: board.filter(c => c.state && c.guess).length,
    wrong: board.filter(c => !c.state && c.guess).length,
  }
}
const updateStats = ({badGuesses = 0, correctGuesses = 0, goal = 0}) => {
  badGuesses && ($('.stats .errorCounter').innerText = badGuesses)
  correctGuesses && ($('.stats .correctCounter').innerText = correctGuesses)
  goal && ($('.stats .toFind').innerText = goal)
}

let gameBoard = recall('board', [])

let {goal, correct, wrong} = calcStats(gameBoard)
updateStats({badGuesses: wrong, correctGuesses: correct, goal: goal})

window.addEventListener('load', () => {
  if (!gameBoard.length) createBoard(boardOptions)
  drawBoard(gameBoard, boardOptions)
  // Apply a11y options
  swapGrid(a11yOptions.gridSize)
  swapTheme(a11yOptions.theme)
})


$('table.board')?.addEventListener('click', (e) => {
  let index = e.target?.dataset.index
  if (index) {
    clickCellAtIndex(index)
    if (a11yOptions.continousClick) toggleContinuousClicking()
  } else {
    disableContinuousClicking()
  }
})

$('table.board')?.addEventListener('mousemove', (e) => {

    let index = e.target?.dataset.index
  //console.log('mousemovde', index, continuousClickingActive)
    if (index && continuousClickingActive) {
      clickCellAtIndex(index)
    } else {
      disableContinuousClicking()
    }
})



// $('main')?.addEventListener('mouseover', (e)=>console.log('mouse', continuousClickingActive, e.target))


$('select[name="grid-size"]')?.addEventListener('change', (e) => {
  const gridSize = parseInt(e.target.value)
  a11yOptions.gridSize = gridSize
  store('a11y-options', a11yOptions)
  swapGrid(gridSize)
})

$('select[name="theme"]')?.addEventListener('change', (e) => {
  const theme = parseInt(e.target.value)
  a11yOptions.theme = theme
  store('a11y-options', a11yOptions)
  swapTheme(theme)

})

$('input[name="auto-click"]')?.addEventListener('change', (e) => {
  a11yOptions.continousClick = !!e.target.checked
  store('a11y-options', a11yOptions)
})

const clickCellAtIndex = (index) => {
 // console.log('clickcell', index)
  if (index >= 0 && gameBoard[index]?.guess === 0) {
    let cellEl = $(`[data-index="${index}"]`)
    gameBoard[index].guess = 1

    if (!gameBoard[index].state) {
      updateStats({badGuesses: ++wrong})
      cellEl.classList.add('err')
      disableContinuousClicking()
    } else {
      updateStats({correctGuesses: ++correct})
    }
    gameBoard = resolveRowCol(index, gameBoard, boardOptions)
    updateCheckedCells(gameBoard)
    if (correct >= goal) {
      $('.score-card .errorCounter').innerText = wrong
      $('.score-card .toFind').innerText = correct
      $('.score-card dialog').showModal()
    }
    store('board', gameBoard)
  }
}


// TODO clean up createBoard, use initBoard as default value for gameBoard
const createBoard = (options) => {
  $('select[name=size]').value = options.size
  switch (options.size) {
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

  gameBoard = initBoard(options)
  store('board', gameBoard)
  const stats = calcStats(gameBoard)
  goal = stats.goal
  wrong = stats.wrong
  correct = stats.correct
  updateStats({badGuesses: wrong, correctGuesses: correct, goal: goal})
}

const initBoard = (options) => {
  let b = fillArray(options.size * options.size, () => ({...baseCell}))
  for (var i = 0; i < options.size; i++) {
    let d = 0
    b.slice(i * options.size, i * options.size + options.size).forEach(c => {
      d = stepper(d, -4, 1)
      c.state += d > 0
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

  boardContainer.innerHTML = '' // make sure we reset the table

  const header = newElement({type: 'tr'})
  let [xHint, yHint] = counter(board, boardOptions)

  // headers
  header.appendChild(newElement({type: 'td'}))
  for (let i = 0; i < options.size; i++) {
    header.appendChild(newElement(
      {
        type: 'th',
        content: yHint[i].map(h => `<span>${h.value}</span>`).join(''),
        dataAttr: {x: i}
      }))
  }
  boardContainer.appendChild(header)

  for (let i = 0, c = 0; i < options.size; i++) {
    let row = newElement({type: 'tr'})
    row.appendChild(newElement({
      type: 'th',
      content: xHint[i].map(h => `<span>${h.value}</span>`).join('-'),
      dataAttr: {y: i}
    }))

    for (let j = 0; j < options.size; j++, c++) {
      let cell = board[c]
      let classes = ['cell']
      if (cell.guess !== 0) {
        classes = [...classes, ...[
          'checked', cell.state ? 'Y' : 'N',
        ]]
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

const swapGrid = (gridSize) => {
  let add = ''
  switch (gridSize) {
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
  $('table.board')?.classList.remove('two-grid', 'three-grid', 'five-grid')
  $('table.board')?.classList.add(add)
}

const swapTheme = (theme) => {

  let className = 'theme-'
  switch (theme) {
    case 3:
      className += 'warlock'
      break;
    case 2:
      className += 'high-contrast-inverse'
      break;
    case 1:
      className += 'high-contrast'
      break;
    case 0:
    default:
      className += 'default'
      break;
  }
  $('body').className = className
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
  // let i = lower, j = (index % options.size)
  let x = board.slice(lower * options.size, lower * options.size + options.size)
  let y = board.filter((c, j) => (j - index) % options.size === 0)

  if (x.filter(c => c.state).every(c => c.guess)) {
    x.forEach(c => c.guess = 1)

  }
  if (y.filter(c => c.state).every(c => c.guess)) {
    y.forEach(c => c.guess = 1)
  }

  return board
}



// Convenience stuff

const enableContinuousClicking = ()=>{
  continuousClickingActive = true;
  $('table.board').classList.add('highlight-marker')
}
const disableContinuousClicking = ()=>{
  continuousClickingActive = false;
  $('table.board').classList.remove('highlight-marker')
}

const toggleContinuousClicking = () => {
  if (continuousClickingActive) disableContinuousClicking()
  else enableContinuousClicking()
}