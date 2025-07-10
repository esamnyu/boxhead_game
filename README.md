# Boxhead Multiplayer Game

A real-time multiplayer zombie survival game built with vanilla JavaScript and Socket.IO. Players can create or join rooms using join codes and battle waves of zombies together.

## Features

- **Real-time Multiplayer**: Create rooms with unique join codes that friends can use to connect from anywhere
- **Optimized Performance**: 60 FPS with 100+ enemies using advanced optimization techniques
- **Multiple Weapons**: Pistol, SMG, Shotgun, Sniper, Grenade Launcher, Flamethrower, and more
- **Enemy Variety**: Different zombie types including fast zombies, tanks, and bosses
- **Power-ups**: Health packs, weapon upgrades, speed boosts
- **Wave System**: Progressively harder waves with more enemies
- **Persistent Saves**: Local save system for single-player progress

## Quick Start

### Single Player (Local)

1. Open `index.html` directly in your browser, or
2. Run a local server:
   ```bash
   python3 -m http.server 8000
   # or
   node server.js
   ```
3. Navigate to `http://localhost:8000`

### Multiplayer Setup

1. **Install server dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Start the multiplayer server:**
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

3. **Open the game** in your browser and press `M` to access multiplayer

4. **Create or Join a Room:**
   - Click "Create Room" to generate a 6-character join code
   - Share the join code with friends
   - Friends click "Join Room" and enter the code

## Controls

- **WASD / Arrow Keys**: Move
- **Mouse**: Aim
- **Left Click**: Shoot
- **Number Keys (1-6)**: Switch weapons
- **M**: Open multiplayer menu
- **ESC**: Pause game

## Deployment

### Deploy the Game Server

#### Option 1: Heroku
```bash
cd server
heroku create your-game-name
heroku config:set CLIENT_URL=https://your-game-domain.com
git push heroku main
```

#### Option 2: AWS EC2 / DigitalOcean
1. Set up Node.js on your server
2. Clone the repository
3. Configure environment variables in `.env.production`
4. Run with PM2:
   ```bash
   npm install -g pm2
   pm2 start index.js --name boxhead-server
   ```

#### Option 3: Railway / Render
- Connect your GitHub repository
- Set environment variables in the dashboard
- Deploy automatically on push

### Deploy the Client

1. **GitHub Pages** (easiest):
   - Push to GitHub
   - Enable GitHub Pages in repository settings
   - Update `multiplayerClient.connect()` URL in the code

2. **Netlify / Vercel**:
   - Drop the project folder into their dashboard
   - Configure the server URL

## Network Architecture

- **WebSocket Communication**: Real-time bidirectional communication using Socket.IO
- **Authoritative Server**: Server handles all game logic to prevent cheating
- **Client Prediction**: Smooth gameplay despite network latency
- **Delta Compression**: Only changes are sent to minimize bandwidth (5-10KB/s per player)
- **Binary Serialization**: Efficient data encoding for network packets

## Performance Optimizations

- **Collision System**: Integer-based spatial hashing, object pooling, collision layers
- **Rendering**: Batched draw calls, offscreen canvas caching
- **Memory**: Pre-allocated object pools to minimize garbage collection
- **Network**: Binary serialization, delta compression, entity interpolation

See [OPTIMIZATIONS.md](OPTIMIZATIONS.md) for detailed performance information.

## Configuration

### Server Environment Variables

Create a `.env` file in the server directory:

```env
PORT=3001
CLIENT_URL=http://localhost:3000
MAX_PLAYERS_PER_ROOM=8
ROOM_CODE_LENGTH=6
TICK_RATE=60
```

### Client Configuration

Update the server URL in `network/multiplayerClient.js`:
```javascript
connect(serverUrl = 'https://your-server-url.com')
```

## Development

### Project Structure
```
├── index.html          # Main game HTML
├── main.js            # Game entry point
├── config.js          # Game configuration
├── engine/            # Core engine (rendering, input, game loop)
├── entities/          # Game entities (player, enemies, bullets)
├── systems/           # Game systems (collision, audio, saves)
├── network/           # Multiplayer client code
├── ui/               # User interface components
├── server/           # Multiplayer server
│   ├── index.js      # Server entry point
│   └── multiplayer/  # Room management, game sessions
└── OPTIMIZATIONS.md  # Performance documentation
```

### Adding New Features

1. **New Weapons**: Add to `config.js` and update `player.js`
2. **New Enemies**: Add to `CONFIG.ENEMY_TYPES` and update `enemy.js`
3. **New Power-ups**: Add to `CONFIG.POWERUP_TYPES` and update `powerup.js`

## Troubleshooting

### Can't connect to multiplayer server
- Check that the server is running (`npm start` in server directory)
- Verify the server URL in the client code
- Check firewall settings for port 3001

### Join code not working
- Codes are case-insensitive but must be exact
- Codes expire after 30 minutes of inactivity
- Maximum 8 players per room by default

### Performance issues
- Ensure hardware acceleration is enabled in your browser
- Close other demanding applications
- Try reducing the number of particles in `config.js`

## License

MIT License - feel free to use this code for your own projects!

## Credits

Built with ❤️ using vanilla JavaScript and Socket.IO