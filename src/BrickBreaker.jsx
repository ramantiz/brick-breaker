import React, { useRef, useEffect, useState } from 'react';

// Constants
const BALL_RADIUS = 8;
const BALL_SPEED_X = 5;
const BALL_SPEED_Y = -5;
const PADDLE_HEIGHT = 14;
const PADDLE_WIDTH = 120;
const PADDLE_SPEED = 8;
const BRICK_ROW_COUNT = 5;
const BRICK_COLUMN_COUNT = 8;
const BRICK_PADDING = 12;
const BRICK_OFFSET_TOP = 60;
const BRICK_WIDTH = 80;
const BRICK_HEIGHT = 24;
// Calculate offset left to center bricks in an 800px wide canvas
// (8 * 80) + (7 * 12) = 640 + 84 = 724
// (800 - 724) / 2 = 38
const BRICK_OFFSET_LEFT = 38; 

import logo from './assets/logo.png';

export default function BrickBreaker() {
  const canvasRef = useRef(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [score, setScore] = useState(0);

  // Use refs for mutable values that shouldn't trigger re-render
  const gameState = useRef({
    ball: { x: 0, y: 0, dx: BALL_SPEED_X, dy: BALL_SPEED_Y },
    paddle: { x: 0 },
    bricks: [],
    rightPressed: false,
    leftPressed: false,
    score: 0,
    animationId: null
  });

  const initGame = (canvas) => {
    const state = gameState.current;
    state.ball.x = canvas.width / 2;
    state.ball.y = canvas.height - 40;
    
    // Slight randomization of start direction
    state.ball.dx = BALL_SPEED_X * (Math.random() > 0.5 ? 1 : -1); 
    state.ball.dy = BALL_SPEED_Y;
    
    state.paddle.x = (canvas.width - PADDLE_WIDTH) / 2;
    state.score = 0;
    setScore(0);
    setIsGameOver(false);

    // Initialize bricks
    state.bricks = [];
    // Colors for gradient rows
    const colors = [
      ['#ff4b4b', '#cc0000'],
      ['#ffaa00', '#cc7700'],
      ['#ffff00', '#bbbb00'],
      ['#00ff00', '#009900'],
      ['#0088ff', '#0000cc']
    ];

    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
      state.bricks[c] = [];
      for (let r = 0; r < BRICK_ROW_COUNT; r++) {
        state.bricks[c][r] = { x: 0, y: 0, status: 1, colors: colors[r] };
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const keyDownHandler = (e) => {
      if (e.key === 'Right' || e.key === 'ArrowRight') gameState.current.rightPressed = true;
      else if (e.key === 'Left' || e.key === 'ArrowLeft') gameState.current.leftPressed = true;
    };

    const keyUpHandler = (e) => {
      if (e.key === 'Right' || e.key === 'ArrowRight') gameState.current.rightPressed = false;
      else if (e.key === 'Left' || e.key === 'ArrowLeft') gameState.current.leftPressed = false;
    };

    const touchHandler = (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        // Calculate position relative to canvas, accounting for CSS scaling
        const scaleX = canvas.width / rect.width;
        const rootX = (touch.clientX - rect.left) * scaleX;
        
        // Center the paddle on the touch point
        const newPaddleX = rootX - PADDLE_WIDTH / 2;
        
        // Clamp between 0 and canvas width
        gameState.current.paddle.x = Math.max(0, Math.min(canvas.width - PADDLE_WIDTH, newPaddleX));
        
        // Prevent scrolling while playing
        if (e.cancelable) e.preventDefault();
      }
    };

    window.addEventListener('keydown', keyDownHandler, false);
    window.addEventListener('keyup', keyUpHandler, false);
    canvas.addEventListener('touchstart', touchHandler, { passive: false });
    canvas.addEventListener('touchmove', touchHandler, { passive: false });

    initGame(canvas);

    const drawBall = () => {
      const { ball } = gameState.current;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#00ffff';
      ctx.fill();
      // Glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'cyan';
      ctx.closePath();
      // Reset shadow
      ctx.shadowBlur = 0;
    };

    const drawPaddle = () => {
      const { paddle } = gameState.current;
      ctx.beginPath();
      ctx.roundRect(paddle.x, canvas.height - PADDLE_HEIGHT - 10, PADDLE_WIDTH, PADDLE_HEIGHT, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(255,255,255,0.8)';
      ctx.closePath();
      ctx.shadowBlur = 0;
    };

    const drawBricks = () => {
      const { bricks } = gameState.current;
      for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
          const b = bricks[c][r];
          if (b.status === 1) {
            const brickX = c * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT;
            const brickY = r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP;
            b.x = brickX;
            b.y = brickY;
            
            ctx.beginPath();
            ctx.roundRect(brickX, brickY, BRICK_WIDTH, BRICK_HEIGHT, 6);
            const gradient = ctx.createLinearGradient(brickX, brickY, brickX, brickY + BRICK_HEIGHT);
            gradient.addColorStop(0, b.colors[0]);
            gradient.addColorStop(1, b.colors[1]);
            ctx.fillStyle = gradient;
            ctx.fill();
            // Optional: sleek inner border
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.stroke();
            ctx.closePath();
          }
        }
      }
    };

    const collisionDetection = () => {
      const { ball, bricks } = gameState.current;
      for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
          const b = bricks[c][r];
          if (b.status === 1) {
            if (
              ball.x > b.x &&
              ball.x < b.x + BRICK_WIDTH &&
              ball.y > b.y &&
              ball.y < b.y + BRICK_HEIGHT
            ) {
              ball.dy = -ball.dy;
              b.status = 0;
              gameState.current.score++;
              setScore(gameState.current.score);
              if (gameState.current.score === BRICK_ROW_COUNT * BRICK_COLUMN_COUNT) {
                 // Game Won!
                 setIsGameOver(true);
              }
            }
          }
        }
      }
    };

    const draw = () => {
      if (!hasStarted || isGameOver) {
         if (hasStarted && gameState.current.animationId) {
             cancelAnimationFrame(gameState.current.animationId);
         }
         return;
      }
      
      const state = gameState.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawBricks();
      drawBall();
      drawPaddle();
      collisionDetection();

      // Wall collision (left and right)
      if (state.ball.x + state.ball.dx > canvas.width - BALL_RADIUS || state.ball.x + state.ball.dx < BALL_RADIUS) {
        state.ball.dx = -state.ball.dx;
      }
      // Wall collision (top)
      if (state.ball.y + state.ball.dy < BALL_RADIUS) {
        state.ball.dy = -state.ball.dy;
      } 
      // Floor intersection / Paddle collision
      else if (state.ball.y + state.ball.dy > canvas.height - BALL_RADIUS - 10) {
        
        // Check if hitting the paddle specifically
        if (
            state.ball.x > state.paddle.x && 
            state.ball.x < state.paddle.x + PADDLE_WIDTH && 
            state.ball.y + state.ball.dy < canvas.height - 10 && 
            state.ball.y + state.ball.dy > canvas.height - PADDLE_HEIGHT - 10
        ) {
            // Apply a nuanced bounce depending on where it hits the paddle
            const hitPoint = state.ball.x - (state.paddle.x + PADDLE_WIDTH / 2);
            // Normalizing hitPoint from -1 to 1 based on center
            const normalizedHitPoint = hitPoint / (PADDLE_WIDTH / 2);
            
            // Adjust X velocity slightly based on spin/hit location
            state.ball.dx = state.ball.dx > 0 
                ? Math.min(Math.max(state.ball.dx + normalizedHitPoint * 2, 2), 8) 
                : Math.max(Math.min(state.ball.dx + normalizedHitPoint * 2, -2), -8);
                
            state.ball.dy = -state.ball.dy;
            
            // Push ball fully above paddle to prevent getting stuck
            state.ball.y = canvas.height - PADDLE_HEIGHT - 10 - BALL_RADIUS;
        } 
        else if (state.ball.y + state.ball.dy > canvas.height - BALL_RADIUS) {
          setIsGameOver(true);
          return;
        }
      }

      state.ball.x += state.ball.dx;
      state.ball.y += state.ball.dy;

      // Paddle movement
      if (state.rightPressed && state.paddle.x < canvas.width - PADDLE_WIDTH) {
        state.paddle.x += PADDLE_SPEED;
      } else if (state.leftPressed && state.paddle.x > 0) {
        state.paddle.x -= PADDLE_SPEED;
      }

      state.animationId = requestAnimationFrame(draw);
    };

    if (hasStarted && !isGameOver) {
      draw();
    }

    return () => {
      window.removeEventListener('keydown', keyDownHandler, false);
      window.removeEventListener('keyup', keyUpHandler, false);
      canvas.removeEventListener('touchstart', touchHandler);
      canvas.removeEventListener('touchmove', touchHandler);
      if (gameState.current.animationId) {
        cancelAnimationFrame(gameState.current.animationId);
      }
    };
  }, [hasStarted, isGameOver]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 font-sans w-full p-4 relative overflow-hidden">
      <div className="fixed top-4 left-0 right-0 flex items-center justify-between px-6 z-30 max-w-[800px] mx-auto w-full">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 border-cyan-400/50 shadow-[0_0_15px_rgba(0,255,255,0.3)] flex-shrink-0">
            <img src={logo} alt="Nabi Games Studio" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-white text-xl sm:text-3xl font-black italic tracking-wider opacity-90 leading-tight">
            <span className="text-slate-400 text-[10px] sm:text-xl block not-italic font-medium tracking-normal mb-[-4px]">NABI GAMES</span>
            BRICK <span className="text-cyan-400">BREAKER</span>
          </h2>
        </div>
        <div className="text-cyan-400 text-xl sm:text-2xl font-bold tracking-widest drop-shadow-[0_0_8px_rgba(0,255,255,0.8)] border-b-2 border-cyan-400/20 pb-1">
          {score}
        </div>
      </div>
      
      <div className="relative mt-20 sm:mt-24 border-[3px] sm:border-[5px] border-slate-700/60 rounded-[12px] sm:rounded-[16px] shadow-[0_0_40px_rgba(0,0,0,0.8)] bg-[#080b12] overflow-hidden ring-2 sm:ring-4 ring-slate-800/80 ring-offset-2 ring-offset-slate-900 z-10 transition-transform duration-700 ease-out aspect-[4/3] w-full max-w-[800px]">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="block w-full h-full touch-none"
        />
        
        {(!hasStarted || isGameOver) && (
          <div className="absolute inset-0 bg-slate-900/85 flex flex-col items-center justify-center backdrop-blur-md z-20 transition-all duration-300">
            <h1 className="text-6xl font-black text-white mb-6 tracking-tighter drop-shadow-lg scale-100">
              {isGameOver && score === BRICK_COUNT ? 'YOU WIN!' : isGameOver ? 'GAME OVER' : 'READY TO PLAY?'}
            </h1>
            {isGameOver && (
               <div className="bg-slate-800 border border-slate-700 rounded-xl px-12 py-4 mb-8 shadow-xl">
                 <p className="text-3xl text-cyan-400 font-bold animate-pulse drop-shadow-[0_0_8px_rgba(0,255,255,0.4)]">
                   Final Score: <span className="text-white">{score}</span>
                 </p>
               </div>
            )}
            <button
              className="px-10 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-extrabold rounded-full text-2xl shadow-[0_0_20px_rgba(0,255,255,0.5)] hover:shadow-[0_0_35px_rgba(0,255,255,0.8)] hover:-translate-y-1 hover:scale-105 active:scale-95 transition-all outline-none border-[3px] border-cyan-400/30 font-sans tracking-wide"
              onClick={() => {
                const canvas = canvasRef.current;
                if (canvas) {
                  initGame(canvas);
                  setHasStarted(true);
                }
              }}
            >
              {isGameOver ? 'PLAY AGAIN' : 'START GAME'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Just to avoid error on BRICK_COUNT
const BRICK_COUNT = BRICK_ROW_COUNT * BRICK_COLUMN_COUNT;
