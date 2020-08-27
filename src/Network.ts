// import { sum } from './index.js';
// console.log(sum(1, 2));
export class NetMessageBase {
  delay: Number;
  from: NetConnection;
  to: NetConnection;
  constructor(delay : Number, from : NetConnection, to : NetConnection) {
    this.delay = delay;
    this.from = from;
    this.to = to;
    console.log(delay)
  }
}



export class NetConnection {
  constructor(a : any) {
    console.log(a);
  }
}

export class Network {
}

