import { NetConn, NetMsg } from './Network.js';
import { MovingBallGame, Ball, Vector2, Vector3 } from './Game.js';
import { MovingBallGameClient } from './Client.js';
import { MovingBallGameServer } from './Server.js';

let client1 = new MovingBallGameClient(new MovingBallGame(document.querySelector('#canvas1')), 250);
let client2 = new MovingBallGameClient(new MovingBallGame(document.querySelector('#canvas3')), 250);
client2.setControlls([38, 37, 40, 39]);
client1.start();
client2.start();

let server = new MovingBallGameServer(new MovingBallGame(document.querySelector('#canvas2')));

server.connect(client1);
server.connect(client2, new Vector3(255, 10, 10));
server.start();
