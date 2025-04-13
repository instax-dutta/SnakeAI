// Game constants
const GRID_SIZE = 20;
const GRID_WIDTH = 30;
const GRID_HEIGHT = 20;
const CANVAS_WIDTH = GRID_WIDTH * GRID_SIZE;
const CANVAS_HEIGHT = GRID_HEIGHT * GRID_SIZE;
const FPS = 10;

// Colors
const WHITE = "#FFFFFF";
const BLACK = "#000000";
const RED = "#FF0000";
const GREEN = "#00FF00";
const BLUE = "#0000FF";

// Directions
const UP = { x: 0, y: -1 };
const DOWN = { x: 0, y: 1 };
const LEFT = { x: -1, y: 0 };
const RIGHT = { x: 1, y: 0 };
const DIRECTIONS = [UP, DOWN, LEFT, RIGHT];

// Game elements
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const resetBtn = document.getElementById('reset-btn');
const scoreDisplay = document.getElementById('score');

// Game state
let snake, food, gameInterval;

class Snake {
    constructor() {
        this.reset();
    }

    reset() {
        this.length = 3;
        this.positions = [{ x: Math.floor(GRID_WIDTH / 2), y: Math.floor(GRID_HEIGHT / 2) }];
        this.direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        this.color = GREEN;
        this.score = 0;
    }

    getHeadPosition() {
        return this.positions[0];
    }

    turn(direction) {
        // Prevent 180-degree turns
        if (this.length > 1 && 
            direction.x === -this.direction.x && 
            direction.y === -this.direction.y) {
            return;
        }
        this.direction = direction;
    }

    move() {
        const head = this.getHeadPosition();
        const newX = (head.x + this.direction.x + GRID_WIDTH) % GRID_WIDTH;
        const newY = (head.y + this.direction.y + GRID_HEIGHT) % GRID_HEIGHT;
        const newPosition = { x: newX, y: newY };

        // Check for collision with self
        if (this.positions.slice(1).some(pos => pos.x === newPosition.x && pos.y === newPosition.y)) {
            this.reset();
            updateScore();
            return;
        }

        // Move snake
        this.positions.unshift(newPosition);
        if (this.positions.length > this.length) {
            this.positions.pop();
        }
    }

    draw() {
        this.positions.forEach(pos => {
            const rect = {
                x: pos.x * GRID_SIZE,
                y: pos.y * GRID_SIZE,
                width: GRID_SIZE,
                height: GRID_SIZE
            };
            ctx.fillStyle = this.color;
            ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
            ctx.strokeStyle = BLACK;
            ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        });
    }
}

class Food {
    constructor() {
        this.position = { x: 0, y: 0 };
        this.color = RED;
        this.randomizePosition();
    }

    randomizePosition() {
        this.position = {
            x: Math.floor(Math.random() * GRID_WIDTH),
            y: Math.floor(Math.random() * GRID_HEIGHT)
        };
    }

    draw() {
        const rect = {
            x: this.position.x * GRID_SIZE,
            y: this.position.y * GRID_SIZE,
            width: GRID_SIZE,
            height: GRID_SIZE
        };
        ctx.fillStyle = this.color;
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.strokeStyle = BLACK;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
}

class SnakeAI {
    constructor(snake, food) {
        this.snake = snake;
        this.food = food;
    }

    getNextMove() {
        // Find the shortest path to food using BFS
        const head = this.snake.getHeadPosition();
        const foodPos = this.food.position;
        
        // Use BFS to find the shortest path
        const queue = [{ pos: head, path: [] }];
        const visited = new Set([`${head.x},${head.y}`]);
        
        while (queue.length > 0) {
            const { pos, path } = queue.shift();
            
            // If we found the food
            if (pos.x === foodPos.x && pos.y === foodPos.y) {
                if (path.length === 0) {
                    // If we're already at the food, choose a random direction
                    return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
                }
                return path[0];
            }
            
            // Try all four directions
            for (const direction of DIRECTIONS) {
                const newX = (pos.x + direction.x + GRID_WIDTH) % GRID_WIDTH;
                const newY = (pos.y + direction.y + GRID_HEIGHT) % GRID_HEIGHT;
                const newPos = { x: newX, y: newY };
                const posKey = `${newX},${newY}`;
                
                // Skip if we've visited this position or it's part of the snake's body
                if (visited.has(posKey) || this.isPartOfSnakeBody(newPos)) {
                    continue;
                }
                
                // Add to queue with the first move that led to this path
                const newPath = path.length > 0 ? [...path] : [direction];
                if (path.length === 0) {
                    newPath[0] = direction;
                }
                queue.push({ pos: newPos, path: newPath });
                visited.add(posKey);
            }
        }
        
        // If no path is found, try to avoid collisions
        return this.avoidCollision();
    }
    
    isPartOfSnakeBody(position) {
        return this.snake.positions.slice(1).some(
            pos => pos.x === position.x && pos.y === position.y
        );
    }
    
    avoidCollision() {
        const head = this.snake.getHeadPosition();
        const safeDirections = [];
        
        for (const direction of DIRECTIONS) {
            const newX = (head.x + direction.x + GRID_WIDTH) % GRID_WIDTH;
            const newY = (head.y + direction.y + GRID_HEIGHT) % GRID_HEIGHT;
            const newPos = { x: newX, y: newY };
            
            // Check if the new position is safe (not part of the snake's body)
            if (!this.isPartOfSnakeBody(newPos)) {
                safeDirections.push(direction);
            }
        }
        
        if (safeDirections.length > 0) {
            return safeDirections[Math.floor(Math.random() * safeDirections.length)];
        } else {
            // If no safe direction, just move in the current direction
            return this.snake.direction;
        }
    }
}

// Add these lines near the top of your script.js file with other game state variables
let highScore = 0;
let gameSpeed = 'normal';
const speedBtn = document.getElementById('speed-btn');
const highScoreDisplay = document.getElementById('high-score');

// Update the score display function
function updateScore() {
    scoreDisplay.textContent = `Boyfriends Eaten: ${snake.score}`;
    
    // Update high score if current score is higher
    if (snake.score > highScore) {
        highScore = snake.score;
        highScoreDisplay.textContent = `Most Boyfriends Eaten: ${highScore}`;
    }
}

// Update the initGame function
function initGame() {
    // Initialize game objects
    snake = new Snake();
    food = new Food();
    ai = new SnakeAI(snake, food);
    
    // Make sure boyfriend doesn't start on the Ex
    while (snake.positions.some(pos => 
        pos.x === food.position.x && pos.y === food.position.y)) {
        food.randomizePosition();
    }
    
    // Update score displays
    updateScore();
    highScoreDisplay.textContent = `Most Boyfriends Eaten: ${highScore}`;
    
    // Clear any existing interval
    if (gameInterval) {
        clearInterval(gameInterval);
    }
    
    // Reset game speed to normal
    gameSpeed = 'normal';
    speedBtn.textContent = 'Ex Speed: Normal';
    
    // Start game loop
    gameInterval = setInterval(gameLoop, 1000 / FPS);
}

// Update the speed button event listener
speedBtn.addEventListener('click', () => {
    // Toggle between speeds
    if (gameSpeed === 'normal') {
        gameSpeed = 'fast';
        speedBtn.textContent = 'Ex Speed: Fast';
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, 1000 / (FPS * 1.5));
    } else if (gameSpeed === 'fast') {
        gameSpeed = 'slow';
        speedBtn.textContent = 'Ex Speed: Slow';
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, 1000 / (FPS * 0.7));
    } else {
        gameSpeed = 'normal';
        speedBtn.textContent = 'Ex Speed: Normal';
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, 1000 / FPS);
    }
});

// Update the gameLoop function to reflect the new theme
function gameLoop() {
    // Get AI's next move
    const nextMove = ai.getNextMove();
    snake.turn(nextMove);
    
    // Move the Ex
    snake.move();
    
    // Check if Ex ate the boyfriend
    const head = snake.getHeadPosition();
    if (head.x === food.position.x && head.y === food.position.y) {
        snake.length += 1;
        snake.score += 1;
        updateScore();
        food.randomizePosition();
        
        // Make sure boyfriend doesn't appear on the Ex
        while (snake.positions.some(pos => 
            pos.x === food.position.x && pos.y === food.position.y)) {
            food.randomizePosition();
        }
    }
    
    // Clear the canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw everything
    snake.draw();
    food.draw();
}

// Event listeners
resetBtn.addEventListener('click', () => {
    snake.reset();
    food.randomizePosition();
    updateScore();
});

// Initialize the game when the page loads
window.addEventListener('load', initGame);

// Theme and gender customization
document.addEventListener('DOMContentLoaded', function() {
    // Add motivational message container to the DOM
    const gameContainer = document.querySelector('.game-container');
    const gameFooter = document.querySelector('.game-footer');
    
    // Create motivational message element
    const motivationalDiv = document.createElement('div');
    motivationalDiv.className = 'motivational-message';
    motivationalDiv.innerHTML = '<p>You deserve better! This game is therapeutic.</p>';
    gameContainer.insertBefore(motivationalDiv, gameFooter);
    
    // Create toxicity control
    const toxicityControl = document.createElement('div');
    toxicityControl.className = 'toxicity-control';
    toxicityControl.innerHTML = `
        <p>Toxicity Level: <span id="toxicity-value">Medium</span></p>
        <input type="range" id="toxicity-slider" min="1" max="3" value="2" class="slider">
        <div class="toxicity-labels">
            <span>Mild</span>
            <span>Medium</span>
            <span>Savage</span>
        </div>
    `;
    gameContainer.insertBefore(toxicityControl, gameFooter);
    
    // Add event listener for toxicity slider
    const toxicitySlider = document.getElementById('toxicity-slider');
    const toxicityValue = document.getElementById('toxicity-value');
    
    toxicitySlider.addEventListener('input', function() {
        const value = parseInt(this.value);
        let levelText = 'Medium';
        
        switch(value) {
            case 1:
                levelText = 'Mild';
                break;
            case 2:
                levelText = 'Medium';
                break;
            case 3:
                levelText = 'Savage';
                break;
        }
        
        toxicityValue.textContent = levelText;
        updateMotivationalMessage();
    });
    
    // Theme selector
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            themeOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to clicked option
            this.classList.add('active');
            
            // Set theme class on body
            document.body.className = '';
            document.body.classList.add('theme-' + this.dataset.theme);
            
            // Update snake and food colors based on theme
            updateGameColors(this.dataset.theme);
        });
    });
    
    // Gender selector
    const genderOptions = document.querySelectorAll('.gender-option');
    const gameTitle = document.querySelector('h1');
    const subtitle = document.querySelector('.subtitle');
    const footerText = document.querySelector('.game-footer p');
    
    genderOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            genderOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to clicked option
            this.classList.add('active');
            
            // Update text based on gender selection
            const gender = this.dataset.gender;
            updateGenderText(gender);
            updateMotivationalMessage();
        });
    });
    
    // Function to update motivational message based on toxicity and gender
    function updateMotivationalMessage() {
        const toxicityLevel = parseInt(toxicitySlider.value);
        const activeGender = document.querySelector('.gender-option.active');
        let gender = activeGender ? activeGender.dataset.gender : 'neutral';
        
        const messages = {
            'ex-boyfriend': {
                1: [
                    "You're on a journey to better relationships!",
                    "Every game is a step toward healing.",
                    "You deserve someone who treats you right!"
                ],
                2: [
                    "That ex wasn't worth your tears anyway!",
                    "Look how hungry they are for attention!",
                    "You've upgraded your standards since then!"
                ],
                3: [
                    "Watch your toxic ex devour everything in sight!",
                    "They were always this greedy, weren't they?",
                    "This is literally how they treated your heart!"
                ]
            },
            'ex-girlfriend': {
                1: [
                    "Better days are ahead of you!",
                    "You're learning and growing from past experiences.",
                    "The right person is out there waiting!"
                ],
                2: [
                    "She never appreciated what she had!",
                    "Notice how she's always chasing the next thing?",
                    "You're so much better off now!"
                ],
                3: [
                    "See how she consumes everything in her path?",
                    "This is exactly how she treated your feelings!",
                    "At least the snake is honest about being cold-blooded!"
                ]
            },
            'neutral': {
                1: [
                    "Every ending is a new beginning!",
                    "You're doing great moving forward!",
                    "Self-care is the best care!"
                ],
                2: [
                    "Some people just can't be satisfied!",
                    "Their loss is someone else's gain!",
                    "You've outgrown that relationship!"
                ],
                3: [
                    "Toxic is as toxic does!",
                    "They're showing their true colors now!",
                    "This is exactly why you're better off without them!"
                ]
            }
        };
        
        // Get random message from appropriate category
        const appropriateMessages = messages[gender][toxicityLevel];
        const randomIndex = Math.floor(Math.random() * appropriateMessages.length);
        motivationalDiv.querySelector('p').textContent = appropriateMessages[randomIndex];
    }
    
    // Function to update game colors based on theme
    function updateGameColors(theme) {
        switch(theme) {
            case 'pink':
                snake.color = "#FF4081"; // Pink
                food.color = "#C2185B";  // Dark Pink
                break;
            case 'blue':
                snake.color = "#2196F3"; // Blue
                food.color = "#1976D2";  // Dark Blue
                break;
            case 'purple':
                snake.color = "#9C27B0"; // Purple
                food.color = "#7B1FA2";  // Dark Purple
                break;
            case 'green':
                snake.color = "#4CAF50"; // Green
                food.color = "#388E3C";  // Dark Green
                break;
            default:
                snake.color = GREEN;
                food.color = RED;
        }
    }
    
    // Function to update text based on gender
    function updateGenderText(gender) {
        if (gender === 'ex-boyfriend') {
            gameTitle.textContent = 'Ex-Boyfriend Eats Girlfriends';
            subtitle.textContent = 'Watch your Ex hunt down all your boyfriends';
            scoreDisplay.textContent = scoreDisplay.textContent.replace(/.*: /, 'Boyfriends Eaten: ');
            highScoreDisplay.textContent = highScoreDisplay.textContent.replace(/.*: /, 'Most Boyfriends Eaten: ');
            resetBtn.textContent = 'New Ex-Boyfriend';
            speedBtn.textContent = speedBtn.textContent.replace(/.*: /, 'Ex-Boyfriend Speed: ');
            footerText.textContent = 'Watch as your Ex-Boyfriend hunts down all your boyfriends with scary precision!';
        } else if (gender === 'ex-girlfriend') {
            gameTitle.textContent = 'Ex-Girlfriend Eats Boyfriends';
            subtitle.textContent = 'Watch your Ex hunt down all your girlfriends';
            scoreDisplay.textContent = scoreDisplay.textContent.replace(/.*: /, 'Girlfriends Eaten: ');
            highScoreDisplay.textContent = highScoreDisplay.textContent.replace(/.*: /, 'Most Girlfriends Eaten: ');
            resetBtn.textContent = 'New Ex-Girlfriend';
            speedBtn.textContent = speedBtn.textContent.replace(/.*: /, 'Ex-Girlfriend Speed: ');
            footerText.textContent = 'Watch as your Ex-Girlfriend hunts down all your girlfriends with scary precision!';
        } else {
            gameTitle.textContent = 'Ex Eats Partners';
            subtitle.textContent = 'Watch your Ex hunt down all your partners';
            scoreDisplay.textContent = scoreDisplay.textContent.replace(/.*: /, 'Partners Eaten: ');
            highScoreDisplay.textContent = highScoreDisplay.textContent.replace(/.*: /, 'Most Partners Eaten: ');
            resetBtn.textContent = 'New Ex';
            speedBtn.textContent = speedBtn.textContent.replace(/.*: /, 'Ex Speed: ');
            footerText.textContent = 'Watch as your Ex hunts down all your partners with scary precision!';
        }
    }
    
    // Initial message update
    updateMotivationalMessage();
});

// Update the updateScore function to maintain gender text consistency
function updateScore() {
    const activeGender = document.querySelector('.gender-option.active');
    let prefix = 'Boyfriends';
    
    if (activeGender) {
        if (activeGender.dataset.gender === 'ex-girlfriend') {
            prefix = 'Girlfriends';
        } else if (activeGender.dataset.gender === 'neutral') {
            prefix = 'Partners';
        }
    }
    
    scoreDisplay.textContent = `${prefix} Eaten: ${snake.score}`;
    
    // Update high score if current score is higher
    if (snake.score > highScore) {
        highScore = snake.score;
        highScoreDisplay.textContent = `Most ${prefix} Eaten: ${highScore}`;
    }
}

// Add error handling for canvas initialization
document.addEventListener('DOMContentLoaded', function() {
    // Add error handling for canvas
    if (!canvas || !ctx) {
        console.error('Canvas or context not available');
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = 'Unable to initialize game canvas. Please try a different browser.';
        document.querySelector('.canvas-container').appendChild(errorMessage);
        return;
    }
    
    // Add local storage for high score persistence
    try {
        const savedHighScore = localStorage.getItem('snakeHighScore');
        if (savedHighScore) {
            highScore = parseInt(savedHighScore);
            highScoreDisplay.textContent = `Most Boyfriends Eaten: ${highScore}`;
        }
    } catch (e) {
        console.warn('Local storage not available:', e);
    }
    
    // Save high score to local storage when it changes
    const originalUpdateScore = updateScore;
    updateScore = function() {
        originalUpdateScore();
        try {
            if (highScore > 0) {
                localStorage.setItem('snakeHighScore', highScore.toString());
            }
        } catch (e) {
            console.warn('Could not save high score:', e);
        }
    };
    
    // Add a window resize handler for responsiveness
    window.addEventListener('resize', function() {
        // Redraw the game on resize
        if (snake && food) {
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            snake.draw();
            food.draw();
        }
    });
    
    // Add a contribute button event listener
    const contributeBtn = document.getElementById('contribute-btn');
    if (contributeBtn) {
        contributeBtn.addEventListener('click', function() {
            // Track contribution clicks if analytics is available
            if (window.gtag) {
                gtag('event', 'click', {
                    'event_category': 'engagement',
                    'event_label': 'contribute_button'
                });
            }
        });
    }
    
    // Add a version number for tracking
    window.SNAKE_GAME_VERSION = '1.0.0';
});