import { Vector3 } from './common/Util.js';

import { MovingBallGame } from './Game.js';
import { MovingBallGameClient } from './Client.js';
import { MovingBallGameServer } from './Server.js';

let client1 = new MovingBallGameClient(new MovingBallGame(document.querySelector('#canvas1')), 200);
let client2 = new MovingBallGameClient(new MovingBallGame(document.querySelector('#canvas3')), 200);
client2.setControlls([38, 37, 40, 39]);
client1.start();
client2.start();

let server = new MovingBallGameServer(new MovingBallGame(document.querySelector('#canvas2')), 2);

server.connect(client1);
server.connect(client2, new Vector3(255, 10, 10));
server.start();