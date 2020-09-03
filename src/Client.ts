import { MovingBallGame, WASDInputs, MoveBallCommand, SimLayer, AllBallsState } from './Game.js';
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
    pendingStates: AllBallsState[] = [];
    worstDelayFrames: number = 0;

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
            //Worst time delay for a input to be confirmed: RTT + serverTickInterval
            //This is important because we always have to send the input for future logic frames
            //Otherwise they will not catch up the server's next tick and be ignored consequently
            this.worstDelayFrames = Math.ceil((this.conn.delay * 2 + 1000 / this.game.tickRate) / (1000 / this.game.simRate));        
            if(this.simLayer.isInitialized) {
                this.update();
            }
        };

        //register the sim loop
        this.game.simTick = () => {
            this.simTick();
        };

        this.game.afterRender = () => {
            this.game.drawText("Render Frame: " + this.frameCnt, new Vector2(10, 30));
            this.game.drawText("Logic Frame: " + this.simLayer.frameCnt, new Vector2(10, 60));
        }
    }

    simTick() {
        this.simLayer.simTick();
        if(this.simLayer.cmdBuf.size > 30) {
            this.simLayer.simTick();
        }
        //processInput
        let cmd = new MoveBallCommand(this.simLayer.frameCnt + this.worstDelayFrames, this.ballId, this.inputs);
        
        if (this.serverConn !== undefined && !cmd.isIdle()) {
            this.pendingCommands.push(cmd);
            let state = this.simLayer.state;
            let len = this.pendingStates.length;
            if(len > 0) {
                state = this.pendingStates[len - 1];
            } 
            let t = state.clone();
            t.execute(cmd, 1.0 / this.game.simRate);
            this.pendingStates.push(t);
            this.conn.send(new NetMsg(this.conn, this.serverConn, cmd.frame, cmd));
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
                while(this.pendingCommands.length > 0 && msg.frame >= this.pendingCommands[0].frame) {
                    this.pendingCommands.shift();
                    this.pendingStates.shift();
                }
                msg.data.forEach((cmd: MoveBallCommand) => {
                    this.simLayer.addCmd(cmd);
                });
            }
            this.conn.msgBuf.shift();
        });
    }

    update() {
        this.game.state.updateTo(this.simLayer.state);

        let len = this.pendingStates.length - 1;
        if(len > 0) {
            this.game.state.updateTo(this.pendingStates[len - 1]);
        }
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
