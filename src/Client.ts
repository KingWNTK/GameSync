import { Vector2, Vector3, MovingBallGame, Ball } from './Game.js';
import { NetConn, NetMsg } from './Network.js';

enum SyncMode {
  LockStep,
  StateSync
}

class Input {
  pressed: boolean;
  dir: Vector2;
  constructor(dir: Vector2) {
    this.pressed = false;
    this.dir = dir;
  }

  update(val: boolean) {
    this.pressed = val;
  }
}

class Command {
  input: Input;
  ts: number;
  constructor(input: Input, ts: number) {
    this.input = input;
    this.ts = ts;
  }
}

export class MovingBallGameClient {
  static totClients: number = 0;
  game: MovingBallGame;
  paused: boolean;
  //WASD keycodes
  controlls: [number, number, number, number] = [87, 65, 83, 68];
  //WASD directions, since they are decoupled from controlls, its easy to remap controlls
  inputs: [Input, Input, Input, Input] = [
    new Input(new Vector2(0, -1)),
    new Input(new Vector2(-1, 0)),
    new Input(new Vector2(0, 1)),
    new Input(new Vector2(1, 0))
  ];
  mode: SyncMode = SyncMode.LockStep;

  preTs: number = new Date().valueOf();

  conn: NetConn;
  commands: Command[] = [];

  // keyUpHandler: (ev: KeyboardEvent) => void = (ev: KeyboardEvent) => {};
  // keyDownHandler: (ev: KeyboardEvent) => void = (ev: KeyboardEvent) => {};

  constructor(game: MovingBallGame) {
    this.game = game;
    this.paused = true;
    this.game.addBall(new Ball(1, new Vector2(100, 100)));
    this.setControlls(this.controlls);
    //register the game loop
    this.game.update = () => {
      this.update();
    }

    this.conn = new NetConn(++MovingBallGameClient.totClients);
  }

  update() {
    let curTs: number = new Date().valueOf();

    this.inputs.forEach(input => {
      if (input.pressed) {
        this.game.moveBallBySpeed(1, input.dir, (curTs - this.preTs) / 1000.0);
      }
    });
    this.preTs = curTs;
  }


  //Generate listener to the input events
  private genInputHandler(down: boolean): (ev: KeyboardEvent) => void {
    return (event: KeyboardEvent) => {
      this.controlls.forEach((val, idx) => {
        if (val == event.keyCode) {
          this.inputs[idx].update(val == event.keyCode && down);
          return;
        }
      });
    }
  }

  setControlls(c: [number, number, number, number]) {
    this.controlls = c;
    document.body.onkeydown = this.genInputHandler(true);
    document.body.onkeyup = this.genInputHandler(false);
  }

  start() {
    if (this.paused) {
      this.game.start();
    }
  }

  pause() {
    if (!this.paused) {
      this.game.pause();
    }
  }
}