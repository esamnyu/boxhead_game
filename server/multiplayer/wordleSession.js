// wordleSession.js - Server-side Wordle game logic

import { getRandomWord, isValidWord } from './words.js';

export class WordleSession {
  constructor(room, io) {
    this.room = room;
    this.io = io;
    this.targetWord = '';
    this.playerStates = new Map();
    this.winnerId = null;
    this.gameOver = false;
  }

  start() {
    // Pick a random word
    this.targetWord = getRandomWord();
    this.winnerId = null;
    this.gameOver = false;

    console.log(`Game started in room ${this.room.id}, word: ${this.targetWord}`);

    // Initialize player states
    this.playerStates.clear();
    for (const [playerId, player] of this.room.players) {
      this.playerStates.set(playerId, {
        name: player.name,
        guesses: [],
        status: 'playing', // 'playing' | 'won' | 'lost'
        solvedAt: null
      });
    }
  }

  submitGuess(playerId, guess) {
    const state = this.playerStates.get(playerId);
    if (!state || state.status !== 'playing') {
      return { valid: false, error: 'Not in game' };
    }

    guess = guess.toUpperCase();

    if (guess.length !== 5) {
      return { valid: false, error: 'Word must be 5 letters' };
    }

    if (!isValidWord(guess)) {
      return { valid: false, error: 'Not in word list' };
    }

    if (state.guesses.length >= 6) {
      return { valid: false, error: 'No more guesses' };
    }

    const colors = this.calculateColors(guess);
    const row = state.guesses.length;
    state.guesses.push({ word: guess, colors });

    // Check win/lose
    if (guess === this.targetWord) {
      state.status = 'won';
      state.solvedAt = Date.now();
      if (!this.winnerId) {
        this.winnerId = playerId;
      }
    } else if (state.guesses.length >= 6) {
      state.status = 'lost';
    }

    // Check if game is over (all players done)
    this.checkGameOver();

    return {
      valid: true,
      guess,
      colors,
      row,
      status: state.status,
      targetWord: state.status !== 'playing' ? this.targetWord : null
    };
  }

  calculateColors(guess) {
    const colors = ['absent', 'absent', 'absent', 'absent', 'absent'];
    const targetLetters = this.targetWord.split('');
    const guessLetters = guess.split('');
    const letterCounts = {};

    // Count letters in target
    for (const letter of targetLetters) {
      letterCounts[letter] = (letterCounts[letter] || 0) + 1;
    }

    // First pass: correct positions (green)
    for (let i = 0; i < 5; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        colors[i] = 'correct';
        letterCounts[guessLetters[i]]--;
      }
    }

    // Second pass: present but wrong position (yellow)
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

  checkGameOver() {
    let allDone = true;
    for (const state of this.playerStates.values()) {
      if (state.status === 'playing') {
        allDone = false;
        break;
      }
    }
    this.gameOver = allDone;
  }

  isGameOver() {
    return this.gameOver;
  }

  getGameOverData() {
    const results = [];

    for (const [playerId, state] of this.playerStates) {
      results.push({
        playerId,
        name: state.name,
        solved: state.status === 'won',
        guesses: state.guesses.length,
        solvedAt: state.solvedAt
      });
    }

    // Sort by solved first, then by number of guesses, then by time
    results.sort((a, b) => {
      if (a.solved && !b.solved) return -1;
      if (!a.solved && b.solved) return 1;
      if (a.solved && b.solved) {
        if (a.guesses !== b.guesses) return a.guesses - b.guesses;
        return (a.solvedAt || 0) - (b.solvedAt || 0);
      }
      return 0;
    });

    return {
      word: this.targetWord,
      winnerId: this.winnerId,
      results
    };
  }
}
