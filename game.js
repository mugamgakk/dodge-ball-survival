const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const arenaRadius = 280;

let gameState = 'menu';
let animationId;
let lastTime = 0;

const game = {
    level: 1,
    score: 0,
    health: 3,
    time: 0,
    levelUpTime: 10,
    lastLevelUp: 0,
    isPaused: false,
    isInvincible: false,
    isSlowMotion: false,
    isDoubleScore: false,
    powerupEndTime: 0,
    powerupType: ''
};

const player = {
    x: centerX,
    y: centerY,
    radius: 12,
    speed: 200,
    color: '#00ff00',
    dx: 0,
    dy: 0
};

const balls = [];
const items = [];
const particles = [];

const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

class Ball {
    constructor(x, y, level) {
        this.x = x;
        this.y = y;
        this.radius = 15 + Math.random() * 10;
        this.baseSpeed = 100 + level * 10;
        this.speed = this.baseSpeed;
        this.angle = Math.random() * Math.PI * 2;
        this.dx = Math.cos(this.angle) * this.speed;
        this.dy = Math.sin(this.angle) * this.speed;
        this.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
        this.trail = [];
        this.maxTrailLength = 5;
        
        if (level > 5) {
            this.curveIntensity = Math.random() * 0.5;
            this.curvePhase = Math.random() * Math.PI * 2;
        }
    }

    update(deltaTime) {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }

        const actualSpeed = game.isSlowMotion ? this.speed * 0.5 : this.speed;
        
        if (this.curveIntensity && game.level > 5) {
            this.curvePhase += deltaTime * 2;
            const curveFactor = Math.sin(this.curvePhase) * this.curveIntensity;
            this.dx += curveFactor * 30 * deltaTime;
            this.dy += curveFactor * 30 * deltaTime;
        }

        this.x += this.dx * deltaTime;
        this.y += this.dy * deltaTime;

        const distFromCenter = Math.sqrt(
            Math.pow(this.x - centerX, 2) + 
            Math.pow(this.y - centerY, 2)
        );

        if (distFromCenter + this.radius > arenaRadius) {
            const angleToCenter = Math.atan2(this.y - centerY, this.x - centerX);
            this.x = centerX + (arenaRadius - this.radius) * Math.cos(angleToCenter);
            this.y = centerY + (arenaRadius - this.radius) * Math.sin(angleToCenter);
            
            const normal = {
                x: (this.x - centerX) / distFromCenter,
                y: (this.y - centerY) / distFromCenter
            };
            
            const dot = this.dx * normal.x + this.dy * normal.y;
            this.dx -= 2 * dot * normal.x;
            this.dy -= 2 * dot * normal.y;
            
            createParticles(this.x, this.y, this.color);
        }

        const speedMagnitude = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        if (speedMagnitude > 0) {
            this.dx = (this.dx / speedMagnitude) * actualSpeed;
            this.dy = (this.dy / speedMagnitude) * actualSpeed;
        }
    }

    draw() {
        this.trail.forEach((point, index) => {
            const trailRadius = Math.max(this.radius * (0.5 + index / this.trail.length * 0.5), 1);
            ctx.globalAlpha = 0.1 * (index / this.trail.length);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, trailRadius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        const safeRadius = Math.max(this.radius, 1);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, safeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x - safeRadius * 0.3, this.y - safeRadius * 0.3, Math.max(safeRadius * 0.3, 1), 0, Math.PI * 2);
        ctx.fill();
    }
}

class Item {
    constructor() {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * (arenaRadius - 50);
        this.x = centerX + Math.cos(angle) * distance;
        this.y = centerY + Math.sin(angle) * distance;
        this.radius = 20;
        this.pulsePhase = 0;
        
        const types = [
            { type: 'shield', emoji: '🛡', color: '#4FC3F7' },
            { type: 'slow', emoji: '🐌', color: '#9C27B0' },
            { type: 'health', emoji: '❤️', color: '#F44336' },
            { type: 'double', emoji: '💰', color: '#FFD700' }
        ];
        const selected = types[Math.floor(Math.random() * types.length)];
        this.type = selected.type;
        this.emoji = selected.emoji;
        this.color = selected.color;
    }

    update(deltaTime) {
        this.pulsePhase += deltaTime * 3;
        this.radius = 20 + Math.sin(this.pulsePhase) * 3;
    }

    draw() {
        ctx.save();
        
        const safeRadius = Math.max(this.radius, 1);
        
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, safeRadius + 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(this.x, this.y, safeRadius + 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, safeRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, this.x, this.y);
        
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 200;
        this.vy = (Math.random() - 0.5) * 200;
        this.life = 1;
        this.decay = 0.02;
        this.color = color;
        this.size = Math.random() * 5 + 2;
    }

    update(deltaTime) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        this.life -= this.decay;
        this.vx *= 0.98;
        this.vy *= 0.98;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        const particleRadius = Math.max(this.size * this.life, 0.1);
        ctx.arc(this.x, this.y, particleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function initGame() {
    game.level = 1;
    game.score = 0;
    game.health = 3;
    game.time = 0;
    game.lastLevelUp = 0;
    game.isInvincible = false;
    game.isSlowMotion = false;
    game.isDoubleScore = false;
    game.powerupType = '';
    game.powerupEndTime = 0;
    
    player.x = centerX;
    player.y = centerY;
    player.dx = 0;
    player.dy = 0;
    
    balls.length = 0;
    items.length = 0;
    particles.length = 0;
    
    for (let i = 0; i < 5; i++) {
        spawnBall();
    }
    
    console.log('게임 초기화:', { playerRadius: player.radius, playerPos: { x: player.x, y: player.y }, ballsCount: balls.length });
    
    updateHUD();
}

function spawnBall() {
    const angle = Math.random() * Math.PI * 2;
    const distance = arenaRadius * 0.7;
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    const newBall = new Ball(x, y, game.level);
    balls.push(newBall);
    console.log('공 생성:', { x, y, radius: newBall.radius, ballsCount: balls.length });
}

function spawnItem() {
    if (items.length < 2) {
        items.push(new Item());
    }
}

function updatePlayer(deltaTime) {
    if (keys.ArrowUp) player.dy = -player.speed;
    else if (keys.ArrowDown) player.dy = player.speed;
    else player.dy = 0;
    
    if (keys.ArrowLeft) player.dx = -player.speed;
    else if (keys.ArrowRight) player.dx = player.speed;
    else player.dx = 0;
    
    if (player.dx !== 0 && player.dy !== 0) {
        const magnitude = Math.sqrt(player.dx * player.dx + player.dy * player.dy);
        player.dx = (player.dx / magnitude) * player.speed;
        player.dy = (player.dy / magnitude) * player.speed;
    }
    
    const newX = player.x + player.dx * deltaTime;
    const newY = player.y + player.dy * deltaTime;
    
    const distFromCenter = Math.sqrt(
        Math.pow(newX - centerX, 2) + 
        Math.pow(newY - centerY, 2)
    );
    
    if (distFromCenter + player.radius <= arenaRadius) {
        player.x = newX;
        player.y = newY;
    }
}

function checkCollisions() {
    let shouldEndGame = false;
    
    for (let i = balls.length - 1; i >= 0; i--) {
        const ball = balls[i];
        const dx = player.x - ball.x;
        const dy = player.y - ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const collisionDistance = player.radius + ball.radius;
        
        console.log(`Ball ${i}: distance=${distance.toFixed(2)}, collision=${collisionDistance.toFixed(2)}, isInvincible=${game.isInvincible}`);
        
        if (distance < collisionDistance) {
            console.log('충돌 감지!', { health: game.health, isInvincible: game.isInvincible });
            if (!game.isInvincible) {
                game.health--;
                console.log('체력 감소:', game.health);
                createParticles(player.x, player.y, '#ff0000');
                updateHUD();
                
                if (game.health <= 0) {
                    shouldEndGame = true;
                } else {
                    game.isInvincible = true;
                    game.powerupType = 'damaged';
                    game.powerupEndTime = Date.now() + 2000;
                    console.log('무적 모드 활성화:', { endTime: game.powerupEndTime, now: Date.now() });
                }
            }
        }
    }
    
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        const dx = player.x - item.x;
        const dy = player.y - item.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < player.radius + item.radius) {
            collectItem(item);
            items.splice(i, 1);
        }
    }
    
    if (shouldEndGame) {
        gameOver();
    }
}

function collectItem(item) {
    createParticles(item.x, item.y, item.color);
    game.score += 100;
    
    switch(item.type) {
        case 'shield':
            game.isInvincible = true;
            game.powerupType = 'shield';
            game.powerupEndTime = Date.now() + 5000;
            showPowerup('🛡 무적 모드!');
            break;
        case 'slow':
            game.isSlowMotion = true;
            game.powerupType = 'slow';
            game.powerupEndTime = Date.now() + 5000;
            showPowerup('🐌 슬로우 모션!');
            break;
        case 'health':
            if (game.health < 3) {
                game.health++;
            }
            showPowerup('❤️ 체력 회복!');
            break;
        case 'double':
            game.isDoubleScore = true;
            game.powerupType = 'double';
            game.powerupEndTime = Date.now() + 10000;
            showPowerup('💰 2배 점수!');
            break;
    }
}

function showPowerup(text) {
    const indicator = document.getElementById('powerupIndicator');
    indicator.textContent = text;
    indicator.classList.remove('hidden');
    setTimeout(() => {
        indicator.classList.add('hidden');
    }, 2000);
}

function updatePowerups() {
    const now = Date.now();
    
    if (game.powerupEndTime > 0) {
        console.log('파워업 체크:', { 
            type: game.powerupType, 
            endTime: game.powerupEndTime, 
            now: now, 
            timeLeft: game.powerupEndTime - now,
            shouldEnd: now > game.powerupEndTime 
        });
    }
    
    if (game.powerupEndTime && now > game.powerupEndTime) {
        console.log('파워업 종료:', game.powerupType);
        switch(game.powerupType) {
            case 'shield':
                game.isInvincible = false;
                break;
            case 'slow':
                game.isSlowMotion = false;
                break;
            case 'double':
                game.isDoubleScore = false;
                break;
            case 'damaged':
                game.isInvincible = false;
                break;
        }
        game.powerupType = '';
        game.powerupEndTime = 0;
        console.log('무적 상태 해제:', game.isInvincible);
    }
}

function levelUp() {
    game.level++;
    game.lastLevelUp = game.time;
    
    const ballsToAdd = game.level < 5 ? 1 : 2;
    for (let i = 0; i < ballsToAdd; i++) {
        spawnBall();
    }
    
    balls.forEach(ball => {
        ball.speed = ball.baseSpeed * (1 + game.level * 0.05);
    });
    
    createParticles(centerX, centerY, '#ffff00');
    showPowerup(`레벨 ${game.level}!`);
    
    const hue = (game.level * 30) % 360;
    document.body.style.background = `linear-gradient(135deg, hsl(${hue}, 70%, 50%) 0%, hsl(${hue + 60}, 70%, 40%) 100%)`;
}

function updateHUD() {
    document.getElementById('level').textContent = game.level;
    document.getElementById('score').textContent = Math.floor(game.score);
    document.getElementById('time').textContent = Math.floor(game.time);
    
    let healthDisplay = '';
    for (let i = 0; i < game.health; i++) {
        healthDisplay += '❤️';
    }
    document.getElementById('health').textContent = healthDisplay;
}

function drawArena() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, arenaRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, arenaRadius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, arenaRadius, 0, Math.PI * 2);
    ctx.fill();
}

function drawPlayer() {
    if (game.isInvincible && game.powerupType === 'damaged') {
        ctx.globalAlpha = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
    }
    
    if (game.isInvincible && game.powerupType === 'shield') {
        ctx.strokeStyle = '#4FC3F7';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, Math.max(player.radius + 10, 1), 0, Math.PI * 2);
        ctx.stroke();
    }
    
    const safePlayerRadius = Math.max(player.radius, 1);
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, safePlayerRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(player.x - safePlayerRadius * 0.3, player.y - safePlayerRadius * 0.3, Math.max(safePlayerRadius * 0.4, 1), 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalAlpha = 1;
}

function gameLoop(currentTime) {
    if (gameState !== 'playing') return;
    
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawArena();
    
    updatePlayer(deltaTime);
    
    balls.forEach(ball => {
        ball.update(deltaTime);
        ball.draw();
    });
    
    items.forEach(item => {
        item.update(deltaTime);
        item.draw();
    });
    
    particles.forEach((particle, index) => {
        particle.update(deltaTime);
        particle.draw();
        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    });
    
    drawPlayer();
    
    checkCollisions();
    updatePowerups();
    
    game.time += deltaTime;
    const scoreIncrease = game.isDoubleScore ? 20 : 10;
    game.score += scoreIncrease * deltaTime;
    
    if (game.time - game.lastLevelUp >= game.levelUpTime) {
        levelUp();
    }
    
    if (Math.random() < 0.001 || (items.length === 0 && Math.random() < 0.01)) {
        spawnItem();
    }
    
    updateHUD();
    
    animationId = requestAnimationFrame(gameLoop);
}

function startGame() {
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    
    gameState = 'playing';
    initGame();
    lastTime = performance.now();
    gameLoop(lastTime);
}

function gameOver() {
    gameState = 'over';
    cancelAnimationFrame(animationId);
    
    const rankings = JSON.parse(localStorage.getItem('rankings') || '[]');
    rankings.push({
        score: Math.floor(game.score),
        time: Math.floor(game.time),
        level: game.level,
        date: new Date().toLocaleDateString()
    });
    
    rankings.sort((a, b) => b.score - a.score);
    rankings.splice(5);
    localStorage.setItem('rankings', JSON.stringify(rankings));
    
    document.getElementById('finalStats').innerHTML = `
        <p>최종 점수: ${Math.floor(game.score)}</p>
        <p>생존 시간: ${Math.floor(game.time)}초</p>
        <p>도달 레벨: ${game.level}</p>
    `;
    
    let rankingHTML = '<h3>🏆 랭킹</h3>';
    rankings.forEach((rank, index) => {
        rankingHTML += `
            <div class="ranking-item">
                ${index + 1}. ${rank.score}점 - ${rank.time}초 - Lv.${rank.level}
            </div>
        `;
    });
    document.getElementById('rankingBoard').innerHTML = rankingHTML;
    
    document.getElementById('gameOverScreen').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
}

document.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
        e.preventDefault();
    }
});

window.addEventListener('blur', () => {
    Object.keys(keys).forEach(key => keys[key] = false);
});