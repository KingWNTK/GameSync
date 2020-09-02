import { MovingBallGame, WASDInputs, MoveBallCommand, AllBallsState } from './Game.js';
import { NetConn, NetMsg, MsgType } from './Network.js';



class SimLayer {
    state: AllBallsState = new AllBallsState();
    simRate: number = 0;
    playerCnt: number = 0;

    frameCnt: number = 0;
    cmdBuf: Map<number, Map<number, MoveBallCommand>> = new Map<number, Map<number, MoveBallCommand>>();

    isInitialized: boolean = false;

    constructor() {

    }

    init(simRate: number, state: AllBallsState, playerCnt: number) {
        this.isInitialized = true;
        this.simRate = simRate;
        this.state = state;
        this.playerCnt = playerCnt;
    }

    simTick() {
        if (!this.isInitialized || !this.canProceed()) return;
        this.frameCnt++;
        this.cmdBuf.get(this.frameCnt)?.forEach(cmd => {
            this.state.execute(cmd, 1.0 / this.simRate);
        });
        this.cmdBuf.delete(this.frameCnt);
    }

    addCmd(cmd: MoveBallCommand) {
        if (cmd.simFrame <= this.frameCnt) return;
        if (!this.cmdBuf.has(cmd.simFrame)) {
            this.cmdBuf.set(cmd.simFrame, new Map<number, MoveBallCommand>());
        }
        this.cmdBuf.get(cmd.simFrame)?.set(cmd.ballId, cmd);

    }
    canProceed(): boolean {
        if (this.cmdBuf.get(this.frameCnt + 1)?.size !== this.playerCnt) {
            return false;
        }
        return true;
    }
}

export class MovingBallGameClient {
    static totClients: number = 0;

    //The game we are playing
    game: MovingBallGame;
    //The simulation(logic) layer of the game
    simLayer: SimLayer;

    paused: boolean;

    //Input
    //WASD keycodes
    controlls: [number, number, number, number] = [87, 65, 83, 68];
    //WASD directions, since they are decoupled from controlls, its easy to remap controlls
    inputs: WASDInputs = [false, false, false, false];
    keyDownHandler: (ev: KeyboardEvent) => void = (ev: KeyboardEvent) => { };
    keyUpHanlder: (ev: KeyboardEvent) => void = (ev: KeyboardEvent) => { };

    //Network
    conn: NetConn;
    serverConn: NetConn | undefined;
    simFrameCnt: number = 0;
    simmedFrameCnt: number = 0;

    //Id of the player controlled ball
    ballId: number;

    constructor(game: MovingBallGame, delay: number = 0) {
        this.game = game;
        this.paused = true;
        this.conn = new NetConn(++MovingBallGameClient.totClients, delay);
        this.ballId = this.conn.connId;
        this.simLayer = new SimLayer();
        this.setControlls(this.controlls);

        //register the render loop
        this.game.update = () => {
            this.update();
        };

        //register the sim loop
        this.game.simTick = () => {
            this.simLayer.simTick();
            this.simTick();
        };
    }

    simTick() {
        this.simFrameCnt++;
        //processInput
        let cmd = new MoveBallCommand(this.simFrameCnt, this.ballId, this.inputs);
        this.simLayer.addCmd(cmd);
        if (this.serverConn !== undefined) {
            this.conn.send(new NetMsg(this.conn, this.serverConn, this.simFrameCnt, cmd));
        }

        //process the msg from the network
        //first make a deep copy
        let curMsgBuf: NetMsg[] = [];
        Object.assign(curMsgBuf, this.conn.msgBuf);
        curMsgBuf.forEach(msg => {
            //Initialize
            if (msg.type == MsgType.AllBallsState) {
                this.game.state = msg.data.clone();
                this.simLayer.init(this.game.simRate, this.game.state.clone(), 2);
            }
            //Command sync
            else if (msg.type == MsgType.MoveBallCommand) {
                // this.game.execute(msg.data);
                this.simLayer.addCmd(msg.data);
            }
            this.conn.msgBuf.shift();
        });
    }

    update() {
        // let curTs: number = new Date().valueOf();
        // this.preTs = curTs;
        this.game.state = this.simLayer.state;
    }

    //Generate listener to the input events
    private genInputHandler(down: boolean): (ev: KeyboardEvent) => void {
        return (event: KeyboardEvent) => {
            this.controlls.forEach((val, idx) => {
                if (val == event.keyCode) {
                    this.inputs[idx] = down;
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
