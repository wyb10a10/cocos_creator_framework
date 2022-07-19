/**
 * 用扫描方式生成Diff
 * 2022-01-16 by 宝爷
 */

import { getReplicateMark } from "./ReplicateMark";
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
    
    /** 构造函数 */
    constructor(target: any) {
        this.target = target;
        this.makeUpDataMap(target);
    }

    /**
     * 生成dataMap
     * @param target 要扫描的目标Object
     */
    makeUpDataMap(target: any) {
        // 获取类的同步标记
        let mark = getReplicateMark(target.prototype, false);
        if(mark) {
            let marks = mark.getMarks();
            for (let [name, info] of marks) {
                let data = info.def || target[name];
                // 如果def是函数，则执行函数返回一个新的对象(比如嵌套的对象)
                if(typeof info.def === "function") {
                    data = info.def.call(target[name], target, info);
                }
                let rp : ReplicateProperty = { data, version: 0};
                if(info.option) {
                    // 这里还可能做点其他事情
                    if(info.option.Setter) {
                        rp.setter = info.option.Setter;
                    }
                }
                this.dataMap.set(name, rp);
            }
        }
    }

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
            let setter = property.setter || name;
            // 判断是否实现了genDiff接口
            if ("genDiff" in property.data) {
                let diff = property.data.genDiff(fromVersion, toVersion);
                if (diff) {
                    ret[setter] = diff;
                }
            } else {
                if (needScan) {
                    if(property.data != this.target[name]) {
                        property.data = this.target[name];
                        ret[setter] = property.data;
                        property.version = toVersion;
                    }
                } else if (property.version > fromVersion) {
                    ret[setter] = property.data;
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