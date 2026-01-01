// Core Wordle game logic
import { isValidWord } from './words.js';

export class WordleGame {
  constructor(targetWord) {
    this.targetWord = targetWord.toUpperCase();
    this.guesses = [];
    this.maxGuesses = 6;
    this.status = 'playing'; // 'playing' | 'won' | 'lost'
  }

  // Submit a guess and get color feedback
  submitGuess(guess) {
    guess = guess.toUpperCase();

    if (guess.length !== 5) {
      return { valid: false, error: 'Word must be 5 letters' };
    }

    if (!isValidWord(guess)) {
      return { valid: false, error: 'Not in word list' };
    }

    if (this.status !== 'playing') {
      return { valid: false, error: 'Game is over' };
    }

    const colors = this.calculateColors(guess);
    this.guesses.push({ word: guess, colors });

    if (guess === this.targetWord) {
      this.status = 'won';
    } else if (this.guesses.length >= this.maxGuesses) {
      this.status = 'lost';
    }

    return {
      valid: true,
      colors,
      guess,
      row: this.guesses.length - 1,
      status: this.status,
      targetWord: this.status !== 'playing' ? this.targetWord : null
    };
  }

  // Calculate color feedback for a guess
  // This handles the tricky duplicate letter logic
  calculateColors(guess) {
    const colors = ['absent', 'absent', 'absent', 'absent', 'absent'];
    const targetLetters = this.targetWord.split('');
    const guessLetters = guess.split('');
    const letterCounts = {};

    // Count letters in target word
    for (const letter of targetLetters) {
      letterCounts[letter] = (letterCounts[letter] || 0) + 1;
    }

    // First pass: mark correct (green) letters
    for (let i = 0; i < 5; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        colors[i] = 'correct';
        letterCounts[guessLetters[i]]--;
      }
    }

    // Second pass: mark present (yellow) letters
    for (let i = 0; i < 5; i++) {
      if (colors[i] === 'correct') continue;

      const letter = guessLetters[i];
      if (letterCounts[letter] > 0) {
        colors[i] = 'present';
        letterCounts[letter]--;
      }
    }

    return colors;
  }

  // Get keyboard letter states based on all guesses
  getKeyboardState() {
    const state = {};

    for (const { word, colors } of this.guesses) {
      for (let i = 0; i < 5; i++) {
        const letter = word[i];
        const color = colors[i];

        // Priority: correct > present > absent
        if (color === 'correct') {
          state[letter] = 'correct';
        } else if (color === 'present' && state[letter] !== 'correct') {
          state[letter] = 'present';
        } else if (!state[letter]) {
          state[letter] = 'absent';
        }
      }
    }

    return state;
  }

  // Get current game state for syncing
  getState() {
    return {
      guesses: this.guesses,
      status: this.status,
      currentRow: this.guesses.length,
      targetWord: this.status !== 'playing' ? this.targetWord : null
    };
  }
}
