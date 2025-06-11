// === GLOBAL VARIABLES & ELEMENT REFERENCES ===
let allWords = null
let currentDifficulty = null
let gameWords = []
let currentWordIndex = 0
let currentWord = ""
let guessesThisRound = []
const maxGuesses = 6
// Add a variable to track hinted positions across words
let hintedPositions = {}

let totalScore = 0

let roundTimer = null
let progressTimer = null
const roundTimeSeconds = 30
let timeLeft = roundTimeSeconds
let timerStartTimestamp = null
let timeElapsedBeforePause = 0

let isPaused = false

const startScreen = document.getElementById("start-screen")
const gameScreen = document.getElementById("game-screen")
const resultScreen = document.getElementById("result-screen")
const pauseScreen = document.getElementById("pause-screen")
const homeBtn = document.getElementById("home-btn")

const easyBtn = document.getElementById("easy-btn")
const difficultBtn = document.getElementById("difficult-btn")
const expertBtn = document.getElementById("expert-btn")
const playAgainBtn = document.getElementById("play-again")
const pauseBtn = document.getElementById("pause-btn")
const pauseIcon = document.getElementById("pause-icon")
const pauseFallback = document.getElementById("pause-fallback")
const hintBtn = document.querySelector(".hint-icon")
const resumeYesBtn = document.getElementById("resume-yes")

const gameBoard = document.getElementById("game-board")
const wordInput = document.getElementById("word-input")
const submitGuessBtn = document.getElementById("submit-guess")

const currentRoundElem = document.getElementById("current-round")
const scoreElem = document.getElementById("score")
const hintCountElem = document.querySelector(".hint-count")

const progressFill = document.querySelector(".progress-fill")
const finalScoreElem = document.getElementById("final-score")

let timerDisplay = null

// Debug logging to check if elements are found
console.log("Pause button found:", pauseBtn !== null)
console.log("Pause icon found:", pauseIcon !== null)
console.log("Home button found:", homeBtn !== null)

// Test if images load
if (pauseIcon) {
    pauseIcon.onload = () => {
        console.log("Pause icon loaded successfully")
    }
    pauseIcon.onerror = () => {
        console.log("Pause icon failed to load")
        if (pauseFallback) {
            pauseFallback.style.display = "block"
            pauseIcon.style.display = "none"
        }
    }
}

async function loadAllWords() {
    try {
        const resp = await fetch("js/lingo_words.json")
        if (!resp.ok) throw new Error("Kon lingo_words.json niet laden")
        allWords = await resp.json()
    } catch (err) {
        console.error("Fout bij laden van woorden:", err)
        alert("Fout bij laden van woorden. Herlaad de pagina aub.")
    }
}

easyBtn.addEventListener("click", () => startGame("easy"))
difficultBtn.addEventListener("click", () => startGame("difficult"))
expertBtn.addEventListener("click", () => startGame("expert"))
playAgainBtn.addEventListener("click", resetGame)

// Home button event listener
homeBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to go back to the home screen? Your current game will be lost.")) {
        resetGame()
    }
})

submitGuessBtn.addEventListener("click", submitGuess)
wordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") submitGuess()
})

// Make sure pause button has event listener
if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
        console.log("Pause button clicked, isPaused:", isPaused)
        if (!isPaused) {
            pauseGame()
            if (pauseIcon && pauseIcon.style.display !== "none") {
                pauseIcon.src = "images/play.png"
                pauseIcon.alt = "Resume"
            } else if (pauseFallback) {
                pauseFallback.textContent = "▶️"
            }
        } else {
            resumeGame()
            if (pauseIcon && pauseIcon.style.display !== "none") {
                pauseIcon.src = "images/pause.png"
                pauseIcon.alt = "Pause"
            } else if (pauseFallback) {
                pauseFallback.textContent = "⏸️"
            }
        }
    })
} else {
    console.error("Pause button not found in the DOM")
}

resumeYesBtn.addEventListener("click", () => {
    resumeGame()
    if (pauseIcon && pauseIcon.style.display !== "none") {
        pauseIcon.src = "images/pause.png"
        pauseIcon.alt = "Pause"
    } else if (pauseFallback) {
        pauseFallback.textContent = "⏸️"
    }
})

hintBtn.addEventListener("click", () => {
    const remainingHints = Number.parseInt(hintCountElem.textContent)
    if (remainingHints <= 0) {
        alert("You've already used a hint this round.")
        return
    }

    const L = currentWord.length
    const currentRow = guessesThisRound.length
    if (currentRow >= maxGuesses) return

    const nextRowOffset = currentRow * L
    const knownPositions = new Set()
    knownPositions.add(0)

    for (let row = 0; row < currentRow; row++) {
        for (let col = 0; col < L; col++) {
            const cell = gameBoard.children[row * L + col]
            if (cell.classList.contains("correct") || col === 0) {
                knownPositions.add(col)
            }
        }
    }

    const unknownPositions = []
    for (let i = 1; i < L; i++) {
        if (!knownPositions.has(i)) {
            unknownPositions.push(i)
        }
    }

    if (unknownPositions.length === 0) {
        alert("There are no unknown letters left for a hint.")
        return
    }

    const randomIndex = unknownPositions[Math.floor(Math.random() * unknownPositions.length)]
    const nextCell = gameBoard.children[nextRowOffset + randomIndex]
    nextCell.textContent = currentWord[randomIndex].toUpperCase()
    nextCell.classList.add("hinted")

    // Store the hinted position and letter for the current word
    if (!hintedPositions[currentWordIndex]) {
        hintedPositions[currentWordIndex] = {}
    }
    hintedPositions[currentWordIndex][randomIndex] = currentWord[randomIndex].toUpperCase()

    hintCountElem.textContent = (remainingHints - 1).toString()
})

async function startGame(difficulty) {
    if (!allWords) await loadAllWords()

    currentDifficulty = difficulty
    totalScore = 0
    currentWordIndex = 0
    isPaused = false

    if (pauseIcon && pauseIcon.style.display !== "none") {
        pauseIcon.src = "images/pause.png"
        pauseIcon.alt = "Pause"
    } else if (pauseFallback) {
        pauseFallback.textContent = "⏸️"
    }

    // Reset hinted positions when starting a new game
    hintedPositions = {}

    buildFiveGameWords()
    currentWord = gameWords[currentWordIndex]
    guessesThisRound = []

    startScreen.classList.add("hidden")
    gameScreen.classList.remove("hidden")
    resultScreen.classList.add("hidden")
    pauseScreen.classList.add("hidden")

    // Show navigation buttons
    if (homeBtn) {
        homeBtn.classList.remove("hidden")
        console.log("Home button should be visible now")
    }
    if (pauseBtn) {
        pauseBtn.classList.remove("hidden")
        console.log("Pause button should be visible now")
        console.log("Pause button display style:", window.getComputedStyle(pauseBtn).display)
        console.log("Pause button position:", window.getComputedStyle(pauseBtn).position)
    }

    updateScoreDisplay()
    updateRoundDisplay()
    resetHintCount()
    resetProgressBar()

    createGameBoard()
    wordInput.value = currentWord[0].toUpperCase()
    wordInput.focus()

    if (!timerDisplay) {
        timerDisplay = document.createElement("div")
        timerDisplay.id = "timer-display"
        timerDisplay.style.fontWeight = "bold"
        timerDisplay.style.marginTop = "10px"
        timerDisplay.style.fontSize = "1.2rem"
        const rightPanel = document.querySelector(".right-panel .lingo-info-box")
        rightPanel.appendChild(timerDisplay)
    }

    startRoundTimer()
}

function buildFiveGameWords() {
    gameWords = []
    const sequence = getWordLengthSequence(currentDifficulty)
    sequence.forEach((lengthKey) => {
        const list = allWords[currentDifficulty][lengthKey]
        const rand = Math.floor(Math.random() * list.length)
        gameWords.push(list[rand])
    })
}

function getWordLengthSequence(diff) {
    switch (diff) {
        case "easy":
            return ["5_letters", "5_letters", "6_letters", "6_letters", "7_letters"]
        case "difficult":
            return ["5_letters", "6_letters", "6_letters", "6_letters", "7_letters"]
        case "expert":
            return ["5_letters", "6_letters", "6_letters", "7_letters", "7_letters"]
        default:
            return []
    }
}

function createGameBoard() {
    currentWord = gameWords[currentWordIndex]
    const L = currentWord.length
    // Change from setting placeholder to setting value
    wordInput.value = currentWord[0].toUpperCase()
    wordInput.placeholder = ""

    gameBoard.innerHTML = ""
    gameBoard.style.display = "grid"
    gameBoard.style.gridTemplateColumns = `repeat(${L}, 80px)`
    gameBoard.style.gridTemplateRows = `repeat(${maxGuesses}, 80px)`
    gameBoard.style.gap = "6px"

    for (let row = 0; row < maxGuesses; row++) {
        for (let col = 0; col < L; col++) {
            const cell = document.createElement("div")
            cell.classList.add("letter-box")

            if (row === 0) {
                if (col === 0) {
                    cell.textContent = currentWord[0].toUpperCase()
                } else {
                    // Check if we have a hint from previous words that matches this position
                    const previousWordIndex = currentWordIndex - 1
                    if (previousWordIndex >= 0 && hintedPositions[previousWordIndex]) {
                        // Get the position in the previous word
                        const previousHint = hintedPositions[previousWordIndex][col]
                        if (previousHint && col < currentWord.length) {
                            // If the letter at this position in the current word matches the hinted letter from the previous word
                            if (currentWord[col].toUpperCase() === previousHint) {
                                cell.textContent = previousHint
                                cell.classList.add("hinted")

                                // Store this as a hint for the current word too
                                if (!hintedPositions[currentWordIndex]) {
                                    hintedPositions[currentWordIndex] = {}
                                }
                                hintedPositions[currentWordIndex][col] = previousHint
                                continue
                            }
                        }
                    }
                    cell.textContent = "•"
                }
            }

            gameBoard.appendChild(cell)
        }
    }
}

async function submitGuess() {
    if (isPaused) return

    const guess = wordInput.value.trim().toLowerCase()
    const L = currentWord.length

    if (guess.length !== L) {
        alert(`Please enter a ${L}-letter word.`)
        return
    }

    try {
        const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${guess}`)
        if (!resp.ok) {
            alert("This word is not in the dictionary.")
            return
        }
    } catch {
        alert("Error checking the word.")
        return
    }

    guessesThisRound.push(guess)
    updateGameBoardRow(guess)
    // Set the value back to just the first letter after submitting
    wordInput.value = currentWord[0].toUpperCase()
    wordInput.focus()

    resetTimerAfterGuess()

    if (guess === currentWord) {
        stopRoundTimer()
        const triesUsed = guessesThisRound.length
        totalScore += (maxGuesses - triesUsed + 1) * 100
        updateScoreDisplay()

        setTimeout(() => {
            if (currentWordIndex === 4) {
                endGame(true)
            } else {
                currentWordIndex++
                nextRound()
            }
        }, 2000)
    } else if (guessesThisRound.length === maxGuesses) {
        stopRoundTimer()
        if (currentWordIndex === 4) {
            endGame(false)
        } else {
            currentWordIndex++
            nextRound()
        }
    }
}

function updateGameBoardRow(guess) {
    const L = currentWord.length
    const row = guessesThisRound.length - 1
    const used = new Array(L).fill(false)
    const rowOffset = row * L

    for (let i = 0; i < L; i++) {
        const cell = gameBoard.children[rowOffset + i]
        cell.textContent = guess[i].toUpperCase()

        if (guess[i] === currentWord[i]) {
            cell.classList.add("correct")
            used[i] = true
        } else {
            cell.classList.remove("correct")
        }
    }

    for (let i = 0; i < L; i++) {
        const cell = gameBoard.children[rowOffset + i]
        if (cell.classList.contains("correct")) continue

        let found = false
        for (let j = 0; j < L; j++) {
            if (!used[j] && guess[i] === currentWord[j]) {
                cell.classList.add("present")
                used[j] = true
                found = true
                break
            }
        }

        if (!found) {
            cell.classList.add("absent")
        }
    }

    const isLastRow = row >= maxGuesses - 1
    if (!isLastRow) {
        prepareNextRowWithKnownLetters()
    }
}

function prepareNextRowWithKnownLetters() {
    const L = currentWord.length
    const row = guessesThisRound.length - 1

    const knownCorrectLetters = new Array(L).fill(null)
    for (let r = 0; r <= row; r++) {
        for (let c = 0; c < L; c++) {
            const index = r * L + c
            const cell = gameBoard.children[index]
            if (cell.classList.contains("correct")) {
                knownCorrectLetters[c] = cell.textContent
            }
        }
    }

    // Check for hinted letters in the current row
    const currentRowOffset = row * L
    for (let c = 0; c < L; c++) {
        const index = currentRowOffset + c
        const cell = gameBoard.children[index]
        if (cell.classList.contains("hinted") && !knownCorrectLetters[c]) {
            knownCorrectLetters[c] = cell.textContent
        }
    }

    if (row >= maxGuesses - 1) return

    const nextRowOffset = (row + 1) * L
    for (let i = 0; i < L; i++) {
        const nextCell = gameBoard.children[nextRowOffset + i]

        if (i === 0) {
            nextCell.textContent = currentWord[0].toUpperCase()
        } else if (knownCorrectLetters[i]) {
            nextCell.textContent = knownCorrectLetters[i]
        } else {
            nextCell.textContent = "•"
        }

        nextCell.classList.remove("correct", "present", "absent", "hinted")
    }
}

function nextRound() {
    guessesThisRound = []
    updateRoundDisplay()
    resetHintCount()
    resetProgressBar()
    createGameBoard()
    // Remove this line since createGameBoard now sets the value
    // wordInput.value = ""
    wordInput.focus()
    startRoundTimer()
}

function updateRoundDisplay() {
    currentRoundElem.textContent = (currentWordIndex + 1).toString()
}

function updateScoreDisplay() {
    scoreElem.textContent = totalScore.toString()
}

function resetProgressBar() {
    progressFill.style.width = "0%"
}

function resetHintCount() {
    hintCountElem.textContent = "1"
}

function resetTimerAfterGuess() {
    if (!isPaused) {
        stopRoundTimer()
        startRoundTimer()
    }
}

function startRoundTimer() {
    if (!timerStartTimestamp) {
        timerStartTimestamp = Date.now()
        timeElapsedBeforePause = 0
    } else {
        timerStartTimestamp = Date.now() - timeElapsedBeforePause * 1000
    }

    timeLeft = roundTimeSeconds - timeElapsedBeforePause
    updateTimerDisplay()
    resetProgressBar()

    if (roundTimer) clearInterval(roundTimer)
    if (progressTimer) clearInterval(progressTimer)

    roundTimer = setInterval(() => {
        if (!isPaused) {
            const elapsedSeconds = (Date.now() - timerStartTimestamp) / 1000
            timeLeft = Math.max(roundTimeSeconds - Math.floor(elapsedSeconds), 0)
            updateTimerDisplay()

            if (timeLeft <= 0) {
                clearInterval(roundTimer)
                roundTimer = null

                clearInterval(progressTimer)
                progressTimer = null

                const L = currentWord.length
                const dummyGuess = "-".repeat(L)
                guessesThisRound.push(dummyGuess)
                updateGameBoardRow(dummyGuess)
                prepareNextRowWithKnownLetters() // ✅ FIX HIER TOEGEVOEGD

                if (guessesThisRound.length >= maxGuesses) {
                    if (currentWordIndex === 4) {
                        endGame(false)
                    } else {
                        currentWordIndex++
                        nextRound()
                    }
                } else {
                    timeElapsedBeforePause = 0
                    timerStartTimestamp = null
                    startRoundTimer()
                }
            }
        }
    }, 1000)

    progressTimer = setInterval(() => {
        if (!isPaused) {
            const elapsedMs = Date.now() - timerStartTimestamp
            let progressPercent = (elapsedMs / (roundTimeSeconds * 1000)) * 100
            progressPercent = Math.min(progressPercent, 100)
            progressFill.style.width = progressPercent + "%"
        }
    }, 100)
}

function stopRoundTimer() {
    if (roundTimer) clearInterval(roundTimer)
    if (progressTimer) clearInterval(progressTimer)
    timerStartTimestamp = null
    timeElapsedBeforePause = 0
    timeLeft = roundTimeSeconds
    updateTimerDisplay()
    resetProgressBar()
}

function pauseGame() {
    if (isPaused) return
    isPaused = true
    if (roundTimer) clearInterval(roundTimer)
    if (progressTimer) clearInterval(progressTimer)
    timeElapsedBeforePause = (Date.now() - timerStartTimestamp) / 1000

    gameScreen.classList.add("hidden")
    pauseScreen.classList.remove("hidden")

    updateTimerDisplay()
}

function resumeGame() {
    if (!isPaused) return
    isPaused = false

    pauseScreen.classList.add("hidden")
    gameScreen.classList.remove("hidden")

    startRoundTimer()
}

function updateTimerDisplay() {
    if (!timerDisplay) return
    timerDisplay.textContent = `Time: ${timeLeft}s`
}

function endGame(won) {
    stopRoundTimer()
    gameScreen.classList.add("hidden")
    resultScreen.classList.remove("hidden")
    finalScoreElem.textContent = totalScore
}

function resetGame() {
    stopRoundTimer()
    totalScore = 0
    currentWordIndex = 0
    isPaused = false

    if (pauseIcon && pauseIcon.style.display !== "none") {
        pauseIcon.src = "images/pause.png"
        pauseIcon.alt = "Pause"
    } else if (pauseFallback) {
        pauseFallback.textContent = "⏸️"
    }

    // Reset hinted positions when resetting the game
    hintedPositions = {}

    startScreen.classList.remove("hidden")
    gameScreen.classList.add("hidden")
    resultScreen.classList.add("hidden")
    pauseScreen.classList.add("hidden")

    // Hide navigation buttons
    if (homeBtn) homeBtn.classList.add("hidden")
    if (pauseBtn) pauseBtn.classList.add("hidden")

    if (timerDisplay) {
        timerDisplay.remove()
        timerDisplay = null
    }
}
