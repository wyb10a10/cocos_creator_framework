import { NetNode } from "./NetNode";

/*
*   网络节点管理类
*
*   2019-10-8 by 宝爷
*/

export class NetManager {
    protected _channels: { [key:number]: NetNode } = {}

    // 添加Node，返回ChannelID
    public setNetNode(channelId: number, newNode: NetNode) {
        this._channels[channelId] = newNode;
    }

    // 移除Node
    public removeNetNode(channelId: number) {
        delete this._channels[channelId]; 
    }

    // 调用Node连接
    public connect(options: any, channelId: number = 0):boolean {
        if (this._channels[channelId]) {
            // return this._channels[channelId].connect(options);
        }
        return false;
    }

    // 调用Node发送
    public send() {

    }

    // 调用Node关闭
    public close(code?: number, reason?: string, channelId: number = 0) {
        if (this._channels[channelId]) {
            return this._channels[channelId].closeSocket(code, reason);
        }
    }
}