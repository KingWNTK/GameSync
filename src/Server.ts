import { Vector2, Vector3, MovingBallGame, Ball, AllBallsState, MoveBallCommand } from './Game.js';
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

  connect(client: MovingBallGameClient, color: Vector3 = new Vector3(10, 10, 100), pos: Vector2 = new Vector2(100, 100)) {
    this.clientConns.push(client.conn);
    client.serverConn = this.conn;
    this.game.addBall(new Ball(client.conn.connId, pos, color));

    //Send the new client info to every client
    this.clientConns.forEach(clientConn => {
      let balls: Ball[] = [];
      //Since we are working on the same memory, deep copy is necessary
      this.game.balls.forEach(ball => {
        balls.push(ball.clone());
      })

      let state = new AllBallsState(balls, new Date().valueOf());

      this.conn.send(new NetMsg(this.conn, clientConn, 0, state, MsgType.AllBallsState));
    });

  }

  tick() {
    //first make a deep copy of the current msg buffer
    let curMsgBuf: NetMsg[] = [];
    Object.assign(curMsgBuf, this.conn.msgBuf);

    //sort these commands
    curMsgBuf.sort((lhs, rhs) => lhs.simFrame == rhs.simFrame ? lhs.simFrame - rhs.simFrame : lhs.from.connId - rhs.from.connId);

    //replay all the commands
    curMsgBuf.forEach(msg => {
      // console.log(msg);
      this.game.execute(msg.data);
      this.clientConns.forEach(clientConn => {
          this.conn.send(new NetMsg(this.conn, clientConn, msg.simFrame, msg.data));
      });
      //this msg is received, remove it now
      this.conn.msgBuf.shift();
    });
  }

  start() {
    this.game.start();
  }
}