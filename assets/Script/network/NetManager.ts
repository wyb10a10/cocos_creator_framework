import { NetNode, NetConnectOptions } from "./NetNode";
import { NetData, CallbackObject } from "./NetInterface";

/*
*   网络节点管理类
*
*   2019-10-8 by 宝爷
*/

export class NetManager {
    private static _instance: NetManager;
    protected _channels: { [key: number]: NetNode } = {};

    public static getInstance(): NetManager {
        if (!this._instance) {
            this._instance = new NetManager();
        }
        return this._instance;
    }

    // 添加Node，返回ChannelID
    public setNetNode(newNode: NetNode, channelId: number = 0) {
        this._channels[channelId] = newNode;
    }

    // 移除Node
    public removeNetNode(channelId: number) {
        delete this._channels[channelId];
    }

    // 调用Node连接
    public connect(options: NetConnectOptions, channelId: number = 0): boolean {
        if (this._channels[channelId]) {
            return this._channels[channelId].connect(options);
        }
        return false;
    }

    // 调用Node发送
    public send(buf: NetData, force: boolean = false, channelId: number = 0): number {
        let node = this._channels[channelId];
        if(node) {
            return node!.send(buf, force);
        }
        return -1;
    }

    // 发起请求，并在在结果返回时调用指定好的回调函数
    public request(buf: NetData, rspCmd: number, rspObject: CallbackObject, showTips: boolean = true, force: boolean = false, channelId: number = 0) {
        let node = this._channels[channelId];
        if(node) {
            node.request(buf, rspCmd, rspObject, showTips, force);
        }
    }

    // 同request，但在request之前会先判断队列中是否已有rspCmd，如有重复的则直接返回
    public requestUnique(buf: NetData, rspCmd: number, rspObject: CallbackObject, showTips: boolean = true, force: boolean = false, channelId: number = 0): boolean {
        let node = this._channels[channelId];
        if(node) {
            return node.requestUnique(buf, rspCmd, rspObject, showTips, force);
        }
        return false;
    }

    // 调用Node关闭
    public close(code?: number, reason?: string, channelId: number = 0) {
        if (this._channels[channelId]) {
            return this._channels[channelId].closeSocket(code, reason);
        }
    }
}