import { ISocket, MessageFunc, NetData } from "./NetInterface";

/*
*   WebSocket封装
*   1. 连接/断开相关接口
*   2. 网络异常回调
*   3. 数据发送与接收
*   
*   2018-5-14 by 宝爷
*/

type Connected =  (event : any) => void;

export class WebSock implements ISocket {
    private _ws: WebSocket | null = null;              // websocket对象

    onConnected = null;
    onMessage = null;
    onError = null;
    onClosed = null;

    connect(options: any) {
        if (this._ws) {
            if (this._ws.readyState === WebSocket.CONNECTING) {
                console.log("websocket connecting, wait for a moment...")
                return false;
            }
        }

        let url = null;
        if(options.url) {
            url = options.url;
        } else {
            let ip = options.ip;
            let port = options.port;
            let protocol = options.protocol;
            url = `${protocol}://${ip}:${port}`;    
        }

        this._ws = new WebSocket(url);
        this._ws.binaryType = options.binaryType ? options.binaryType : "arraybuffer";
        this._ws.onmessage = (event) => {
            let onMessage : MessageFunc = this.onMessage!;
            onMessage(event.data);
        };
        this._ws.onopen = this.onConnected;
        this._ws.onerror = this.onError;
        this._ws.onclose = this.onClosed;
        return true;
    }

    send(buffer: NetData) : number {
        if (this._ws && this._ws.readyState == WebSocket.OPEN) {
            this._ws.send(buffer);
            return 1;
        }
        return -1;
    }

    close(code?: number, reason?: string) {
        if(this._ws) {
            this._ws.close(code, reason);
        }
    }
}