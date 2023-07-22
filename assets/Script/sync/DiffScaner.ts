/**
 * 用扫描方式生成Diff
 * 2022-01-16 by 宝爷
 */

import ReplicateMark, { getReplicateMark } from "./ReplicateMark";
import { createReplicator } from "./ReplicatorFactory";
import { IReplicator, ReplicateProperty } from "./SyncUtil";

export class ReplicateScanner implements IReplicator {
    /** 最后一个有数据变化的版本号 */
    private lastVersion: number = 0;
    /** 最后一次检测的版本号 */
    private lastCheckVersion: number = 0;
    /** 要扫描的目标Object */
    private target: any = null;
    /** 所有发生过变化的数据，属性名 : 变化参数 */
    private dataMap: Map<string, ReplicateProperty> = new Map<string, ReplicateProperty>();

    /** 构造函数 */
    constructor(target: any, mark?: ReplicateMark) {
        this.target = target;
        this.makeUpDataMap(target, mark);
    }

    /**
     * 生成dataMap
     * @param target 要扫描的目标Object
     */
    makeUpDataMap(target: any, mark?: ReplicateMark) {
        if (mark === undefined) {
            // 获取类的同步标记
            // 当我们不希望这个类的所有实例都支持同步，只是希望某些实例支持同步时，mark由外部传入
            mark = getReplicateMark(target.__proto__, false);
        }
        if (mark) {
            let marks = mark.getMarks();
            for (let [name, info] of marks) {
                let data: any;
                if (undefined === info.def) {
                    data = target[name];
                } else {
                    data = info.def;
                }
                // 如果def是函数，则执行函数返回一个新的对象(比如嵌套的对象)
                /*if (typeof info.def === "function") {
                    data = info.def.call(target[name], target, info);
                } else*/ if (data instanceof Object) {
                    let subMark = getReplicateMark(data, true, info.option?.ObjectOption);
                    data = createReplicator(target[name], subMark);
                }
                let rp: ReplicateProperty = { data, version: 0 };
                if (info.option) {
                    // 这里还可能做点其他事情
                    if (info.option.Setter) {
                        rp.setter = info.option.Setter;
                    }
                }
                this.dataMap.set(name, rp);
            }
        }
    }

    getTarget() {
        return this.target;
    }

    setTarget(target: any): void {
        this.target = target;
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
        let needScan = this.lastCheckVersion < toVersion;
        // 如果不需要扫描，且最终版本小于fromVersion，则直接返回
        if (!needScan && fromVersion > this.lastVersion) {
            return false;
        }
        let ret: any = {};
        let changed = false;
        let hasData = false;
        // 遍历生成Diff
        for (let [name, property] of this.dataMap) {
            // let setter = property.setter || name;
            let setter = name;
            // 判断是否实现了genDiff接口
            if (property.data instanceof Object && "genDiff" in property.data) {
                let diff = property.data.genDiff(fromVersion, toVersion);
                if (diff) {
                    ret[setter] = diff;
                    changed = true;
                }
            } else {
                if (needScan && property.data != this.target[name]) {
                    property.data = this.target[name];
                    ret[setter] = property.data;
                    property.version = toVersion;
                    changed = true;
                } else if (property.version > fromVersion) {
                    ret[setter] = property.data;
                    hasData = true;
                }
            }
        }
        // 这个版本已经检查过了，不需要重复检查
        this.lastCheckVersion = toVersion;
        // 如果有数据变化，更新lastVersion
        if (changed) {
            this.lastVersion = toVersion;
        } else if (!hasData) {
            return false;
        }
        return ret;
    }

    /**
     * 将Diff应用到目标Object上
     * @param diff Diff
     */
    applyDiff(diff: any) {
        let keys = Object.keys(diff);
        for (let key of keys) {
            let property = this.dataMap.get(key);
            if (property) {
                // 如果指定了setter，则优先执行setter方法来应用Diff
                if (property.setter && typeof this.target[property.setter] === "function") {
                    // diff[key]可能是数组，当它是数组的时候，可以得到下面这样的效果
                    // 如setPosition，this.target.setPosition(diff[key][0], diff[key][1], diff[key][2])
                    this.target[property.setter].apply(this.target, diff[key]);
                } else if (property.data instanceof Object && "applyDiff" in property.data) {
                    // 判断是否实现了applyDiff接口
                    property.data.applyDiff(diff[key]);
                } else {
                    this.target[key] = diff[key];
                }
            }
        }
    }

    /**
     * 获取当前版本号
     * @returns 最后一个有数据变化的版本号
     */
    getVersion(): number {
        return this.lastVersion;
    }
}