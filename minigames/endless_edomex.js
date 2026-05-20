const canvas = document.getElementById("endless-edomex");
const ctx = canvas.getContext("2d");

// Responsive canvas
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Player
const player = {
  x: 100,
  y: 0,
  width: 50,
  height: 50,
  velocityY: 0,
  jumping: false
};

const gravity = 0.7;
const groundHeight = 120;

// Jump function
function jump() {
  if (!player.jumping) {
    player.velocityY = -16;
    player.jumping = true;
  }
}

// Keyboard
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    jump();
  }
});

// Mobile touch
document.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    jump();
  },
  { passive: false }
);

// Update physics
function update() {
  player.velocityY += gravity;
  player.y += player.velocityY;

  const groundY = canvas.height - groundHeight - player.height;

  if (player.y >= groundY) {
    player.y = groundY;
    player.velocityY = 0;
    player.jumping = false;
  }
}

// Draw everything
function draw() {
  // Background
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Ground
  ctx.fillStyle = "#222";
  ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);

  // Player
  ctx.fillStyle = "white";
  ctx.fillRect(
    player.x,
    player.y,
    player.width,
    player.height
  );

  // Title
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText("DEM00NZ TEST", 20, 40);
}

// Game loop
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// Start player on ground
player.y = canvas.height - groundHeight - player.height;

loop();

