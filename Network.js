import { sum } from './mylib/dist/index.js'


export class NetMessageBase {
  constructor(delay, from, to) {
    this.delay = delay;
    this.from = from;
    this.to = to;
  }
}

export class NetConnection {

}

export class Network {
  static registerConn()
}

