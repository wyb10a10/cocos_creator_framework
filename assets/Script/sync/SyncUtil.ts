/**
 * 网络同步基础工具
 * 1. 属性复制相关
 *  基础属性复制（number、string
 *  对象复制（简单对象
 *  容器复制（支持嵌套容器与对象
 *      数组复制
 *      Set复制
 *      Hash复制
 * 2. 属性装饰器与类装饰器
 * 3. Diff的生成与Apply
 */

import ReplicateMark, { getReplicateMark, ObjectReplicatedOption, ReplicatedOption } from "./ReplicateMark";
import { createReplicator } from "./ReplicatorFactory";

/** 属性变化回调 */
export type ReplicateNotify = (target: any, key: string, value: any) => boolean;
export type Consturctor<T> = {
    [x: string]: any; new(...args: any[]): T
};

export const REPLICATE_OBJECT_INDEX = "__repObj__";
export const REPLICATOR_INDEX = "__RI__";

/** 是否支持装饰器的Setter设置 */
export const IsSupportGetSet = true;

export type SimpleType = number | string | boolean | bigint;

export function isSimpleType(obj: any): boolean {
    return typeof obj === "number" || typeof obj === "string" || typeof obj === "boolean" || typeof obj === "bigint";
}

export function getConsturctor<T>(obj: T): Consturctor<T> {
    return (obj as any).__proto__.constructor as Consturctor<T>;
}

/**
 * 查询对象的ReplicateObject，检查对象的target.__repObj__字段
 * 每个实例会有一个自己的ReplicateObject
 * @param target 要指定的对象
 * @param autoCreator 找不到是否自动创建一个？
 * @param mark 同步标记
 * @returns 
 */
export function getReplicator(target: any, autoCreator: boolean = false, mark?: ReplicateMark): IReplicator | null {
    let ret: IReplicator | null = target[REPLICATOR_INDEX];
    if (!ret && autoCreator) {
        if (!mark) {
            mark = getReplicateMark(target.constructor, true);
            // 当类装饰器作用时，如果属性还未生成，则需要使用类的实例进行初始化
            if (mark) {
                mark.initMark(target);
            } else {
                console.warn(`getReplicator error, ${target.constructor.name} not found in ReplicateMark`);
                return null;
            }
        }
        ret = createReplicator(target, mark);
        if (ret) {
            target[REPLICATOR_INDEX] = ret;
            Object.defineProperty(target, REPLICATOR_INDEX, {
                value: ret,
                enumerable: false,
                writable: false,
                configurable: true,
            });
        }
    }
    return ret;
}

/**
 * 将一个对象的指定属性设置为可复制，为对象自动添加__repObj__属性，同时跟踪该属性的变化
 * @param target 要指定的对象
 * @param propertyKey 对象的属性名
 * @param descriptor 属性的描述符
 * @param option 自定义同步选项
 */
function makePropertyReplicatedMark(cls: any, propertyKey: string, descriptor?: PropertyDescriptor, option?: ReplicatedOption) {
    if (descriptor) {
        // 获取这个类的同步标记
        let markObj = getReplicateMark(cls, true);
        if (!markObj) {
            console.warn(`makePropertyReplicatedMark error, ${cls} not found in ReplicateMark`);
            return;
        }
        // 初始化默认值def
        if ('initializer' in descriptor && typeof descriptor['initializer'] == 'function') {
            let def = (descriptor as any).initializer();
            markObj.addMark(propertyKey, def, option);
        } else {
            let def = descriptor.value;
            markObj.addMark(propertyKey, def, option);
        }
    } else {
        console.warn(`makePropertyReplicatedMark error, ${propertyKey} not found in target ${cls}`);
    }
}

/**
 * TODO: Mark可能在Mark一个类，也可能Mark一个实例，这里是否要区分开？
 * 1. 当Mark一个类时，该类的实例的Replicator获取prototype的Mark对象来初始化
 * 2. 当Mark一个实例时，实际上可以直接初始化实例的Replicator，不需要再创建一个Mark对象
 * @param cls 
 * @param option 
 */
function makeObjectReplicatedMark(cls: any, option?: ObjectReplicatedOption): ReplicateMark | undefined {
    return getReplicateMark(cls, true, option);
}

/**
 * 属性同步装饰器，只能用于修饰属性，不能用于修饰方法
 * @param option 同步选项
 */
export function replicated(option?: ReplicatedOption) {
    // 真正的装饰器
    return (target: any, propertyKey: string, descriptor?: PropertyDescriptor) => {
        let cls = target.constructor ? target.constructor : target;
        return makePropertyReplicatedMark(cls, propertyKey, descriptor, option);
    };
}

/**
 * 类同步装饰器
 * @param option 
 * @returns 
 */
export function replicatedClass<T extends Consturctor<T>>(option?: ObjectReplicatedOption) {
    return (target: T) => {
        makeObjectReplicatedMark(target, option);
    }
}

/**
 * 一个属性的变化信息
 * changed : 是否有发生过变化
 * version : 该属性的最新版本号
 * data : 该属性的最新数据
 * 
 * 当属性为 :
 * 基础类型 - data为最新的值
 * 结构对象类型 - data为ReplicateObject
 * 数组类型 - data为整个数组对象（每次变化都会全量更新数组）
 * 节点类型 - data为节点的网络唯一ID
 * 组件类型 - data为组件的网络唯一ID
 */
export interface ReplicateProperty {
    changed?: boolean;
    version: number;
    data: any;
    setter?: string;
}

/**
 * 属性同步器接口，抽象Diff的生成和Diff的应用
 */
export interface IReplicator {
    /**
     * 生成一个Diff对象
     */
    genDiff(fromVersion: number, toVersion: number): any
    /**
     * 应用一个Diff对象
     * @param diff Diff对象
     */
    applyDiff(diff: any): void
    /**
     * 获取当前版本
     */
    getVersion(): number
    /**
     * 获取当前目标
     */
    getTarget(): any
    /** 
     * 设置当前目标
     */
    setTarget(target: any): void
}

export function isEqual(obj1: any, obj2: any): boolean {
    // 如果两个对象引用相同，则它们是相等的
    if (obj1 === obj2) {
        return true;
    }

    // 如果两个对象的类型不同，则它们不相等
    if (typeof obj1 !== typeof obj2) {
        return false;
    }

    // 如果两个对象都是 null 或 undefined，则它们是相等的
    if (obj1 == null && obj2 == null) {
        return true;
    }

    // 如果一个对象是 null 或 undefined，而另一个不是，则它们不相等
    if (obj1 == null || obj2 == null) {
        return false;
    }

    // 如果是Set，则比较Set的元素
    if (obj1 instanceof Set && obj2 instanceof Set) {
        if (obj1.size !== obj2.size) {
            return false;
        } else {
            for (const item of obj1) {
                if (!obj2.has(item)) {
                    return false;
                }
            }
            return true;
        }
    }

    // 如果是Map，则比较Map的元素
    if (obj1 instanceof Map && obj2 instanceof Map) {
        if (obj1.size !== obj2.size) {
            return false;
        } else {
            for (const [key, value] of obj1) {
                if (!obj2.has(key) || !isEqual(value, obj2.get(key))) {
                    return false;
                }
            }
            return true;
        }
    }

    // 如果两个对象都是基本类型，则比较它们的值
    if (typeof obj1 !== 'object' && typeof obj2 !== 'object') {
        return obj1 === obj2;
    }

    // 如果两个对象都是数组，则比较它们的元素
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
        if (obj1.length !== obj2.length) {
            return false;
        }

        for (let i = 0; i < obj1.length; i++) {
            if (!isEqual(obj1[i], obj2[i])) {
                return false;
            }
        }

        return true;
    }

    // 如果两个对象都是对象，则比较它们的属性
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
        return false;
    }

    for (const key of keys1) {
        if (keys2.indexOf(key) === -1 || !isEqual(obj1[key], obj2[key])) {
            return false;
        }
    }

    return true;
}

// 把当前时间戳作为随机数种子，并打印出来，方便调试
let currentSeed = Date.now();
console.log("customRandom currentSeed: ", currentSeed);

export function customRandom() {
    const a = 1664525;
    const c = 1013904223;
    const m = 2 ** 32;
    currentSeed = (a * currentSeed + c) % m;
    return currentSeed / m;
}