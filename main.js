/**
 * Hide & Seek 3D - Main Game Logic
 * Zero-budget implementation with vanilla JS, Three.js, and Firebase
 * 
 * BUGLOG:
 * - Initial implementation - no known bugs yet
 * - TODO: Test all systems thoroughly
 * - TODO: Optimize performance for mobile devices
 * - TODO: Add more robust error handling
 */

// ============================================================================
// GLOBAL VARIABLES & CONFIGURATION
// ============================================================================

// Firebase Configuration (Replace with your own)
const FIREBASE_CONFIG = {
    apiKey: "your-api-key-here",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com/",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Game State
let gameState = {
    currentScreen: 'loading',
    gameCode: null,
    playerId: null,
    playerName: null,
    isHost: false,
    role: 'hider', // 'hider' or 'seeker'
    players: {},
    gameStarted: false,
    gameTime: 300, // 5 minutes
    hits: 0,
    maxHits: 3,
    disguise: null,
    isDisguised: false
};

// Three.js Variables
let scene, camera, renderer, controls;
let mapData = null;
let mapBlocks = [];
let players3D = {};
let playerMesh = null;
let keys = {};
let mouse = { x: 0, y: 0 };
let isPointerLocked = false;

// Firebase Variables
let database = null;
let gameRef = null;
let playersRef = null;
let positionUpdateInterval = null;

// Mobile Controls
let joystickActive = false;
let joystickCenter = { x: 0, y: 0 };
let joystickPosition = { x: 0, y: 0 };

// Game Timer
let gameTimer = null;
let gameStartTime = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the game when page loads
 */
window.addEventListener('load', async () => {
    try {
        console.log('🎮 Initializing Hide & Seek 3D...');
        
        // Load map data
        await loadMapData();
        
        // Initialize Firebase
        initializeFirebase();
        
        // Initialize Three.js
        initializeThreeJS();
        
        // Setup event listeners
        setupEventListeners();
        
        // Generate player ID and name
        gameState.playerId = generatePlayerId();
        gameState.playerName = generatePlayerName();
        
        // Show main menu
        showScreen('main-menu');
        
        console.log('✅ Game initialized successfully');
        showPopup('Game loaded successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Failed to initialize game:', error);
        showPopup('Failed to load game. Please refresh.', 'error');
    }
});

/**
 * Load map data from JSON file
 */
async function loadMapData() {
    try {
        const response = await fetch('map.json');
        mapData = await response.json();
        console.log('📍 Map data loaded:', mapData.name);
    } catch (error) {
        console.error('❌ Failed to load map data:', error);
        // Fallback map data
        mapData = createFallbackMap();
    }
}

/**
 * Create fallback map if JSON fails to load
 */
function createFallbackMap() {
    return {
        name: "Fallback Arena",
        size: { width: 2, height: 2 },
        blockSize: 10,
        spawnPoints: [
            { x: 5, z: 5, y: 1 },
            { x: 15, z: 5, y: 1 },
            { x: 5, z: 15, y: 1 },
            { x: 15, z: 15, y: 1 }
        ],
        blocks: [
            { type: "floor", position: { x: 0, y: 0, z: 0 }, size: { width: 20, height: 0.5, depth: 20 }, color: "#f0f8ff", solid: true }
        ],
        disguisePresets: {
            floor: { type: "floor", size: { width: 1, height: 0.3, depth: 1 }, color: "#f0f8ff" }
        },
        gameSettings: {
            maxPlayers: 10,
            gameDuration: 300,
            hiderLives: 3,
            playerSpeed: 5
        }
    };
}

/**
 * Initialize Firebase connection
 */
function initializeFirebase() {
    try {
        // Check if Firebase config is set
        if (FIREBASE_CONFIG.apiKey === 'your-api-key-here') {
            console.warn('⚠️ Firebase not configured - using offline mode');
            showPopup('Running in offline mode. Multiplayer disabled.', 'warning');
            return;
        }
        
        firebase.initializeApp(FIREBASE_CONFIG);
        database = firebase.database();
        console.log('🔥 Firebase initialized');
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        showPopup('Multiplayer unavailable. Playing offline.', 'warning');
    }
}

/**
 * Initialize Three.js scene, camera, and renderer
 */
function initializeThreeJS() {
    const canvas = document.getElementById('game-canvas');
    
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    scene.fog = new THREE.Fog(0x87ceeb, 50, 200);
    
    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(10, 15, 10);
    camera.lookAt(10, 0, 10);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Create map
    createMap();
    
    console.log('🎨 Three.js initialized');
}

/**
 * Create the 3D map from map data
 */
function createMap() {
    if (!mapData || !mapData.blocks) return;
    
    mapBlocks = [];
    
    mapData.blocks.forEach(blockData => {
        const geometry = new THREE.BoxGeometry(
            blockData.size.width,
            blockData.size.height,
            blockData.size.depth
        );
        
        const material = new THREE.MeshLambertMaterial({ 
            color: blockData.color,
            transparent: blockData.type === 'water',
            opacity: blockData.type === 'water' ? 0.7 : 1.0
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            blockData.position.x + blockData.size.width / 2,
            blockData.position.y + blockData.size.height / 2,
            blockData.position.z + blockData.size.depth / 2
        );
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = blockData;
        
        scene.add(mesh);
        mapBlocks.push(mesh);
    });
    
    console.log(`🗺️ Map created with ${mapBlocks.length} blocks`);
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Menu buttons
    document.getElementById('create-game-btn').addEventListener('click', createGame);
    document.getElementById('join-game-btn').addEventListener('click', showJoinForm);
    document.getElementById('solo-test-btn').addEventListener('click', startSoloTest);
    document.getElementById('join-submit-btn').addEventListener('click', joinGame);
    document.getElementById('join-cancel-btn').addEventListener('click', hideJoinForm);
    
    // Lobby buttons
    document.getElementById('start-game-btn').addEventListener('click', startGame);
    document.getElementById('leave-lobby-btn').addEventListener('click', leaveLobby);
    
    // Game buttons
    document.getElementById('resume-btn').addEventListener('click', resumeGame);
    document.getElementById('leave-game-btn').addEventListener('click', leaveGame);
    document.getElementById('play-again-btn').addEventListener('click', playAgain);
    document.getElementById('main-menu-btn').addEventListener('click', goToMainMenu);
    
    // Keyboard controls
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    // Mouse controls
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('click', requestPointerLock);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    
    // Disguise buttons
    document.querySelectorAll('.disguise-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const disguiseType = e.target.dataset.disguise;
            toggleDisguise(disguiseType);
        });
    });
    
    // Mobile controls
    setupMobileControls();
    
    // Window resize
    window.addEventListener('resize', onWindowResize);
    
    console.log('🎛️ Event listeners setup complete');
}

/**
 * Setup mobile touch controls
 */
function setupMobileControls() {
    const joystickOuter = document.querySelector('.joystick-outer');
    const joystickInner = document.querySelector('.joystick-inner');
    
    if (!joystickOuter || !joystickInner) return;
    
    // Touch start
    joystickOuter.addEventListener('touchstart', (e) => {
        e.preventDefault();
        joystickActive = true;
        const rect = joystickOuter.getBoundingClientRect();
        joystickCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    });
    
    // Touch move
    document.addEventListener('touchmove', (e) => {
        if (!joystickActive) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - joystickCenter.x;
        const deltaY = touch.clientY - joystickCenter.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = 40;
        
        if (distance <= maxDistance) {
            joystickPosition = { x: deltaX, y: deltaY };
        } else {
            joystickPosition = {
                x: (deltaX / distance) * maxDistance,
                y: (deltaY / distance) * maxDistance
            };
        }
        
        joystickInner.style.transform = `translate(-50%, -50%) translate(${joystickPosition.x}px, ${joystickPosition.y}px)`;
    });
    
    // Touch end
    document.addEventListener('touchend', () => {
        joystickActive = false;
        joystickPosition = { x: 0, y: 0 };
        joystickInner.style.transform = 'translate(-50%, -50%)';
    });
    
    // Action buttons
    document.getElementById('sprint-btn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys['Shift'] = true;
    });
    
    document.getElementById('sprint-btn').addEventListener('touchend', (e) => {
        e.preventDefault();
        keys['Shift'] = false;
    });
    
    document.getElementById('jump-btn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys[' '] = true;
    });
    
    document.getElementById('jump-btn').addEventListener('touchend', (e) => {
        e.preventDefault();
        keys[' '] = false;
    });
}

// ============================================================================
// SCREEN MANAGEMENT
// ============================================================================

/**
 * Show a specific screen and hide others
 */
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
        gameState.currentScreen = screenId;
    }
    
    // Special handling for game screen
    if (screenId === 'game-screen') {
        startGameLoop();
        document.getElementById('controls-help').style.display = 'block';
    } else {
        stopGameLoop();
        document.getElementById('controls-help').style.display = 'none';
    }
}

/**
 * Show popup notification
 */
function showPopup(message, type = 'info', duration = 3000) {
    const container = document.getElementById('popup-container');
    const popup = document.createElement('div');
    popup.className = `popup ${type}`;
    popup.textContent = message;
    
    container.appendChild(popup);
    
    // Auto remove
    setTimeout(() => {
        popup.classList.add('fade-out');
        setTimeout(() => {
            if (popup.parentNode) {
                popup.parentNode.removeChild(popup);
            }
        }, 300);
    }, duration);
}

// ============================================================================
// GAME LOBBY FUNCTIONS
// ============================================================================

/**
 * Create a new game
 */
async function createGame() {
    if (!database) {
        showPopup('Multiplayer not available. Try solo test.', 'warning');
        return;
    }
    
    try {
        gameState.gameCode = generateGameCode();
        gameState.isHost = true;
        
        // Create game in Firebase
        gameRef = database.ref(`games/${gameState.gameCode}`);
        await gameRef.set({
            host: gameState.playerId,
            created: Date.now(),
            started: false,
            players: {
                [gameState.playerId]: {
                    name: gameState.playerName,
                    role: 'hider',
                    hits: 0,
                    position: { x: 0, y: 0, z: 0 },
                    disguise: null,
                    alive: true,
                    lastSeen: Date.now()
                }
            }
        });
        
        // Setup game listeners
        setupGameListeners();
        
        // Show lobby
        showLobby();
        
        showPopup(`Game created! Code: ${gameState.gameCode}`, 'success');
        
    } catch (error) {
        console.error('❌ Failed to create game:', error);
        showPopup('Failed to create game. Please try again.', 'error');
    }
}

/**
 * Show join game form
 */
function showJoinForm() {
    document.getElementById('join-form').classList.remove('hidden');
    document.getElementById('game-code-input').focus();
}

/**
 * Hide join game form
 */
function hideJoinForm() {
    document.getElementById('join-form').classList.add('hidden');
    document.getElementById('game-code-input').value = '';
}

/**
 * Join an existing game
 */
async function joinGame() {
    if (!database) {
        showPopup('Multiplayer not available.', 'warning');
        return;
    }
    
    const codeInput = document.getElementById('game-code-input');
    const code = codeInput.value.toUpperCase().trim();
    
    if (!code || code.length !== 6) {
        showPopup('Please enter a valid 6-character game code.', 'warning');
        return;
    }
    
    try {
        gameState.gameCode = code;
        gameRef = database.ref(`games/${code}`);
        
        // Check if game exists
        const snapshot = await gameRef.once('value');
        if (!snapshot.exists()) {
            showPopup('Game not found. Please check the code.', 'error');
            return;
        }
        
        const gameData = snapshot.val();
        if (gameData.started) {
            showPopup('Game already started. Cannot join.', 'warning');
            return;
        }
        
        const playerCount = Object.keys(gameData.players || {}).length;
        if (playerCount >= mapData.gameSettings.maxPlayers) {
            showPopup('Game is full. Cannot join.', 'warning');
            return;
        }
        
        // Add player to game
        await gameRef.child(`players/${gameState.playerId}`).set({
            name: gameState.playerName,
            role: 'hider',
            hits: 0,
            position: { x: 0, y: 0, z: 0 },
            disguise: null,
            alive: true,
            lastSeen: Date.now()
        });
        
        // Setup game listeners
        setupGameListeners();
        
        // Show lobby
        showLobby();
        
        showPopup(`Joined game ${code}!`, 'success');
        
    } catch (error) {
        console.error('❌ Failed to join game:', error);
        showPopup('Failed to join game. Please try again.', 'error');
    }
}

/**
 * Start solo test mode
 */
function startSoloTest() {
    gameState.gameCode = 'SOLO';
    gameState.isHost = true;
    gameState.role = 'seeker'; // Player is seeker, bot is hider
    
    // Create dummy bot
    gameState.players = {
        [gameState.playerId]: {
            name: gameState.playerName,
            role: 'seeker',
            hits: 0,
            position: { x: 5, y: 1, z: 5 },
            alive: true
        },
        'bot1': {
            name: 'Dummy Bot',
            role: 'hider',
            hits: 0,
            position: { x: 15, y: 1, z: 15 },
            disguise: 'floor',
            alive: true
        }
    };
    
    // Start game immediately
    gameState.gameStarted = true;
    gameState.gameTime = mapData.gameSettings.gameDuration;
    
    showScreen('game-screen');
    createPlayer();
    updateHUD();
    startGameTimer();
    
    showPopup('Solo test started! Find the dummy bot!', 'info');
}

/**
 * Setup Firebase game listeners
 */
function setupGameListeners() {
    if (!gameRef) return;
    
    // Listen for player changes
    gameRef.child('players').on('value', (snapshot) => {
        const players = snapshot.val() || {};
        gameState.players = players;
        updatePlayerList();
        
        if (gameState.gameStarted) {
            updatePlayersIn3D();
        }
    });
    
    // Listen for game start
    gameRef.child('started').on('value', (snapshot) => {
        if (snapshot.val() === true && !gameState.gameStarted) {
            gameState.gameStarted = true;
            startGameFromLobby();
        }
    });
    
    // Listen for host changes
    gameRef.child('host').on('value', (snapshot) => {
        const hostId = snapshot.val();
        gameState.isHost = (hostId === gameState.playerId);
        updateLobbyControls();
    });
}

/**
 * Show game lobby
 */
function showLobby() {
    document.getElementById('lobby-code').textContent = gameState.gameCode;
    updatePlayerList();
    updateLobbyControls();
    showScreen('game-lobby');
}

/**
 * Update player list in lobby
 */
function updatePlayerList() {
    const playerList = document.getElementById('player-list');
    const playerCount = document.getElementById('player-count');
    
    playerList.innerHTML = '';
    
    const players = Object.entries(gameState.players || {});
    playerCount.textContent = players.length;
    
    players.forEach(([playerId, player]) => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        
        const playerName = document.createElement('span');
        playerName.className = 'player-name';
        playerName.textContent = player.name;
        
        const playerRole = document.createElement('span');
        playerRole.className = `player-role ${gameState.isHost && playerId === gameState.playerId ? 'host' : ''}`;
        playerRole.textContent = gameState.isHost && playerId === gameState.playerId ? 'Host' : player.role;
        
        playerItem.appendChild(playerName);
        playerItem.appendChild(playerRole);
        playerList.appendChild(playerItem);
    });
}

/**
 * Update lobby controls based on host status
 */
function updateLobbyControls() {
    const startBtn = document.getElementById('start-game-btn');
    const playerCount = Object.keys(gameState.players || {}).length;
    
    if (gameState.isHost) {
        startBtn.classList.remove('hidden');
        startBtn.disabled = playerCount < 2;
    } else {
        startBtn.classList.add('hidden');
    }
}

/**
 * Start the game (host only)
 */
async function startGame() {
    if (!gameState.isHost || !gameRef) return;
    
    try {
        // Assign roles
        const playerIds = Object.keys(gameState.players);
        const seekerIndex = Math.floor(Math.random() * playerIds.length);
        
        const updates = {};
        playerIds.forEach((playerId, index) => {
            updates[`players/${playerId}/role`] = index === seekerIndex ? 'seeker' : 'hider';
        });
        
        updates['started'] = true;
        updates['startTime'] = Date.now();
        
        await gameRef.update(updates);
        
        showPopup('Game starting!', 'success');
        
    } catch (error) {
        console.error('❌ Failed to start game:', error);
        showPopup('Failed to start game.', 'error');
    }
}

/**
 * Start game from lobby
 */
function startGameFromLobby() {
    // Set player role
    const playerData = gameState.players[gameState.playerId];
    if (playerData) {
        gameState.role = playerData.role;
        gameState.hits = playerData.hits || 0;
    }
    
    // Initialize game state
    gameState.gameTime = mapData.gameSettings.gameDuration;
    
    // Show game screen
    showScreen('game-screen');
    
    // Create player
    createPlayer();
    
    // Update HUD
    updateHUD();
    
    // Start game timer
    startGameTimer();
    
    // Start position sync
    startPositionSync();
    
    showPopup(`Game started! You are a ${gameState.role}!`, 'info');
}

/**
 * Leave lobby
 */
async function leaveLobby() {
    try {
        if (gameRef && gameState.playerId) {
            await gameRef.child(`players/${gameState.playerId}`).remove();
            
            // If host is leaving, migrate host
            if (gameState.isHost) {
                const remainingPlayers = Object.keys(gameState.players).filter(id => id !== gameState.playerId);
                if (remainingPlayers.length > 0) {
                    await gameRef.child('host').set(remainingPlayers[0]);
                }
            }
        }
        
        // Reset state
        gameState.gameCode = null;
        gameState.isHost = false;
        gameState.players = {};
        
        showScreen('main-menu');
        showPopup('Left the lobby.', 'info');
        
    } catch (error) {
        console.error('❌ Failed to leave lobby:', error);
        showScreen('main-menu');
    }
}

// ============================================================================
// 3D WORLD & PLAYER MANAGEMENT
// ============================================================================

/**
 * Create the player in the 3D world
 */
function createPlayer() {
    // Remove existing player
    if (playerMesh) {
        scene.remove(playerMesh);
    }
    
    // Create player geometry
    const geometry = new THREE.CapsuleGeometry(0.5, 1.5, 4, 8);
    const material = new THREE.MeshLambertMaterial({ 
        color: gameState.role === 'seeker' ? 0xff4444 : 0x4444ff 
    });
    
    playerMesh = new THREE.Mesh(geometry, material);
    playerMesh.castShadow = true;
    
    // Set spawn position
    const spawnPoint = getSpawnPoint();
    playerMesh.position.set(spawnPoint.x, spawnPoint.y, spawnPoint.z);
    
    scene.add(playerMesh);
    
    // Update camera position
    updateCameraPosition();
    
    console.log(`👤 Player created as ${gameState.role}`);
}

/**
 * Get a spawn point for the player
 */
function getSpawnPoint() {
    if (!mapData.spawnPoints || mapData.spawnPoints.length === 0) {
        return { x: 10, y: 1, z: 10 };
    }
    
    const spawnIndex = Math.floor(Math.random() * mapData.spawnPoints.length);
    return mapData.spawnPoints[spawnIndex];
}

/**
 * Update camera position relative to player
 */
function updateCameraPosition() {
    if (!playerMesh) return;
    
    const playerPos = playerMesh.position;
    
    // Third-person camera
    camera.position.set(
        playerPos.x - 5,
        playerPos.y + 8,
        playerPos.z + 5
    );
    
    camera.lookAt(playerPos.x, playerPos.y + 1, playerPos.z);
}

/**
 * Update other players in 3D world
 */
function updatePlayersIn3D() {
    // Remove old player meshes
    Object.values(players3D).forEach(mesh => {
        scene.remove(mesh);
    });
    players3D = {};
    
    // Create meshes for other players
    Object.entries(gameState.players).forEach(([playerId, player]) => {
        if (playerId === gameState.playerId || !player.alive) return;
        
        let geometry, material;
        
        if (player.disguise && player.role === 'hider') {
            // Create disguised mesh
            const disguiseData = mapData.disguisePresets[player.disguise];
            if (disguiseData) {
                geometry = new THREE.BoxGeometry(
                    disguiseData.size.width,
                    disguiseData.size.height,
                    disguiseData.size.depth
                );
                material = new THREE.MeshLambertMaterial({ color: disguiseData.color });
            }
        }
        
        if (!geometry) {
            // Create normal player mesh
            geometry = new THREE.CapsuleGeometry(0.5, 1.5, 4, 8);
            material = new THREE.MeshLambertMaterial({ 
                color: player.role === 'seeker' ? 0xff4444 : 0x4444ff 
            });
        }
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(player.position.x, player.position.y, player.position.z);
        mesh.castShadow = true;
        mesh.userData = { playerId, playerData: player };
        
        scene.add(mesh);
        players3D[playerId] = mesh;
    });
}

// ============================================================================
// GAME MECHANICS
// ============================================================================

/**
 * Toggle player disguise
 */
function toggleDisguise(disguiseType) {
    if (gameState.role !== 'hider' || !gameState.gameStarted) return;
    
    if (gameState.disguise === disguiseType) {
        // Remove disguise
        gameState.disguise = null;
        gameState.isDisguised = false;
        showPopup('Disguise removed', 'info');
    } else {
        // Apply disguise
        gameState.disguise = disguiseType;
        gameState.isDisguised = true;
        showPopup(`Disguised as ${disguiseType}`, 'success');
    }
    
    // Update player appearance
    updatePlayerAppearance();
    
    // Update disguise buttons
    updateDisguiseButtons();
    
    // Sync with server
    syncPlayerState();
}

/**
 * Update player appearance based on disguise
 */
function updatePlayerAppearance() {
    if (!playerMesh) return;
    
    scene.remove(playerMesh);
    
    let geometry, material;
    
    if (gameState.isDisguised && gameState.disguise) {
        const disguiseData = mapData.disguisePresets[gameState.disguise];
        if (disguiseData) {
            geometry = new THREE.BoxGeometry(
                disguiseData.size.width,
                disguiseData.size.height,
                disguiseData.size.depth
            );
            material = new THREE.MeshLambertMaterial({ color: disguiseData.color });
        }
    }
    
    if (!geometry) {
        geometry = new THREE.CapsuleGeometry(0.5, 1.5, 4, 8);
        material = new THREE.MeshLambertMaterial({ 
            color: gameState.role === 'seeker' ? 0xff4444 : 0x4444ff 
        });
    }
    
    const oldPosition = playerMesh.position.clone();
    playerMesh = new THREE.Mesh(geometry, material);
    playerMesh.position.copy(oldPosition);
    playerMesh.castShadow = true;
    
    scene.add(playerMesh);
}

/**
 * Update disguise button states
 */
function updateDisguiseButtons() {
    document.querySelectorAll('.disguise-btn').forEach(btn => {
        const disguiseType = btn.dataset.disguise;
        if (disguiseType === gameState.disguise) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

/**
 * Handle player hit (seeker hitting hider)
 */
function handlePlayerHit(targetPlayerId) {
    if (gameState.role !== 'seeker' || !gameState.gameStarted) return;
    
    const targetPlayer = gameState.players[targetPlayerId];
    if (!targetPlayer || !targetPlayer.alive || targetPlayer.role !== 'hider') return;
    
    // Check distance
    const targetMesh = players3D[targetPlayerId];
    if (!targetMesh || !playerMesh) return;
    
    const distance = playerMesh.position.distanceTo(targetMesh.position);
    if (distance > mapData.gameSettings.hitRange) return;
    
    // Apply hit
    if (gameRef) {
        gameRef.child(`players/${targetPlayerId}/hits`).transaction((currentHits) => {
            return (currentHits || 0) + 1;
        });
    }
    
    showPopup(`Hit ${targetPlayer.name}!`, 'success');
}

/**
 * Check for player elimination
 */
function checkPlayerElimination(playerId, hits) {
    if (hits >= mapData.gameSettings.hiderLives) {
        if (gameRef) {
            gameRef.child(`players/${playerId}/alive`).set(false);
        }
        
        const player = gameState.players[playerId];
        if (player) {
            showPopup(`${player.name} eliminated!`, 'warning');
        }
        
        // Check win conditions
        checkWinConditions();
    }
}

/**
 * Check win conditions
 */
function checkWinConditions() {
    const alivePlayers = Object.values(gameState.players).filter(p => p.alive);
    const aliveHiders = alivePlayers.filter(p => p.role === 'hider');
    const aliveSeekers = alivePlayers.filter(p => p.role === 'seeker');
    
    let gameEnded = false;
    let winner = null;
    
    if (aliveHiders.length === 0) {
        gameEnded = true;
        winner = 'seekers';
    } else if (aliveSeekers.length === 0) {
        gameEnded = true;
        winner = 'hiders';
    } else if (gameState.gameTime <= 0) {
        gameEnded = true;
        winner = 'hiders'; // Hiders win if time runs out
    }
    
    if (gameEnded) {
        endGame(winner);
    }
}

/**
 * End the game
 */
function endGame(winner) {
    gameState.gameStarted = false;
    
    // Stop timers
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    
    if (positionUpdateInterval) {
        clearInterval(positionUpdateInterval);
        positionUpdateInterval = null;
    }
    
    // Show game over screen
    const resultElement = document.getElementById('game-result');
    const statsElement = document.getElementById('final-stats');
    
    if (winner === 'seekers') {
        resultElement.textContent = 'Seekers Win!';
        resultElement.style.color = '#ff4444';
    } else {
        resultElement.textContent = 'Hiders Win!';
        resultElement.style.color = '#4444ff';
    }
    
    // Show final stats
    const playerStats = Object.entries(gameState.players).map(([id, player]) => {
        return `${player.name}: ${player.role} - ${player.hits || 0} hits - ${player.alive ? 'Alive' : 'Eliminated'}`;
    }).join('<br>');
    
    statsElement.innerHTML = `<h4>Final Stats:</h4><p>${playerStats}</p>`;
    
    showScreen('game-over');
    showPopup(`Game Over! ${winner === 'seekers' ? 'Seekers' : 'Hiders'} win!`, winner === 'seekers' ? 'warning' : 'success');
}

// ============================================================================
// INPUT HANDLING
// ============================================================================

/**
 * Handle key down events
 */
function onKeyDown(event) {
    keys[event.code] = true;
    
    // Prevent default for game keys
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'Escape'].includes(event.code)) {
        event.preventDefault();
    }
    
    // Handle special keys
    switch (event.code) {
        case 'Escape':
            toggleGameMenu();
            break;
        case 'Digit1':
            if (gameState.role === 'hider') toggleDisguise('floor');
            break;
        case 'Digit2':
            if (gameState.role === 'hider') toggleDisguise('tree');
            break;
        case 'Digit3':
            if (gameState.role === 'hider') toggleDisguise('bush');
            break;
        case 'Digit4':
            if (gameState.role === 'hider') toggleDisguise('water');
            break;
    }
}

/**
 * Handle key up events
 */
function onKeyUp(event) {
    keys[event.code] = false;
}

/**
 * Handle mouse movement
 */
function onMouseMove(event) {
    if (!isPointerLocked) return;
    
    mouse.x += event.movementX * 0.002;
    mouse.y += event.movementY * 0.002;
    
    // Clamp vertical rotation
    mouse.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mouse.y));
}

/**
 * Request pointer lock for mouse controls
 */
function requestPointerLock() {
    if (gameState.currentScreen === 'game-screen') {
        document.body.requestPointerLock();
    }
}

/**
 * Handle pointer lock change
 */
function onPointerLockChange() {
    isPointerLocked = document.pointerLockElement === document.body;
}

/**
 * Toggle game menu
 */
function toggleGameMenu() {
    const gameMenu = document.getElementById('game-menu');
    if (gameMenu.classList.contains('hidden')) {
        gameMenu.classList.remove('hidden');
        document.exitPointerLock();
    } else {
        gameMenu.classList.add('hidden');
        requestPointerLock();
    }
}

/**
 * Resume game
 */
function resumeGame() {
    document.getElementById('game-menu').classList.add('hidden');
    requestPointerLock();
}

/**
 * Leave game
 */
function leaveGame() {
    // Clean up
    if (gameRef && gameState.playerId) {
        gameRef.child(`players/${gameState.playerId}`).remove();
    }
    
    // Reset state
    gameState.gameStarted = false;
    gameState.gameCode = null;
    gameState.isHost = false;
    gameState.players = {};
    
    // Stop timers
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    
    if (positionUpdateInterval) {
        clearInterval(positionUpdateInterval);
        positionUpdateInterval = null;
    }
    
    showScreen('main-menu');
    showPopup('Left the game.', 'info');
}

/**
 * Play again
 */
function playAgain() {
    // Reset game state
    gameState.gameStarted = false;
    gameState.hits = 0;
    gameState.disguise = null;
    gameState.isDisguised = false;
    
    if (gameState.gameCode === 'SOLO') {
        startSoloTest();
    } else {
        showLobby();
    }
}

/**
 * Go to main menu
 */
function goToMainMenu() {
    leaveGame();
}

// ============================================================================
// GAME LOOP & UPDATES
// ============================================================================

/**
 * Start the main game loop
 */
function startGameLoop() {
    function animate() {
        if (gameState.currentScreen === 'game-screen') {
            updatePlayer();
            updateCamera();
            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        }
    }
    animate();
}

/**
 * Stop the game loop
 */
function stopGameLoop() {
    // Game loop will stop automatically when screen changes
}

/**
 * Update player movement and physics
 */
function updatePlayer() {
    if (!playerMesh || !gameState.gameStarted) return;
    
    const speed = mapData.gameSettings.playerSpeed;
    const sprintMultiplier = keys['ShiftLeft'] ? mapData.gameSettings.sprintMultiplier : 1;
    const moveSpeed = speed * sprintMultiplier * 0.016; // 60fps normalization
    
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);
    
    // Apply camera rotation to movement vectors
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouse.x);
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouse.x);
    
    const movement = new THREE.Vector3();
    
    // Keyboard movement
    if (keys['KeyW']) movement.add(forward);
    if (keys['KeyS']) movement.sub(forward);
    if (keys['KeyA']) movement.sub(right);
    if (keys['KeyD']) movement.add(right);
    
    // Mobile joystick movement
    if (joystickActive) {
        const joyForward = forward.clone().multiplyScalar(-joystickPosition.y / 40);
        const joyRight = right.clone().multiplyScalar(joystickPosition.x / 40);
        movement.add(joyForward).add(joyRight);
    }
    
    // Normalize and apply movement
    if (movement.length() > 0) {
        movement.normalize().multiplyScalar(moveSpeed);
        
        const newPosition = playerMesh.position.clone().add(movement);
        
        // Check collision
        if (!checkCollision(newPosition)) {
            playerMesh.position.copy(newPosition);
        }
    }
    
    // Jump
    if (keys['Space'] && playerMesh.position.y <= 1.1) {
        playerMesh.position.y += mapData.gameSettings.jumpHeight * 0.1;
    }
    
    // Apply gravity
    if (playerMesh.position.y > 1) {
        playerMesh.position.y -= 0.2;
    }
    
    // Clamp to ground
    if (playerMesh.position.y < 1) {
        playerMesh.position.y = 1;
    }
}

/**
 * Check collision with map blocks
 */
function checkCollision(position) {
    const playerRadius = 0.5;
    
    for (let block of mapBlocks) {
        const blockData = block.userData;
        if (!blockData.solid) continue;
        
        const blockPos = block.position;
        const blockSize = blockData.colliderSize || blockData.size;
        
        // Simple AABB collision
        if (position.x + playerRadius > blockPos.x - blockSize.width / 2 &&
            position.x - playerRadius < blockPos.x + blockSize.width / 2 &&
            position.z + playerRadius > blockPos.z - blockSize.depth / 2 &&
            position.z - playerRadius < blockPos.z + blockSize.depth / 2) {
            return true; // Collision detected
        }
    }
    
    return false; // No collision
}

/**
 * Update camera based on mouse input
 */
function updateCamera() {
    if (!playerMesh) return;
    
    const playerPos = playerMesh.position;
    
    // Calculate camera position based on mouse rotation
    const distance = 8;
    const height = 5;
    
    camera.position.x = playerPos.x - Math.sin(mouse.x) * distance;
    camera.position.z = playerPos.z - Math.cos(mouse.x) * distance;
    camera.position.y = playerPos.y + height + Math.sin(mouse.y) * 3;
    
    camera.lookAt(playerPos.x, playerPos.y + 1, playerPos.z);
}

/**
 * Update HUD elements
 */
function updateHUD() {
    document.getElementById('role-display').textContent = `Role: ${gameState.role}`;
    document.getElementById('hits-display').textContent = `Hits: ${gameState.hits}/${gameState.maxHits}`;
    
    const minutes = Math.floor(gameState.gameTime / 60);
    const seconds = gameState.gameTime % 60;
    document.getElementById('timer-display').textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const aliveCount = Object.values(gameState.players).filter(p => p.alive).length;
    document.getElementById('players-alive').textContent = `Players: ${aliveCount}`;
    
    // Show/hide disguise controls
    const disguiseControls = document.getElementById('disguise-controls');
    if (gameState.role === 'hider' && gameState.gameStarted) {
        disguiseControls.classList.remove('hidden');
    } else {
        disguiseControls.classList.add('hidden');
    }
    
    // Show mobile controls on mobile
    const mobileControls = document.getElementById('mobile-controls');
    if (window.innerWidth <= 768 && gameState.gameStarted) {
        mobileControls.classList.remove('hidden');
    } else {
        mobileControls.classList.add('hidden');
    }
}

/**
 * Start game timer
 */
function startGameTimer() {
    if (gameTimer) clearInterval(gameTimer);
    
    gameStartTime = Date.now();
    
    gameTimer = setInterval(() => {
        gameState.gameTime--;
        updateHUD();
        
        if (gameState.gameTime <= 0) {
            checkWinConditions();
        }
    }, 1000);
}

/**
 * Start position synchronization
 */
function startPositionSync() {
    if (!gameRef || positionUpdateInterval) return;
    
    positionUpdateInterval = setInterval(() => {
        if (playerMesh && gameState.gameStarted) {
            const position = {
                x: Math.round(playerMesh.position.x * 100) / 100,
                y: Math.round(playerMesh.position.y * 100) / 100,
                z: Math.round(playerMesh.position.z * 100) / 100
            };
            
            gameRef.child(`players/${gameState.playerId}`).update({
                position: position,
                disguise: gameState.disguise,
                lastSeen: Date.now()
            });
        }
    }, 100); // 10Hz update rate
}

/**
 * Sync player state to server
 */
function syncPlayerState() {
    if (!gameRef || !gameState.gameStarted) return;
    
    gameRef.child(`players/${gameState.playerId}`).update({
        hits: gameState.hits,
        disguise: gameState.disguise,
        alive: gameState.hits < gameState.maxHits,
        lastSeen: Date.now()
    });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique player ID
 */
function generatePlayerId() {
    return 'player_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Generate a random player name
 */
function generatePlayerName() {
    const adjectives = ['Swift', 'Sneaky', 'Quick', 'Silent', 'Clever', 'Bold', 'Agile', 'Sharp'];
    const nouns = ['Fox', 'Cat', 'Wolf', 'Eagle', 'Tiger', 'Ninja', 'Shadow', 'Ghost'];
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adj}${noun}`;
}

/**
 * Generate a 6-character game code
 */
function generateGameCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Handle window resize
 */
function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// ============================================================================
// ERROR HANDLING & DEBUGGING
// ============================================================================

/**
 * Global error handler
 */
window.addEventListener('error', (event) => {
    console.error('🚨 Global Error:', event.error);
    showPopup('An error occurred. Check console for details.', 'error');
});

/**
 * Unhandled promise rejection handler
 */
window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled Promise Rejection:', event.reason);
    showPopup('Network error occurred.', 'error');
});

/**
 * Debug function to log game state
 */
function debugGameState() {
    console.log('🐛 Game State:', {
        currentScreen: gameState.currentScreen,
        gameCode: gameState.gameCode,
        playerId: gameState.playerId,
        role: gameState.role,
        players: gameState.players,
        gameStarted: gameState.gameStarted,
        gameTime: gameState.gameTime,
        hits: gameState.hits
    });
}

// Make debug function available globally
window.debugGameState = debugGameState;

console.log('🎮 Hide & Seek 3D loaded successfully!');
console.log('💡 Type debugGameState() in console to see current game state');

/**
 * BUGLOG - Track and fix issues as they arise:
 * 
 * FIXED:
 * - None yet
 * 
 * KNOWN ISSUES:
 * - Firebase config needs to be set by user
 * - Mobile controls need more testing
 * - Hit detection could be more precise
 * - Need to add more robust error handling for network issues
 * 
 * TODO:
 * - Add sound effects
 * - Improve mobile UI
 * - Add spectator mode for eliminated players
 * - Add more disguise options
 * - Optimize performance for lower-end devices
 */