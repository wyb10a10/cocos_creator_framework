import * as WebSocket from 'ws';
import { Server as WebSocketServer } from 'ws';
import {WsConnection} from "./Connection"
import * as http from "http"
import { Counter } from './models/Counter';
import { ConnManager } from './models/ConnManager';

enum WsServerStatus {
    Initializing,
    Inited,
    Closing,
    Closed,
}

export interface WsServerOptions {
    host: string
    port: number
    timeout: number
    onClientConnect: ((ws : WebSocket, httpReq: http.IncomingMessage) => void) | undefined
}

const defaultWsServerOptions: WsServerOptions = {
    host: "0.0.0.0",
    port: 8080,
    timeout: 3000,
    onClientConnect: undefined,
}

export class WsServer {
    private status: WsServerStatus = WsServerStatus.Closed;
    private options: WsServerOptions;

    private _wsServer: WebSocketServer | undefined;
    private _connIdCounter = new Counter(1);

    constructor (options?: WsServerOptions) {
        this.options = Object.assign({}, defaultWsServerOptions, options);
        if (this.options.onClientConnect === undefined) {
            this.options.onClientConnect = this._onClientConnect;
        }
        this._wsServer = undefined;
    }

    start() {
        if (this._wsServer) {
            throw new Error('Server already started');
        }
        this.status = WsServerStatus.Initializing
        this._wsServer = new WebSocketServer({port: this.options.port, host: this.options.host}, () => {
            console.log(`server started, listening on ${this.options.host}:${this.options.port}...`)
            this.status = WsServerStatus.Inited
        })
        this._wsServer.on("connection", this.options.onClientConnect || this._onClientConnect)
        this._wsServer.on("error", e => {
            console.log("[server_error]", e)
        })
    }

    private _onClientConnect = (ws: WebSocket, httpReq: http.IncomingMessage) => {
        // 服务不可用 不接受新的连接
        if (this.status !== WsServerStatus.Inited) {
            ws.close();
            return;
        }

        let connId = this.getNextConnId()
        if (isNaN(connId)) {
            ws.close(-1, "无法建立更多的连接");
            return;
        }

        let conn = new WsConnection({
            connId: connId,
            ws: ws,
            httpReq: httpReq,
            onClose: this._onClientClose,
            onRecvData: v => { this.onData(conn, v) }
        });
        ConnManager.addConn(conn);

        console.log('[Connected]', `ActiveConn=${ConnManager.getActiveConnNum()}`)
    };

    getNextConnId(): number {
        for (let i = 0; i < 1000; ++i) {
            let connId = this._connIdCounter.getNext();
            if (!ConnManager.getConn(connId)) {
                return connId;
            }
        }
        return NaN;
    }

    private _onClientClose = (conn: WsConnection, code: number, reason: string) => {
        ConnManager.remConn(conn)
        console.log('[Disconnected]', `Code=${code} ${reason ? `Reason=${reason} ` : ''} ActiveConn=${ConnManager.getActiveConnNum()}`)
    }

    private onData(conn : WsConnection, data: Buffer) {
        console.log("conn on data", data)
    }
}