/**
 * 属性复制标记，描述一个类的哪些属性需要被同步，如何同步等
 * 支持多级属性嵌套
 * 2022-01-16 by 宝爷
 */

import { ReplicateNotify } from "./SyncUtil";

export const REPLICATE_MARK_INDEX = "__repMrk__";

/**
 * 对象的属性同步类型
 */
export enum ReplicateType {
    REPLICATE_SCAN = 0,
    REPLICATE_TRIGGER = 1,
}

/**
 * 属性同步选项
 */
export interface ReplicatedOption {
    /** 要同步的属性名 */
    Name: string;
    /** 应用同步的方法，默认为Name */
    Setter?: string;
    /** 属性同步条件 */
    Condiction?: number;
    /** 同步回调，在属性被Apply的时候调用 */
    Notify?: ReplicateNotify;
    /** 如果该属性是一个Object类型的，可以指定该Object的ObjectReplicatedOption
     * 对于未指定的Object，则默认会为其创建不带参数的IReplicator，默认为ScannerReplicator */
    ObjectOption?: ObjectReplicatedOption;
}

/**
 * 对象属性同步配置
 */
export interface ObjectReplicatedOption {
    /** 指定同步哪些属性 */
    SyncProperty?: ReplicatedOption[];
    /** 指定跳过哪些属性的同步 */
    SkipProperty?: string[];
    /** 同步类型 */
    Type?: ReplicateType;
}

/**
 * 属性同步信息
 */
export interface ReplicateMarkInfo {
    /** 默认值 */
    def?: any,
    option?: ReplicatedOption,
}

/**
 * 获取该类的标记对象（所有实例共享
 * @param target 要修饰的类对象
 * @returns ReplicateMark
 */
export function getReplicateMark(target: any, autoCreator: boolean = true): ReplicateMark {
    let ret: ReplicateMark = target[REPLICATE_MARK_INDEX];
    if (!ret && autoCreator) {
        ret = new ReplicateMark(target);
        Object.defineProperty(target, REPLICATE_MARK_INDEX, {
            value: ret,
            enumerable: false,
            writable: false,
            configurable: true,
        });
    }
    return ret;
}

/**
 * 属性同步标记，每个类只有一个标记对象
 * 用于描述一个类的哪些属性需要被同步，如何同步等
 */
export default class ReplicateMark {
    public init = false;
    private markMap: Map<string, ReplicateMarkInfo> = new Map<string, ReplicateMarkInfo>();
    private objMark?: ObjectReplicatedOption;
    private defaultMark = false;
    private cls: any;

    public constructor(cls: any) {
        this.cls = cls;
    }

    public getCls(): any { return this.cls; }

    public setDefaultMark(def: boolean) {
        this.defaultMark = def;
    }

    public getDefaultMark() {
        return this.defaultMark;
    }

    public addMark(key: string, def?: any, option?: ReplicatedOption) {
        this.markMap.set(key, { def, option });
    }

    public getMark(key: string): ReplicateMarkInfo | undefined {
        return this.markMap.get(key);
    }

    public getMarks(): Map<string, ReplicateMarkInfo> {
        return this.markMap;
    }

    public setObjMark(objMark: ObjectReplicatedOption) {
        this.objMark = objMark;
        if (objMark) {
            // 遍历markMap，如果在objMark.SkipProperty中，则删除
            this.markMap.forEach((value, key) => {
                if (objMark.SkipProperty && objMark.SkipProperty.indexOf(key) >= 0) {
                    this.markMap.delete(key);
                }
            });
            // 遍历objMark的SyncProperty，添加到markMap
            if (objMark.SyncProperty) {
                objMark.SyncProperty.forEach((item) => {
                    this.addMark(item.Name, this.cls[item.Name], item);
                });
            }
        }
    }

    public getObjMark(): ObjectReplicatedOption | undefined {
        return this.objMark;
    }
}
