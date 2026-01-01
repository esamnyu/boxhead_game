# Wordle for Friends - Development Guide

## Project Vision

A real-time multiplayer Wordle game where friends race to solve the same word while watching each other type letters in real-time. The tension of seeing opponents close to solving creates an exciting competitive experience.

## Core Game Mechanics

### Standard Wordle Rules
- **5-letter words** - All guesses and solutions are exactly 5 letters
- **6 attempts** - Players have 6 guesses to find the word
- **Color feedback:**
  - Green - Correct letter in correct position
  - Yellow - Correct letter in wrong position
  - Gray - Letter not in word

### Real-Time Multiplayer Twist
- Players see each other's current row updating live (letters appearing/disappearing)
- Players do NOT see each other's color feedback (that would make it too easy)
- Creates psychological pressure and racing dynamics

## Architecture

### Tech Stack
- **Client:** Vanilla JS (ES6 modules), Canvas/DOM hybrid
- **Server:** Node.js, Express, Socket.IO
- **No database needed for MVP** - all state in memory

### Client-Server Model
- Server is authoritative (word selection, validation, win detection)
- Client handles UI (rendering, animations, input)
- Real-time sync via WebSocket

## File Structure

```
/
├── index.html                 # Entry point
├── main.js                    # Game initialization
├── config.js                  # Game settings
├── CLAUDE.md                  # This file
│
├── game/                      # Core game logic
│   ├── wordleGame.js         # Game state machine
│   ├── wordValidator.js      # Guess validation
│   └── words.js              # Word lists
│
├── ui/                        # User interface
│   ├── gameBoard.js          # Letter grid
│   ├── keyboard.js           # On-screen keyboard
│   ├── playerList.js         # Other players' progress
│   └── animations.js         # Visual effects
│
├── network/                   # Multiplayer
│   ├── multiplayerClient.js  # Socket.IO wrapper
│   ├── roomUI.js             # Lobby UI
│   └── syncManager.js        # State sync
│
└── server/                    # Backend
    ├── index.js              # Express + Socket.IO
    └── multiplayer/
        ├── gameServer.js     # Socket handlers
        ├── roomManager.js    # Room system
        └── wordleSession.js  # Game logic
```

## Real-Time Sync Protocol

### Letter Input (every keystroke)
```javascript
// Client → Server
socket.emit('letter-input', { letters: 'HEL' });

// Server → Other players
socket.to(room).emit('player-typing', {
  playerId: 'abc',
  letterCount: 3  // Show progress, not actual letters
});
```

### Guess Submission
```javascript
// Client → Server
socket.emit('submit-guess', { guess: 'HELLO' });

// Server → Submitting player only
socket.emit('guess-result', {
  guess: 'HELLO',
  colors: ['green', 'gray', 'yellow', 'gray', 'gray'],
  row: 0
});

// Server → Other players
socket.to(room).emit('player-guessed', {
  playerId: 'abc',
  row: 0  // Just which row, no spoilers
});
```

## Duplicate Letter Rule

The trickiest part of Wordle. Example:
- Word: `APPLE`
- Guess: `PAPER`
- Result: P(yellow) A(yellow) P(green) E(yellow) R(gray)

**Rule:** Green matches first, then yellow for remaining. Never mark more instances than exist in answer.

## Color Palette

```css
--correct: #6aaa64;    /* Green */
--present: #c9b458;    /* Yellow */
--absent: #787c7e;     /* Gray */
--key-bg: #818384;     /* Keyboard */
--bg: #121213;         /* Background */
--tile-border: #3a3a3c;
--text: #ffffff;
```

## Game States

```
LOBBY → PLAYING → FINISHED
         ↓
      (per player)
    GUESSING → WON/LOST
```

## Win Conditions

1. **Winner:** First player to guess correctly
2. **Loser:** Used all 6 guesses without solving
3. **Game ends:** When first player wins OR all players lose

## Development Phases

### Phase 1: Core Game
- [x] Word lists (solutions + valid guesses)
- [ ] Game board rendering
- [ ] Keyboard input (physical + on-screen)
- [ ] Color feedback calculation
- [ ] Win/lose detection

### Phase 2: Multiplayer
- [ ] Adapt room/lobby from existing code
- [ ] Server-side game session
- [ ] Real-time letter broadcasting
- [ ] Player progress display

### Phase 3: Polish
- [ ] Flip animations
- [ ] Shake on invalid word
- [ ] Victory celebration
- [ ] Mobile touch support
- [ ] Sound effects (optional)

## Security Notes

- Word validation server-side only
- Never send solution to client until game ends
- Rate limit guesses (prevent brute force)
- Sanitize player names

## Testing Checklist

- [ ] Duplicate letter coloring works
- [ ] Real-time sync with 2-8 players
- [ ] Disconnect/reconnect handling
- [ ] Mobile keyboard works
- [ ] All 2309 solution words are valid guesses
