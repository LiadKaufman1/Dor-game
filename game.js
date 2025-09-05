// Canvas setup
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// HUD
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const timerEl = document.getElementById('timer');
const bigTimerEl = document.getElementById('bigTimer');
const levelIndicatorEl = document.getElementById('levelIndicator');
const restartBtn = document.getElementById('restart');

// Audio
const bgm = new Audio("music.mp3");
bgm.loop = true;
bgm.volume = 0.3;

// Images
const headImg = new Image();
headImg.src = "Dor.PNG";          // ראש בתחתית
const pearImg = new Image();
pearImg.src = "אגס.PNG";           // קליע
const fanImg = new Image();
fanImg.src = "מאוורר.jpg";        // אויב
const redFanImg = new Image();
redFanImg.src = "Red fan.PNG";     // מאוורר אדום
const electricImg = new Image();
electricImg.src = "חשמל.PNG";     // פאוור-אפ חשמל

let assetsReady = {head:false, pear:false, fan:false, redFan:false, electric:false};
headImg.onload = ()=> assetsReady.head = true;
pearImg.onload = ()=> assetsReady.pear = true;
fanImg.onload  = ()=> assetsReady.fan  = true;
redFanImg.onload = ()=> assetsReady.redFan = true;
electricImg.onload = ()=> assetsReady.electric = true;

// Game state
let player, bullets, enemies, powerups, score, lives, running, lastShot, keys, spawnTimer, spin, doublePoints, doublePointsTimer, gameTime, difficultyLevel;

// Init/reset
function reset(){
  player = { x: W/2, y: H-80, w: 100, h: 100, speed: 6 };
  bullets = [];
  enemies = [];
  powerups = [];
  score = 0;
  lives = 3;
  running = true;
  lastShot = 0;
  spawnTimer = 0;
  spin = 0;
  doublePoints = false;
  doublePointsTimer = 0;
  gameTime = 0;
  difficultyLevel = 0;
  keys = {left:false, right:false, shooting:false};
  updateHUD();
}

function updateHUD(){
  scoreEl.textContent = `נקודות: ${score}`;
  livesEl.textContent = `חיים: ${lives}`;
  const minutes = Math.floor(gameTime / 60);
  const seconds = Math.floor(gameTime % 60);
  const centiseconds = Math.floor((gameTime % 1) * 100);
  timerEl.textContent = `זמן: ${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  // עדכון הטיימר הגדול
  if (bigTimerEl) {
    bigTimerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }
  
  // עדכון אינדיקטור השלב
  if (levelIndicatorEl) {
    levelIndicatorEl.textContent = `שלב: ${difficultyLevel + 1}`;
  }
  
  // עדכון אינדיקטור כפל נקודות
  const indicator = document.getElementById('doublePointsIndicator');
  if (!indicator) {
    const div = document.createElement('div');
    div.id = 'doublePointsIndicator';
    div.style.cssText = 'position:fixed;top:10px;left:10px;background:#ffff00;color:#000;padding:15px 25px;border-radius:10px;font-weight:bold;font-size:24px;display:none;z-index:1000;border:3px solid #000;';
    document.body.appendChild(div);
  }
  
  const indicatorEl = document.getElementById('doublePointsIndicator');
  if (doublePoints) {
    indicatorEl.textContent = `Double Points! ${Math.ceil(doublePointsTimer)}s`;
    indicatorEl.style.display = 'block';
  } else {
    indicatorEl.style.display = 'none';
  }
}
restartBtn.addEventListener('click', reset);

// Start audio on first interaction
let audioStarted = false;
function startAudio() {
  if (!audioStarted) {
    bgm.play().catch(() => {});
    audioStarted = true;
  }
}

// Input
document.addEventListener('keydown', e=>{
  startAudio();
  if (e.key === 'ArrowLeft' || e.key.toLowerCase()==='a') keys.left = true;
  if (e.key === 'ArrowRight' || e.key.toLowerCase()==='d') keys.right = true;
  if (e.key === ' '){ e.preventDefault(); keys.shooting = true; }
});
document.addEventListener('keyup', e=>{
  if (e.key === 'ArrowLeft' || e.key.toLowerCase()==='a') keys.left = false;
  if (e.key === 'ArrowRight' || e.key.toLowerCase()==='d') keys.right = false;
  if (e.key === ' ') keys.shooting = false;
});
canvas.addEventListener('mousemove', e=>{
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  player.x = Math.max(player.w/2, Math.min(W - player.w/2, mx));
});
canvas.addEventListener('mousedown', ()=> {
  startAudio();
  keys.shooting = true;
});
canvas.addEventListener('mouseup', ()=> keys.shooting = false);

// Helpers
function rectsIntersect(a,b){
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

// Spawn enemies (fans) and powerups from top
function spawnEnemy(dt){
  spawnTimer += dt;
  if (spawnTimer >= 0.51){ // כל 0.51 שנ׳ (5% יותר איטי)
    spawnTimer = 0;
    const size = 76 + Math.random()*34; // 76-110px
    const x = Math.random() * (W - size);
    const baseSpeed = (1.6 + Math.random()*1.6) * 0.85 * 0.97;
    let speedMultiplier;
    if (difficultyLevel === 0) {
      speedMultiplier = 0.7; // שלב 1: 30% יותר איטי
    } else {
      speedMultiplier = 1 + ((difficultyLevel - 1) * 0.2); // משלב 2: 20% יותר מהיר כל שלב
    }
    const vy = baseSpeed * speedMultiplier;
    
    // 9% סיכוי למאוורר אלכסוני
    if (Math.random() < 0.09) {
      const vx = (Math.random() - 0.5) * 3; // מהירות אלכסונית
      enemies.push({x, y: -size, w:size, h:size, vy, vx, diagonal: true});
    } else {
      enemies.push({x, y: -size, w:size, h:size, vy, vx: 0, diagonal: false});
    }
    
    // לפעמים צור פאוור-אפ חשמל
    if (Math.random() < 0.05) {
      const px = Math.random() * (W - 35);
      powerups.push({x: px, y: -35, w: 35, h: 35, vy: 2, type: 'electric'});
    }
  }
}

// Shoot pears upward from the head's forehead
function shoot(ts){
  if (!keys.shooting) return;
  if (ts - lastShot < 220) return; // cadence
  lastShot = ts;
  const bw = 40, bh = 40;
  bullets.push({
    x: player.x - bw/2, 
    y: player.y + 10,   // יוצא מהראש
    w: bw, h: bh, vy: -4.5
  });
}

// Update
let prev = performance.now();
function loop(ts){
  const dt = (ts - prev)/1000; prev = ts;
  if (running){
    // עדכון זמן משחק ורמת קושי
    gameTime += dt;
    const newDifficultyLevel = Math.min(5, Math.floor(gameTime / 15));
    if (newDifficultyLevel > difficultyLevel) {
      difficultyLevel = newDifficultyLevel;
    }
    
    // עדכון טיימר כפל נקודות
    if (doublePoints) {
      doublePointsTimer -= dt;
      if (doublePointsTimer <= 0) {
        doublePoints = false;
      }
    }
    updateHUD(); // עדכון רציף של הטיימר
    
    // player move
    if (keys.left)  player.x -= player.speed;
    if (keys.right) player.x += player.speed;
    player.x = Math.max(player.w/2, Math.min(W - player.w/2, player.x));

    // shooting
    shoot(ts);

    // bullets
    bullets.forEach(b => b.y += b.vy);
    bullets = bullets.filter(b => b.y + b.h > -10);

    // enemies
    spawnEnemy(dt);
    enemies.forEach(e => {
      e.y += e.vy;
      if (e.vx) {
        e.x += e.vx; // תנועה אלכסונית
        // בדיקה שהמאוורר לא יוצא מהמסך
        if (e.x < 0 || e.x + e.w > W) {
          e.vx = -e.vx; // החזר כיוון
        }
      }
    });
    // בדוק אם מאוורר עבר את השחקן
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].y > H + 40) {
        enemies.splice(i, 1);
        lives -= 1;
        updateHUD();
        if (lives <= 0) running = false;
      }
    }
    
    // powerups
    powerups.forEach(p => p.y += p.vy);
    powerups = powerups.filter(p => p.y < H + 40);

    // collisions: bullet vs enemy
    for (let i=enemies.length-1; i>=0; i--){
      const e = enemies[i];
      let hit = false;
      for (let j=bullets.length-1; j>=0; j--){
        const b = bullets[j];
        if (rectsIntersect({x:b.x,y:b.y,w:b.w,h:b.h}, {x:e.x,y:e.y,w:e.w,h:e.h})){
          bullets.splice(j,1);
          hit = true; break;
        }
      }
      if (hit){
        enemies.splice(i,1);
        score += doublePoints ? 20 : 10;
        updateHUD();
      }
    }

    // collisions: enemy vs player (head)
    for (const e of enemies){
      if (rectsIntersect({x:player.x-player.w/2,y:player.y-player.h/2,w:player.w,h:player.h}, e)){
        lives -= 1;
        updateHUD();
        // דחוף את האויב למטה כדי לא לספור פעמיים
        e.y = H + 100;
        if (lives <= 0) running = false;
      }
    }
    
    // collisions: powerup vs player
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      if (rectsIntersect({x:player.x-player.w/2,y:player.y-player.h/2,w:player.w,h:player.h}, p)) {
        if (p.type === 'electric') {
          doublePoints = true;
          doublePointsTimer = 10; // 10 שניות
          updateHUD(); // עדכון מיידי של האינדיקטור
        }
        powerups.splice(i, 1);
      }
    }
  }

  draw();
  requestAnimationFrame(loop);
}

// Draw
function draw(){
  // bg
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,W,H);

  // player head
  if (assetsReady.head){
    ctx.drawImage(headImg, player.x - player.w/2, player.y - player.h/2, player.w, player.h);
  }else{
    ctx.fillStyle = '#888'; ctx.fillRect(player.x-25, player.y-25, 50, 50);
  }

  // bullets (pears)
  for (const b of bullets){
    if (assetsReady.pear){
      ctx.drawImage(pearImg, b.x, b.y, b.w, b.h);
    }else{
      ctx.fillStyle = '#7aff00'; ctx.fillRect(b.x, b.y, b.w, b.h);
    }
  }
  
  // powerups (electric)
  for (const p of powerups){
    if (assetsReady.electric){
      ctx.drawImage(electricImg, p.x, p.y, p.w, p.h);
    } else {
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(p.x, p.y, p.w, p.h);
    }
  }
  


  // enemies (fans) with rotation
  spin += 0.08;
  for (const e of enemies){
    if (e.diagonal && assetsReady.redFan){
      ctx.save();
      ctx.translate(e.x + e.w/2, e.y + e.h/2);
      ctx.rotate(spin);
      ctx.drawImage(redFanImg, -e.w/2, -e.h/2, e.w, e.h);
      ctx.restore();
    } else if (assetsReady.fan){
      ctx.save();
      ctx.translate(e.x + e.w/2, e.y + e.h/2);
      ctx.rotate(spin);
      ctx.drawImage(fanImg, -e.w/2, -e.h/2, e.w, e.h);
      ctx.restore();
    }else{
      ctx.fillStyle = e.diagonal ? '#ff0000' : '#19c37d';
      ctx.fillRect(e.x, e.y, e.w, e.h);
    }
  }

  if (!running){
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#fff';
    ctx.font = '28px system-ui';
    const msg = `נגמר! — לחץ "התחל מחדש"`;
    const scoreMsg = `ניקוד: ${score}`;
    const tw = ctx.measureText(msg).width;
    ctx.fillText(scoreMsg, (W-tw)/2 + 315, H/2 - 40);
    ctx.fillText(msg, (W-tw)/2 + 315, H/2);
  }
}

// Kickoff
reset();
requestAnimationFrame(loop);
