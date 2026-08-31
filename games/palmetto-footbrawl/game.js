const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('gameOverlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const restartButton = document.getElementById('restartButton');
const scoreLeftEl = document.getElementById('score-left');
const scoreRightEl = document.getElementById('score-right');
const halfLabelEl = document.getElementById('half-label');
const clockDisplayEl = document.getElementById('clock-display');

const FIELD = { width: canvas.width, height: canvas.height, margin: 40, goalHeight: 170, goalDepth: 38 };
const HALF_LENGTH = 100;
const TEAMS = {
  tigers: { name: 'Upstate Tigers', color: '#f28f3b', accent: '#7b4ed8', xBase: 0.28, side: 'left' },
  gamecocks: { name: 'Capital Gamecocks', color: '#9d0f27', accent: '#141416', xBase: 0.72, side: 'right' }
};
const LEVELS = [
  { name: 'Rocks', theme: '#1d5b38', hazard: 'rock', rockCount: 11, speed: 1.0 },
  { name: 'Concrete', theme: '#2a3440', hazard: 'concrete', rockCount: 0, speed: 1.2 }
];

const keys = new Set();
const touchState = { up: false, down: false, left: false, right: false };
const controlMap = {
  tiger: {
    up: 'w', down: 's', left: 'a', right: 'd', tackle: 'f', pass: 'g', burst: 'h'
  },
  gamecock: {
    up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', tackle: 'k', pass: 'l', burst: ';'
  }
};

let gameState = 'title';
let lastTimestamp = 0;
let half = 1;
let score = { tigers: 0, gamecocks: 0 };
let timeLeft = HALF_LENGTH;
let messageTimer = 0;
let lastTouchdownAt = 0;
let screenShake = 0;
let particles = [];
let troll = null;
let trollTimer = 0;
let goalFlash = 0;
let goalFlashTeam = null;
let currentLevel = 0;
let hazards = [];
let audioContext = null;
let audioLoopId = null;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function createPlayer(team, index, x, y, isControlled) {
  const skinTones = ['#d8b38c', '#c98b5d', '#7c4d2d', '#e1c39a', '#a86d4f'];
  const skinTone = skinTones[(index + (team === 'gamecocks' ? 2 : 1)) % skinTones.length];

  return {
    id: `${team}-${index}`,
    team,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: 15,
    speed: 220,
    color: TEAMS[team].color,
    accent: TEAMS[team].accent,
    facing: team === 'tigers' ? 1 : -1,
    hasBall: false,
    controlled: isControlled,
    ai: !isControlled,
    passiveTimer: 0,
    attackCooldown: 0,
    chaseBias: 0,
    aimX: x,
    aimY: y,
    stunned: 0,
    slipTimer: 0,
    ring: 0,
    isDiving: 0,
    hasVikingHat: ((index + (team === 'gamecocks' ? 2 : 1)) % 3 === 0),
    skinTone,
    name: `${TEAMS[team].name.split(' ')[0]} ${index + 1}`
  };
}

function createTeam(teamName, controlledPlayerId) {
  const players = [];
  const baseX = teamName === 'tigers' ? 170 : FIELD.width - 170;
  const startOffsets = [
    { x: -150, y: -120 },
    { x: -120, y: 0 },
    { x: -110, y: 120 },
    { x: -30, y: -60 },
    { x: -30, y: 60 }
  ];

  for (let i = 0; i < 5; i += 1) {
    const offset = startOffsets[i];
    const player = createPlayer(teamName, i, baseX + offset.x, FIELD.height / 2 + offset.y, i === 0 && controlledPlayerId === teamName);
    players.push(player);
  }

  return players;
}

let players = [];
let ball = {
  x: FIELD.width / 2,
  y: FIELD.height / 2,
  radius: 9,
  owner: null,
  vx: 0,
  vy: 0,
  lastCarrier: null,
  spin: 0
};

function resetTroll() {
  troll = null;
  trollTimer = 2.5;
}

function spawnTroll() {
  if (troll) return;
  troll = {
    x: -120,
    y: FIELD.height / 2,
    vx: 0,
    vy: 0,
    radius: 30,
    speed: 150,
    stompCooldown: 0,
    roarTimer: 1.4,
    entrance: 1.2,
    roarFlash: 0,
    clubSwing: 0
  };
  screenShake = 1.4;
  for (let i = 0; i < 30; i += 1) {
    particles.push({
      x: 80,
      y: FIELD.height / 2,
      vx: (Math.random() - 0.5) * 180,
      vy: (Math.random() - 0.5) * 180,
      life: 0.9 + Math.random() * 0.8,
      maxLife: 0.9 + Math.random() * 0.8,
      color: i % 2 === 0 ? '#6ce886' : '#d0ffe0',
      radius: 3 + Math.random() * 5
    });
  }
}

function createLevelHazards() {
  const level = LEVELS[currentLevel];
  hazards = [];

  if (level.hazard === 'rock') {
    for (let i = 0; i < level.rockCount; i += 1) {
      hazards.push({
        x: 180 + (i * 68) % (FIELD.width - 360),
        y: 90 + ((i * 83) % (FIELD.height - 180)),
        radius: 12 + (i % 3) * 4,
        type: 'rock'
      });
    }
  } else {
    for (let i = 0; i < 8; i += 1) {
      hazards.push({
        x: 130 + i * 90,
        y: 100 + ((i % 3) * 80),
        radius: 16,
        type: 'concrete'
      });
    }
  }
}

function resetTeams() {
  players = [
    ...createTeam('tigers', 'tigers'),
    ...createTeam('gamecocks', 'gamecocks')
  ];
  createLevelHazards();
  resetTroll();
  ball.owner = null;
  ball.x = FIELD.width / 2;
  ball.y = FIELD.height / 2;
  ball.vx = 0;
  ball.vy = 0;
  ball.lastCarrier = null;
}

function resetForTouchdown() {
  players.forEach((player) => {
    player.vx = 0;
    player.vy = 0;
    player.hasBall = false;
    player.attackCooldown = 0;
    player.stunned = 0;
    player.isDiving = 0;
  });
  const tigerBases = [
    { x: 170, y: 170 },
    { x: 210, y: 260 },
    { x: 260, y: 370 },
    { x: 310, y: 210 },
    { x: 310, y: 300 }
  ];
  const gamecockBases = [
    { x: FIELD.width - 170, y: 170 },
    { x: FIELD.width - 210, y: 260 },
    { x: FIELD.width - 260, y: 370 },
    { x: FIELD.width - 310, y: 210 },
    { x: FIELD.width - 310, y: 300 }
  ];

  players.filter((p) => p.team === 'tigers').forEach((player, index) => {
    player.x = tigerBases[index].x;
    player.y = tigerBases[index].y;
    player.facing = 1;
  });
  players.filter((p) => p.team === 'gamecocks').forEach((player, index) => {
    player.x = gamecockBases[index].x;
    player.y = gamecockBases[index].y;
    player.facing = -1;
  });

  ball.owner = null;
  ball.x = FIELD.width / 2;
  ball.y = FIELD.height / 2;
  ball.vx = 0;
  ball.vy = 0;
}

function getControlledPlayer(team) {
  return players.filter((player) => player.team === team).sort((a, b) => distance(a, ball) - distance(b, ball))[0];
}

function setControlledFlags() {
  players.forEach((player) => {
    player.controlled = false;
  });

  const tiger = getControlledPlayer('tigers');
  const gamecock = getControlledPlayer('gamecocks');
  if (tiger) tiger.controlled = true;
  if (gamecock) gamecock.controlled = true;
}

function chooseClosestTeammate(player, teamPlayers) {
  let best = null;
  let bestDist = Infinity;
  teamPlayers.forEach((teammate) => {
    if (teammate.id === player.id) return;
    const dx = teammate.x - player.x;
    const dy = teammate.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < bestDist) {
      bestDist = dist;
      best = teammate;
    }
  });
  return best;
}

function getTeamPlayers(team) {
  return players.filter((player) => player.team === team);
}

function updateScoreboard() {
  scoreLeftEl.textContent = String(score.tigers);
  scoreRightEl.textContent = String(score.gamecocks);
  halfLabelEl.textContent = `Level ${currentLevel + 1}`;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = Math.floor(timeLeft % 60);
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  clockDisplayEl.textContent = display;
}

function applyPlayerMove(player, dx, dy, scale = 1) {
  if (player.stunned > 0) return;
  const runSpeed = player.speed * (player.isDiving > 0 ? 1.5 : 1) * scale;
  const length = Math.hypot(dx, dy) || 1;
  const nx = dx / length;
  const ny = dy / length;
  player.vx = nx * runSpeed;
  player.vy = ny * runSpeed;
  if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
    player.facing = dx >= 0 ? 1 : -1;
  }
  if (Math.abs(dx) + Math.abs(dy) > 18) {
    player.ring = 0.35;
  }
}

function spawnParticles(x, y, color, count = 12) {
  for (let i = 0; i < count; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 140,
      vy: (Math.random() - 0.5) * 140,
      life: 0.6 + Math.random() * 0.7,
      maxLife: 0.6 + Math.random() * 0.7,
      color,
      radius: 2 + Math.random() * 4
    });
  }
}

function handleInput() {
  if (gameState !== 'playing') return;

  const tigerPlayers = getTeamPlayers('tigers');
  const gamecockPlayers = getTeamPlayers('gamecocks');
  const tigerControlled = getControlledPlayer('tigers');
  const gamecockControlled = getControlledPlayer('gamecocks');

  if (messageTimer > 0) {
    messageTimer = Math.max(0, messageTimer - 1 / 60);
  }

  const hasTouchMoveUp = touchState.up || keys.has('w');
  const hasTouchMoveDown = touchState.down || keys.has('s');
  const hasTouchMoveLeft = touchState.left || keys.has('a');
  const hasTouchMoveRight = touchState.right || keys.has('d');

  tigerPlayers.forEach((player) => {
    if (player !== tigerControlled || !player.controlled) {
      return;
    }
    let dx = 0;
    let dy = 0;
    if (hasTouchMoveUp) dy -= 1;
    if (hasTouchMoveDown) dy += 1;
    if (hasTouchMoveLeft) dx -= 1;
    if (hasTouchMoveRight) dx += 1;
    applyPlayerMove(player, dx, dy, 1);

    if ((keys.has('f') || touchState.action === 'f') && player.attackCooldown <= 0) {
      performTackle(player, 'tigers');
      player.attackCooldown = 0.34;
    }
    if ((keys.has('g') || touchState.action === 'g') && player.attackCooldown <= 0 && player.hasBall) {
      passBall(player, 'tigers');
      player.attackCooldown = 0.6;
    }
    if ((keys.has('h') || touchState.action === 'h') && player.attackCooldown <= 0) {
      player.isDiving = 0.38;
      player.attackCooldown = 0.7;
      player.speed = 260;
      setTimeout(() => { player.speed = 220; }, 220);
    }
  });

  gamecockPlayers.forEach((player) => {
    if (player !== gamecockControlled || !player.controlled) {
      return;
    }
    let dx = 0;
    let dy = 0;
    if (keys.has('ArrowUp')) dy -= 1;
    if (keys.has('ArrowDown')) dy += 1;
    if (keys.has('ArrowLeft')) dx -= 1;
    if (keys.has('ArrowRight')) dx += 1;
    applyPlayerMove(player, dx, dy, 1);

    if (keys.has('k') && player.attackCooldown <= 0) {
      performTackle(player, 'gamecocks');
      player.attackCooldown = 0.34;
    }
    if (keys.has('l') && player.attackCooldown <= 0 && player.hasBall) {
      passBall(player, 'gamecocks');
      player.attackCooldown = 0.6;
    }
    if (keys.has(';') && player.attackCooldown <= 0) {
      player.isDiving = 0.38;
      player.attackCooldown = 0.7;
      player.speed = 260;
      setTimeout(() => { player.speed = 220; }, 220);
    }
  });
}

function performTackle(attacker, team) {
  const enemyPlayers = players.filter((player) => player.team !== team && distance(player, attacker) < 38);
  if (!enemyPlayers.length) return;

  const victim = enemyPlayers.sort((a, b) => distance(a, attacker) - distance(b, attacker))[0];
  if (victim.hasBall || ball.owner === victim) {
    victim.stunned = 0.8;
    victim.ring = 0.7;
    victim.vx *= 0.2;
    victim.vy *= 0.2;
    spawnParticles(victim.x, victim.y, '#f4f0d0', 10);
    if (Math.random() < 0.7) {
      ball.owner = null;
      ball.x = victim.x + attacker.facing * 18;
      ball.y = victim.y + 8;
      ball.vx = attacker.facing * 140;
      ball.vy = (Math.random() - 0.5) * 80;
      spawnParticles(ball.x, ball.y, '#f9d97a', 8);
    }
  }
}

function passBall(player, teamLabel) {
  if (!player.hasBall || !ball.owner || ball.owner !== player) return;
  const teammates = players.filter((teammate) => teammate.team === teamLabel && teammate.id !== player.id);
  let target = null;
  let bestScore = -Infinity;

  teammates.forEach((teammate) => {
    const dx = teammate.x - player.x;
    const dy = teammate.y - player.y;
    const distanceValue = Math.hypot(dx, dy);
    const facingBias = teamLabel === 'tigers' ? player.facing : -player.facing;
    const directionScore = (dx * facingBias) / (distanceValue || 1) + (Math.abs(dx) * 0.8) - distanceValue * 0.2;
    if (directionScore > bestScore) {
      bestScore = directionScore;
      target = teammate;
    }
  });

  if (!target) return;
  ball.owner = target;
  target.hasBall = true;
  player.hasBall = false;
  ball.x = player.x;
  ball.y = player.y;
  const passPower = 1.1;
  ball.vx = (target.x - player.x) * passPower;
  ball.vy = (target.y - player.y) * passPower;
  player.facing = player.x < target.x ? 1 : -1;
  spawnParticles(player.x, player.y, '#f9f2a8', 8);
}

function giveBallToPlayer(player) {
  if (ball.owner) {
    ball.owner.hasBall = false;
  }
  ball.owner = player;
  player.hasBall = true;
  ball.x = player.x;
  ball.y = player.y;
  ball.vx = 0;
  ball.vy = 0;
  player.ring = 0.6;
  spawnParticles(player.x, player.y, '#f4f0d0', 10);
}

function updateBall(dt) {
  const activePlayers = players.filter((player) => !player.stunned);

  const inTigerGoal = ball.x > FIELD.width - 38 && ball.y > FIELD.height / 2 - FIELD.goalHeight / 2 && ball.y < FIELD.height / 2 + FIELD.goalHeight / 2;
  const inGamecockGoal = ball.x < 38 && ball.y > FIELD.height / 2 - FIELD.goalHeight / 2 && ball.y < FIELD.height / 2 + FIELD.goalHeight / 2;

  if (ball.owner) {
    const carrier = ball.owner;
    ball.x = carrier.x;
    ball.y = carrier.y;
    carrier.hasBall = true;

    if (carrier.team === 'tigers' && carrier.x > FIELD.width - 30) {
      score.tigers += 7;
      goalFlash = 1.2;
      goalFlashTeam = 'tigers';
      screenShake = 1.2;
      spawnParticles(FIELD.width - 70, FIELD.height / 2, '#f9f2a8', 24);
      gameState = 'score';
      setOverlay('Touchdown!', 'Upstate Tigers punch one in for seven.', 'playing');
      lastTouchdownAt = performance.now();
      resetForTouchdown();
      updateScoreboard();
      return;
    }

    if (carrier.team === 'gamecocks' && carrier.x < 30) {
      score.gamecocks += 7;
      goalFlash = 1.2;
      goalFlashTeam = 'gamecocks';
      screenShake = 1.2;
      spawnParticles(70, FIELD.height / 2, '#f9f2a8', 24);
      gameState = 'score';
      setOverlay('Touchdown!', 'Capital Gamecocks punch one in for seven.', 'playing');
      lastTouchdownAt = performance.now();
      resetForTouchdown();
      updateScoreboard();
      return;
    }
  } else {
    const ballCarrier = activePlayers.find((player) => distance(player, ball) < player.radius + ball.radius + 10);
    if (ballCarrier) {
      giveBallToPlayer(ballCarrier);
    } else {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.vx *= 0.98;
      ball.vy *= 0.98;
      if (Math.abs(ball.vx) < 2) ball.vx = 0;
      if (Math.abs(ball.vy) < 2) ball.vy = 0;

      if (inTigerGoal) {
        score.tigers += 7;
        goalFlash = 1.2;
        goalFlashTeam = 'tigers';
        screenShake = 1.2;
        spawnParticles(FIELD.width - 70, FIELD.height / 2, '#f9f2a8', 24);
        gameState = 'score';
        setOverlay('Touchdown!', 'Upstate Tigers score on a loose ball run in for seven.', 'playing');
        lastTouchdownAt = performance.now();
        resetForTouchdown();
        updateScoreboard();
        return;
      }

      if (inGamecockGoal) {
        score.gamecocks += 7;
        goalFlash = 1.2;
        goalFlashTeam = 'gamecocks';
        screenShake = 1.2;
        spawnParticles(70, FIELD.height / 2, '#f9f2a8', 24);
        gameState = 'score';
        setOverlay('Touchdown!', 'Capital Gamecocks score on a loose ball run in for seven.', 'playing');
        lastTouchdownAt = performance.now();
        resetForTouchdown();
        updateScoreboard();
        return;
      }
    }
  }

  players.forEach((player) => {
    if (!player.hasBall && distance(player, ball) < player.radius + ball.radius + 2) {
      giveBallToPlayer(player);
    }
  });
}

function updateAI(dt) {
  players.forEach((player) => {
    if (player.controlled) return;
    if (player.stunned > 0) {
      player.stunned = Math.max(0, player.stunned - dt);
      return;
    }

    const enemyPlayers = players.filter((enemy) => enemy.team !== player.team);
    const teamInFront = player.team === 'tigers' ? 1 : -1;

    if (player.hasBall) {
      const targetGoal = player.team === 'tigers' ? FIELD.width - 30 : 30;
      const dx = targetGoal - player.x;
      const dy = FIELD.height / 2 - player.y;
      applyPlayerMove(player, dx, dy, 1.25);
      return;
    }

    if (ball.owner) {
      const isTeammateCarrier = ball.owner.team === player.team;
      if (isTeammateCarrier) {
        const dx = ball.owner.x - player.x;
        const dy = ball.owner.y - player.y;
        applyPlayerMove(player, dx, dy, 1.0);
        return;
      }
    }

    const target = ball.owner || { x: FIELD.width / 2, y: FIELD.height / 2 };
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const enemyNear = enemyPlayers.sort((a, b) => distance(player, a) - distance(player, b))[0];
    if (enemyNear && distance(player, enemyNear) < 55) {
      const blockX = enemyNear.x + (teamInFront * 35);
      const blockY = enemyNear.y;
      applyPlayerMove(player, blockX - player.x, blockY - player.y, 0.9);
      return;
    }

    const laneBias = player.team === 'tigers' ? 1 : -1;
    const laneY = (FIELD.height / 2 + laneBias * 60) - player.y;
    applyPlayerMove(player, dx * 0.9 + laneBias * 24, dy * 0.9 + laneY * 0.4, 1.05);
  });
}

function updatePlayers(dt) {
  players.forEach((player) => {
    if (player.stunned > 0) {
      player.stunned = Math.max(0, player.stunned - dt);
    }
    if (player.attackCooldown > 0) {
      player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    }
    if (player.isDiving > 0) {
      player.isDiving = Math.max(0, player.isDiving - dt);
    }
    if (player.ring > 0) {
      player.ring = Math.max(0, player.ring - dt * 1.4);
    }
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.x = clamp(player.x, FIELD.margin, FIELD.width - FIELD.margin);
    player.y = clamp(player.y, FIELD.margin, FIELD.height - FIELD.margin);

    hazards.forEach((hazard) => {
      if (distance(player, hazard) < player.radius + hazard.radius + 3) {
        if (hazard.type === 'rock') {
          player.stunned = Math.max(player.stunned, 0.35);
          player.vx *= 0.4;
          player.vy *= 0.4;
        } else {
          player.vx *= 0.9;
          player.vy *= 0.9;
        }
      }
    });

    player.vx *= 0.86;
    player.vy *= 0.86;
    if (Math.abs(player.vx) < 0.8) player.vx = 0;
    if (Math.abs(player.vy) < 0.8) player.vy = 0;
  });
}

function updateTroll(dt) {
  if (!troll) return;

  if (troll.roarTimer > 0) {
    troll.roarTimer = Math.max(0, troll.roarTimer - dt);
    troll.roarFlash = Math.min(1, troll.roarFlash + dt * 2.5);
  } else {
    troll.roarFlash = Math.max(0, troll.roarFlash - dt * 2);
  }

  troll.clubSwing = Math.max(0, (troll.clubSwing || 0) - dt * 1.5);

  if (troll.entrance > 0) {
    troll.entrance = Math.max(0, troll.entrance - dt);
    troll.x += 220 * dt;
    troll.y = FIELD.height / 2 + Math.sin((1.2 - troll.entrance) * 16) * 18;
    if (troll.entrance === 0) {
      troll.vx = 30;
    }
    return;
  }

  if (troll.stompCooldown > 0) {
    troll.stompCooldown = Math.max(0, troll.stompCooldown - dt);
  }

  const target = ball.owner || players.reduce((closest, player) => {
    if (!closest || distance(player, ball) < distance(closest, ball)) return player;
    return closest;
  }, null) || { x: FIELD.width / 2, y: FIELD.height / 2 };

  const dx = target.x - troll.x;
  const dy = target.y - troll.y;
  const dist = Math.hypot(dx, dy) || 1;
  troll.vx = (dx / dist) * troll.speed;
  troll.vy = (dy / dist) * troll.speed * 0.9;
  troll.x += troll.vx * dt;
  troll.y += troll.vy * dt;
  troll.x = clamp(troll.x, FIELD.margin, FIELD.width - FIELD.margin);
  troll.y = clamp(troll.y, FIELD.margin, FIELD.height - FIELD.margin);

  players.forEach((player) => {
    const hitDist = distance(player, troll);
    if (hitDist < player.radius + troll.radius + 6) {
      const awayX = player.x - troll.x;
      const awayY = player.y - troll.y;
      const len = Math.hypot(awayX, awayY) || 1;
      player.vx += (awayX / len) * 185;
      player.vy += (awayY / len) * 185;
      player.stunned = Math.max(player.stunned, 0.8);
      spawnParticles(player.x, player.y, '#6ce886', 14);
      if (troll.stompCooldown <= 0) {
        troll.stompCooldown = 1.2;
        screenShake = Math.max(screenShake, 0.7);
        troll.roarTimer = 0.5;
        troll.clubSwing = 1.1;
      }
      if (ball.owner === player) {
        ball.owner = null;
        ball.x = troll.x + 18;
        ball.y = troll.y;
        ball.vx = 140;
        ball.vy = (Math.random() - 0.5) * 80;
      }
    }
  });

  if (ball.owner && distance(ball.owner, troll) < 50) {
    ball.owner.hasBall = false;
    ball.owner = null;
    ball.x = troll.x + 22;
    ball.y = troll.y;
    ball.vx = 160;
    ball.vy = (Math.random() - 0.5) * 100;
  }
}

function setOverlay(title, message, nextState) {
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  overlay.classList.add('visible');
  if (nextState) {
    gameState = nextState;
  }
}

function hideOverlay() {
  overlay.classList.remove('visible');
}

function togglePause() {
  if (gameState === 'playing') {
    gameState = 'paused';
    setOverlay('Paused', 'The field freezes for a brief moment. Press P or Resume to continue.', 'paused');
    return;
  }
  if (gameState === 'paused') {
    hideOverlay();
    gameState = 'playing';
  }
}

function beginGame() {
  if (gameState === 'final') {
    restartGame();
  }
  hideOverlay();
  gameState = 'playing';
}

function restartGame() {
  half = 1;
  timeLeft = HALF_LENGTH;
  score.tigers = 0;
  score.gamecocks = 0;
  resetTeams();
  setControlledFlags();
  updateScoreboard();
  hideOverlay();
  gameState = 'playing';
}

function beginHalfTwo() {
  half = 2;
  currentLevel = 1;
  timeLeft = HALF_LENGTH;
  resetTeams();
  updateScoreboard();
  hideOverlay();
  gameState = 'playing';
}

function finishGame() {
  gameState = 'final';
  const winner = score.tigers === score.gamecocks
    ? 'The game ends in a deadlock.'
    : score.tigers > score.gamecocks
      ? 'Upstate Tigers win the brawl.'
      : 'Capital Gamecocks take it.';
  overlayTitle.textContent = 'Final Score';
  overlayMessage.textContent = `${winner} ${score.tigers} - ${score.gamecocks}.`;
  overlay.classList.add('visible');
  startButton.textContent = 'Play Again';
}

function updateClock(dt) {
  if (gameState !== 'playing') return;
  timeLeft -= dt;
  if (timeLeft <= 0) {
    if (half === 1) {
      gameState = 'halftime';
      overlayTitle.textContent = 'Halftime';
      overlayMessage.textContent = 'The towel comes out. Reset the field and get ready for round two.';
      overlay.classList.add('visible');
      startButton.textContent = 'Start Half 2';
      startButton.onclick = () => {
        beginHalfTwo();
        startButton.textContent = 'Start Match';
      };
      return;
    }
    finishGame();
  }
  updateScoreboard();
}

function drawField() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const background = LEVELS[currentLevel]?.theme || '#124b30';
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(FIELD.width / 2 - 2, 0, 4, FIELD.height);

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(0, FIELD.height / 2 - 90, 30, 180);
  ctx.fillRect(FIELD.width - 30, FIELD.height / 2 - 90, 30, 180);

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 25, FIELD.width - 40, FIELD.height - 50);

  ctx.beginPath();
  ctx.moveTo(FIELD.width / 2, 25);
  ctx.lineTo(FIELD.width / 2, FIELD.height - 25);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(20, FIELD.height / 2 - 20, 6, 40);
  ctx.fillRect(FIELD.width - 26, FIELD.height / 2 - 20, 6, 40);

  hazards.forEach((hazard) => {
    ctx.save();
    ctx.translate(hazard.x, hazard.y);
    if (hazard.type === 'rock') {
      ctx.fillStyle = '#6a4b3b';
      ctx.beginPath();
      ctx.moveTo(-hazard.radius, hazard.radius * 0.5);
      ctx.lineTo(-hazard.radius * 0.3, -hazard.radius);
      ctx.lineTo(hazard.radius * 0.8, -hazard.radius * 0.3);
      ctx.lineTo(hazard.radius, hazard.radius * 0.8);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(140, 150, 160, 0.8)';
      ctx.fillRect(-hazard.radius, -hazard.radius * 0.6, hazard.radius * 2, hazard.radius * 1.2);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(-hazard.radius * 0.7, -hazard.radius * 0.2);
      ctx.lineTo(hazard.radius * 0.7, hazard.radius * 0.2);
      ctx.stroke();
    }
    ctx.restore();
  });
}

function drawBall() {
  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.fillStyle = '#f4f0d0';
  ctx.beginPath();
  ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawPlayer(player) {
  const ringColor = player.controlled ? '#f9f2a8' : 'rgba(255,255,255,0.18)';
  const teamColor = player.team === 'tigers' ? TEAMS.tigers.color : TEAMS.gamecocks.color;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(Math.atan2(player.vy || 0, player.vx || 0) || 0);

  ctx.beginPath();
  ctx.fillStyle = ringColor;
  ctx.arc(0, 0, player.radius + (player.controlled ? 7 : 3), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 22, 18, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#1a1d1f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-7, 12);
  ctx.lineTo(-12, 26);
  ctx.moveTo(7, 12);
  ctx.lineTo(12, 26);
  ctx.moveTo(-5, 0);
  ctx.lineTo(-14, 10);
  ctx.moveTo(5, 0);
  ctx.lineTo(14, 10);
  ctx.stroke();

  ctx.fillStyle = teamColor;
  ctx.fillRect(-11, 2, 22, 18);
  ctx.fillStyle = player.skinTone || '#d8b38c';
  ctx.beginPath();
  ctx.arc(0, -16, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#111827';
  ctx.fillRect(-9, -10, 18, 5);
  ctx.fillStyle = '#f5f7fb';
  ctx.fillRect(-4, -18, 8, 5);
  ctx.fillStyle = '#111827';
  ctx.fillRect(-3, -15, 2, 2);
  ctx.fillRect(1, -15, 2, 2);

  if (player.hasVikingHat) {
    ctx.fillStyle = '#d8c7a1';
    ctx.beginPath();
    ctx.moveTo(-15, -26);
    ctx.lineTo(-22, -8);
    ctx.lineTo(-4, -8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(15, -26);
    ctx.lineTo(22, -8);
    ctx.lineTo(4, -8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#b43f2e';
    ctx.fillRect(-14, -29, 28, 8);
  }

  if (player.hasBall) {
    ctx.fillStyle = '#f4f0d0';
    ctx.beginPath();
    ctx.arc(18, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawTroll() {
  if (!troll) return;

  const roarGlow = troll.roarFlash > 0 ? 0.25 + troll.roarFlash * 0.9 : 0;
  const clubAngle = troll.clubSwing > 0 ? Math.sin((1 - troll.clubSwing) * Math.PI) * 1.4 : 0;

  ctx.save();
  ctx.translate(troll.x, troll.y);
  ctx.rotate(Math.atan2(troll.vy || 0, troll.vx || 0) || 0);

  if (roarGlow > 0) {
    ctx.fillStyle = `rgba(255, 120, 120, ${roarGlow})`;
    ctx.beginPath();
    ctx.arc(0, 0, 54 + troll.roarFlash * 28, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#2c6d3c';
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#6ce886';
  ctx.beginPath();
  ctx.moveTo(-18, -24);
  ctx.lineTo(-10, -48);
  ctx.lineTo(-2, -24);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(18, -24);
  ctx.lineTo(10, -48);
  ctx.lineTo(2, -24);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#d7f9cb';
  ctx.fillRect(-14, -8, 28, 18);
  ctx.fillStyle = '#1a1d1f';
  ctx.fillRect(-8, -3, 6, 6);
  ctx.fillRect(2, -3, 6, 6);
  ctx.fillStyle = '#8d5b2f';
  ctx.fillRect(-18, 18, 12, 18);
  ctx.fillRect(6, 18, 12, 18);

  ctx.save();
  ctx.translate(26, 0);
  ctx.rotate(clubAngle);
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(0, -4, 28, 8);
  ctx.fillStyle = '#b38a5a';
  ctx.beginPath();
  ctx.arc(28, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (troll.roarTimer > 0) {
    ctx.fillStyle = '#fff2c2';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('ROAR!', 30, -32);
  }

  ctx.restore();
}

function drawGoalText() {
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('TIGERS GOAL', 90, 24);
  ctx.fillText('GAMECOCKS GOAL', FIELD.width - 180, 24);
}

function renderParticles() {
  particles.forEach((particle) => {
    particle.x += particle.vx * 0.016;
    particle.y += particle.vy * 0.016;
    particle.life -= 0.016;
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  particles = particles.filter((particle) => particle.life > 0);
}

function render() {
  ctx.save();
  if (screenShake > 0) {
    const offsetX = (Math.random() - 0.5) * 12 * screenShake;
    const offsetY = (Math.random() - 0.5) * 12 * screenShake;
    ctx.translate(offsetX, offsetY);
    screenShake = Math.max(0, screenShake - 0.05);
  }

  drawField();
  drawGoalText();
  players.forEach(drawPlayer);
  drawTroll();
  drawBall();
  renderParticles();

  if (goalFlash > 0) {
    const flashAlpha = goalFlash * 0.35;
    const flashColor = goalFlashTeam === 'tigers' ? '#f28f3b' : '#9d0f27';
    ctx.fillStyle = flashColor;
    ctx.globalAlpha = flashAlpha;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    goalFlash = Math.max(0, goalFlash - 0.04);
  }

  ctx.restore();
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTimestamp) / 1000 || 0.016, 0.03);
  lastTimestamp = timestamp;

  handleInput();
  if (gameState === 'playing') {
    if (trollTimer > 0) {
      trollTimer = Math.max(0, trollTimer - dt);
      if (trollTimer === 0 && !troll) {
        spawnTroll();
      }
    }
    updatePlayers(dt);
    updateAI(dt);
    updateTroll(dt);
    updateBall(dt);
    updateClock(dt);
    setControlledFlags();
  }

  render();
  requestAnimationFrame(gameLoop);
}

function startSoundtrack() {
  if (audioLoopId) return;

  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;

  audioContext = new AudioCtor();
  const notes = [220, 277.18, 329.63, 277.18, 196, 246.94, 293.66, 246.94];
  let step = 0;

  const playTone = (frequency, duration, type = 'square', gainValue = 0.035) => {
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  };

  audioLoopId = setInterval(() => {
    if (!audioContext || audioContext.state === 'suspended') return;
    const freq = notes[step % notes.length];
    playTone(freq, 0.12, 'square', 0.04);
    if (step % 2 === 0) {
      playTone(freq / 2, 0.18, 'triangle', 0.03);
    }
    step += 1;
  }, 150);
}

startButton.addEventListener('click', () => {
  startSoundtrack();
  if (gameState === 'title' || gameState === 'final') {
    restartGame();
    return;
  }
  if (gameState === 'halftime') {
    beginHalfTwo();
    startButton.textContent = 'Start Match';
    return;
  }
  beginGame();
});

pauseButton.addEventListener('click', togglePause);
restartButton.addEventListener('click', restartGame);

function setTouchAction(action, isPressed) {
  if (!isPressed) {
    touchState.action = null;
    return;
  }
  touchState.action = action;
  if (action === 'f' || action === 'g' || action === 'h') {
    keys.add(action);
  }
}

function bindTouchButtons() {
  const buttons = document.querySelectorAll('.touch-btn');
  buttons.forEach((button) => {
    const key = button.dataset.key;
    const press = () => {
      startSoundtrack();
      if (['w', 'a', 's', 'd'].includes(key)) {
        touchState[key] = true;
        keys.add(key);
      }
      if (['f', 'g', 'h'].includes(key)) {
        touchState.action = key;
        keys.add(key);
      }
    };
    const release = () => {
      if (['w', 'a', 's', 'd'].includes(key)) {
        touchState[key] = false;
        keys.delete(key);
      }
      if (['f', 'g', 'h'].includes(key)) {
        touchState.action = null;
        keys.delete(key);
      }
    };
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointerleave', release);
    button.addEventListener('pointercancel', release);
  });
}

window.addEventListener('keydown', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'f', 'g', 'h', 'k', 'l', ';', 'p', 'P', 'Escape'].includes(key)) {
    event.preventDefault();
  }

  if (key === 'p' || key === 'P' || event.key === 'Escape') {
    togglePause();
    return;
  }

  if (event.key === 'Enter' && gameState !== 'playing') {
    startSoundtrack();
    if (gameState === 'halftime') {
      beginHalfTwo();
      return;
    }
    restartGame();
    return;
  }

  keys.add(key);
});

window.addEventListener('keyup', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.delete(key);
});

function init() {
  currentLevel = 0;
  resetTeams();
  setControlledFlags();
  updateScoreboard();
  startButton.textContent = 'Start Match';
  overlayTitle.textContent = 'BRING IN THE TROLL';
  overlayMessage.textContent = 'Mobile-friendly chaos: take the ball to the end zone, dodge the hazards, and survive the troll. Press Enter to start, or P to pause.';
  overlay.classList.add('visible');
  bindTouchButtons();
  requestAnimationFrame(gameLoop);
}

init();
