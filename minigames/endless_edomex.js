const canvas = document.getElementById("endless-edomex");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 400;

const player = {
  x: 100,
  y: 300,
  width: 40,
  height: 40,
  velocityY: 0,
  jumping: false
};

function update() {
  player.velocityY += 0.5;
  player.y += player.velocityY;

  if (player.y > 300) {
    player.y = 300;
    player.velocityY = 0;
    player.jumping = false;
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !player.jumping) {
    player.velocityY = -12;
    player.jumping = true;
  }
});

loop();