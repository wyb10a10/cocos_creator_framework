
/**
 * 资源泄露检查类，可以用于跟踪
 * 
 * 1. 实例化ResLeakChecker之后，需要先绑定到resLoader中
 * 2. 设置resFilter过滤器可以过滤不需要检测的资源，可用于专门跟踪某资源的使用情况
 * 3. 设置startCheck和stopCheck可动态开启、关闭检测，可用于跟踪某时间段内分配了未释放的资源
 * 4. dump方法可以将收集到的未释放资源打印到控制台
 * 5. getLog可以获取收集到的泄露日志，自己进行打印、上传或存档
 * 6. resetLog方法可以清空泄露日志
 * 
 * 2020-1-20 by 宝爷
 */

import { ResUtil } from "./ResUtil";

export type FilterCallback = (url: string) => boolean;

export class ResLeakChecker {
    public resFilter: FilterCallback = null;
    private _checking: boolean = false;
    private _log: Map<string, Map<string, string>> = new Map<string, Map<string, string>>();

    public checkFilter(url: string): boolean {
        if (!this._checking) {
            return false;
        }
        if (this.resFilter) {
            return this.resFilter(url);
        }
        return true;
    }

    public logLoad(url: string, use: string, stack?: string) {
        if (!this.checkFilter(url)) {
            return;
        }
        if (!this._log.has(url)) {
            this._log.set(url, new Map<string, string>());
        }
        let urlInfos: Map<string, string> = this._log.get(url);
        if (urlInfos.has(use)) {
            console.warn(`ResLeakChecker doubel same use ${url} : ${use}, stack ${urlInfos[use]}`);
        }
        urlInfos.set(use, stack ? stack : ResUtil.getCallStack(2));
    }

    public logRelease(url: string, use: string) {
        if (!this.checkFilter(url)) {
            return;
        }
        if (!this._log.has(url)) {
            console.warn(`ResLeakChecker url nofound ${url} : ${use}`);
            return;
        }
        let urlInfos: Map<string, string> = this._log.get(url);
        if (!urlInfos.has(use)) {
            console.warn(`ResLeakChecker use nofound ${url} : ${use}`);
        } else {
            urlInfos.delete(use);
        }
    }

    public startCheck() { this._checking = true; }
    public stopCheck() { this._checking = false; }
    public getLog() { return this._log; }
    public resetLog() {
        this._log = new Map<string, Map<string, string>>();
    }
    public dump() {
        this._log.forEach((log, url) => {
            console.log(url);
            log.forEach((stack, use) => {
                console.log(`${use} : ${stack}`);
            });
        });
    }
}
