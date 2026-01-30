// Maggs Game - simple canvas coin collector with enemies
(function(){
  const CONFIG = { width: 800, height: 500, playerSpeed: 3.2, enemySpeed: 2.2, coinCount: 6, enemyCount: 2 };

  let canvas, ctx, W, H;
  const state = { score: 0, lives: 3, paused: false, gameOver: false, started: false };
  const player = {x: 60, y: 60, r: 20, vx: 0, vy: 0, img: 'player'};
  let coins = [], enemies = [];
  const keys = { left:false, right:false, up:false, down:false };
  let lastTime = 0; let hitCooldown = 0;
  const images = {};

  function loadImage(name, src) {
    const img = new Image();
    img.src = src;
    images[name] = img;
  }

  // Player
  loadImage('player', 'assets/tiny_man.png');

  // Coins
  loadImage('coin1', 'assets/banana_bread_latte.png');
  loadImage('coin2', 'assets/berry_latte.png');
  loadImage('coin3', 'assets/cinnamon_latte.png');
  loadImage('coin4', 'assets/caramel_latte.png');
  loadImage('coin5', 'assets/vanilla_latte.png');

  // Enemies
  loadImage('enemy1', 'assets/brocollie.png');
  loadImage('enemy2', 'assets/chilly.png');
  loadImage('enemy3', 'assets/eggs.png');


  const coinImages = ['coin1', 'coin2', 'coin3','coin4', 'coin5'];
  const enemyImages = ['enemy1','enemy2','enemy3'];

  function rand(min, max){ return Math.random() * (max - min) + min; }
  function distance(ax, ay, bx, by){ const dx = ax - bx, dy = ay - by; return Math.hypot(dx, dy); }
  function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

  function spawnCoin(){
    const imgKey = coinImages[Math.floor(Math.random() * coinImages.length)];
    coins.push({
      x: rand(30, W-30),
      y: rand(30, H-30),
      r: 10,
      img: imgKey
    });
  }

  function spawnEnemy(){
    const speed = CONFIG.enemySpeed;
    const angle = rand(0, Math.PI*2);
    const imgKey = enemyImages[Math.floor(Math.random() * enemyImages.length)];
    enemies.push({ 
      x: rand(60, W-60), 
      y: rand(60, H-60), 
      r: 16, 
      vx: Math.cos(angle)*speed, 
      vy: Math.sin(angle)*speed,
      img: imgKey
    });
  }

  function reset(){
    state.score = 0; state.lives = 3; state.paused = false; state.gameOver = false;
    player.x = 60; player.y = 60; player.vx = 0; player.vy = 0; player.r = 20; hitCooldown = 0;
    coins = []; enemies = [];
    for(let i=0;i<CONFIG.coinCount;i++) spawnCoin();
    for(let i=0;i<CONFIG.enemyCount;i++) spawnEnemy();
    state.started = false;
  }

  function handleInput(){
    player.vx = 0; player.vy = 0;
    if(keys.left)  player.vx -= CONFIG.playerSpeed;
    if(keys.right) player.vx += CONFIG.playerSpeed;
    if(keys.up)    player.vy -= CONFIG.playerSpeed;
    if(keys.down)  player.vy += CONFIG.playerSpeed;
  }

  function update(dt){
    if (!state.started || state.paused || state.gameOver) return;

    hitCooldown = Math.max(0, hitCooldown - dt);
    handleInput();

    // Move player
    player.x += player.vx; player.y += player.vy;
    player.x = clamp(player.x, player.r, W - player.r);
    player.y = clamp(player.y, player.r, H - player.r);

    // Move and bounce enemies
    enemies.forEach(e => {
      e.x += e.vx; e.y += e.vy;
      if(e.x < e.r || e.x > W - e.r) e.vx *= -1;
      if(e.y < e.r || e.y > H - e.r) e.vy *= -1;
    });

    // Coin collection
    for(let i = coins.length - 1; i >= 0; i--){
      const c = coins[i];
      if(distance(player.x, player.y, c.x, c.y) < player.r + c.r){
        coins.splice(i,1); 
        state.score += 10; 
        spawnCoin();

        // Grow player
        player.r = Math.min(player.r + 1, 35); // cap size
 // Increase radius per coin

        // Add a new enemy occasionally
        if(state.score % 50 === 0 && enemies.length < 6) spawnEnemy();
      }
    }

    // Enemy collision
    if(hitCooldown <= 0){
      for(const e of enemies){
        if(distance(player.x, player.y, e.x, e.y) < (player.r + e.r) * 0.85){
          state.lives -= 1; hitCooldown = 800;
          if(state.lives <= 0){ state.gameOver = true; break; }
          const dx = player.x - e.x, dy = player.y - e.y; 
          const len = Math.hypot(dx, dy) || 1;
          player.x = clamp(player.x + (dx/len)*24, player.r, W - player.r);
          player.y = clamp(player.y + (dy/len)*24, player.r, H - player.r);
          break;
        }
      }
    }
  }

  function draw(){
    // Cafe-style background
ctx.fillStyle = '#a1866f'; // warm coffee brown
ctx.fillRect(0, 0, W, H);

// subtle grid lines
ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'; // soft cream lines
ctx.lineWidth = 1;
for(let x=0; x<W; x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
for(let y=0; y<H; y+=40){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

// Draw coins (only when image loaded - works on WAMP when paths resolve)
coins.forEach(c => {
  const img = images[c.img];
  if (!img || !img.complete || !img.naturalWidth) return;
  const scale = 1.35;
  ctx.drawImage(img, c.x - c.r * scale, c.y - c.r * scale, c.r * 2 * scale, c.r * 2 * scale);
});

enemies.forEach(e => {
  const img = images[e.img];
  if (img && img.complete && img.naturalWidth) {
    const scale = 1.25;
    ctx.drawImage(img, e.x - e.r * scale, e.y - e.r * scale, e.r * 2 * scale, e.r * 2 * scale);
  }
});

    const pImg = images[player.img];
    if (pImg && pImg.complete && pImg.naturalWidth) ctx.drawImage(pImg, player.x - player.r, player.y - player.r, player.r*2, player.r*2);

    // HUD
    ctx.fillStyle = '#ffffff'; ctx.font = '16px system-ui, Arial'; ctx.textBaseline = 'top';
    ctx.fillText(`Score: ${state.score}`, 12, 10);
    ctx.fillText(`Lives: ${state.lives}`, 12, 30);
    ctx.fillText('Arrows/WASD move • P pause • R reset', 12, 50);

    if(state.paused){
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 28px system-ui'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      ctx.fillText('Paused', W/2, H/2);
      ctx.textAlign = 'left';
    }

    if(state.gameOver){
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 28px system-ui'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      ctx.fillText('Game Over', W/2, H/2 - 20);
      ctx.font = '16px system-ui';
      ctx.fillText('Press R to restart', W/2, H/2 + 16);
      ctx.textAlign = 'left';
    }

    if (!state.started) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '700 26px Poppins';
  ctx.fillText('Would you like to have some fun while you wait?', W / 2, H / 2 - 60);

  // Start button
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(W / 2 - 110, H / 2 - 10, 220, 44);
  ctx.fillStyle = '#000';
  ctx.font = '600 18px Poppins';
  ctx.fillText('Start Game', W / 2, H / 2 + 12);

  // Quit button
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(W / 2 - 110, H / 2 + 50, 220, 44);
  ctx.fillStyle = '#000';
  ctx.fillText('Quit', W / 2, H / 2 + 72);

  ctx.textAlign = 'left';
}

  }

  function loop(ts){
    const dt = Math.min(100, ts - lastTime); lastTime = ts;
    update(dt); draw();
    requestAnimationFrame(loop);
  }

  function bindControls(){
    window.addEventListener('keydown', e => {
      if(e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
      if(e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
      if(e.key === 'ArrowUp' || e.key === 'w') keys.up = true;
      if(e.key === 'ArrowDown' || e.key === 's') keys.down = true;
      if(e.key.toLowerCase() === 'p') state.paused = !state.paused;
      if(e.key.toLowerCase() === 'r') reset();
    });
    window.addEventListener('keyup', e => {
      if(e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
      if(e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
      if(e.key === 'ArrowUp' || e.key === 'w') keys.up = false;
      if(e.key === 'ArrowDown' || e.key === 's') keys.down = false;
    });

    const resetBtn = document.getElementById('resetBtn');
    if(resetBtn) resetBtn.addEventListener('click', reset);

    canvas.addEventListener('click', e => {
      if (state.started) return;

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  // Start button bounds
      if (
    mx >= W / 2 - 110 &&
    mx <= W / 2 + 110 &&
    my >= H / 2 - 10 &&
    my <= H / 2 + 34
  ) {
    state.started = true;
    return;
  }

  // Quit button bounds
// Quit button bounds
  if (
    mx >= W / 2 - 110 &&
    mx <= W / 2 + 110 &&
    my >= H / 2 + 50 &&    // Adjust these coordinates to match your Quit button Y-axis
    my <= H / 2 + 94
  ) {
    window.location.href = "index.html"; // Redirects back to the main page
    return;
  }
  });
}

  function handleTouch(id, isPressed) {
    if (id === 'up') keys.up = isPressed;
    if (id === 'down') keys.down = isPressed;
    if (id === 'left') keys.left = isPressed;
    if (id === 'right') keys.right = isPressed;
  }

  function boot(){
    canvas = document.getElementById('game');
    if(!canvas){ console.warn('Canvas #game not found.'); return; }
    ctx = canvas.getContext('2d'); W = canvas.width = CONFIG.width; H = canvas.height = CONFIG.height;
    reset(); bindControls();

    // Touch controls (must run after canvas exists)
    const touchButtons = { up: document.getElementById('up'), down: document.getElementById('down'), left: document.getElementById('left'), right: document.getElementById('right') };
    Object.keys(touchButtons).forEach(id => {
      const btn = touchButtons[id];
      if (btn) {
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouch(id, true); });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); handleTouch(id, false); });
      }
    });
    canvas.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      if (touch) canvas.dispatchEvent(new MouseEvent("click", { clientX: touch.clientX, clientY: touch.clientY }));
    }, false);

    requestAnimationFrame(loop);
  }

  document.addEventListener('DOMContentLoaded', boot);

})();
