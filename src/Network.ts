export const net = Network();

function Network() {
    let allConns = new Map();
    let connId = 0;
    return {
        addConn: (conn: NetConn) => {
            allConns.set(connId, conn);
            conn.connId = connId;
            connId++;
        },

        print: () => {
            allConns.forEach((v, k) => {
                console.log(k, v);
            });
        },
        send: (msg: NetMsg, delay: number = 0) => {
            setTimeout(() => {
                msg.to.recv(msg);
                // console.log('Server: msg from sender');
            }, delay);
        }
    }
}

export enum MsgType {
    AllBallsState,
    MoveBallCommand
}

export class NetMsg {
    frame: number;
    from: NetConn;
    to: NetConn;
    data: any;
    type: MsgType;
    ack: number = 0;
    constructor(from: NetConn, to: NetConn, simFrame: number, data: any, type: MsgType = MsgType.MoveBallCommand) {
        this.from = from;
        this.to = to;
        this.frame = simFrame;
        this.data = data;
        this.type = type;
    }
}

export class NetConn {
    termId: number = -1;
    connId: number = -1;
    delay: number;
    receiveHandlers: Function[] = [];
    msgBuf: NetMsg[] = [];
    constructor(termId: number, delay: number = 0) {
        this.termId = termId;
        this.delay = delay;
        net.addConn(this);
        this.addRecvHandler((msg: NetMsg) => {
            this.msgBuf.push(msg);
        });
    }

    addRecvHandler(handler: Function) {
        this.receiveHandlers.push(handler);
    }

    send(msg: NetMsg) {
        //let delta  = Math.random() > 0.5 ? -this.delay / 2 : this.delay / 2;
        net.send(msg, this.delay);
    }

    recv(msg: NetMsg) {
        setTimeout(() => {
            // console.log('Clien: msg from server');
            this.receiveHandlers.forEach(handler => {
                handler(msg);
            });
        }, this.delay);
    }
}


