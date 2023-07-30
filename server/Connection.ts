import {WebSocket} from "ws"
import * as http from "http"
import { HttpUtil } from "./models/HttpUtil"

export interface WsConnectionOptions {
    connId: number
    ws: WebSocket
    httpReq: http.IncomingMessage
    onClose: (conn: WsConnection, code: number, reason: string) => void
    onRecvData: (data: Buffer) => void;
}

export class WsConnection {
    options: WsConnectionOptions
    ip!: string

    constructor (options: WsConnectionOptions) {
        this.options = options;
    }

    getConnId() : number {
        return this.options.connId;
    }

    getIp() : string {
        return this.ip;
    }

    getWs() : WebSocket {
        return this.options.ws;
    }

    init(options: WsConnectionOptions) {
        this.options = options;

        this.ip = HttpUtil.getClientIp(options.httpReq);

        // todo: log
        this.options.ws.onclose = e => { this.options.onClose(this, e.code, e.reason);}
        this.options.ws.onerror = e => { console.log("[client_err] ", e.error)}
        this.options.ws.onmessage = e => {
            if (Buffer.isBuffer(e.data)) {
                this.options.onRecvData(e.data);
            } else {
                console.log("[dataType_err]", e.data);
            }
        }
    }

    close(reason?: string) {
        if (this.options.ws && this.options.ws.readyState == WebSocket.OPEN) {
            this.options.ws.close(1000, reason || 'Server Closed');
        }
        this.options.ws.onopen = this.options.ws.onclose = this.options.ws.onmessage = this.options.ws.onerror = undefined as any;
        this.ip = "";
    }

    getIsClosed(): boolean {
        return this.options.ws.readyState !== WebSocket.OPEN;
    }
}