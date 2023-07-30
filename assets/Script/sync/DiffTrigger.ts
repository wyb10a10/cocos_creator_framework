/**
 * 用监听-触发的方式监控Diff的生成
 * 2022-01-16 by 宝爷
 */

import ReplicateMark, { ReplicatedOption } from "./ReplicateMark";
import { getReplicator, IReplicator, ReplicateProperty } from "./SyncUtil";

/**
 * 构造一个属性复制的Descriptor，设置该Descriptor的get/set
 * 在不影响原来set方法的基础上自动跟踪属性变化
 * @param target 要跟踪的实例
 * @param propertyKey 要跟踪的Key
 * @param descriptor 要修改的descriptor
 * @param option ReplicatedOption
 */
function makePropertyDescriptor(propertyKey: string, descriptor: PropertyDescriptor, option?: ReplicatedOption) {
    // 在不影响原来set方法的基础上自动跟踪属性变化
    let realProperty: string;
    if (option && option.Setter) {
        realProperty = option.Setter;
    } else {
        realProperty = propertyKey;
    }

    let oldValue = descriptor.value;
    let oldSet = descriptor.set;
    let oldGet = descriptor.get;
    delete descriptor.value;
    delete descriptor.writable;

    if (oldValue === undefined
        && Object.getOwnPropertyDescriptor(descriptor, "initializer")) {
        let desc = descriptor as any;
        oldValue = desc.initializer();
        delete desc.initializer;
    }

    descriptor.set = function (v: any) {
        let repObj = getReplicator(this, true) as ReplicateTrigger;
        // 标记属性发生变化
        repObj.propertyChanged(realProperty, v);
        if (oldSet) {
            oldSet(v);
        }
    }

    // 在不影响原来get方法的基础上，实现set方法的对应操作
    descriptor.get = function () {
        let ret = undefined;
        if (oldGet) {
            ret = oldGet();
        } else {
            let repObj = getReplicator(this, true) as ReplicateTrigger;
            ret = repObj.getProperty(realProperty);
        }
        return ret === undefined ? oldValue : ret;
    }
}

export class ReplicateTrigger implements IReplicator {
    /** 最后一次检测的版本号 */
    private lastCheckVersion: number = 0;
    /** 要扫描的目标Object */
    private target: any = null;
    /** 所有发生过变化的数据，属性名 : 变化参数 */
    private dataMap: Map<string, ReplicateProperty> = new Map<string, ReplicateProperty>();
    /** 自上次同步后有无属性发生过变化 */
    private hasNewChange: boolean = false;
    /** outter */
    private outter: any = null;
    /** 在outter中的属性名 */
    private outterKey: string = "";

    /** 构造函数 */
    constructor(target: any, mark?: ReplicateMark) {
        this.target = target;
    }

    public getProperty(key: string): any {
        let repPro = this.dataMap.get(key);
        return repPro ? repPro.data : repPro;
    }

    getTarget() {
        return this.target;
    }

    setTarget(target: any): void {
        this.target = target;
    }

    /**
     * 当一个属性被重新赋值时回调，即 target.key = v时
     * 1. 对比数值是否有发生变化，有则更新dataMap
     * 2. 如果要赋值的是一个可复制对象 v intanceof Rep，设置当前target为v的outter
     * 3. 当属性变化时存在outer
     * 
     * PS: 初始化赋值是否可以跳过？是否可以存着多个outer？
     * @param key 
     * @param v 
     * @param force 
     */
    public propertyChanged(key: string, v?: any, force?: boolean): void {
        let repPro = this.dataMap.get(key);
        let changed = force != true;

        if (repPro) {
            if (v === repPro.data) {
                // 实际的数值并没有发生改变
                return;
            }
            repPro.changed = changed;
            if (!(v === undefined && repPro.data instanceof Object)) {
                repPro.data = v;
            }
        } else {
            repPro = { version: 0, data: v, changed };
            this.dataMap.set(key, repPro);
        }

        // 如果设置了新的对象成员
        if (repPro.data instanceof Object) {
            repPro.data.setOutter(this, key);
        }

        // 如果有outter，需要通知，但只通知一次就够了
        // 首次赋值时（初始值，无需通知outter）
        if (!this.hasNewChange && repPro.changed) {
            if (this.outter && 'propertyChanged' in this.outter) {
                this.outter.propertyChanged(this.outterKey);
            }
            this.hasNewChange = true;
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
        // 如果不需要扫描，且最终版本小于fromVersion，则直接返回
        if (!this.hasNewChange && fromVersion > this.lastCheckVersion) {
            return false;
        }
        let ret: any = {};
        for (let [key, property] of this.dataMap) {
            if (property.changed) {
                property.changed = false;
                property.version = toVersion;
            } else if (property.version < fromVersion) {
                continue;
            }
            let setter = property.setter || key;
            if ("genDiff" in property.data) {
                let diff = property.data.genDiff(fromVersion, toVersion);
                if (diff) {
                    ret[setter] = diff;
                }
            } else {
                ret[setter] = property.data;
            }
        }
        this.lastCheckVersion = toVersion;
        return ret;
    }

    /**
     * 将Diff应用到目标Object上
     * @param diff Diff
     */
    applyDiff(diff: any) {
        let keys = Object.keys(diff);
        for (let key of keys) {
            // 如果是setter函数，则执行函数
            if (typeof this.target[key] === "function") {
                this.target[key](diff[key]);
            } else {
                let property = this.dataMap.get(key);
                // 判断是否实现了applyDiff接口
                if (property instanceof Object && "applyDiff" in property.data) {
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
        return this.lastCheckVersion;
    }
}