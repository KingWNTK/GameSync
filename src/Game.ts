import { Vector2, Vector3 } from './common/Util.js';

export type WASDInputs = [boolean, boolean, boolean, boolean];
let defaultWASDInputs: WASDInputs = [false, false, false, false];

export class MoveBallCommand {
    frame: number;
    inputs: WASDInputs;
    ballId: number;
    constructor(simFrame: number, ballId: number, inputs: WASDInputs = defaultWASDInputs) {
        this.frame = simFrame;
        this.ballId = ballId;
        this.inputs = Object.assign([], inputs);
    }

    isIdle(): boolean {
        for(let i = 0; i < 4; i++) {
            if(this.inputs[i]) return false;
        }
        return true;
    }

    clone() {
        return new MoveBallCommand(this.frame, this.ballId, this.inputs);
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

    clone(): Ball {
        let ret = new Ball(this.id, this.pos.clone(), this.color.clone());
        ret.radius = this.radius;
        ret.speed = this.speed;
        return ret;
    }
}

export class AllBallsState {
    balls: Map<number, Ball>;

    constructor(balls: Map<number, Ball> = new Map<number, Ball>()) {
        this.balls = balls;
    }

    addBall(ball: Ball) {
        this.balls.set(ball.id, ball);
    }

    removeBall(id: number) {
        this.balls.delete(id);
    }

    getBall(id: number): Ball {
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

    execute(cmd: MoveBallCommand, dt: number) {
        cmd.inputs.forEach((val, idx) => {
            if (val === true) {
                this.moveBallBySpeed(cmd.ballId, MovingBallGame.inputDirs[idx], dt);
            }
        });
    }

    updateTo(newState: AllBallsState) {
        newState.balls.forEach(ball => {
            this.getBall(ball.id).pos.set(ball.pos);
        });
    }


    clone(): AllBallsState {
        let bs = new Map<number, Ball>();
        this.balls.forEach(b => {
            bs.set(b.id, b.clone());
        });
        return new AllBallsState(bs);
    }
}

export class SimLayer {
    state: AllBallsState = new AllBallsState();
    simRate: number = 0;
    playerCnt: number = 0;

    frameCnt: number = 0;
    cmdBuf: Map<number, Map<number, MoveBallCommand>> = new Map<number, Map<number, MoveBallCommand>>();

    isInitialized: boolean = false;

    constructor() {

    }

    init(simRate: number, state: AllBallsState, playerCnt: number) {
        this.isInitialized = true;
        this.simRate = simRate;
        this.state = state;
        this.playerCnt = playerCnt;
    }

    simTick() {
        if (!this.isInitialized || !this.canProceed()) return;
        this.cmdBuf.get(this.frameCnt)?.forEach(cmd => {
            this.state.execute(cmd, 1.0 / this.simRate);
        });
        this.cmdBuf.delete(this.frameCnt);
        this.frameCnt++;
    }

    tickAnyway() {
        this.cmdBuf.get(this.frameCnt)?.forEach(cmd => {
            this.state.execute(cmd, 1.0 / this.simRate);
        });
        this.cmdBuf.delete(this.frameCnt);
        this.frameCnt++;
    }

    addCmd(cmd: MoveBallCommand) {
        if (cmd.frame < this.frameCnt) return;
        if (!this.cmdBuf.has(cmd.frame)) {
            this.cmdBuf.set(cmd.frame, new Map<number, MoveBallCommand>());
        }
        this.cmdBuf.get(cmd.frame)?.set(cmd.ballId, cmd);
    }
    
    getCurCmdsArray(): MoveBallCommand[] {
        let ret: MoveBallCommand[] = [];
        this.cmdBuf.get(this.frameCnt)?.forEach(cmd => {
            ret.push(cmd);
        });
        return ret;
    }

    getCmdsMap(frame: number): Map<number, MoveBallCommand> {
        return this.cmdBuf.get(frame) || new Map<number, MoveBallCommand>();
    }

    canProceed(): boolean {
        if (this.cmdBuf.get(this.frameCnt)?.size !== this.playerCnt) {
            return false;
        }
        return true;
    }
}

export class MovingBallGame {
    static inputDirs: [Vector2, Vector2, Vector2, Vector2] = [
        new Vector2(0, -1),
        new Vector2(-1, 0),
        new Vector2(0, 1),
        new Vector2(1, 0)
    ];

    state: AllBallsState;

    frameRate: number = 60;
    simRate: number = 60;
    tickRate: number = 10;

    private renderInterval: number = -1;
    private simInterval: number = -1;

    private canvas: Canvas;

    constructor(canvas: any) {
        this.canvas = new Canvas(canvas);
        this.state = new AllBallsState();
        this.canvas.drawBg();
    }

    addBall(ball: Ball) {
        this.state.addBall(ball);
    }

    removeBall(id: number) {
        this.state.removeBall(id);
    }

    getBall(id: number): Ball {
        return this.state.getBall(id);
    }

    updateBall(id: number, pos: Vector2) {
        this.state.updateBall(id, pos);
    }

    moveBallBySpeed(id: number, dir: Vector2, time: number) {
        this.state.moveBallBySpeed(id, dir, time);
    }

    moveBallByPos(id: number, move: Vector2) {
        this.state.moveBallByPos(id, move);
    }

    execute(cmd: MoveBallCommand) {
        this.state.execute(cmd, 1.0 / this.simRate);
    }

    draw() {
        this.canvas.drawBg();
        this.state.balls.forEach((ball) => {
            this.canvas.drawCicle(ball.pos, ball.radius, ball.color);
        });
    }

    drawText(text: string, pos: Vector2) {
        this.canvas.drawText(text, pos);
    }

    update() { }

    simTick() { }

    afterRender() {}

    start() {
        this.renderInterval = setInterval(() => {
            this.update();
            this.draw();
            this.afterRender();
        }, 1000.0 / this.frameRate);

        this.simInterval = setInterval(() => {
            this.simTick();
        }, 1000.0 / this.simRate);
    }

    pause() {
        if (this.renderInterval !== -1) {
            clearInterval(this.renderInterval);
            this.renderInterval = -1;
        }
        if (this.simInterval !== -1) {
            clearInterval(this.simInterval);
            this.simInterval = -1;
        }
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

    drawText(text: string, pos: Vector2 = new Vector2(10, 30)) {
        this.ctx.fillStyle = "white";
        this.ctx.font = "20px Arial";
        this.ctx.fillText(text, pos.x, pos.y);
    }
}