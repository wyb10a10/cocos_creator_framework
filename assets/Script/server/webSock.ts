import * as WebSocket from 'ws';
import { Server as WebSocketServer } from 'ws';
import {WsConnection} from "./connection"

enum WsServerStatus {
    Initializing,
    Inited,
    Closing,
    Closed,
}

export class WsServer {
    private _id2conn : {[connId : string] : WsConnection | undefined}
}

