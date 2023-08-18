/**
 * 属性复制标记，描述一个类的哪些属性需要被同步，如何同步等
 * 支持多级属性嵌套
 * 2022-01-16 by 宝爷
 */

import { Consturctor, ReplicateNotify } from "./SyncUtil";

export const REPLICATE_MARK_INDEX = "__repMrk__";

/**
 * 对象的属性同步类型
 */
export enum ReplicateType {
    REPLICATE_SCAN = 0,
    REPLICATE_TRIGGER = 1,
    REPLICATE_SIMPLE_ARRAY = 2, // 简单数组, 不支持嵌套 
    REPLICATE_ARRAY = 3,        // 简单结构体数组, 支持嵌套，用于cc.Vec3等简单结构体
    REPLICATE_LINK_ARRAY = 4,   // 引用对象数组, 支持嵌套，用于复杂对象
    REPLICATE_SIMPLE_HASH = 5,  // 简单Hash, 不支持嵌套
    REPLICATE_HASH = 6,         // 简单结构体Hash, 支持嵌套，用于cc.Vec3等简单结构体
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
    /** 构造函数，当数组需要创建新元素的时候指定 */
    Constructor?: Consturctor<any>;
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
export function getReplicateMark(target: any, autoCreator: boolean = true, option?: ObjectReplicatedOption, autoScan?: boolean): ReplicateMark | undefined {
    let ret: ReplicateMark | undefined = target[REPLICATE_MARK_INDEX];
    if (!ret && autoCreator) {
        ret = new ReplicateMark(target, option, autoScan);
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

    public constructor(cls: any, objMark?: ObjectReplicatedOption, autoScan?: boolean) {
        this.cls = cls;
        this.objMark = objMark;
        // 如果明确指定了syncProperty
        // 或cls存在成员变量，才执行initMark
        // 其他情况表示，cls还未被初始化
        if ((objMark && objMark.SyncProperty) || (autoScan && Object.keys(cls).length > 0)) {
            this.initMark();
        }
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

    public setObjMark(objMark?: ObjectReplicatedOption) {
        this.objMark = objMark;
        this.initMark();
    }

    public getObjMark(): ObjectReplicatedOption | undefined {
        return this.objMark;
    }

    public initMark(cls?: any) {
        if (this.init) {
            return;
        }

        // 当对象通过addMark的方式初始化时，无需再检查
        if (this.markMap.size > 0) {
            this.init = true;
            return;
        }

        if(!cls) {
            cls = this.cls;
        }
        this.init = true;
        let objMark = this.objMark;

        // 如果指定了SyncProperty，则添加SyncProperty中的属性到标记中
        if (objMark && objMark.SyncProperty) {
            for (let i = 0; i < objMark.SyncProperty.length; i++) {
                let option = objMark.SyncProperty[i];
                this.addMark(option.Name, cls[option.Name], option);
            }
        } else {
            // 如果没有指定SyncProperty，则添加所有属性到标记中
            // 使用Keys遍历，避免遍历到其原型属性导致无限递归
            for (let key of Object.keys(cls)) {
                // 跳过__开头的属性
                if (key.indexOf("__") == 0) {
                    continue;
                }
                this.addMark(key, cls[key]);
            }
        }

        // 如果指定了SkipProperty，则跳过SkipProperty中的属性的同步
        if (objMark && objMark.SkipProperty) {
            for (let i = 0; i < objMark.SkipProperty.length; i++) {
                let key = objMark.SkipProperty[i];
                this.markMap.delete(key);
            }
        }
    }
}
