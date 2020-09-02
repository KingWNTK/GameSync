import { MovingBallGame, WASDInputs, MoveBallCommand, SimLayer } from './Game.js';
import { NetConn, NetMsg, MsgType } from './Network.js';
import { Vector2 } from './common/Util.js';


export class MovingBallGameClient {
    static totClients: number = 0;

    //The game we are playing
    game: MovingBallGame;
    //The simulation(logic) layer of the game
    simLayer: SimLayer;

    //All the synchronization techniques we are using
    usePrediction: boolean = false;

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
    frameCnt: number = 0;
    pendingCommands: MoveBallCommand[] = [];

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
            if(this.simLayer.isInitialized) {
                this.update();
            }
        };

        //register the sim loop
        this.game.simTick = () => {
            this.simLayer.simTick();
            this.simTick();
        };

        this.game.afterRender = () => {
            this.game.drawText("Render Frame: " + this.frameCnt, new Vector2(10, 30));
            this.game.drawText("Logic Frame: " + this.simLayer.frameCnt, new Vector2(10, 60));
        }
    }

    simTick() {
        
        //processInput
        let cmd = new MoveBallCommand(this.frameCnt, this.ballId, this.inputs);
        //this.simLayer.addCmd(cmd);
        if (this.serverConn !== undefined) {
            let len = this.pendingCommands.length;
            if(len > 0 && this.pendingCommands[len - 1].frame == cmd.frame) {
                let oldCmd = this.pendingCommands[0];
                this.conn.send(new NetMsg(this.conn, this.serverConn, oldCmd.frame, oldCmd));
            }
            else {
                this.pendingCommands.push(cmd);
                this.conn.send(new NetMsg(this.conn, this.serverConn, cmd.frame, cmd));
            }
        }

        //process the msg from the network
        //first make a deep copy
        let curMsgBuf: NetMsg[] = [];
        Object.assign(curMsgBuf, this.conn.msgBuf);
        curMsgBuf.forEach(msg => {
            //Initialize
            if (msg.type == MsgType.AllBallsState) {
                this.game.state = msg.data.clone();
                this.simLayer.init(this.game.simRate, this.game.state.clone(), this.game.state.balls.size);
            }
            //Command
            else if (msg.type == MsgType.MoveBallCommand) {
                // this.game.execute(msg.data);
                while(this.pendingCommands.length > 0 && msg.frame >= this.pendingCommands[0].frame) {
                    this.pendingCommands.shift();
                }
                msg.data.forEach((cmd: MoveBallCommand) => {
                    this.simLayer.addCmd(cmd);
                });
            }
            this.conn.msgBuf.shift();
        });

        if(this.frameCnt <= this.simLayer.frameCnt + 20) {
            this.frameCnt++;
        }
    }

    update() {
        
        // let curTs: number = new Date().valueOf();
        // this.preTs = curTs;
        this.game.state.updateTo(this.simLayer.state);
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
