# Hide & Seek 3D

A 3D multiplayer hide and seek web game built with vanilla JavaScript, Three.js, and Firebase. Players can hide as objects in a 3D environment or seek out other players in this fun, interactive game that can be deployed on GitHub Pages.

![Hide & Seek 3D Game](https://via.placeholder.com/800x400?text=Hide+%26+Seek+3D+Screenshot)

## Features

- **Lobby System**: Create or join games with up to 10 players
- **3D World**: Block-based environment with different object types (floor, tree, bush, water)
- **Player Roles**: Play as either a Hider or Seeker
- **Disguise Mechanics**: Hiders can disguise themselves as various objects
- **Elimination System**: Seekers must hit hiders 3 times to eliminate them
- **Real-time Networking**: Serverless P2P networking via Firebase
- **Mobile Support**: Touch controls for mobile devices
- **Solo Testing**: Test the game mechanics without other players
- **Pop-up Notifications**: In-game alerts and messages
- **Clean UI**: White/light-blue theme with smooth rounded design

## Setup Guide

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/hidenseek.git
cd hidenseek
```

### Step 2: Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Once your project is created, click on "Realtime Database" in the left sidebar
4. Click "Create Database" and start in test mode
5. Set the security rules to allow read/write access:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
6. Go to Project Settings (gear icon) > General > Your apps
7. Click the web icon (</>) to add a web app
8. Register your app with a nickname (e.g., "Hide & Seek 3D")
9. Copy the Firebase configuration object

### Step 3: Configure the Game

1. Open `main.js` in your code editor
2. Find the Firebase configuration section at the top:
   ```javascript
   const FIREBASE_CONFIG = {
       apiKey: "your-api-key-here",
       authDomain: "your-project.firebaseapp.com",
       databaseURL: "https://your-project-default-rtdb.firebaseio.com/",
       projectId: "your-project-id",
       storageBucket: "your-project.appspot.com",
       messagingSenderId: "123456789",
       appId: "your-app-id"
   };
   ```
3. Replace the placeholder values with your Firebase configuration

### Step 4: Test Locally

#### Using Visual Studio Code:
1. Install the "Live Server" extension
2. Right-click on `index.html` and select "Open with Live Server"
3. The game will open in your default browser

#### Using Python's built-in server:
```bash
# Python 3
python -m http.server

# Python 2
python -m SimpleHTTPServer
```
Then open `http://localhost:8000` in your browser

#### Using Node.js:
1. Install http-server: `npm install -g http-server`
2. Run: `http-server`
3. Open `http://localhost:8080` in your browser

### Step 5: Deploy to GitHub Pages

1. Create a GitHub repository
2. Push your code to the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/hidenseek.git
   git push -u origin main
   ```
3. Go to your repository on GitHub
4. Click on "Settings" > "Pages"
5. Under "Source", select the branch you want to deploy (usually `main`)
6. Click "Save"
7. Your game will be available at `https://yourusername.github.io/hidenseek/`

## Game Controls

### Desktop Controls
- **WASD**: Move character
- **Mouse**: Look around
- **Left Click**: Attack (as Seeker)
- **1-4 Keys**: Change disguise (as Hider)
- **Shift**: Sprint
- **Space**: Jump
- **ESC**: Game menu

### Mobile Controls
- **Virtual Joystick**: Move character
- **Swipe**: Look around
- **Sprint Button**: Sprint
- **Jump Button**: Jump
- **Disguise Buttons**: Change disguise (as Hider)

## How to Play

1. **Create or Join a Game**:
   - Click "Create Game" to host a new game
   - Click "Join Game" and enter a game code to join an existing game
   - Click "Solo Test" to practice with AI bots

2. **In the Lobby**:
   - Wait for other players to join
   - The host can start the game when ready
   - Players are randomly assigned as Hiders or Seekers

3. **During the Game**:
   - **As a Hider**:
     - Use the head start to find a good hiding spot
     - Press 1-4 to disguise as different objects
     - Stay still when disguised to avoid detection
   - **As a Seeker**:
     - Wait for the countdown to finish before seeking
     - Look for objects that seem out of place
     - Left-click to hit suspected hiders
     - Eliminate hiders by hitting them 3 times

4. **Game End**:
   - Game ends when all Hiders are eliminated or time runs out
   - Hiders win if at least one survives until the end
   - Seekers win if they eliminate all Hiders

## Customization

### Map Customization

You can customize the game map by editing the `map.json` file. The map consists of blocks with different types:

- **floor**: Basic floor blocks
- **tree**: Tall objects for hiding behind
- **bush**: Medium-sized objects for hiding
- **water**: Transparent blocks with special effects

### Game Settings

You can modify game settings in the `main.js` file:

- Game duration
- Maximum players
- Hider lives
- Player speed
- Disguise options

## Troubleshooting

1. **Firebase Connection Issues**:
   - Verify your Firebase configuration
   - Check if your Realtime Database rules allow read/write
   - Look for errors in the browser console (F12)

2. **Performance Issues**:
   - Reduce the number of blocks in the map
   - Close other browser tabs and applications
   - Try a different browser

3. **Mobile Compatibility**:
   - Use landscape orientation for better controls
   - Ensure your device supports WebGL
   - Update your browser to the latest version

## Development

The game consists of four main files:

- **index.html**: Contains the HTML structure and UI elements
- **styles.css**: Defines the styling with a white/light-blue theme
- **main.js**: Contains all game logic, networking, and 3D rendering
- **map.json**: Defines the game map with block types and positions

The BUGLOG at the top of `main.js` tracks issues and improvements.

## License

This project is open source and available under the MIT License.

## Credits

- Three.js for 3D rendering: [https://threejs.org/](https://threejs.org/)
- Firebase for real-time networking: [https://firebase.google.com/](https://firebase.google.com/)