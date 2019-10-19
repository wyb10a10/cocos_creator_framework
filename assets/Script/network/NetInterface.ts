
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

// 协议辅助接口
export interface IProtocolHelper {
    getHeadlen(): number;                   // 返回包头长度
    getHearbeat(): NetData;                 // 返回一个心跳包
    getPackageLen(msg: NetData): number;    // 返回整个包的长度
    checkPackage(msg: NetData): boolean;    // 检查包数据是否合法
    getPackageId(msg: NetData): number;     // 返回包的id或协议类型
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
    checkPackage(msg: NetData): boolean {
        return true;
    }
    getPackageId(msg: NetData): number {
        return 0;
    }
}

// Socket接口
export interface ISocket {
    onConnected: (event) => void;           // 连接回调
    onMessage: (msg: NetData) => void;      // 消息回调
    onError: (event) => void;               // 错误回调
    onClosed: (event) => void;              // 关闭回调
    
    connect(options: any);                  // 连接接口
    send(buffer: NetData);                  // 数据发送接口
    close(code?: number, reason?: string);  // 关闭接口
}

// 网络提示接口
export interface INetworkTips {
    connectTips(isShow: boolean): void;
    reconnectTips(isShow: boolean): void;
    requestTips(isShow: boolean): void;
}
