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

function setupGameObj() {
  player = { x: 10, y: canvas.height/2 - paddleHeight/2, width: paddleWidth, height: paddleHeight, dy: 0, score: 0, color: "#0f0" };
  computer = { x: canvas.width - paddleWidth - 10, y: canvas.height/2 - paddleHeight/2, width: paddleWidth, height: paddleHeight, dy: 3, score: 0, color: "#f00"};
  ball = { x: canvas.width/2, y: canvas.height/2, radius: ballRadius, speed: 5, dx: 5, dy: 3 };
  if (playerSide === "right") {
    // Swap sides
    [player.x, computer.x] = [computer.x, player.x];
    [player.color, computer.color] = [computer.color, player.color];
  }
}

// --- Drawing Utility Functions
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
  // Clear
  drawRect(0, 0, canvas.width, canvas.height, "#000");
  // Net
  drawNet();
  // Scores
  if (!gameOver) {
    if (playerSide === "left") {
      drawText(player.score, canvas.width/4, 50, player.color);
      drawText(computer.score, 3*canvas.width/4, 50, computer.color);
    } else {
      drawText(computer.score, canvas.width/4, 50, computer.color);
      drawText(player.score, 3*canvas.width/4, 50, player.color);
    }
  }
  
  // Paddles & Ball
  drawRect(player.x, player.y, player.width, player.height, player.color);
  drawRect(computer.x, computer.y, computer.width, computer.height, computer.color);
  drawCircle(ball.x, ball.y, ball.radius, "#fff");
}

// -- Paddle Controls
function clampPaddle(p) {
  if (p.y < 0) p.y = 0;
  if (p.y + p.height > canvas.height) p.y = canvas.height - p.height;
}
function movePlayer() {
  if (gameOver) return;
  // Laptop/Desktop Controls
  if (!isMobile) {
    if(upPressed) player.y -= 7;
    if(downPressed) player.y += 7;
    clampPaddle(player);
  }
  // On mobile, handled by touch events
}
function moveComputer() {
  if (gameOver) return;
  let compObj = (playerSide === "left") ? computer : player;
  // Intelligent AI: move towards ball with some "lag"
  let target = ball.y - (compObj.height/2);
  if (compObj.y < target) compObj.y += compObj.dy;
  else if (compObj.y > target) compObj.y -= compObj.dy;
  clampPaddle(compObj);
}

// -- Ball Logic & Collision
function resetBall() {
  ball.x = canvas.width/2;
  ball.y = canvas.height/2;
  ball.dy = (Math.random() * 2 + 3) * (Math.random() > 0.5 ? 1 : -1);
  ball.dx = Math.sign(ball.dx || 1) * ball.speed;
  ball.dx *= -1; // Change direction
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
  // Scoring (left or right)
  if (playerSide === "left") {
    // Left out = computer scores, right out = player scores
    if(ball.x - ball.radius < 0) {
      computer.score++;
      resetBall(); checkWin();
    }
    if(ball.x + ball.radius > canvas.width) {
      player.score++;
      resetBall(); checkWin();
    }
  } else {
    if(ball.x + ball.radius > canvas.width) {
      computer.score++;
      resetBall(); checkWin();
    }
    if(ball.x - ball.radius < 0) {
      player.score++;
      resetBall(); checkWin();
    }
  }
  // Paddle collisions
  let paddle1 = (playerSide==="left") ? player : computer;
  let paddle2 = (playerSide==="left") ? computer : player;
  let mainPaddle = (ball.x < canvas.width/2) ? paddle1 : paddle2;
  if (checkCollision(ball, mainPaddle)) {
    let collidePoint = ball.y - (mainPaddle.y + mainPaddle.height/2);
    collidePoint = collidePoint / (mainPaddle.height/2);
    let angle = collidePoint * Math.PI/3;
    let direction = (ball.x < canvas.width/2) ? 1 : -1;
    ball.dx = direction * ball.speed * Math.cos(angle);
    ball.dy = ball.speed * Math.sin(angle);
    if(ball.speed < 12) ball.speed += 0.3;
  }
}
function checkWin() {
  if(player.score >= winScore) showGameOver("You Win! 🏆");
  if(computer.score >= winScore) showGameOver("Computer Wins! 💻");
}
function showGameOver(winner) {
  gameOver = true;
  winnerMsg.innerText = winner;
  winnerScreen.style.display="block";
  canvas.style.display = "none";
  if(requestId) cancelAnimationFrame(requestId);
}

// -- Touch/Mouse Controls
function enablePaddleControls() {
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
    // Mouse
    canvas.addEventListener('mousemove', function(evt) {
      const rect = canvas.getBoundingClientRect();
      const mouseY = evt.clientY - rect.top;
      if (playerSide === "left") player.y = mouseY - player.height / 2;
      else if (playerSide === "right") player.y = mouseY - player.height / 2;
      clampPaddle(player);
    });
  }
  // Mobile (Touch)
  if (isMobile) {
    canvas.addEventListener('touchstart', function(evt) {
      let rect = canvas.getBoundingClientRect();
      let touchY = evt.touches[0].clientY - rect.top;
      touchOffset = touchY - player.y;
      evt.preventDefault();
    });
    canvas.addEventListener('touchmove', function(evt) {
      if (touchOffset == null) return;
      let rect = canvas.getBoundingClientRect();
      let touchY = evt.touches[0].clientY - rect.top;
      player.y = touchY - touchOffset;
      clampPaddle(player);
      evt.preventDefault();
    });
    canvas.addEventListener('touchend', function() {
      touchOffset = null;
    });
    // Tap to move
    canvas.addEventListener('touchstart', function(evt) {
      let rect = canvas.getBoundingClientRect();
      let tapY = evt.touches[0].clientY - rect.top;
      player.y = tapY - player.height/2;
      clampPaddle(player);
      evt.preventDefault();
    });
  }
}

// -- Main Loop
function game() {
  movePlayer();
  moveComputer();
  updateBall();
  render();
  if(!gameOver) requestId = requestAnimationFrame(game);
}

// -- Menu Logic & Game Start
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
  game();
};

// -- Restart Logic
restartBtn.onclick = function() {
  menu.style.display = "flex";
  winnerScreen.style.display = "none";
  canvas.style.display = "none";
};

// -- On page load, show menu (done by default)