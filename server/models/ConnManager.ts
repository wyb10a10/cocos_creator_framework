import { WsConnection } from "../Connection";

export class ConnManager {
    private static _idConnMap : {[connId: number]: WsConnection | undefined};
    private static activeConnNum : number = 0;

    public static getActiveConnNum() {
        return this.activeConnNum;
    }

    public static getConn(connId : number) {
        return this._idConnMap[connId];
    }

    public static addConn(conn : WsConnection) {
        this._idConnMap[conn.options.connId] = conn
        this.activeConnNum++;
    }

    public static remConn(conn : WsConnection) {
        this._idConnMap[conn.options.connId] = undefined;
        this.activeConnNum--;
    }
    
    public static sendMsg(connId: number, msg : Buffer) {
        let conn = this._idConnMap[connId];
        if (conn === undefined) {
            console.log("conn is not exists");
        }
        conn?.options.ws.send(msg)
    }
}