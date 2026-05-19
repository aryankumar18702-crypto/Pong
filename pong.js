const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');

// --- Game config
let winScore = 5; // default
let playerSide = "left"; // or "right"
let isMobile = false;

// --- DOM Elements
const menu = document.getElementById('gameMenu');
const form = document.getElementById('gameForm');
const winnerScreen = document.getElementById('winnerScreen');
const winnerMsg = document.getElementById('winner');
const restartBtn = document.getElementById('restartBtn');

//--- Game State Variables
let gameRunning = false, gameOver = false;
let upPressed = false, downPressed = false, touchOffset = null;
let requestId;

//--- Game Objects
const paddleWidth = 15, paddleHeight = 100;
const ballRadius = 10;
let player, computer, ball;
let humanPaddle, computerPaddle;

function setupGameObj() {
  // Left paddle: always x=10; right paddle: always x=canvas.width - paddleWidth -10
  player = { x: 10, y: canvas.height/2 - paddleHeight/2, width: paddleWidth, height: paddleHeight, dy: 0, score: 0, color: "#0f0", baseX: 10 };
  computer = { x: canvas.width - paddleWidth - 10, y: canvas.height/2 - paddleHeight/2, width: paddleWidth, height: paddleHeight, dy: 3, score: 0, color: "#f00", baseX: canvas.width - paddleWidth - 10 };
  ball = { x: canvas.width/2, y: canvas.height/2, radius: ballRadius, speed: 5, dx: 5, dy: 3 };
  
  // Set color and assign paddles based on playerSide
  if (playerSide === "left") {
    player.x = 10;
    player.color = "#0f0";
    computer.x = canvas.width - paddleWidth - 10;
    computer.color = "#f00";
    humanPaddle = player;
    computerPaddle = computer;
  } else {
    computer.x = 10;
    computer.color = "#0f0";
    player.x = canvas.width - paddleWidth - 10;
    player.color = "#f00";
    humanPaddle = player;
    computerPaddle = computer;
  }
}

function drawRect(x, y, w, h, color = '#fff') {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
function drawCircle(x, y, r, color = '#fff') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2*Math.PI, false);
  ctx.closePath();
  ctx.fill();
}
function drawText(text, x, y, color="#fff") {
  ctx.fillStyle = color;
  ctx.font = "40px Arial";
  ctx.fillText(text, x, y);
}
function drawNet() {
  for(let i=0; i<canvas.height; i+=20) {
    drawRect(canvas.width/2-2, i, 4, 10, "#666");
  }
}
function render() {
  drawRect(0, 0, canvas.width, canvas.height, "#000");
  drawNet();
  // Scores based on paddle location
  if (!gameOver) {
    // Left paddle score left, right paddle score right
    if (humanPaddle.x < computerPaddle.x) {
      drawText(humanPaddle.score, canvas.width/4, 50, humanPaddle.color);
      drawText(computerPaddle.score, 3*canvas.width/4, 50, computerPaddle.color);
    } else {
      drawText(computerPaddle.score, canvas.width/4, 50, computerPaddle.color);
      drawText(humanPaddle.score, 3*canvas.width/4, 50, humanPaddle.color);
    }
  }
  drawRect(player.x, player.y, player.width, player.height, player.color);
  drawRect(computer.x, computer.y, computer.width, computer.height, computer.color);
  drawCircle(ball.x, ball.y, ball.radius, "#fff");
}

// Paddle Clamping
function clampPaddle(p) {
  if (p.y < 0) p.y = 0;
  if (p.y + p.height > canvas.height) p.y = canvas.height - p.height;
}
// Player input movement (mouse/touch/keys only move humanPaddle)
function moveHumanPaddle() {
  if (gameOver) return;
  if (!isMobile) {
    if (upPressed)    { humanPaddle.y -= 7; clampPaddle(humanPaddle); }
    if (downPressed)  { humanPaddle.y += 7; clampPaddle(humanPaddle); }
  }
  // Mobile input: handled by touch events.
}
// Computer paddle movement
function moveComputer() {
  if (gameOver) return;
  let target = ball.y - (computerPaddle.height/2);
  if (computerPaddle.y < target) computerPaddle.y += computerPaddle.dy;
  else if (computerPaddle.y > target) computerPaddle.y -= computerPaddle.dy;
  clampPaddle(computerPaddle);
}

function resetBall() {
  ball.x = canvas.width/2;
  ball.y = canvas.height/2;
  ball.dy = (Math.random() * 2 + 3) * (Math.random() > 0.5 ? 1 : -1);
  ball.dx = (Math.random() > 0.5 ? 1 : -1) * ball.speed;
  ball.speed = 5;
}

function checkCollision(ball, paddle) {
  return (
    ball.x - ball.radius < paddle.x + paddle.width &&
    ball.x + ball.radius > paddle.x &&
    ball.y + ball.radius > paddle.y &&
    ball.y - ball.radius < paddle.y + paddle.height
  );
}

function updateBall() {
  if (gameOver) return;
  ball.x += ball.dx;
  ball.y += ball.dy;
  // Walls
  if(ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
    ball.dy *= -1;
  }
  // Scoring (based on paddle X position)
  // Left side
  if(ball.x - ball.radius < 0) {
    if (playerSide === "left") {
      computerPaddle.score++; // right scores
    } else {
      humanPaddle.score++; // right (you) scores
    }
    resetBall(); checkWin();
  }
  // Right side
  if(ball.x + ball.radius > canvas.width) {
    if (playerSide === "right") {
      computerPaddle.score++; // left scores
    } else {
      humanPaddle.score++; // right (you) scores
    }
    resetBall(); checkWin();
  }
  // Paddle collisions
  let targetPaddle;
  // Left half
  if (ball.x < canvas.width / 2) {
    targetPaddle = (humanPaddle.x < canvas.width / 2) ? humanPaddle : computerPaddle;
  } else {
    targetPaddle = (humanPaddle.x > canvas.width / 2) ? humanPaddle : computerPaddle;
  }
  if (checkCollision(ball, targetPaddle)) {
    let collidePoint = ball.y - (targetPaddle.y + targetPaddle.height/2);
    collidePoint = collidePoint / (targetPaddle.height/2);
    let angle = collidePoint * Math.PI/3;
    let direction = (ball.x < canvas.width/2) ? 1 : -1;
    ball.dx = direction * ball.speed * Math.cos(angle);
    ball.dy = ball.speed * Math.sin(angle);
    if(ball.speed < 12) ball.speed += 0.3;
  }
}

function checkWin() {
  if(humanPaddle.score >= winScore) showGameOver("You Win! 🏆");
  if(computerPaddle.score >= winScore) showGameOver("Computer Wins! 💻");
}

function showGameOver(winner) {
  gameOver = true;
  winnerMsg.innerText = winner;
  winnerScreen.style.display="block";
  canvas.style.display = "none";
  if(requestId) cancelAnimationFrame(requestId);
}

// Input Controls
function enablePaddleControls() {
  // Remove all old listeners first
  document.onkeydown = null; document.onkeyup = null;
  canvas.onmousemove = null;
  canvas.ontouchstart = null;
  canvas.ontouchmove = null;
  canvas.ontouchend = null;

  // Laptop/Desktop: Arrow keys & Mouse
  if(!isMobile) {
    // Keyboard
    document.onkeydown = function(e) {
      if (e.key === "ArrowUp") upPressed = true;
      else if (e.key === "ArrowDown") downPressed = true;
    };
    document.onkeyup = function(e) {
      if (e.key === "ArrowUp") upPressed = false;
      else if (e.key === "ArrowDown") downPressed = false;
    };
    // Mouse (moves human paddle)
    canvas.onmousemove = function(evt) {
      let rect = canvas.getBoundingClientRect();
      let mouseY = evt.clientY - rect.top;
      humanPaddle.y = mouseY - humanPaddle.height / 2;
      clampPaddle(humanPaddle);
    };
  }
  // Mobile (Touch)
  if (isMobile) {
    canvas.ontouchstart = function(evt) {
      let rect = canvas.getBoundingClientRect();
      let touchY = evt.touches[0].clientY - rect.top;
      touchOffset = touchY - humanPaddle.y;
      evt.preventDefault();
      // Also allow tap jump to position
      humanPaddle.y = touchY - humanPaddle.height/2;
      clampPaddle(humanPaddle);
    };
    canvas.ontouchmove = function(evt) {
      if (touchOffset == null) return;
      let rect = canvas.getBoundingClientRect();
      let touchY = evt.touches[0].clientY - rect.top;
      humanPaddle.y = touchY - touchOffset;
      clampPaddle(humanPaddle);
      evt.preventDefault();
    };
    canvas.ontouchend = function() {
      touchOffset = null;
    };
  }
}

// Main Loop
function game() {
  moveHumanPaddle();
  moveComputer();
  updateBall();
  render();
  if(!gameOver) requestId = requestAnimationFrame(game);
}

// Menu Logic & Game Start
form.onsubmit = function(e) {
  e.preventDefault();
  playerSide = document.getElementById('side').value;
  isMobile = document.getElementById('device').value === "phone";
  winScore = parseInt(document.getElementById('winScore').value, 10);
  setupGameObj();
  upPressed = false; downPressed = false; touchOffset = null;
  menu.style.display = 'none';
  winnerScreen.style.display = 'none';
  canvas.style.display = 'block';
  gameRunning = true;
  gameOver = false;
  player.score = 0;
  computer.score = 0;
  resetBall();
  enablePaddleControls();
  render();
  game();
};

// Restart Logic
restartBtn.onclick = function() {
  menu.style.display = "flex";
  winnerScreen.style.display = "none";
  canvas.style.display = "none";
};

// On page load, show menu (done by default)
