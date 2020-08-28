import { Vector2, Vector3, MovingBallGame, Ball, Input, SyncMode, Command } from './Game.js';
import { NetConn, NetMsg, MsgType } from './Network.js';



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
  keyDownHandler: (ev: KeyboardEvent) => void = (ev: KeyboardEvent) => {};
  keyUpHanlder: (ev: KeyboardEvent) => void = (ev: KeyboardEvent) => {};
  
  mode: SyncMode = SyncMode.LockStep;


  preTs: number = new Date().valueOf();

  conn: NetConn;
  serverConn: NetConn | undefined;
  commandSeq: number = 0;
  commands: Command[] = [];
  ballId: number;

  // keyUpHandler: (ev: KeyboardEvent) => void = (ev: KeyboardEvent) => {};
  // keyDownHandler: (ev: KeyboardEvent) => void = (ev: KeyboardEvent) => {};

  constructor(game: MovingBallGame, delay: number = 0) {
    this.game = game;
    this.paused = true;
    this.conn = new NetConn(++MovingBallGameClient.totClients, delay);
    this.ballId = this.conn.connId;

    this.setControlls(this.controlls);

    //register the game loop
    this.game.update = () => {
      this.update();
    }
  }

  update() {
    let curTs: number = new Date().valueOf();

    //process the msg from the network
    //first make a deep copy
    let curMsgBuf: NetMsg[] = [];
    Object.assign(curMsgBuf, this.conn.msgBuf);
    curMsgBuf.forEach(msg => {
      //State sync
      if(msg.type == MsgType.State) {
        this.game.balls.clear();
        let balls: Ball[] = msg.data.balls;
        balls.forEach(ball => {
          this.game.balls.set(ball.id, ball);
        });
      }
      //Command sync
      else if(msg.type == MsgType.Input) {
        this.game.execute(msg.data);
      }
      this.conn.msgBuf.shift();
    });

    //process the input
    this.inputs.forEach(input => {
      if (input.pressed) {
        let cmd = new Command(++this.commandSeq, this.ballId, input.clone(), curTs, (curTs - this.preTs) / 1000.0);
        this.game.execute(cmd);
        //inform the server
        if (this.serverConn !== undefined) {
          this.conn.send(new NetMsg(this.conn, this.serverConn, cmd));
        }
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