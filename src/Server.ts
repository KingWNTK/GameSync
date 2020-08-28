import { Vector2, Vector3, MovingBallGame, Ball, State } from './Game.js';
import { NetConn, NetMsg, MsgType } from './Network.js';
import { MovingBallGameClient } from './Client.js';

export class MovingBallGameServer {
  static totServers: number = 0;
  game: MovingBallGame;
  conn: NetConn;
  clientConns: NetConn[] = [];
  tickRate: number = 3;
  constructor(game: MovingBallGame) {
    this.game = game;
    this.conn = new NetConn(++MovingBallGameServer.totServers);
    let interval = setInterval(() => {
      this.tick();
    }, 1000.0 / this.tickRate);
  }

  connect(client: MovingBallGameClient) {
    this.clientConns.push(client.conn);
    client.serverConn = this.conn;
    this.game.addBall(new Ball(client.conn.connId, new Vector2(100, 100), new Vector3(10, 10, 100)));

    let balls: Ball[] = [];
    //Since we are working on the same memory, deep copy is necessary
    this.game.balls.forEach(ball => {
      balls.push(ball.clone());
    })

    let state = new State(balls, new Date().valueOf());
    this.conn.send(new NetMsg(this.conn, client.conn, state, MsgType.State));
    //TODO: the state should be sent to every client
  }

  tick() {
    //first make a deep copy of the current msg buffer
    let curMsgBuf: NetMsg[] = [];
    Object.assign(curMsgBuf, this.conn.msgBuf);

    //sort these commands
    curMsgBuf.sort((lhs, rhs) => lhs.data.ts - rhs.data.ts);

    //replay all the commands
    curMsgBuf.forEach(msg => {
      console.log(msg);
      this.game.execute(msg.data);
      this.clientConns.forEach(client => {
        this.conn.send(new NetMsg(this.conn, client, msg));
      });
      //this msg is received, remove it now
      this.conn.msgBuf.shift();
    });

    

  }
  
  start() {
    this.game.start();
  }
}