import { Vector2, Vector3 } from './common/Util.js';
import { MovingBallGame, Ball, SimLayer } from './Game.js';
import { NetConn, NetMsg, MsgType } from './Network.js';
import { MovingBallGameClient } from './Client.js';

export class MovingBallGameServer {
    static totServers: number = 0;

    game: MovingBallGame;
    simLayer: SimLayer;

    conn: NetConn;
    clientConns: NetConn[] = [];
    tickRate: number = 10;
    playerCnt: number;
    constructor(game: MovingBallGame, playerCnt: number) {
        this.game = game;
        this.conn = new NetConn(++MovingBallGameServer.totServers);
        this.simLayer = new SimLayer();
        this.playerCnt = playerCnt;
        let interval = setInterval(() => {
            this.tick();
        }, 1000.0 / this.tickRate);

        this.game.update = () => {
            this.game.state.updateTo(this.simLayer.state);
        }
    }

    connect(client: MovingBallGameClient, color: Vector3 = new Vector3(10, 10, 100), pos: Vector2 = new Vector2(100, 100)) {
        this.clientConns.push(client.conn);
        client.serverConn = this.conn;
        this.game.addBall(new Ball(client.conn.connId, pos, color));

        if (this.playerCnt == this.clientConns.length) {
            //All the players are connected, inform the clients the initial state of the game
            this.simLayer.init(this.game.simRate, this.game.state.clone(), this.game.state.balls.size);
            this.clientConns.forEach(clientConn => {
                this.conn.send(new NetMsg(this.conn, clientConn, 0, this.game.state, MsgType.AllBallsState));
            });
        }
    }

    tick() {
        //first make a deep copy of the current msg buffer
        let curMsgBuf: NetMsg[] = [];
        Object.assign(curMsgBuf, this.conn.msgBuf);

        //sort these commands

        //replay all the commands
        curMsgBuf.forEach(msg => {
            // console.log(msg);
            // this.game.execute(msg.data);
            this.simLayer.addCmd(msg.data);

            //this msg is received, remove it now
            this.conn.msgBuf.shift();
        });

        if (!this.simLayer.canProceed()) {
            // this.simLayer.frameCnt++;
        }

        while (this.simLayer.canProceed()) {
            this.clientConns.forEach(clientConn => {
                this.conn.send(new NetMsg(this.conn, clientConn, this.simLayer.frameCnt, Object.assign([], this.simLayer.getCurCmds())));
            });
            this.simLayer.simTick();
        }
    }

    start() {
        this.game.start();
    }
}