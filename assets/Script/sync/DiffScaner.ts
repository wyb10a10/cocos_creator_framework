/**
 * 用扫描方式生成Diff
 * 2022-01-16 by 宝爷
 */

import { IDiffGenerator, ReplicateProperty } from "./SyncUtil";

export class ObjectDiffScanner implements IDiffGenerator {
    /** 最后一个有数据变化的版本号 */
    private lastVersion: number = 0;
    /** 最后一次检测的版本号 */
    private lastCheckVersion: number = 0;
    /** 要扫描的目标Object */
    private target: any = null;
    /** 所有发生过变化的数据，属性名 : 变化参数 */
    private dataMap: Map<string, ReplicateProperty> = new Map<string, ReplicateProperty>();
    
    /**
     * 生成Diff，toVersion必须为对象的最新版本号
     * @param fromVersion 从哪个版本开始扫描
     * @param toVersion 扫描到哪个版本结束
     * @returns 
     */
    genDiff(fromVersion: number, toVersion: number): any {
        if (toVersion < fromVersion || this.target === null) {
            return false;
        }
        let ret: any = {};
        let needScan = this.lastCheckVersion < toVersion;
        // 如果不需要扫描，且最终版本小于fromVersion，则直接返回
        if (!needScan && fromVersion > this.lastVersion) {
            return false;
        }
        // 遍历生成Diff
        for (let [name, property] of this.dataMap) {
            // 判断是否实现了genDiff接口
            if ("genDiff" in property.data) {
                let diff = property.data.genDiff(fromVersion, toVersion);
                if (diff) {
                    ret[name] = diff;
                }
            } else {
                if (needScan) {
                    if(property.data != this.target[name]) {
                        property.data = this.target[name];
                        ret[name] = property.data;
                        property.version = toVersion;
                    }
                } else if (property.version > fromVersion) {
                    ret[name] = property.data;
                }
            }
        }
        this.lastCheckVersion = toVersion;
        return ret;
    }

    /**
     * 获取当前版本号
     * @returns 最后一个有数据变化的版本号
     */
    getVersion(): number {
        return this.lastVersion;
    }
}