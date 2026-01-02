// Wordle for Friends - Main Entry Point
import { GameBoard } from './ui/gameBoard.js';
import { Keyboard } from './ui/keyboard.js';
import { CONFIG } from './config.js';

class WordleApp {
  constructor() {
    this.socket = null;
    this.playerName = '';
    this.roomCode = '';
    this.isHost = false;
    this.isReady = false;
    this.players = new Map();
    this.gameBoard = null;
    this.keyboard = null;
    this.gameActive = false;
    this.currentInput = '';
    this.myStatus = 'playing'; // 'playing' | 'won' | 'lost'
    this.gameMode = 'competitive'; // 'competitive' | 'collaborative'
    this.collaborativeLetters = ''; // Shared letters in collaborative mode

    this.init();
  }

  init() {
    this.bindLobbyEvents();
    this.loadSavedName();
  }

  loadSavedName() {
    const saved = localStorage.getItem('wordlePlayerName');
    if (saved) {
      document.getElementById('player-name').value = saved;
    }
  }

  saveName(name) {
    localStorage.setItem('wordlePlayerName', name);
  }

  bindLobbyEvents() {
    // Create room
    document.getElementById('create-room-btn').addEventListener('click', () => {
      this.playerName = document.getElementById('player-name').value.trim() || 'Player';
      this.saveName(this.playerName);
      const selectedMode = document.querySelector('input[name="game-mode"]:checked').value;
      this.gameMode = selectedMode;
      this.connectAndCreateRoom();
    });

    // Show join section
    document.getElementById('join-room-btn').addEventListener('click', () => {
      document.getElementById('join-section').style.display = 'block';
      document.getElementById('room-code-input').focus();
    });

    // Submit join
    document.getElementById('submit-join-btn').addEventListener('click', () => {
      this.playerName = document.getElementById('player-name').value.trim() || 'Player';
      this.saveName(this.playerName);
      const code = document.getElementById('room-code-input').value.trim().toUpperCase();
      if (code.length === 6) {
        this.connectAndJoinRoom(code);
      }
    });

    // Enter key for room code
    document.getElementById('room-code-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('submit-join-btn').click();
      }
    });

    // Ready button
    document.getElementById('ready-btn').addEventListener('click', () => {
      this.toggleReady();
    });

    // Start button (host only)
    document.getElementById('start-btn').addEventListener('click', () => {
      if (this.isHost) {
        this.socket.emit('start-game');
      }
    });

    // Play again
    document.getElementById('play-again-btn').addEventListener('click', () => {
      document.getElementById('results').classList.add('hidden');
      if (this.isHost) {
        this.socket.emit('start-game');
      }
    });
  }

  async connectToServer() {
    // Dynamically load Socket.IO
    if (!window.io) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    const serverUrl = this.getServerUrl();
    this.socket = io(serverUrl);

    return new Promise((resolve, reject) => {
      this.socket.on('connect', () => {
        console.log('Connected to server');
        this.bindSocketEvents();
        resolve();
      });

      this.socket.on('connect_error', (err) => {
        console.error('Connection error:', err);
        this.showMessage('Failed to connect to server');
        reject(err);
      });
    });
  }

  getServerUrl() {
    // Use localhost for development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return CONFIG.DEV_SERVER_URL;
    }
    // Use production server URL (Railway)
    if (CONFIG.PRODUCTION_SERVER_URL) {
      return CONFIG.PRODUCTION_SERVER_URL;
    }
    // Fallback - shouldn't happen in production
    console.warn('No production server URL configured!');
    return CONFIG.DEV_SERVER_URL;
  }

  bindSocketEvents() {
    // Room created
    this.socket.on('room-created', (data) => {
      this.roomCode = data.joinCode;
      this.isHost = true;
      this.gameMode = data.gameMode || 'competitive';
      this.showWaitingRoom();
    });

    // Room joined
    this.socket.on('room-joined', (data) => {
      this.roomCode = data.joinCode;
      this.isHost = data.isHost;
      this.showWaitingRoom();
    });

    // Room update
    this.socket.on('room-update', (data) => {
      this.updateWaitingRoom(data);
    });

    // Game starting
    this.socket.on('game-start', (data) => {
      this.startGame(data);
    });

    // Player typing (real-time)
    this.socket.on('player-typing', (data) => {
      this.updatePlayerTyping(data);
    });

    // Collaborative mode - real-time letter updates
    this.socket.on('collab-update', (data) => {
      this.handleCollabUpdate(data);
    });

    // Collaborative mode - someone is submitting
    this.socket.on('collab-submitting', (data) => {
      this.handleCollabSubmitting(data);
    });

    // Collaborative mode - guess result for all players
    this.socket.on('collab-result', (data) => {
      this.handleCollabResult(data);
    });

    // Player submitted guess (competitive mode)
    this.socket.on('player-guessed', (data) => {
      this.updatePlayerProgress(data);
    });

    // Guess result (your own guess in competitive mode)
    this.socket.on('guess-result', (data) => {
      this.handleGuessResult(data);
    });

    // Game over
    this.socket.on('game-over', (data) => {
      this.handleGameOver(data);
    });

    // Errors
    this.socket.on('error', (msg) => {
      this.showMessage(msg);
    });
  }

  async connectAndCreateRoom() {
    try {
      await this.connectToServer();
      this.socket.emit('create-room', {
        playerName: this.playerName,
        gameMode: this.gameMode
      });
    } catch (err) {
      console.error('Failed to create room:', err);
    }
  }

  async connectAndJoinRoom(code) {
    try {
      await this.connectToServer();
      this.socket.emit('join-room', { joinCode: code, playerName: this.playerName });
    } catch (err) {
      console.error('Failed to join room:', err);
    }
  }

  showWaitingRoom() {
    document.getElementById('lobby').classList.add('hidden');
    document.getElementById('waiting-room').classList.remove('hidden');
    document.getElementById('display-room-code').textContent = this.roomCode;

    // Show game mode
    const modeDisplay = document.getElementById('game-mode-display');
    modeDisplay.textContent = this.gameMode === 'collaborative'
      ? 'Mode: Collaborative (Work Together!)'
      : 'Mode: Competitive (Race!)';

    if (this.isHost) {
      document.getElementById('start-btn').style.display = 'block';
    }
  }

  updateWaitingRoom(data) {
    const container = document.getElementById('waiting-players');
    container.innerHTML = '';

    this.players = new Map(Object.entries(data.players));

    for (const [id, player] of this.players) {
      const el = document.createElement('div');
      el.className = 'waiting-player' + (player.ready ? ' ready' : '');
      el.innerHTML = `
        <span>${player.name}</span>
        ${player.isHost ? '<span style="color: var(--present);">HOST</span>' : ''}
      `;
      container.appendChild(el);
    }

    // Update start button
    const allReady = [...this.players.values()].every(p => p.ready);
    const startBtn = document.getElementById('start-btn');
    startBtn.disabled = !allReady || this.players.size < 1;
  }

  toggleReady() {
    this.isReady = !this.isReady;
    const btn = document.getElementById('ready-btn');
    btn.classList.toggle('ready', this.isReady);
    btn.textContent = this.isReady ? 'Ready!' : 'Ready';
    this.socket.emit('player-ready', { ready: this.isReady });
  }

  startGame(data) {
    // Set game mode from server
    this.gameMode = data.gameMode || 'competitive';

    // Hide waiting room, show game
    document.getElementById('waiting-room').classList.add('hidden');
    document.getElementById('game-header').style.display = 'flex';
    document.getElementById('game-main').style.display = 'flex';
    document.getElementById('keyboard').style.display = 'block';

    if (this.gameMode === 'competitive') {
      document.getElementById('players-panel').classList.add('visible');
    } else {
      // Show collaborative status bar
      const statusEl = document.getElementById('collab-status');
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.textContent = '🤝 Working together...';
        statusEl.style.background = 'var(--tile-border)';
        setTimeout(() => {
          statusEl.style.display = 'none';
        }, 2000);
      }
    }

    // Update header
    document.getElementById('header-room-code').textContent = this.roomCode;
    const modeText = this.gameMode === 'collaborative' ? 'Collaborative' : 'Competitive';
    document.getElementById('header-player-count').textContent = `${this.players.size} players • ${modeText}`;

    // Initialize game board and keyboard
    this.gameBoard = new GameBoard('game-board');
    this.keyboard = new Keyboard('keyboard', (key) => this.handleKeyPress(key));

    this.gameActive = true;
    this.currentInput = '';
    this.collaborativeLetters = '';
    this.myStatus = 'playing';

    // Update players panel (for competitive mode)
    if (this.gameMode === 'competitive') {
      this.updatePlayersPanel();
    }
  }

  handleKeyPress(key) {
    if (!this.gameActive || this.myStatus !== 'playing') return;

    if (key === 'ENTER') {
      this.submitGuess();
    } else if (key === 'BACK') {
      if (this.gameMode === 'collaborative') {
        // In collaborative mode, work with shared letters
        if (this.collaborativeLetters.length > 0) {
          this.collaborativeLetters = this.collaborativeLetters.slice(0, -1);
          this.gameBoard.removeLetter();
          this.broadcastCollabTyping();
        }
      } else {
        // Competitive mode
        if (this.currentInput.length > 0) {
          this.currentInput = this.currentInput.slice(0, -1);
          this.gameBoard.removeLetter();
          this.broadcastTyping();
        }
      }
    } else if (/^[A-Z]$/.test(key)) {
      if (this.gameMode === 'collaborative') {
        // In collaborative mode, work with shared letters
        if (this.collaborativeLetters.length < 5) {
          this.collaborativeLetters += key;
          this.gameBoard.addLetter(key);
          this.broadcastCollabTyping();
        }
      } else {
        // Competitive mode
        if (this.currentInput.length < 5) {
          this.currentInput += key;
          this.gameBoard.addLetter(key);
          this.broadcastTyping();
        }
      }
    }
  }

  broadcastTyping() {
    if (this.socket) {
      this.socket.emit('typing', {
        letterCount: this.currentInput.length,
        row: this.gameBoard.currentRow
      });
    }
  }

  broadcastCollabTyping() {
    if (this.socket) {
      this.socket.emit('collab-typing', {
        letters: this.collaborativeLetters,
        row: this.gameBoard.currentRow,
        playerName: this.playerName
      });
    }
  }

  handleCollabUpdate(data) {
    // Don't update if it's from me
    if (data.playerId === this.socket.id) return;

    // Update the shared collaborative letters
    this.collaborativeLetters = data.letters;

    // Clear and redraw the current row with the new letters
    this.gameBoard.clearCurrentRow();
    for (let i = 0; i < this.collaborativeLetters.length; i++) {
      this.gameBoard.addLetter(this.collaborativeLetters[i]);
    }

    // Show collaborative status
    this.updateCollabStatus(data.playerName, data.letters);
  }

  handleCollabSubmitting(data) {
    // Someone else is submitting the guess
    this.updateCollabStatus(`${data.playerName} submitting`, data.guess, true);
    this.showMessage(`${data.playerName} submitting "${data.guess}"...`, 1000);
  }

  updateCollabStatus(playerName, text, isSubmitting = false) {
    const statusEl = document.getElementById('collab-status');
    if (!statusEl) return;

    if (text && text.length > 0) {
      statusEl.style.display = 'block';
      if (isSubmitting) {
        statusEl.style.background = 'var(--correct)';
        statusEl.textContent = `⏎ ${playerName}: ${text}`;
      } else {
        statusEl.style.background = 'var(--present)';
        statusEl.textContent = `✎ ${playerName}: ${text}`;
      }

      // Auto-hide after a delay if not submitting
      if (!isSubmitting) {
        setTimeout(() => {
          if (!isSubmitting) {
            statusEl.style.display = 'none';
          }
        }, 1500);
      }
    } else {
      statusEl.style.display = 'none';
    }
  }

  handleCollabResult(data) {
    // Hide status bar
    const statusEl = document.getElementById('collab-status');
    if (statusEl) statusEl.style.display = 'none';

    // All players receive the same result simultaneously
    if (!data.valid) {
      this.gameBoard.shakeRow();
      this.showMessage(data.error);
      return;
    }

    const isMe = data.submitterId === this.socket.id;
    const submitterText = isMe ? 'You' : data.submitterName;

    // Update status to show result is being revealed
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.style.background = 'var(--correct)';
      statusEl.textContent = `✓ ${submitterText} submitted: ${data.guess}`;
    }

    // Reveal colors with animation (synchronized for all players)
    this.gameBoard.revealRow(data.row, data.colors, () => {
      // Update keyboard colors
      this.updateKeyboardColors(data.guess, data.colors);

      // Hide status bar after animation
      setTimeout(() => {
        if (statusEl) statusEl.style.display = 'none';
      }, 500);

      if (data.status === 'won') {
        this.gameBoard.bounceRow(data.row);
        this.myStatus = 'won';
        const message = isMe ? '🎉 You won it for the team!' : `🎉 ${data.submitterName} won it for the team!`;
        this.showMessage(message, 3000);
      } else if (data.status === 'lost') {
        this.myStatus = 'lost';
      }
    });

    // Move to next row
    this.gameBoard.nextRow();
    this.currentInput = '';
    this.collaborativeLetters = '';
  }

  submitGuess() {
    const guess = this.gameMode === 'collaborative' ? this.collaborativeLetters : this.currentInput;

    if (guess.length !== 5) {
      this.gameBoard.shakeRow();
      this.showMessage('Not enough letters');
      return;
    }

    this.socket.emit('submit-guess', { guess });
  }

  handleGuessResult(data) {
    if (!data.valid) {
      this.gameBoard.shakeRow();
      this.showMessage(data.error);
      return;
    }

    // Reveal colors with animation
    this.gameBoard.revealRow(data.row, data.colors, () => {
      // Update keyboard colors
      this.updateKeyboardColors(data.guess, data.colors);

      if (data.status === 'won') {
        this.gameBoard.bounceRow(data.row);
        this.myStatus = 'won';
        const message = this.gameMode === 'collaborative' ? 'Team won!' : 'You got it!';
        this.showMessage(message);
      } else if (data.status === 'lost') {
        this.myStatus = 'lost';
      }
    });

    // Move to next row
    this.gameBoard.nextRow();
    this.currentInput = '';
    this.collaborativeLetters = '';
  }

  updateKeyboardColors(guess, colors) {
    const keyStates = this.keyboard.keys;
    const newStates = {};

    for (let i = 0; i < 5; i++) {
      const letter = guess[i];
      const color = colors[i];
      const currentState = keyStates[letter]?.classList;

      // Priority: correct > present > absent
      if (color === 'correct') {
        newStates[letter] = 'correct';
      } else if (color === 'present' && !currentState?.contains('correct')) {
        newStates[letter] = 'present';
      } else if (color === 'absent' && !currentState?.contains('correct') && !currentState?.contains('present')) {
        newStates[letter] = 'absent';
      }
    }

    this.keyboard.updateKeyStates(newStates);
  }

  updatePlayerTyping(data) {
    const playerEl = document.querySelector(`[data-player-id="${data.playerId}"]`);
    if (playerEl) {
      const typingEl = playerEl.querySelector('.player-typing');
      if (data.letterCount > 0) {
        typingEl.textContent = '.'.repeat(data.letterCount);
        typingEl.style.display = 'block';
      } else {
        typingEl.style.display = 'none';
      }
    }
  }

  updatePlayerProgress(data) {
    const playerEl = document.querySelector(`[data-player-id="${data.playerId}"]`);
    if (playerEl) {
      const dots = playerEl.querySelectorAll('.progress-dot');
      if (dots[data.row]) {
        dots[data.row].classList.add(data.solved ? 'correct' : 'used');
      }

      const typingEl = playerEl.querySelector('.player-typing');
      typingEl.style.display = 'none';
    }
  }

  updatePlayersPanel() {
    const container = document.getElementById('players-list');
    container.innerHTML = '';

    for (const [id, player] of this.players) {
      if (id === this.socket.id) continue;

      const el = document.createElement('div');
      el.className = 'player-item';
      el.dataset.playerId = id;
      el.innerHTML = `
        <div class="player-avatar">${player.name[0].toUpperCase()}</div>
        <div class="player-info">
          <div class="player-name">${player.name}</div>
          <div class="player-progress">
            ${[0,1,2,3,4,5].map(() => '<div class="progress-dot"></div>').join('')}
          </div>
          <div class="player-typing" style="display: none;"></div>
        </div>
      `;
      container.appendChild(el);
    }
  }

  handleGameOver(data) {
    this.gameActive = false;

    const resultsEl = document.getElementById('results');
    const titleEl = document.getElementById('results-title');
    const wordEl = document.getElementById('results-word');
    const statsEl = document.getElementById('results-stats');

    if (data.winnerId === this.socket.id) {
      titleEl.textContent = 'You Won!';
    } else if (data.winnerId) {
      const winner = this.players.get(data.winnerId);
      titleEl.textContent = `${winner?.name || 'Someone'} Won!`;
    } else {
      titleEl.textContent = 'Game Over';
    }

    wordEl.textContent = data.word;

    statsEl.innerHTML = data.results.map(r => `
      <div class="stat-row">
        <span>${r.name}</span>
        <span>${r.solved ? `${r.guesses} guesses` : 'DNF'}</span>
      </div>
    `).join('');

    resultsEl.classList.remove('hidden');

    const playAgainBtn = document.getElementById('play-again-btn');
    playAgainBtn.style.display = this.isHost ? 'block' : 'none';
  }

  showMessage(text, duration = 1500) {
    const msgEl = document.getElementById('message');
    msgEl.textContent = text;
    msgEl.classList.add('visible');

    setTimeout(() => {
      msgEl.classList.remove('visible');
    }, duration);
  }
}

// Start the app
window.addEventListener('DOMContentLoaded', () => {
  new WordleApp();
});
