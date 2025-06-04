class LingoGame {
    constructor() {
        this.words = null;
        this.currentDifficulty = null;
        this.currentRound = 1;
        this.currentWord = '';
        this.guesses = [];
        this.maxGuesses = 6;
        this.gameWords = [];
        this.currentWordIndex = 0;

        this.initializeElements();
        this.loadWords();
        this.setupEventListeners();
    }

    initializeElements() {
        this.startScreen = document.getElementById('start-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.resultScreen = document.getElementById('result-screen');
        this.gameBoard = document.getElementById('game-board');
        this.wordInput = document.getElementById('word-input');
        this.submitButton = document.getElementById('submit-guess');
        this.currentRoundElement = document.getElementById('current-round');
        this.finalScoreElement = document.getElementById('final-score');
    }

    async loadWords() {
        try {
            const response = await fetch('js/lingo_words.json');
            this.words = await response.json();
        } catch (error) {
            console.error('Error loading words:', error);
        }
    }

    setupEventListeners() {
        document.getElementById('easy-btn').addEventListener('click', () => this.startGame('easy'));
        document.getElementById('difficult-btn').addEventListener('click', () => this.startGame('difficult'));
        document.getElementById('expert-btn').addEventListener('click', () => this.startGame('expert'));
        document.getElementById('play-again').addEventListener('click', () => this.resetGame());
        this.submitButton.addEventListener('click', () => this.submitGuess());
        this.wordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitGuess();
        });
    }

    startGame(difficulty) {
        this.currentDifficulty = difficulty;
        this.selectGameWords();
        this.currentWord = this.gameWords[0];
        this.currentWordIndex = 0;
        this.currentRound = 1;
        this.guesses = [];
        
        this.startScreen.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');
        this.resultScreen.classList.add('hidden');
        
        this.updateGameInfo();
        this.createGameBoard();
    }

    selectGameWords() {
        this.gameWords = [];
        const wordLengths = this.getWordLengthSequence();
        
        for (const length of wordLengths) {
            const wordList = this.words[this.currentDifficulty][length];
            const randomWord = wordList[Math.floor(Math.random() * wordList.length)];
            this.gameWords.push(randomWord);
        }
    }

    getWordLengthSequence() {
        switch (this.currentDifficulty) {
            case 'easy':
                return ['5_letters', '5_letters', '6_letters', '6_letters', '7_letters'];
            case 'difficult':
                return ['5_letters', '6_letters', '6_letters', '6_letters', '7_letters'];
            case 'expert':
                return ['5_letters', '6_letters', '6_letters', '7_letters', '7_letters'];
            default:
                return [];
        }
    }

    createGameBoard() {
        this.gameBoard.innerHTML = '';
        // Dynamisch grid: aantal kolommen = lengte van het woord
        const wordLength = this.currentWord.length;
        this.gameBoard.style.gridTemplateColumns = `repeat(${wordLength}, 1fr)`;
        this.gameBoard.style.width = `${wordLength * 60}px`;
        this.gameBoard.style.height = `${this.maxGuesses * 60}px`;
        for (let i = 0; i < this.maxGuesses; i++) {
            const row = document.createElement('div');
            row.className = 'row';
            for (let j = 0; j < wordLength; j++) {
                const letterBox = document.createElement('div');
                letterBox.className = 'letter-box';
                row.appendChild(letterBox);
            }
            this.gameBoard.appendChild(row);
        }
    }

    async submitGuess() {
        const guess = this.wordInput.value.toLowerCase();
        
        if (guess.length !== this.currentWord.length) {
            alert(`Please enter a ${this.currentWord.length}-letter word`);
            return;
        }

        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${guess}`);
            if (!response.ok) {
                alert('This word is not in the dictionary. Please try another word.');
                return;
            }

            this.guesses.push(guess);
            this.updateGameBoard();
            this.wordInput.value = '';

            if (guess === this.currentWord) {
                if (this.currentRound === 5) {
                    this.endGame(true);
                } else {
                    this.nextRound();
                }
            } else if (this.guesses.length === this.maxGuesses) {
                if (this.currentRound === 5) {
                    this.endGame(false);
                } else {
                    this.nextRound();
                }
            }
        } catch (error) {
            console.error('Error checking word:', error);
            alert('Error checking word. Please try again.');
        }
    }

    updateGameBoard() {
        const currentRow = this.gameBoard.children[this.guesses.length - 1];
        const guess = this.guesses[this.guesses.length - 1];
        
        // Create a map to track used letters in the target word
        const usedLetters = new Map();
        for (let i = 0; i < this.currentWord.length; i++) {
            usedLetters.set(i, false);
        }

        // First pass: mark correct letters
        for (let i = 0; i < guess.length; i++) {
            const letterBox = currentRow.children[i];
            letterBox.textContent = guess[i].toUpperCase();
            
            if (guess[i] === this.currentWord[i]) {
                letterBox.classList.add('correct');
                usedLetters.set(i, true);
            }
        }

        // Second pass: mark present and absent letters
        for (let i = 0; i < guess.length; i++) {
            const letterBox = currentRow.children[i];
            
            if (!letterBox.classList.contains('correct')) {
                let found = false;
                for (let j = 0; j < this.currentWord.length; j++) {
                    if (guess[i] === this.currentWord[j] && !usedLetters.get(j)) {
                        letterBox.classList.add('present');
                        usedLetters.set(j, true);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    letterBox.classList.add('absent');
                }
            }
        }
    }

    nextRound() {
        this.currentRound++;
        this.currentWordIndex++;
        this.currentWord = this.gameWords[this.currentWordIndex];
        this.guesses = [];
        
        this.updateGameInfo();
        this.createGameBoard();
    }

    updateGameInfo() {
        this.currentRoundElement.textContent = this.currentRound;
    }

    endGame(isWin) {
        this.gameScreen.classList.add('hidden');
        this.resultScreen.classList.remove('hidden');
        
        const score = this.calculateScore();
        this.finalScoreElement.textContent = `Final Score: ${score} points`;
    }

    calculateScore() {
        let totalScore = 0;
        for (let i = 0; i < this.gameWords.length; i++) {
            const wordGuesses = this.guesses.filter(guess => 
                guess === this.gameWords[i]
            ).length;
            if (wordGuesses > 0) {
                totalScore += (this.maxGuesses - wordGuesses + 1) * 100;
            }
        }
        return totalScore;
    }

    resetGame() {
        this.startScreen.classList.remove('hidden');
        this.gameScreen.classList.add('hidden');
        this.resultScreen.classList.add('hidden');
        this.wordInput.value = '';
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new LingoGame();
});
