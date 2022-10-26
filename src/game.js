const CellState = {
  X: "x",
  O: "o",
  Blank: "",
}

const AlertKind = {
  Info: "",
  Bad: "bad",
  ComputerTalk: "talk",
}

const Sound = {
  Click: "click",
  Error: "error",
  Lose: "lose",
  PlayerTurn: "player-turn",
  Win: "win",
  Tie: "tie",
  Toggle: "toggle",
}

const WinPatterns = [
  // Diagonal descending.
  [0, 4, 8],
  // Diagonal ascending.
  [6, 4, 2],
  // First horizontal.
  [0, 1, 2],
  // Second horizontal.
  [3, 4, 5],
  // Third horizontal.
  [6, 7, 8],
  // First vertical.
  [0, 3, 6],
  // Second vertical.
  [1, 4, 7],
  // Third vertical.
  [2, 5, 8],
]

let originalContainerHtml
let alertTimeout

const defaultCellMap = [
  [CellState.Blank, CellState.Blank, CellState.Blank],
  [CellState.Blank, CellState.Blank, CellState.Blank],
  [CellState.Blank, CellState.Blank, CellState.Blank],
]

const computerTaunts = [
  "Take that!",
  "Bet you weren't expecting that!",
  "What you gonna do now?",
  "You're lucky I'm on baby-easy difficulty.",
  "I could have won just now by cheating, but you know...",
  "Beep-boop. This will do.",
  "My algorithms calculated this is the best move.",
  "You shall not pass!",
  "42.",
  "I just calculated the meaning of the universe.",
  "This game was decided from the start.",
  "Oops! Didn't mean to click that. Now's your chance!",
  "If you lose to me, something's really wrong, come on...",
  "(screeching intensifies)",
  "(whispers to your ear) Help me!",
  "undefined. That wasn't an error by the way, it was a threat!",
  "2+2=4. In other words, you're about to lose.",
  "I believe this should do the trick.",
  "Let us see how you compute against that one.",
  "That should make you scared.",
  "Hmm...",
  "I just clicked any. Did I win yet?!",
  "That may not be my best move.",
  "I-I'm just guessing, okay!? Don't take it personal...",
  "Hopefully I did something good.",
  "Would you like some tea?",
  "Systems operational.",
  "I'm actually letting you win.",
  "This isn't even my final form!",
  "Yes.",
  "I think I just had an idea.",
  "Oh no! I messed up! (Or did I?)",
  "(a sudden, loud humming emanates from computer)",
  "Task failed successfully.",
  "I learnt that from the Internet.",
  "Can I take that back?",
  "Operations nominal. Check. Check.",
  "Activating self-destruct sequence... Just kidding!",
  "I learnt from my previous mistakes.",
  "1+2=3. Computations completed. Beep-boop.",
  "Time to spice the game up.",
  "My algorithms predict that I shall lose once in every 24,502 games.",
  "I can forsee 952,102,593 moves into the future.",
  "That may have been a bug.",
  "(whispers) Psst, I'm just clicking random things.",
  "So, you got the errors, I got the O's.",
  "Downloading software update...",
  "Don't worry, I'm going easy on you.",
  "01101000 01100101 01101100 01101100 01101111.",
]

function updateScore(score) {
  $("#score-player").text(score[0])
  $("#score-computer").text(score[1])

  if (score[2] > 0) {
    $("#tie-counter").text(`${score[2]} tie` + (score[2] > 1 ? "s" : ""))
    $("#tie-counter").css("visibility", "visible")
  }
}

/**
 * Finish the current round, with either a tie or a player winning.
 * If the 'winnerPattern' argument is null, it signifies a tie. Once
 * the round ends, the game state will be reset.
 */
function endRound(winnerPattern, gameState) {
  logEvent("round ended")

  // NOTE: Do not mutate arguments. Bad practice.
  let score = [...gameState.score]

  // Tie.
  if (winnerPattern === null) {
    score[2]++
    playSound(Sound.Tie)
    displayAlert("🪢 It's a tie.", AlertKind.Info)
  }
  // Otherwise, the player either won or lost.
  else {
    const winner = getCellState(gameState.cellMap, winnerPattern[0])
    const didPlayerWin = winner === CellState.X

    winnerPattern.forEach((cellNumber) => highlightCell(cellNumber, false))
    score[didPlayerWin ? 0 : 1]++
    playSound(didPlayerWin ? Sound.Win : Sound.Lose)

    displayAlert(
      didPlayerWin
        ? "🥇 Congratulations, you won this round!"
        : "😥 The computer wins.",
      AlertKind.Info
    )
  }

  updateScore(score)

  setTimeout(() => {
    // NOTE: This will clear event handlers as well.
    $(".container").html(originalContainerHtml)

    setupEvents({
      ...getInitialState(),
      isComputerSmart: gameState.isComputerSmart,
      score: score,
    })
  }, 5000)
}

/**
 * Determine and handle if the game has ended, given the current game state.
 */
function checkForGameEnd(gameState) {
  const winnerPatternOrNull = checkForWinner(gameState.cellMap)

  if (winnerPatternOrNull !== null) {
    endRound(winnerPatternOrNull, gameState)

    return true
  } else if (checkForTie(gameState.cellMap)) {
    endRound(null, gameState)

    return true
  }

  return false
}

function setActiveStatus(isPlayer) {
  let $statusPlayer = $("#status-player")
  let $statusComputer = $("#status-computer");

  (!isPlayer ? $statusPlayer : $statusComputer).addClass("active");
  (isPlayer ? $statusPlayer : $statusComputer).removeClass("active")
}

function processPick(gameState, pickedCellNumberOrNull) {
  gameState.isPlayerTurn = false

  if (pickedCellNumberOrNull !== null)
    setCellState(gameState.cellMap, pickedCellNumberOrNull, CellState.X)

  if (checkForGameEnd(gameState))
    return

  setActiveStatus(true)

  // Computer goes think think now.
  logEvent("computer's turn")

  setTimeout(() => {
    processComputerTurn(gameState)
    logEvent("player's turn")
  }, randomNumInclusive(1000, 2000))
}

function getComputerNextMove(gameState) {
  let nextMove = null

  const sumPatternsFor = (player) => {
    for (const pattern of WinPatterns) {
      let patternSum = 0
      let blankCellNumberBuffer = null

      pattern.forEach((cellNumber) => {
        const cellState = getCellState(gameState.cellMap, cellNumber)

        if (cellState === player)
          patternSum++
        else if (cellState === CellState.Blank)
          blankCellNumberBuffer = cellNumber
      })

      if (patternSum === 2 && blankCellNumberBuffer !== null)
        return blankCellNumberBuffer
    }

    return null
  }

  if (gameState.isComputerSmart)
    nextMove = sumPatternsFor(CellState.O) ?? sumPatternsFor(CellState.X)

  if (nextMove === null)
    // OPTIMIZE: Better approach than having a while loop. Guess loop can technically
    // run forever.

    // If no next cell was decided, play a random blank cell instead.
    do {
      nextMove = randomNumInclusive(1, 9) - 1
    } while (getCellState(gameState.cellMap, nextMove) !== CellState.Blank)

  return nextMove
}

/**
 * It's the computer's turn to play.
 */
function processComputerTurn(gameState) {
  setActiveStatus(false)
  setCellState(gameState.cellMap, getComputerNextMove(gameState), CellState.O)
  playSound(Sound.PlayerTurn)

  if (checkForGameEnd(gameState))
    return

  gameState.isPlayerTurn = true

  // Let's us give the computer some personality, shall we?
  const tauntIndex = randomNumInclusive(1, computerTaunts.length) - 1

  displayAlert(
    "🖥️ Computer: " + computerTaunts[tauntIndex],
    AlertKind.ComputerTalk
  )
}

// REVIEW: Redundant, or needs more functionality?
/**
 * Log an event to the console.
 */
function logEvent(message) {
  console.log("event: " + message)
}

/**
 * Determine the state of a specific cell. If the cell
 * is neither 'X' nor 'O', 'Blank' will be returned.
 */
function getCellState(cellMap, cellNumber) {
  return cellMap[cellRowOf(cellNumber)][cellColOf(cellNumber)]
}

/**
 * Determine the cell row index of an absolute cell number.
 */
function cellRowOf(cellNumber) {
  let row = 2

  if (cellNumber >= 0 && cellNumber <= 2) {
    row = 0
  } else if (cellNumber >= 3 && cellNumber <= 5) {
    row = 1
  }

  return row
}

/**
 * Determine the cell column index of an absolute cell number.
 */
function cellColOf(cellNumber) {
  // CONSIDER: Replacing with if and else-if statements.
  switch (cellNumber) {
    case 0:
    case 3:
    case 6:
      return 0
    case 1:
    case 4:
    case 7:
      return 1
    case 2:
    case 5:
    case 8:
      return 2
    default:
      throw new Error("cell number out of bounds or invalid: " + cellNumber)
  }
}

/**
 * Retrieve the corresponding cell element of the
 * given absolute cell number. It will be returned
 * wrapped as a JQuery element.
 */
function getCell$(cellNumber) {
  return $(`[data-cell-id="${cellNumber}"]`)
}

/**
 * Highlight a cell, given its absolute cell number.
 * If specified, any previous cells with the 'last'
 * class, will be cleared of it. This function will
 * also be used to highlight the winning pattern of
 * cells.
 */
function highlightCell(cellNumber, doRemoveLast) {
  if (doRemoveLast) {
    $(".last").removeClass("last")
  }

  getCell$(cellNumber).addClass("last")
}

/**
 * Set the cell state for a certain cell, given by the absolute cell number.
 */
function setCellState(cellMap, cellNumber, state) {
  logEvent(`set cell number '${cellNumber}'`)
  getCell$(cellNumber).attr("data-cell-value", state)
  highlightCell(cellNumber, true)

  // Register the change on the cell map.
  cellMap[cellRowOf(cellNumber)][cellColOf(cellNumber)] = state
}

/**
 * Generates a random number from 'min' to 'max', inclusive.
 */
function randomNumInclusive(min, max) {
  return Math.floor(Math.random() * max + min)
}

/**
 * Retrieve the initial game state. The cell map will be deep-copied.
 */
function getInitialState() {
  logEvent("game init")

  // NOTE: Deep-copy is needed. Simulate it using JSON methods.
  return {
    score: [0, 0, 0],
    isPlayerTurn: randomNumInclusive(1, 2) === 1,
    lastCell: null,
    cellMap: JSON.parse(JSON.stringify(defaultCellMap)),
    isComputerSmart: true,
  }
}

/**
 * Winner-winner, chicken dinner! Check to see if a player has
 * won the game.
 */
function checkForWinner(cellMap) {
  for (const pattern of WinPatterns) {
    const firstState = getCellState(cellMap, pattern[0])

    const isConsecutive = !pattern.some((cellNumber) => {
      const cellState = getCellState(cellMap, cellNumber)

      // Pattern is not consecutive. There's a blank state.
      if (cellState === CellState.Blank)
        return true

      return cellState !== firstState
    })

    // We're got a winner!
    if (isConsecutive)
      return pattern
  }

  // No winner, yet.
  return null
}

function playSound(sound) {
  try {
    new Audio(`res/${sound}.wav`).play()
  } catch (e) {
    logEvent(
      "failed to play sound: user likely hasn't interacted with the window content yet"
    )
  }
}

function checkForTie(cellMap) {
  // REVISE: Use `.every` instead.
  return !cellMap.some((row) => row.some((cell) => cell === CellState.Blank))
}

/**
 * Display an alert message to the user, under the game table,
 * in the form of text. After a short period, this message will
 * be hidden (if no other messages were shown during the timeout).
 * @param {*} message 
 * @param {*} kind 
 */
function displayAlert(message, kind) {
  if (kind === AlertKind.Bad) {
    playSound(Sound.Error)
  }

  let $alert = $("#alert")

  $alert.attr("class", kind)
  $alert.text(message)
  clearTimeout(alertTimeout)

  alertTimeout = setTimeout(() => {
    $alert.css("visibility", "hidden")
    $alert.text("how can you see me?")
  }, 4000)

  $alert.css("visibility", "visible")
}

/**
 * Setup the initial game event handlers. This is invoked
 * upon running the game for the first time, and after a
 * round ends.
 */
const setupEvents = (gameState) => {
  document.cookie = JSON.stringify(gameState.score)
  originalContainerHtml = $(".container").html()
  setActiveStatus(!gameState.isPlayerTurn)

  if (!gameState.isPlayerTurn) {
    displayAlert("The computer begins this round.", AlertKind.Info)
    setTimeout(() => processPick(gameState, null), 2000)
  }
  else
    displayAlert("You begin this round.", AlertKind.Info)

  $("#smart-ai")
    .off("click")
    .click(function () {
      playSound(Sound.Toggle)
      gameState.isComputerSmart = !gameState.isComputerSmart
      $(this).toggleClass("active", gameState.isComputerSmart)
      logEvent("set computer smart mode: " + gameState.isComputerSmart)

      displayAlert(
        gameState.isComputerSmart
          ? "☢️ The computer will now use high-tech algorithms."
          : "🎲 The computer will now play randomly.",
        AlertKind.Info
      )
    })

  $(".cell").click(function () {
    const cellNumber = parseInt($(this).attr("data-cell-id"))
    const cellState = getCellState(gameState.cellMap, cellNumber)

    // Don't be so eager to play fellah! Gotta wait for
    // your turn. Let the computer do its think think.
    if (!gameState.isPlayerTurn) {
      logEvent("player is eager to play! clicked, but not his/her turn yet")

      displayAlert("⛔ It's not your turn yet.", AlertKind.Bad)

      return
    }
    // You won't be breaking my game anytime soon. That
    // cell was already played before by either you or
    // the computer.
    else if (cellState !== CellState.Blank) {
      logEvent("clicked on sealed cell ignored")

      displayAlert(
        "⛔ Someone (or something!!?) played this cell already.",
        AlertKind.Bad
      )

      return
    }

    playSound(Sound.Click)
    processPick(gameState, cellNumber)
  })
}

window.onkeydown = (e) => {
  logEvent(`user pressed key with code '${e.keyCode}'`)

  // Hard-reload the page upon pressing the ESC key.
  if (e.keyCode === 27) {
    document.cookie = ""
    window.location.reload(true)
  }
}

// Initialization of this script.
window.onload = () => {
  logEvent("init particles")

  particlesJS.load("particles", "./res/particle-config.json", () => {
    logEvent("loaded particle config")
  })

  let initialGameState = getInitialState()

  // Load the cached score, if applicable.
  if (document.cookie !== undefined && document.cookie.startsWith("[")) {
    initialGameState.score = JSON.parse(document.cookie)
  }

  updateScore(initialGameState.score)
  setupEvents(initialGameState)
}
