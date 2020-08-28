export const net = Network();

function Network() {
  let allConns = new Map();
  let connId = 0;
  let ret: Object;
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
  State,
  Input
}

export class NetMsg {
  from: NetConn;
  to: NetConn;
  data: any;
  type: MsgType;
  constructor(from: NetConn, to: NetConn, data: any = null, type: MsgType = MsgType.Input) {
    this.from = from;
    this.to = to;
    this.data = data;
    this.type = type;
  }

  toString() {
    return this.data;
  }

  print() {
    console.log(this.data);
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


