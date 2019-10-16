
/*
*   网络相关接口定义
*   
*   2019-10-8 by 宝爷
*/

export type NetData = (string | ArrayBufferLike | Blob | ArrayBufferView);
export type NetCallFunc = (cmd: number, data: any) => void;

// 回调对象
export interface CallbackObject {
    target: any,                // 回调对象，不为null时调用target.callback(xxx)
    callback: NetCallFunc,      // 回调函数
}

// 请求对象
export interface RequestObject {
    buffer: NetData,            // 请求的Buffer
    rspCmd: number,             // 等待响应指令
    rspObject: CallbackObject,  // 等待响应的回调对象
}

// 协议对象
export interface IProtocolHelper {
    getHeadlen(): number;                   // 返回包头长度
    getHearbeat(): NetData;                 // 返回一个心跳包
    getPackageLen(msg: NetData): number;    // 返回整个包的长度
    checkHead(msg: NetData): boolean;       // 检查数据头部是否合法
    checkCmd(msg: NetData): number;         // 获取协议类型或id
}

// 默认字符串协议对象
export class DefStringProtocol implements IProtocolHelper {
    getHeadlen(): number {
        return 0;
    }
    getHearbeat(): NetData {
        return "";
    }
    getPackageLen(msg: NetData): number
    {
        return msg.toString().length;
    }
    checkHead(msg: NetData): boolean {
        return true;
    }
    checkCmd(msg: NetData): number {
        return 0;
    }
}

// Socket对象
export interface ISocket {
    onConnected: (event) => void;
    onMessage: (msg: NetData) => void;
    onError: (event) => void;
    onClosed: (event) => void;
    connect(options: any): boolean;
    send(buffer: NetData): boolean;
    close(code?: number, reason?: string);
}

// 网络提示对象
export interface INetworkTips {
    connectTips(isShow: boolean): void;
    reconnectTips(isShow: boolean): void;
    requestTips(isShow: boolean): void;
}
