import { NetConn, NetMsg } from './Network.js';
import { MovingBallGame, Ball, Vector2, Vector3 } from './Game.js';
import { MovingBallGameClient } from './Client.js';

let canvas = document.querySelector('#canvas1');
let game = new MovingBallGameClient(new MovingBallGame(canvas));

game.start();