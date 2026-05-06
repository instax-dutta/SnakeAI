const GRID_SIZE = 20;
const GRID_WIDTH = 28;
const GRID_HEIGHT = 21;
const CANVAS_WIDTH = GRID_WIDTH * GRID_SIZE;
const CANVAS_HEIGHT = GRID_HEIGHT * GRID_SIZE;

const DIRECTIONS = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 }
];

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const resetBtn = document.getElementById('reset-btn');
const speedBtn = document.getElementById('speed-btn');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('high-score');

let snake, food, ai, gameInterval;
let highScore = 0;
let gameSpeed = 'steady';

const themeColors = {
    sage: { snake: '#7BA37B', food: '#4A6B4A', glow: '#A8C9A5' },
    peach: { snake: '#E89B7B', food: '#C4755A', glow: '#FFC4A8' },
    lavender: { snake: '#A591D5', food: '#7B5FB5', glow: '#C9B8E0' },
    ocean: { snake: '#5BAFC7', dataColor: '#3D8AA8', glow: '#9DD1E1' }
};

let currentTheme = 'sage';

function getThemeColors() {
    const theme = themeColors[currentTheme] || themeColors.sage;
    return {
        snake: theme.snake,
        food: theme.food,
        glow: theme.glow
    };
}

function updateCanvasSize() {
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
}

class Snake {
    constructor() {
        this.reset();
    }

    reset() {
        this.length = 3;
        this.positions = [{
            x: Math.floor(GRID_WIDTH / 2),
            y: Math.floor(GRID_HEIGHT / 2)
        }];
        this.direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        this.score = 0;
    }

    getHeadPosition() {
        return this.positions[0];
    }

    turn(direction) {
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

        if (this.positions.slice(1).some(pos => pos.x === newPosition.x && pos.y === newPosition.y)) {
            this.reset();
            updateScore();
            return;
        }

        this.positions.unshift(newPosition);
        if (this.positions.length > this.length) {
            this.positions.pop();
        }
    }

    draw() {
        const colors = getThemeColors();
        
        this.positions.forEach((pos, index) => {
            const x = pos.x * GRID_SIZE;
            const y = pos.y * GRID_SIZE;
            const isHead = index === 0;
            
            ctx.fillStyle = isHead ? colors.snake : colors.snake + 'CC';
            ctx.strokeStyle = colors.glow + '40';
            
            const radius = isHead ? 6 : 4;
            const padding = 1;
            
            ctx.beginPath();
            ctx.roundRect(x + padding, y + padding, GRID_SIZE - padding * 2, GRID_SIZE - padding * 2, radius);
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.stroke();
            
            if (isHead) {
                ctx.fillStyle = '#ffffff40';
                ctx.beginPath();
                ctx.arc(x + 6, y + 6, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }
}

class Food {
    constructor() {
        this.position = { x: 0, y: 0 };
        this.pulsePhase = 0;
        this.randomizePosition();
    }

    randomizePosition() {
        this.position = {
            x: Math.floor(Math.random() * GRID_WIDTH),
            y: Math.floor(Math.random() * GRID_HEIGHT)
        };
    }

    draw() {
        const colors = getThemeColors();
        const x = this.position.x * GRID_SIZE + GRID_SIZE / 2;
        const y = this.position.y * GRID_SIZE + GRID_SIZE / 2;
        
        this.pulsePhase += 0.1;
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.1;
        const size = (GRID_SIZE / 2 - 2) * pulse;
        
        ctx.fillStyle = colors.food;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff40';
        ctx.beginPath();
        ctx.arc(x - 2, y - 2, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }
}

class SnakeAI {
    constructor(snake, food) {
        this.snake = snake;
        this.food = food;
    }

    getNextMove() {
        const head = this.snake.getHeadPosition();
        const foodPos = this.food.position;
        
        const queue = [{ pos: head, path: [] }];
        const visited = new Set([`${head.x},${head.y}`]);
        
        while (queue.length > 0) {
            const { pos, path } = queue.shift();
            
            if (pos.x === foodPos.x && pos.y === foodPos.y) {
                if (path.length === 0) {
                    return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
                }
                return path[0];
            }
            
            for (const direction of DIRECTIONS) {
                const newX = (pos.x + direction.x + GRID_WIDTH) % GRID_WIDTH;
                const newY = (pos.y + direction.y + GRID_HEIGHT) % GRID_HEIGHT;
                const newPos = { x: newX, y: newY };
                const posKey = `${newX},${newY}`;
                
                if (visited.has(posKey) || this.isPartOfSnakeBody(newPos)) {
                    continue;
                }
                
                const newPath = path.length > 0 ? [...path] : [direction];
                if (path.length === 0) {
                    newPath[0] = direction;
                }
                queue.push({ pos: newPos, path: newPath });
                visited.add(posKey);
            }
        }
        
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
            
            if (!this.isPartOfSnakeBody(newPos)) {
                safeDirections.push(direction);
            }
        }
        
        if (safeDirections.length > 0) {
            return safeDirections[Math.floor(Math.random() * safeDirections.length)];
        } else {
            return this.snake.direction;
        }
    }
}

function updateScore() {
    const activeGender = document.querySelector('.gender-btn.active');
    let prefix = 'Partners';
    
    if (activeGender) {
        const gender = activeGender.dataset.gender;
        if (gender === 'ex-boyfriend') prefix = 'Boyfriends';
        else if (gender === 'ex-girlfriend') prefix = 'Girlfriends';
    }
    
    scoreDisplay.textContent = snake.score;
    
    if (snake.score > highScore) {
        highScore = snake.score;
        highScoreDisplay.textContent = highScore;
        try {
            localStorage.setItem('snakeHighScore', highScore.toString());
        } catch (e) {}
    }
}

function initGame() {
    updateCanvasSize();
    
    snake = new Snake();
    food = new Food();
    ai = new SnakeAI(snake, food);
    
    while (snake.positions.some(pos =>
        pos.x === food.position.x && pos.y === food.position.y)) {
        food.randomizePosition();
    }
    
    updateScore();
    
    try {
        const saved = localStorage.getItem('snakeHighScore');
        if (saved) {
            highScore = parseInt(saved);
            highScoreDisplay.textContent = highScore;
        }
    } catch (e) {}
    
    if (gameInterval) clearInterval(gameInterval);
    
    gameSpeed = 'steady';
    speedBtn.innerHTML = '<span class="btn-icon">⚡</span><span>Speed: Steady</span>';
    
    gameInterval = setInterval(gameLoop, 1000 / 8);
}

function gameLoop() {
    const nextMove = ai.getNextMove();
    snake.turn(nextMove);
    snake.move();
    
    const head = snake.getHeadPosition();
    if (head.x === food.position.x && head.y === food.position.y) {
        snake.length += 1;
        snake.score += 1;
        updateScore();
        food.randomizePosition();
        
        while (snake.positions.some(pos =>
            pos.x === food.position.x && pos.y === food.position.y)) {
            food.randomizePosition();
        }
    }
    
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    const colors = getThemeColors();
    ctx.strokeStyle = colors.glow + '10';
    ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_WIDTH; x++) {
        ctx.beginPath();
        ctx.moveTo(x * GRID_SIZE, 0);
        ctx.lineTo(x * GRID_SIZE, CANVAS_HEIGHT);
        ctx.stroke();
    }
    for (let y = 0; y <= GRID_HEIGHT; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * GRID_SIZE);
        ctx.lineTo(CANVAS_WIDTH, y * GRID_SIZE);
        ctx.stroke();
    }
    
    food.draw();
    snake.draw();
}

speedBtn.addEventListener('click', () => {
    if (gameSpeed === 'steady') {
        gameSpeed = 'fast';
        speedBtn.innerHTML = '<span class="btn-icon">⚡</span><span>Speed: Fast</span>';
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, 1000 / 14);
    } else if (gameSpeed === 'fast') {
        gameSpeed = 'slow';
        speedBtn.innerHTML = '<span class="btn-icon">🐢</span><span>Speed: Slow</span>';
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, 1000 / 5);
    } else {
        gameSpeed = 'steady';
        speedBtn.innerHTML = '<span class="btn-icon">⚡</span><span>Speed: Steady</span>';
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, 1000 / 8);
    }
});

resetBtn.addEventListener('click', () => {
    snake.reset();
    food.randomizePosition();
    updateScore();
});

document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        currentTheme = this.dataset.theme;
        document.body.className = 'theme-' + currentTheme;
    });
});

document.querySelectorAll('.gender-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        updateAffirmation();
    });
});

const toxicitySlider = document.getElementById('toxicity-slider');
const toxicityLabels = document.querySelectorAll('.toxicity-labels span');

toxicitySlider.addEventListener('input', function() {
    const level = parseInt(this.value);
    toxicityLabels.forEach(label => {
        label.classList.toggle('active', parseInt(label.dataset.level) === level);
    });
    updateAffirmation();
});

const affirmations = {
    'ex-boyfriend': {
        1: [
            "You're worthy of love that honors you.",
            "Every day is a fresh start.",
            "Your happiness doesn't depend on anyone else.",
            "You are enough, exactly as you are."
        ],
        2: [
            "Some lessons hurt but help us grow.",
            "Your standards matter. Don't settle.",
            "You've outgrown what no longer serves you.",
            "The right person will value you."
        ],
        3: [
            "Watch them chase what they'll never catch.",
            "Your peace is the best revenge.",
            "They showed you who they really are.",
            "You're free now. Use it well."
        ]
    },
    'ex-girlfriend': {
        1: [
            "Your heart heals a little more each day.",
            "You deserve gentleness from yourself.",
            "The best is yet to come.",
            "Trust the timing of your life."
        ],
        2: [
            "Not everyone is meant to stay.",
            "Your worth isn't defined by someone else's choice.",
            "Goodbyes make room for hellos.",
            "She's showing you her path, not yours."
        ],
        3: [
            "Let them eat their regrets.",
            "You're the catch they couldn't handle.",
            "See how they scramble for what's not theirs?",
            "Cold-blooded behavior meets its match."
        ]
    },
    'neutral': {
        1: [
            "Release what no longer aligns with you.",
            "You are your own safe place.",
            "Growth happens in letting go.",
            "Tomorrow holds better things."
        ],
        2: [
            "What glitters isn't always gold.",
            "You're stronger than you know.",
            "The right ones stay; the wrong ones teach.",
            "Your peace is priority."
        ],
        3: [
            "Watch them spiral while you rise.",
            "They can't touch your peace.",
            "Karma is patient and precise.",
            "You're the main character now."
        ]
    }
};

function updateAffirmation() {
    const activeGender = document.querySelector('.gender-btn.active');
    const gender = activeGender ? activeGender.dataset.gender : 'neutral';
    const toxicity = parseInt(toxicitySlider.value);
    
    const messages = affirmations[gender][toxicity];
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    
    const affirmationEl = document.getElementById('affirmation');
    affirmationEl.style.opacity = 0;
    
    setTimeout(() => {
        affirmationEl.textContent = randomMsg;
        affirmationEl.style.opacity = 1;
    }, 300);
}

window.addEventListener('load', initGame);

window.addEventListener('resize', () => {
    if (snake && food) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        food.draw();
        snake.draw();
    }
});