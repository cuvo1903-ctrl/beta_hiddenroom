(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // Safari/iPhone no siempre calcula 100vh correctamente por la barra inferior.
  // Esta variable mantiene el alto real de la ventana para que el juego no se corte.
  function setViewportHeight() {
    document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
  }
  setViewportHeight();
  window.addEventListener('resize', setViewportHeight);
  window.addEventListener('orientationchange', () => setTimeout(setViewportHeight, 250));
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  const $ = (id) => document.getElementById(id);
  const ui = {
    menu: $('menu'), gamePanel: $('gamePanel'), gameOver: $('gameOver'), howTo: $('howTo'), message: $('message'),
    scoreboard: $('scoreboardUI'), time: $('timeUI'), score: $('scoreUI'), chicks: $('chicksUI'),
    finalGoals: $('finalGoals'), finalScore: $('finalScore'), finalWings: $('finalWings'), record: $('recordUI')
  };

  let W = 960, H = 540;

  function isPortraitGame() {
    return window.innerWidth <= 760 && window.innerHeight > window.innerWidth;
  }

  function configureCanvas() {
    if (isPortraitGame()) {
      W = 540;
      H = 960;
    } else {
      W = 960;
      H = 540;
    }
    canvas.width = W;
    canvas.height = H;
  }

  function goalTop() { return H / 2 - (isPortraitGame() ? 92 : 58); }
  function goalBottom() { return H / 2 + (isPortraitGame() ? 92 : 58); }
  function fieldTop() { return isPortraitGame() ? 118 : 70; }
  function fieldBottom() { return H - (isPortraitGame() ? 118 : 50); }
  function fieldLeft() { return isPortraitGame() ? 52 : 70; }
  function fieldRight() { return W - fieldLeft(); }

  configureCanvas();
  window.addEventListener('resize', () => { configureCanvas(); if (state.running) resetMatch(); });
  window.addEventListener('orientationchange', () => setTimeout(() => { configureCanvas(); if (state.running) resetMatch(); }, 260));
  const keys = new Set();
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const state = {
    running: false,
    last: 0,
    timeLeft: 60,
    score: 0,
    goals: 0,
    rivalGoals: 0,
    chicks: 0,
    difficulty: 1,
    rivalSpeedBonus: 1,
    stealCooldown: 0,
    sprintEnergy: 100,
    comboTimer: 0,
    messageTimer: 0,
    messageText: '',
    claraTimer: 0,
    claraCooldown: 8,
    ajoloteTimer: 0,
    multiplierTimer: 0,
    speedTimer: 0,
    invincibleTimer: 0,
    touchMove: { x: 0, y: 0 },
    touchSprint: false,
    touchShoot: false,
    shootPressed: false,
    tackleCooldown: 0
  };

  const player = { x: 210, y: 270, r: 17, vx: 0, vy: 0, color: '#21d46b', hasBall: true, facing: { x: 1, y: 0 } };
  const ball = { x: 232, y: 270, r: 9, vx: 0, vy: 0, owner: 'player', ownerIndex: -1, passTargetIndex: -1, passGrace: 0 };
  const rivals = [];
  const pickups = [];
  const clara = { active: false, x: -80, y: 0, r: 24, vx: 0, vy: 0 };
  const goalie = { x: W - 62, y: H / 2, r: 18, speed: 82, color: '#b78cff', passCooldown: 0, targetY: H / 2, reaction: 0 };

  function resetMatch() {
    configureCanvas();
    player.x = W * 0.22; player.y = H / 2; player.vx = player.vy = 0; player.hasBall = true; player.facing = { x: 1, y: 0 };
    ball.x = player.x + 24; ball.y = player.y; ball.vx = ball.vy = 0; ball.owner = 'player'; ball.ownerIndex = -1; ball.passTargetIndex = -1; ball.passGrace = 0;
    rivals.length = 0;
    rivals.push({ x: W * 0.63, y: H * 0.40, r: 17, color: '#ff4141', speed: 74, facing: {x:-1,y:0}, shootCooldown: 0, passCooldown: 0, receiveCooldown: 0, lane: -1 });
    rivals.push({ x: W * 0.70, y: H * 0.60, r: 17, color: '#ff7a18', speed: 78, facing: {x:-1,y:0}, shootCooldown: 0, passCooldown: 0, receiveCooldown: 0, lane: 1 });
    rivals.push({ x: W * 0.78, y: H * 0.50, r: 17, color: '#22a7ff', speed: 68, facing: {x:-1,y:0}, shootCooldown: 0, passCooldown: 0, receiveCooldown: 0, lane: 0 });
    goalie.x = W - (isPortraitGame() ? 44 : 62); goalie.y = H / 2; goalie.targetY = H / 2; goalie.reaction = 0; goalie.passCooldown = 0;
  }

  function newGame() {
    state.running = true;
    state.last = performance.now();
    state.timeLeft = 50;
    state.score = 0; state.goals = 0; state.rivalGoals = 0; state.chicks = 0; state.difficulty = 1.0; state.rivalSpeedBonus = 1.0; state.stealCooldown = 0; state.sprintEnergy = 100; state.comboTimer = 0;
    state.claraCooldown = 7; state.claraTimer = 0; state.ajoloteTimer = 0;
    state.multiplierTimer = 0; state.speedTimer = 0; state.invincibleTimer = 0; state.tackleCooldown = 0;
    pickups.length = 0;
    for (let i = 0; i < 4; i++) spawnPickup();
    resetMatch();
    show(ui.menu, false); show(ui.gameOver, false); show(ui.gamePanel, true);
    requestAnimationFrame(loop);
  }

  function show(el, yes) { el.classList.toggle('hidden', !yes); }
  function flash(text, seconds = 1.0) { state.messageText = text; state.messageTimer = seconds; ui.message.textContent = text; show(ui.message, true); }

  function spawnPickup() {
    const types = ['chick', 'chick', 'chick', 'chick', 'gold', 'salsa', 'humo'];
    pickups.push({ type: types[Math.floor(Math.random() * types.length)], x: rand(fieldLeft() + 60, fieldRight() - 60), y: rand(fieldTop() + 55, fieldBottom() - 55), r: 12 });
  }

  function inputVector() {
    let x = 0, y = 0;
    if (keys.has('arrowleft') || keys.has('a')) x -= 1;
    if (keys.has('arrowright') || keys.has('d')) x += 1;
    if (keys.has('arrowup') || keys.has('w')) y -= 1;
    if (keys.has('arrowdown') || keys.has('s')) y += 1;
    x += state.touchMove.x; y += state.touchMove.y;
    const m = Math.hypot(x, y);
    return m > 0 ? { x: x / m, y: y / m } : { x: 0, y: 0 };
  }

  function shoot() {
    if (!player.hasBall) return;
    const crooked = state.ajoloteTimer > 0 ? rand(-0.55, 0.55) : 0;
    const fx = player.facing.x * Math.cos(crooked) - player.facing.y * Math.sin(crooked);
    const fy = player.facing.x * Math.sin(crooked) + player.facing.y * Math.cos(crooked);
    ball.owner = null; ball.ownerIndex = -1; ball.passTargetIndex = -1; player.hasBall = false;
    ball.x = player.x + fx * 24; ball.y = player.y + fy * 24;
    ball.vx = fx * 520; ball.vy = fy * 520;
  }

  function update(dt) {
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) return endGame();

    for (const k of ['messageTimer','claraCooldown','claraTimer','ajoloteTimer','multiplierTimer','speedTimer','invincibleTimer','stealCooldown','comboTimer','tackleCooldown']) state[k] = Math.max(0, state[k] - dt);
    ball.passGrace = Math.max(0, ball.passGrace - dt);
    if (state.messageTimer <= 0) show(ui.message, false);

    const v = inputVector();
    const wantsSprint = keys.has('shift') || state.touchSprint;
    const moving = Math.hypot(v.x, v.y) > 0.1;
    const sprint = wantsSprint && moving && state.sprintEnergy > 4;
    if (sprint) state.sprintEnergy = Math.max(0, state.sprintEnergy - 30 * dt);
    else state.sprintEnergy = Math.min(100, state.sprintEnergy + 18 * dt);
    let speed = 180 * (sprint ? 1.32 : 1) * (state.speedTimer > 0 ? 1.25 : 1) * (state.ajoloteTimer > 0 ? 0.58 : 1);
    player.vx = v.x * speed; player.vy = v.y * speed;
    if (Math.hypot(v.x, v.y) > 0.1) player.facing = { x: v.x, y: v.y };
    player.x = clamp(player.x + player.vx * dt, fieldLeft() + 18, fieldRight() - 18);
    player.y = clamp(player.y + player.vy * dt, fieldTop() + 18, fieldBottom() - 18);

    if ((keys.has(' ') || state.touchShoot) && !state.shootPressed) shoot();
    state.shootPressed = keys.has(' ') || state.touchShoot;

    updateBall(dt);
    updateRivals(dt);
    updateGoalie(dt);
    updatePickups();
    updateClara(dt);
    updateUI();
  }

  function updateBall(dt) {
    if (player.hasBall) {
      ball.x = player.x + player.facing.x * 24;
      ball.y = player.y + player.facing.y * 24;
      ball.vx = ball.vy = 0;
      ball.owner = 'player';
      ball.ownerIndex = -1;
      return;
    }

    if (ball.owner === 'rival' && rivals[ball.ownerIndex]) {
      const r = rivals[ball.ownerIndex];
      ball.passTargetIndex = -1;
      ball.x = r.x + r.facing.x * 23;
      ball.y = r.y + r.facing.y * 23;
      ball.vx = ball.vy = 0;
      return;
    }

    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    ball.vx *= Math.pow(0.985, dt * 60); ball.vy *= Math.pow(0.985, dt * 60);
    if (ball.y < fieldTop() || ball.y > fieldBottom()) ball.vy *= -0.75;
    if (ball.x < fieldLeft() - 2 || ball.x > fieldRight() + 2) ball.vx *= -0.75;
    ball.x = clamp(ball.x, fieldLeft() - 2, fieldRight() + 2); ball.y = clamp(ball.y, fieldTop(), fieldBottom());

    const leftGoal = ball.x < fieldLeft() + 10 && ball.y > goalTop() && ball.y < goalBottom();
    const rightGoal = ball.x > fieldRight() - 10 && ball.y > goalTop() && ball.y < goalBottom();
    if (rightGoal) goal();
    if (leftGoal) rivalGoal();

    if (ball.passGrace <= 0 && dist(player, ball) < player.r + ball.r + 4 && Math.hypot(ball.vx, ball.vy) < 230) {
      player.hasBall = true; ball.owner = 'player'; ball.ownerIndex = -1; flash('¡BALÓN RECUPERADO!', .45);
    }
  }

  function goal() {
    state.goals++; state.difficulty += 0.18; state.rivalSpeedBonus += 0.085; state.claraCooldown = Math.min(state.claraCooldown, rand(4.5, 8));
    const mult = state.multiplierTimer > 0 ? 2 : 1;
    state.score += 250 * mult;
    state.timeLeft = Math.min(state.timeLeft + 4, 55);
    flash('¡GOOOL GANA!', 1.05);
    resetMatch();
  }

  function rivalGoal() {
    state.rivalGoals++;
    // El rival NO sube la dificultad; solo castiga puntos/tiempo.
    state.score = Math.max(0, state.score - 120);
    state.timeLeft = Math.max(8, state.timeLeft - 3);
    flash('¡GOL RIVAL!', .95);
    resetMatch();
  }

  function updateRivals(dt) {
    for (let i = 0; i < rivals.length; i++) {
      const r = rivals[i];
      r.shootCooldown = Math.max(0, (r.shootCooldown || 0) - dt);
      r.passCooldown = Math.max(0, (r.passCooldown || 0) - dt);
      r.receiveCooldown = Math.max(0, (r.receiveCooldown || 0) - dt);

      let target;
      let speedFactor = 1;
      const hasBall = ball.owner === 'rival' && ball.ownerIndex === i;

      if (hasBall) {
        // Si tiene balón, ataca con intención: avanza hacia la portería izquierda,
        // pero no se mete al centro siempre; busca ángulo para tirar o soltar pase filtrado.
        const laneY = H / 2 + (r.lane || 0) * (isPortraitGame() ? 90 : 58);
        target = {
          x: fieldLeft() + 34,
          y: clamp((laneY * 0.45) + (H / 2 * 0.55), goalTop() + 18, goalBottom() - 18)
        };
        speedFactor = 0.78;
      } else if (player.hasBall) {
        target = player;
        speedFactor = 1.12;
      } else if (ball.owner === 'rival') {
        // Si un compañero tiene el balón, los demás NO persiguen la pelota:
        // se desmarcan hacia carriles útiles para recibir y rematar.
        const holder = rivals[ball.ownerIndex];
        const laneY = H / 2 + (r.lane || 0) * (isPortraitGame() ? 110 : 72);
        const aheadX = holder ? holder.x - (80 + i * 14) : ball.x - 80;
        target = {
          x: clamp(aheadX, fieldLeft() + 80, fieldRight() - 95),
          y: clamp(laneY, fieldTop() + 55, fieldBottom() - 55)
        };
        speedFactor = 0.74;
      } else {
        // Si es un pase dirigido, solo el receptor va fuerte por el balón; los demás dan apoyo.
        if (ball.passTargetIndex === i) {
          target = ball;
          speedFactor = 1.05;
        } else if (ball.passTargetIndex >= 0) {
          target = { x: clamp(ball.x + 45 + i * 16, fieldLeft() + 70, fieldRight() - 70), y: clamp(ball.y + (i - 1) * (isPortraitGame() ? 90 : 60), fieldTop() + 45, fieldBottom() - 45) };
          speedFactor = 0.62;
        } else {
          target = ball;
          speedFactor = 0.9;
        }
      }

      let dx = target.x - r.x, dy = target.y - r.y;
      const m = Math.hypot(dx, dy) || 1;
      dx /= m; dy /= m;
      r.facing = { x: dx, y: dy };
      r.x += dx * r.speed * state.difficulty * state.rivalSpeedBonus * speedFactor * dt;
      r.y += dy * r.speed * state.difficulty * state.rivalSpeedBonus * speedFactor * dt;
      r.x = clamp(r.x, fieldLeft() + 28, fieldRight() - 28); r.y = clamp(r.y, fieldTop() + 25, fieldBottom() - 25);

      // Separación simple para evitar que se vuelvan locos/amontonados.
      for (let j = 0; j < rivals.length; j++) {
        if (i === j) continue;
        const o = rivals[j];
        const d = Math.hypot(r.x - o.x, r.y - o.y) || 1;
        const minD = r.r + o.r + 10;
        if (d < minD) {
          r.x += ((r.x - o.x) / d) * (minD - d) * 0.35;
          r.y += ((r.y - o.y) / d) * (minD - d) * 0.35;
        }
      }

      if (player.hasBall && dist(r, player) < r.r + player.r + 4 && state.invincibleTimer <= 0 && state.stealCooldown <= 0) {
        player.hasBall = false;
        ball.owner = 'rival';
        ball.ownerIndex = i;
        r.facing = { x: -1, y: (H / 2 - r.y) / 220 };
        state.stealCooldown = 0.85;
        state.comboTimer = 0;
        flash('¡TE LA ROBARON!', .55);
      }

      if (!player.hasBall && ball.owner === null && dist(r, ball) < r.r + ball.r + 6 && Math.hypot(ball.vx, ball.vy) < 300) {
        ball.owner = 'rival';
        ball.ownerIndex = i;
        ball.passTargetIndex = -1;
        r.receiveCooldown = 0.28;
      }

      if (hasBall) {
        const closeToGoal = r.x < fieldLeft() + (isPortraitGame() ? 150 : 175) && r.y > goalTop() - 62 && r.y < goalBottom() + 62;
        const veryClose = r.x < fieldLeft() + 95 && r.y > goalTop() - 35 && r.y < goalBottom() + 35;
        const pressured = dist(r, player) < 92;
        const teammateAhead = findBestTeammate(i);
        const hasGoodPass = teammateAhead >= 0 && teammateAhead !== i;

        // Intención ofensiva:
        // 1) Si está muy cerca o con buen ángulo, tira.
        // 2) Si está presionado o hay compañero mejor posicionado, pasa hacia ventaja.
        // 3) Si no, sigue avanzando.
        const passChance = closeToGoal ? 0.035 : 0.055;
        const mate = hasGoodPass ? rivals[teammateAhead] : null;
        const mateInBetterShotLane = mate && mate.x < r.x - 28 && mate.x < fieldLeft() + (isPortraitGame() ? 210 : 250) && mate.y > goalTop() - 78 && mate.y < goalBottom() + 78;
        const shouldPass = r.passCooldown <= 0 && hasGoodPass && (
          pressured || mateInBetterShotLane || Math.random() < passChance * Math.min(2.25, state.difficulty)
        );

        if (shouldPass && (!veryClose || pressured || mateInBetterShotLane)) {
          rivalPass(i);
        } else if ((veryClose || (closeToGoal && !pressured)) && r.shootCooldown <= 0) {
          rivalShoot(r);
        }
      }
    }

    // El jugador puede robarle al rival si lo alcanza.
    // Antes estaba demasiado estricto; ahora hay robo por contacto, tackle con espacio/botón
    // e incluso intercepción cuando el rival intenta pasar cerca del jugador.
    if (ball.owner === 'rival' && rivals[ball.ownerIndex]) {
      const r = rivals[ball.ownerIndex];
      const d = dist(player, r);
      const tacklePressed = (keys.has(' ') || state.touchShoot) && state.tackleCooldown <= 0;
      const sprinting = keys.has('shift') || state.touchSprint;
      const stealRange = player.r + r.r + (tacklePressed ? 20 : sprinting ? 13 : 9);

      if (r.receiveCooldown <= 0 && d < stealRange && state.stealCooldown <= 0) {
        player.hasBall = true;
        ball.owner = 'player';
        ball.ownerIndex = -1;
        ball.passTargetIndex = -1;
        state.stealCooldown = 0.62;
        state.tackleCooldown = 0.45;
        // pequeño empujón para que no se vuelva a robar instantáneamente
        const awayX = player.x - r.x;
        const awayY = player.y - r.y;
        const m = Math.hypot(awayX, awayY) || 1;
        player.x = clamp(player.x + (awayX / m) * 10, fieldLeft() + 18, fieldRight() - 18);
        player.y = clamp(player.y + (awayY / m) * 10, fieldTop() + 18, fieldBottom() - 18);
        flash(tacklePressed ? '¡BARRIDA LIMPIA!' : '¡SE LA QUITASTE!', .45);
      }
    }

    // Interceptar pases rivales: si el balón pasa cerca y no va muy rápido, el jugador lo controla.
    if (!player.hasBall && ball.owner === null && ball.passTargetIndex >= 0 && ball.passGrace <= 0.18) {
      const speed = Math.hypot(ball.vx, ball.vy);
      if (dist(player, ball) < player.r + ball.r + 14 && speed < 520) {
        player.hasBall = true;
        ball.owner = 'player';
        ball.ownerIndex = -1;
        ball.passTargetIndex = -1;
        ball.vx = ball.vy = 0;
        flash('¡INTERCEPTASTE!', .45);
      }
    }
  }

  function findBestTeammate(holderIndex) {
    let bestIndex = -1;
    let bestScore = -Infinity;
    const holder = holderIndex >= 0 ? rivals[holderIndex] : goalie;

    for (let i = 0; i < rivals.length; i++) {
      if (i === holderIndex) continue;
      const mate = rivals[i];
      const distance = Math.hypot(mate.x - holder.x, mate.y - holder.y);

      // Los rivales atacan hacia la izquierda.
      // Premia al compañero que esté más cerca de la portería rival, abierto y no marcado.
      const advanceBonus = (holder.x - mate.x) * 2.4;
      const openLaneBonus = Math.abs(mate.y - H / 2) > 35 ? 55 : 15;
      const shotLaneBonus = (mate.x < fieldLeft() + 210 && mate.y > goalTop() - 70 && mate.y < goalBottom() + 70) ? 85 : 0;
      const tooClosePenalty = distance < 85 ? 220 : 0;
      const tooFarPenalty = distance > 300 ? 90 : 0;
      const playerPressurePenalty = Math.max(0, 120 - dist(mate, player)) * 1.5;

      // Evita pases hacia atrás salvo que el portero esté distribuyendo.
      const backwardsPenalty = holderIndex >= 0 && mate.x > holder.x + 20 ? 130 : 0;

      const score = advanceBonus + openLaneBonus + shotLaneBonus - tooClosePenalty - tooFarPenalty - playerPressurePenalty - backwardsPenalty + rand(-18, 18);
      if (score > bestScore) { bestScore = score; bestIndex = i; }
    }
    return bestIndex;
  }

  function passBallToPoint(from, targetIndex, targetPoint, speed = 390) {
    const target = rivals[targetIndex];
    if (!target) return false;
    const dx = targetPoint.x - from.x;
    const dy = targetPoint.y - from.y;
    const m = Math.hypot(dx, dy) || 1;
    ball.owner = null;
    ball.ownerIndex = -1;
    ball.passTargetIndex = targetIndex;
    ball.passGrace = 0.22;
    ball.x = from.x + (dx / m) * 24;
    ball.y = from.y + (dy / m) * 24;
    ball.vx = (dx / m) * speed;
    ball.vy = (dy / m) * speed;
    return true;
  }

  function passBallTo(from, targetIndex, speed = 390) {
    const target = rivals[targetIndex];
    if (!target) return false;

    // Pase con intención: no apunta al cuerpo actual del compañero, sino a un espacio
    // más adelantado hacia la portería para que el receptor ataque al recibir.
    const leadX = clamp(target.x - (46 + 10 * Math.min(4, state.difficulty)), fieldLeft() + 38, fieldRight() - 60);
    const goalBias = (H / 2 - target.y) * 0.08;
    const leadY = clamp(target.y + (target.lane || 0) * 10 + goalBias, fieldTop() + 35, fieldBottom() - 35);
    return passBallToPoint(from, targetIndex, { x: leadX, y: leadY }, speed);
  }

  function rivalPass(holderIndex) {
    const holder = rivals[holderIndex];
    if (!holder || ball.owner !== 'rival' || ball.ownerIndex !== holderIndex) return;
    const targetIndex = findBestTeammate(holderIndex);
    if (targetIndex < 0) return;
    holder.passCooldown = 1.1;
    holder.receiveCooldown = 0.18;
    passBallTo(holder, targetIndex, 380 + 25 * state.difficulty);
    flash('¡PASE RIVAL!', .35);
  }

  function goalieDistribute() {
    const targetIndex = findBestTeammate(-1);
    if (targetIndex < 0) return;
    player.hasBall = false;
    goalie.y = clamp(goalie.y, goalTop() - 15, goalBottom() + 15);
    passBallTo({ x: goalie.x - 18, y: goalie.y }, targetIndex, 420 + 25 * state.difficulty);
    if (rivals[targetIndex]) rivals[targetIndex].receiveCooldown = 0.22;
    flash('¡ATAJADA Y PASE!', .55);
  }

  function rivalShoot(r) {
    const targetY = rand(goalTop() + 18, goalBottom() - 18);
    const dx = fieldLeft() - 18 - r.x;
    const dy = targetY - r.y;
    const m = Math.hypot(dx, dy) || 1;
    ball.owner = null;
    ball.ownerIndex = -1;
    ball.passTargetIndex = -1;
    ball.x = r.x - 24;
    ball.y = r.y;
    ball.vx = (dx / m) * (430 + 45 * state.difficulty);
    ball.vy = (dy / m) * (430 + 45 * state.difficulty);
    r.shootCooldown = 1.4;
    flash('¡TIRA EL RIVAL!', .4);
  }

  function updateGoalie(dt) {
    goalie.passCooldown = Math.max(0, goalie.passCooldown - dt);

    // Portero balanceado:
    // - No persigue el balón por toda la cancha.
    // - Solo cubre su portería.
    // - Reacciona mejor cuando el balón viene hacia él, pero con error humano.
    const keeperMinY = goalTop() + 10;
    const keeperMaxY = goalBottom() - 10;
    const centerY = H / 2;
    const ballComingToGoal = ball.owner === null && ball.vx > 140 && ball.x > W * 0.54;
    const ballInDangerZone = ball.x > W * 0.68 || ballComingToGoal;

    goalie.reaction = Math.max(0, (goalie.reaction || 0) - dt);
    if (goalie.reaction <= 0) {
      // En peligro sigue el balón; fuera de peligro vuelve al centro.
      const errorRange = ballComingToGoal ? 18 : 32;
      const humanError = rand(-errorRange, errorRange);
      const targetBlend = ballInDangerZone ? 0.78 : 0.28;
      goalie.targetY = clamp(centerY * (1 - targetBlend) + ball.y * targetBlend + humanError, keeperMinY, keeperMaxY);
      goalie.reaction = ballComingToGoal ? rand(0.10, 0.18) : rand(0.22, 0.38);
    }

    const baseSpeed = 92 + state.difficulty * 10;
    const dangerBoost = ballInDangerZone ? 1.45 : 0.85;
    const maxStep = baseSpeed * dangerBoost * dt;
    goalie.y += clamp(goalie.targetY - goalie.y, -maxStep, maxStep);
    goalie.y = clamp(goalie.y, keeperMinY, keeperMaxY);

    // Atajada: el radio efectivo sube un poco si el tiro va directo, pero no es pared imposible.
    const shotSpeed = Math.hypot(ball.vx, ball.vy);
    const saveRadius = goalie.r + ball.r + (shotSpeed > 260 ? 3 : 7);
    if (goalie.passCooldown <= 0 && ball.owner === null && dist(goalie, ball) < saveRadius) {
      goalie.passCooldown = 0.75;
      goalieDistribute();
    }
  }

  function updatePickups() {
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      if (dist(player, p) < player.r + p.r) {
        pickups.splice(i, 1);
        if (p.type === 'chick') { state.chicks++; state.comboTimer = 3; state.score += state.multiplierTimer > 0 ? 70 : 35; flash('+1 ALITA', .35); }
        if (p.type === 'gold') { state.chicks += 3; state.speedTimer = 4; state.score += 90; flash('ALITA DORADA', .55); }
        if (p.type === 'salsa') { state.multiplierTimer = 4.5; flash('SALSA x2', .55); }
        if (p.type === 'humo') { state.invincibleTimer = 3.5; flash('HUMO DE BARRIO', .55); }
        spawnPickup();
      }
    }
  }

  function updateClara(dt) {
    if (!clara.active && state.claraCooldown <= 0) {
      clara.active = true; state.claraTimer = 5.6; state.claraCooldown = rand(8, 12);
      const fromLeft = Math.random() > .5;
      clara.x = fromLeft ? -40 : W + 40; clara.y = rand(fieldTop() + 25, fieldBottom() - 25);
      clara.vx = (fromLeft ? 185 : -185) * Math.min(1.6, state.difficulty); clara.vy = rand(-50, 50);
      flash('¡LLEGÓ CLARA!', .9);
    }
    if (!clara.active) return;
    clara.x += clara.vx * dt; clara.y += clara.vy * dt;
    if (state.claraTimer <= 0 || clara.x < -70 || clara.x > W + 70) clara.active = false;
    if (dist(player, clara) < player.r + clara.r && state.invincibleTimer <= 0) {
      state.ajoloteTimer = 6; clara.active = false; player.hasBall = false; ball.owner = null; ball.ownerIndex = -1;
      ball.vx = -player.facing.x * 180; ball.vy = -player.facing.y * 180;
      flash('HAS SIDO AJOLOTIZADO', 1.1);
    }
  }

  function updateUI() {
    state.score += 3 / 60;
    // La dificultad solo sube cuando el jugador mete gol, no por tiempo ni por gol rival.
    ui.scoreboard.textContent = `${state.goals} - ${state.rivalGoals}`;
    ui.time.textContent = Math.ceil(state.timeLeft);
    ui.score.textContent = Math.floor(state.score);
    ui.chicks.textContent = state.chicks;
    ui.gamePanel.classList.toggle('ajolote-mode', state.ajoloteTimer > 0);
  }

  function endGame() {
    state.running = false;
    show(ui.gamePanel, false); show(ui.gameOver, true);
    const final = Math.floor(state.score);
    const record = Math.max(final, Number(localStorage.getItem('gol_gana_record') || 0));
    localStorage.setItem('gol_gana_record', record);
    ui.finalGoals.textContent = `GOL GANA ${state.goals} - ${state.rivalGoals} RIVALES`;
    ui.finalScore.textContent = final;
    if (ui.finalWings) ui.finalWings.textContent = state.chicks;
    ui.record.textContent = record;
    ui.gamePanel.classList.remove('ajolote-mode');
  }

  function draw() {
    ctx.clearRect(0,0,W,H);
    drawField(); drawPickups(); drawGoals(); drawRivals(); drawGoalie(); drawPlayer(); drawBall(); drawPossessionArrow(); drawClara(); drawEffects();
  }

  function drawField() {
    ctx.fillStyle = state.ajoloteTimer > 0 ? '#24123a' : '#272a28'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = state.ajoloteTimer > 0 ? '#301849' : '#202320'; ctx.fillRect(fieldLeft(), fieldTop(), fieldRight()-fieldLeft(), fieldBottom()-fieldTop());
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; ctx.strokeRect(fieldLeft(), fieldTop(), fieldRight()-fieldLeft(), fieldBottom()-fieldTop());
    ctx.beginPath(); ctx.moveTo(W/2,fieldTop()); ctx.lineTo(W/2,fieldBottom()); ctx.stroke();
    ctx.beginPath(); ctx.arc(W/2,H/2,isPortraitGame() ? 48 : 58,0,Math.PI*2); ctx.stroke();
    ctx.strokeRect(fieldLeft(), H/2 - 112, isPortraitGame() ? 58 : 95, 224); ctx.strokeRect(fieldRight() - (isPortraitGame() ? 58 : 95), H/2 - 112, isPortraitGame() ? 58 : 95, 224);
    ctx.fillStyle = 'rgba(255,210,46,.12)'; ctx.fillRect(fieldLeft(),fieldTop(),fieldRight()-fieldLeft(),20);
    ctx.fillStyle = '#ffd22e'; ctx.font = isPortraitGame() ? '900 16px system-ui' : '900 22px system-ui'; ctx.textAlign='center'; ctx.fillText('HIDDEN ROOM x TLALPAN WINGS HOUSE', W/2, fieldTop()+36);
    ctx.font = '900 16px system-ui'; ctx.fillStyle = 'rgba(255,255,255,.13)';
    ctx.fillText('GOL GANA', W/2, fieldBottom()-28);
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
    for (let i=0;i<18;i++) { ctx.beginPath(); ctx.moveTo(rand(fieldLeft()+20,fieldRight()-20), rand(fieldTop()+35,fieldBottom()-35)); ctx.lineTo(rand(fieldLeft()+20,fieldRight()-20), rand(fieldTop()+35,fieldBottom()-35)); ctx.stroke(); }
  }

  function drawGoals() {
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#ff4141'; ctx.strokeRect(fieldLeft()-30, goalTop(), 30, goalBottom()-goalTop());
    ctx.strokeStyle = '#21d46b'; ctx.strokeRect(fieldRight(), goalTop(), 30, goalBottom()-goalTop());
    ctx.fillStyle = '#21d46b'; ctx.font = '900 18px system-ui'; ctx.textAlign='center'; ctx.fillText('GOL', fieldRight()+15, goalTop()-16);
  }

  function drawCircleThing(o, label, color) {
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(o.x, o.y+18, o.r*1.05, 8, 0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(o.x,o.y,o.r,0,Math.PI*2); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.fillStyle = '#111'; ctx.font = '900 14px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, o.x, o.y);
  }

  function drawPlayer() { drawCircleThing(player, state.ajoloteTimer > 0 ? 'AX' : 'HR', state.ajoloteTimer > 0 ? '#b95cff' : player.color); }
  function drawRivals() { rivals.forEach((r,i)=>drawCircleThing(r, String(i+1), r.color)); }
  function drawGoalie() { drawCircleThing(goalie, 'GK', goalie.color); }
  function drawBall() { ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#111'; ctx.lineWidth=3; ctx.stroke(); }
  function drawPossessionArrow() {
    if (ball.owner === 'rival' && rivals[ball.ownerIndex]) {
      const r = rivals[ball.ownerIndex];
      ctx.fillStyle = '#ffd22e';
      ctx.beginPath();
      ctx.moveTo(r.x, r.y - r.r - 18);
      ctx.lineTo(r.x - 9, r.y - r.r - 5);
      ctx.lineTo(r.x + 9, r.y - r.r - 5);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawPickups() {
    for (const p of pickups) {
      ctx.fillStyle = p.type === 'chick' ? '#ffd22e' : p.type === 'gold' ? '#fff05a' : p.type === 'salsa' ? '#ff4141' : '#b78cff';
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle='#111'; ctx.font='900 13px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(p.type === 'salsa' ? 'S' : p.type === 'humo' ? 'H' : '🍗', p.x, p.y+1);
    }
  }
  function drawClara() {
    if (!clara.active) return;
    drawCircleThing(clara, 'CB', '#ff4bb8');
    ctx.strokeStyle='rgba(255,75,184,.35)'; ctx.lineWidth=8; ctx.beginPath(); ctx.arc(clara.x,clara.y,clara.r+10,0,Math.PI*2); ctx.stroke();
  }
  function drawEffects() {
    if (state.ajoloteTimer > 0) {
      ctx.fillStyle='rgba(112,34,180,.30)'; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle='rgba(218,156,255,.55)'; ctx.lineWidth=8; ctx.strokeRect(fieldLeft()+4, fieldTop()+4, fieldRight()-fieldLeft()-8, fieldBottom()-fieldTop()-8);
    }
    if (state.invincibleTimer > 0) { ctx.strokeStyle='rgba(255,255,255,.8)'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(player.x,player.y,player.r+10,0,Math.PI*2); ctx.stroke(); }
    ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(fieldLeft(), fieldBottom()+16, 120, 10);
    ctx.fillStyle= state.sprintEnergy > 25 ? '#21d46b' : '#ff4141'; ctx.fillRect(fieldLeft(), fieldBottom()+16, 120*(state.sprintEnergy/100),10);
    ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=1; ctx.strokeRect(fieldLeft(), fieldBottom()+16,120,10);
  }

  function loop(now) {
    if (!state.running) return;
    const dt = Math.min(0.033, (now - state.last) / 1000 || 0);
    state.last = now;
    update(dt); draw();
    requestAnimationFrame(loop);
  }

  window.addEventListener('keydown', (e) => { keys.add(e.key.toLowerCase()); if ([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())) e.preventDefault(); });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  $('playBtn').addEventListener('click', newGame);
  $('retryBtn').addEventListener('click', newGame);
  $('howBtn').addEventListener('click', () => ui.howTo.classList.toggle('hidden'));

  // Controles táctiles simples.
  const base = $('stickBase'), stick = $('stick');
  let activeTouch = null;
  function setStick(clientX, clientY) {
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    let dx = clientX - cx, dy = clientY - cy;
    const max = rect.width * .32, m = Math.hypot(dx,dy);
    if (m > max) { dx = dx / m * max; dy = dy / m * max; }
    stick.style.transform = `translate(${dx}px, ${dy}px)`;
    state.touchMove.x = dx / max; state.touchMove.y = dy / max;
  }
  base.addEventListener('touchstart', e => { activeTouch = e.changedTouches[0].identifier; setStick(e.changedTouches[0].clientX, e.changedTouches[0].clientY); e.preventDefault(); }, {passive:false});
  base.addEventListener('touchmove', e => { for (const t of e.changedTouches) if (t.identifier === activeTouch) setStick(t.clientX, t.clientY); e.preventDefault(); }, {passive:false});
  function resetStick(e) { if (e) e.preventDefault(); activeTouch = null; stick.style.transform = 'translate(0,0)'; state.touchMove.x = state.touchMove.y = 0; }
  base.addEventListener('touchend', resetStick, {passive:false});
  base.addEventListener('touchcancel', resetStick, {passive:false});
  $('shootTouch').addEventListener('touchstart', e => { state.touchShoot = true; e.preventDefault(); }, {passive:false});
  $('shootTouch').addEventListener('touchend', e => { state.touchShoot = false; e.preventDefault(); }, {passive:false});
  $('shootTouch').addEventListener('touchcancel', e => { state.touchShoot = false; e.preventDefault(); }, {passive:false});
  $('sprintTouch').addEventListener('touchstart', e => { state.touchSprint = true; e.preventDefault(); }, {passive:false});
  $('sprintTouch').addEventListener('touchend', e => { state.touchSprint = false; e.preventDefault(); }, {passive:false});
  $('sprintTouch').addEventListener('touchcancel', e => { state.touchSprint = false; e.preventDefault(); }, {passive:false});
})();
