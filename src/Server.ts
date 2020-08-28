import { Vector2, Vector3, MovingBallGame, Ball } from './Game.js';
import { NetConn, NetMsg } from './Network.js';
import { MovingBallGameClient } from './Client.js';

class MovingBallGameServer {
  static totServers: number = 0;
  game: MovingBallGame;
  conn: NetConn;
  constructor(game: MovingBallGame) {
    this.game = game;
    this.conn = new NetConn(++MovingBallGameServer.totServers);
    
  }

  update() {

  }
  
  start() {
    this.game.start();
  }
}