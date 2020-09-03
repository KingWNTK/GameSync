import { Vector2, Vector3 } from './common/Util.js';
import { MovingBallGame, Ball, SimLayer, MoveBallCommand } from './Game.js';
import { NetConn, NetMsg, MsgType } from './Network.js';
import { MovingBallGameClient } from './Client.js';

export class MovingBallGameServer {
    static totServers: number = 0;

    game: MovingBallGame;
    simLayer: SimLayer;

    conn: NetConn;
    clientConns: NetConn[] = [];
    playerCnt: number;

    constructor(game: MovingBallGame, playerCnt: number) {
        this.game = game;
        this.conn = new NetConn(++MovingBallGameServer.totServers);
        this.simLayer = new SimLayer();
        this.playerCnt = playerCnt;
        let interval = setInterval(() => {
            this.tick();
        }, 1000.0 / this.game.tickRate);

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

        curMsgBuf.forEach(msg => {
            this.simLayer.addCmd(msg.data);
            //this msg is received, remove it now
            this.conn.msgBuf.shift();
        });

        let ticksToProceed = this.game.simRate / this.game.tickRate;

        let curSendBuf: MoveBallCommand[][] = [];

        for(let i = 0; i < ticksToProceed; i++) {
            if(!this.simLayer.isInitialized) return;
            let frame = this.simLayer.frameCnt;
            let cmds = this.simLayer.getCmdsMap(frame);
            if(this.simLayer.canProceed()) {
                this.simLayer.simTick();
            }
            else {
                this.simLayer.tickAnyway();
            }
            //Fill the missing commands
            this.clientConns.forEach(conn => {
                if(cmds?.has(conn.connId) !== true) {
                    cmds?.set(conn.connId, new MoveBallCommand(frame, conn.connId));
                }
            });

            let tmp: MoveBallCommand[] = [];
            cmds?.forEach(cmd => tmp.push(cmd));
            curSendBuf.push(tmp);
        }

        curSendBuf.forEach(cmds => {
            this.clientConns.forEach(clientConn => {
                this.conn.send(new NetMsg(this.conn, clientConn, cmds[0].frame, Object.assign([], cmds)));
            });
        });
    }

    start() {
        this.game.start();
    }
}