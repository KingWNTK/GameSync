import { Vector2, Vector3, MovingBallGame, Ball, WASDInputs, SyncMode, MoveBallCommand } from './Game.js';
import { NetConn, NetMsg, MsgType } from './Network.js';

export class MovingBallGameClient {
  static totClients: number = 0;

  mode: SyncMode = SyncMode.LockStep;

  game: MovingBallGame;
  paused: boolean;

  //WASD keycodes
  controlls: [number, number, number, number] = [87, 65, 83, 68];
  //WASD directions, since they are decoupled from controlls, its easy to remap controlls
  inputs: WASDInputs = [false, false, false, false];
  keyDownHandler: (ev: KeyboardEvent) => void = (ev: KeyboardEvent) => { };
  keyUpHanlder: (ev: KeyboardEvent) => void = (ev: KeyboardEvent) => { };

  preTs: number = new Date().valueOf();

  conn: NetConn;
  serverConn: NetConn | undefined;
  simFrameCnt: number = 0;
  simmedFrameCnt: number = 0;
  commands: MoveBallCommand[] = [];
  //Id of the player controlled ball
  ballId: number;

  simRate: number = 60;

  constructor(game: MovingBallGame, delay: number = 0) {
    this.game = game;
    this.paused = true;
    this.conn = new NetConn(++MovingBallGameClient.totClients, delay);
    this.ballId = this.conn.connId;
    this.setControlls(this.controlls);

    //register the render loop
    this.game.update = () => {
      this.update();
    };

    //register the sim loop
    this.game.simTick = () => {
      this.simTick();
    };
  }

  simTick() {
    this.simFrameCnt++;
    //processInput
    let cmd = new MoveBallCommand(this.simFrameCnt, this.ballId, this.inputs);
    this.commands.push(cmd);
    if (this.serverConn !== undefined) {
      this.conn.send(new NetMsg(this.conn, this.serverConn, this.simFrameCnt, cmd));
    }

    //process the msg from the network
    //first make a deep copy
    let curMsgBuf: NetMsg[] = [];
    Object.assign(curMsgBuf, this.conn.msgBuf);
    curMsgBuf.forEach(msg => {
      //State sync
      if (msg.type == MsgType.AllBallsState) {
        this.game.balls.clear();
        let balls: Ball[] = msg.data.balls;
        balls.forEach(ball => {
          this.game.balls.set(ball.id, ball);
        });
      }
      //Command sync
      else if (msg.type == MsgType.MoveBallCommand) {

        this.game.execute(msg.data);
      }
      this.conn.msgBuf.shift();
    });
  }

  update() {
    let curTs: number = new Date().valueOf();
    this.preTs = curTs;
  }

  //Generate listener to the input events
  private genInputHandler(down: boolean): (ev: KeyboardEvent) => void {
    return (event: KeyboardEvent) => {
      this.controlls.forEach((val, idx) => {
        if (val == event.keyCode) {
          this.inputs[idx] = down;
          return;
        }
      });
    }
  }

  setControlls(c: [number, number, number, number]) {
    document.removeEventListener('keydown', this.keyDownHandler);
    document.removeEventListener('keyup', this.keyDownHandler);
    this.controlls = c;
    this.keyDownHandler = this.genInputHandler(true);
    this.keyUpHanlder = this.genInputHandler(false);
    document.addEventListener('keydown', this.keyDownHandler);
    document.addEventListener('keyup', this.keyUpHanlder);
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
