
export class Vector2 {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  add(rhs: Vector2): Vector2 {
    return new Vector2(this.x + rhs.x, this.y + rhs.y);
  }
}

export class Vector3 {
  x: number;
  y: number;
  z: number;
  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  add(rhs: Vector3): Vector3 {
    return new Vector3(this.x + rhs.x, this.y + rhs.y, this.z + rhs.z);
  }

  toColorString(): string {
    return 'rgb(' + this.x + ',' + this.y + ',' + this.z + ')';
  }
}

class Canvas {
  ctx: CanvasRenderingContext2D;
  height: number;
  width: number;
  bgColor: Vector3;
  constructor(canvas: any) {
    this.ctx = canvas.getContext('2d');
    this.height = canvas.height;
    this.width = canvas.width;
    this.bgColor = new Vector3(100, 100, 100);
  }

  drawBg() {
    this.ctx.fillStyle = this.bgColor.toColorString();
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawCicle(pos: Vector2, radius: number, color: Vector3) {
    this.ctx.fillStyle = color.toColorString();
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, radius, 0, 180);
    this.ctx.closePath();
    this.ctx.fill();
  }
}

export class Ball {
  id: number;
  pos: Vector2;
  color: Vector3;
  radius: number = 30;
  speed: number = 100;
  constructor(id: number, pos: Vector2 = new Vector2(0, 0), color: Vector3 = new Vector3(0, 0, 0)) {
    this.id = id;
    this.pos = pos;
    this.color = color;
  }
}

export class MovingBallGame {
  canvas: Canvas;
  balls: Map<number, Ball> = new Map<number, Ball>();
  frameRate: number = 60;
  interval: number = -1;
  constructor(canvas: any) {
    this.canvas = new Canvas(canvas);
    this.canvas.drawBg();
  }
  addBall(ball: Ball) {
    this.balls.set(ball.id, ball);
  }

  removeBall(id: number) {
    this.balls.delete(id);
  }

  getBall(id: number) {
    let ret = this.balls.get(id);
    if (ret !== undefined) {
      return ret;
    }
    else {
      return new Ball(-1);
    }
  }

  updateBall(id: number, pos: Vector2) {
    this.getBall(id).pos = pos;
  }

  moveBallBySpeed(id: number, dir: Vector2, time: number) {
    let ball = this.getBall(id);
    ball.pos = ball.pos.add(new Vector2(dir.x * ball.speed * time, dir.y * ball.speed * time));
  }

  moveBallByPos(id: number, move: Vector2) {
    this.getBall(id).pos = this.getBall(id).pos.add(move);
  }
  draw() {
    this.canvas.drawBg();
    this.balls.forEach((ball) => {
      this.canvas.drawCicle(ball.pos, ball.radius, ball.color);
    })
  }

  update() { }

  start() {
    this.interval = setInterval(() => {
      this.update();
      this.draw();
    }, 1000 / this.frameRate);
  }

  pause() {
    if (this.interval !== -1) {
      clearInterval(this.interval);
      this.interval = -1;
    }
  }
}