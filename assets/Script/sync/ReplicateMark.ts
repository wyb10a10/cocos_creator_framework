/**
 * 属性复制标记，描述一个类的哪些属性需要被同步，如何同步等
 * 2022-01-16 by 宝爷
 */

import { ReplicateNotify } from "./SyncUtil";

export const REPLICATE_MARK_INDEX = "__repMrk__";

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
    /** 同步回调 */
    Notify?: ReplicateNotify;
}

/**
 * 对象属性同步配置
 */
export interface ObjectReplicatedOption {
    /** 指定同步哪些属性 */
    SyncProperty?: ReplicatedOption[];
    /** 指定跳过哪些属性的同步 */
    SkipProperty?: string[];
}

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
export function getReplicateMark(target: any): ReplicateMark {
    let ret: ReplicateMark = target[REPLICATE_MARK_INDEX];
    if (!ret) {
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
    }

    public getObjMark(): ObjectReplicatedOption | undefined {
        return this.objMark;
    }
}
