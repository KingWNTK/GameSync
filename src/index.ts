import { NetConn, NetMsg } from './Network.js';
import { MovingBallGame, Ball, Vector2, Vector3 } from './Game.js';
import { MovingBallGameClient } from './Client.js';
import { MovingBallGameServer } from './Server.js';

let client1 = new MovingBallGameClient(new MovingBallGame(document.querySelector('#canvas1')), 250);

client1.start();

let server = new MovingBallGameServer(new MovingBallGame(document.querySelector('#canvas2')));

server.connect(client1);
server.start();
