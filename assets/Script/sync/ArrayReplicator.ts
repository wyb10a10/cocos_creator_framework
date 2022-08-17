import ReplicateMark from "./ReplicateMark";
import { createReplicator } from "./ReplicatorFactory";
import { Consturctor, IReplicator } from "./SyncUtil";

export type SimpleType = number | string | boolean | bigint;

/**
 * 数组对象某个版本的数据
 */
interface ArraySimpleVersionInfo {
    version: number;
    data: SimpleType;
}

/**
 * SimpleArrayReplicator 高效的数组对象同步器
 * 用于同步number、string、boolean、bigint等基础类型的数组对象
 */
export class SimpleArrayReplicator implements IReplicator {
    /** 最后一个有数据变化的版本号 */
    private lastVersion: number = 0;
    /** 最后一次检测的版本号 */
    private lastCheckVersion: number = 0;
    /** 数组长度发生变化的最后一个版本 */
    private lastLengthVersion: number = 0;
    private data: ArraySimpleVersionInfo[];
    private target: SimpleType[];

    constructor(target: SimpleType[], mark?: ReplicateMark) {
        this.target = target;
        this.data = [];
        this.makeUpDataArray(target, mark);
    }

    makeUpDataArray(target: SimpleType[], mark?: ReplicateMark) {
        for (let i = 0; i < target.length; i++) {
            this.data.push({ version: 0, data: target[i] });
        }
    }

    getTarget() {
        return this.target;
    }

    setTarget(target: any): void {
        this.target = target;
    }

    genDiff(fromVersion: number, toVersion: number): any {
        if (toVersion < fromVersion) {
            return false;
        }
        let needScan = this.lastCheckVersion < toVersion;
        // 如果不需要扫描，且最终版本小于fromVersion，则直接返回
        if (!needScan && fromVersion > this.lastVersion) {
            return false;
        }
        // 如果需要扫描，先判断长度是否相等
        if (needScan) {
            let diff: SimpleType[] = [this.target.length];
            let lengthChanged = this.data.length != this.target.length;
            if (lengthChanged) {
                this.lastLengthVersion = toVersion;
            }
            if (this.data.length > this.target.length) {
                // 删除多余的data
                this.data.splice(this.target.length, this.data.length - this.target.length);
            }
            for (let i = this.target.length; i < this.target.length; i++) {
                if (this.data.length <= i) {
                    this.data.push({ version: toVersion, data: this.target[i] });
                    diff.push(i, this.target[i]);
                } else if (this.data[i].data != this.target[i]) {
                    this.data[i].version = toVersion;
                    this.data[i].data = this.target[i];
                    diff.push(i, this.target[i]);
                }
            }
            this.lastCheckVersion = toVersion;
            // 没有任何变化
            if (!lengthChanged && diff.length == 1) {
                return false;
            }
            this.lastVersion = toVersion;
            return diff;
        } else {
            // 遍历data，过滤出版本范围内的数据
            let diff: SimpleType[] = [this.target.length];
            for (let i = 0; i < this.data.length; i++) {
                if (this.data[i].version >= fromVersion && this.data[i].version <= toVersion) {
                    diff.push(i, this.data[i].data);
                }
            }
            // 没有任何变化
            if (this.lastLengthVersion < fromVersion && diff.length == 1) {
                return false;
            }
            return diff;
        }
    }

    applyDiff(diff: any): void {
        if (diff instanceof Array) {
            // 如果长度减少，删除多余的对象
            let length = diff[0];
            if (length < this.target.length) {
                this.target.splice(length, this.target.length - length);
            }
            // 遍历修改或push
            for (let i = 1; i < diff.length; i += 2) {
                let index = diff[i];
                let value = diff[i + 1];
                if (index >= this.target.length) {
                    this.target.push(value);
                } else {
                    this.target[index] = value;
                }
            }
        }
    }
    getVersion(): number {
        return this.lastVersion;
    }
}

interface ArrayObjectVersionInfo {
    version: number;
    index: number;
    data: IReplicator;
}

/**
 * ArrayReplicator 数组对象同步器
 * 用于同步对象类型的数组，例如自定义的ReplicateClass、cc.Vec2、cc.Color、cc.Rect等
 */
export class ArrayReplicator<T extends Consturctor> implements IReplicator {
    private data: ArrayObjectVersionInfo[];
    private target: Array<T>;
    private lastVersion: number = 0;
    private lastCheckVersion: number = 0;
    private ctor: Consturctor;

    constructor(target: Array<T>, mark?: ReplicateMark) {
        let objMark = mark?.getObjMark();
        if (objMark?.Constructor) {
            this.ctor = objMark?.Constructor;
        } else {
            // 如果没有指定Constructor，则target数组不得为空
            this.ctor = target[0];
        }
        this.target = target;
        this.data = [];
        this.makeUpDataArray(target, mark);
    }

    getTarget() {
        return this.target;
    }

    setTarget(target: any): void {
        this.target = target;
    }

    pushData(data: T, version: number, mark?: ReplicateMark) {
        let replicator = createReplicator(data, mark);
        if (replicator) {
            this.data.push({
                version,
                index: this.data.length,
                data: replicator
            });
        } else {
            console.error("ArrayReplicator.pushData createReplicator error:", data);
        }
    }

    makeUpDataArray(target: Array<T>, mark?: ReplicateMark) {
        for (let i = 0; i < target.length; ++i) {
            this.pushData(target[i], this.lastVersion, mark);
        }
    }

    genDiff(fromVersion: number, toVersion: number): any {
        if (toVersion < fromVersion) {
            return false;
        }

        // 长度都为0时，不发生变化
        if (this.target.length == 0 && this.data.length == 0) {
            return false;
        }

        let needScan = this.lastCheckVersion < toVersion;
        // 如果不需要扫描，且最终版本小于fromVersion，则直接返回
        if (!needScan && fromVersion > this.lastVersion) {
            return false;
        }

        let ret: Array<any> = [];
        if (needScan) {
            ret.push(this.target.length);
            for (let i = 0; i < this.target.length; i++) {
                // 如果数组长度小于当前索引，则直接添加
                if (this.data.length <= i) {
                    this.pushData(this.target[i], toVersion);
                    ret.push(i, this.data[i].data.genDiff(-1, toVersion));
                } else {
                    let data: IReplicator = this.data[i].data;
                    // 如果由于数组的插入与删除，导致对象下标变化，则需要重新绑定
                    if (this.data[i].index != i) {
                        data.setTarget(this.target[i]);
                        this.data[i].index = i;
                    }
                    let diff = data.genDiff(fromVersion, toVersion);
                    // 如果不是新插入的，则需要有diff才进入ret
                    if (diff) {
                        ret.push(i, diff);
                    }
                }
            }
            this.lastCheckVersion = toVersion;
        } else {
            // 先记录长度，再比较数据，这里不再扫描target，直接使用data
            ret.push(this.data.length);
            for (let i = 0; i < this.data.length; i++) {
                let data: IReplicator = this.data[i].data;
                // 如果version大于fromVersion，则表示为新插入的，必须添加到ret
                if (this.data[i].version > fromVersion) {
                    ret.push(i, data.genDiff(-1, toVersion));
                } else {
                    // 元素有变化则更新
                    let diff = data.genDiff(fromVersion, toVersion);
                    if (diff) {
                        ret.push(i, diff);
                    }
                }
            }
        }

        // 如果没有差异（ret的长度为1），且长度相同，则返回false
        if (ret.length == 1 && ret[0] == this.data.length) {
            return false;
        }

        this.lastVersion = toVersion;
        // 如果data的长度大于target的长度，则删除data的多余部分
        if (this.data.length > this.target.length) {
            this.data.splice(this.target.length, this.data.length - this.target.length);
        }
        return ret;
    }

    applyDiff(diff: any): void {
        if (diff instanceof Array) {
            // 如果长度减少，删除多余的对象
            let length = diff[0];
            if (length < this.target.length) {
                this.target.splice(length, this.target.length - length);
            }
            // 遍历修改或push
            for (let i = 1; i < diff.length; i += 2) {
                let index = diff[i];
                let value = diff[i + 1];
                // 如果需要创建新的对象
                if (index >= this.target.length) {
                    // TODO: 如果有构造函数参数，如何传递？
                    // 暂时只能使用默认构造函数，数值的变化可以使用applyDiff更新
                    this.target.push(new this.ctor());
                    let replicator = createReplicator(this.target[index]);
                    if (replicator) {
                        this.data.push({
                            version: this.lastVersion,
                            data: replicator,
                            index: index
                        });
                    }
                }
                this.data[index].data.applyDiff(value);
            }
        }
    }

    getVersion(): number {
        return this.lastVersion;
    }
}

enum ActionType {
    Insert, // 插入, index: 插入的位置
    Delete, // 删除, index: 删除的位置
    Move,   // 移动，index: 移动的位置，to: 移动到的位置
    Clear,  // 清空
    Update, // 更新，index: 更新的位置
}

interface ArrayActionInfo {
    version: number,
    actions: number[],
}

export class ArrayLinkReplicator<T extends Consturctor> implements IReplicator {
    private data: Array<ArrayObjectVersionInfo>;
    private dataIndexMap: Map<T, number>;
    private target: Array<T>;
    private actionSequence: Array<ArrayActionInfo> = [];
    private lastVersion: number = 0;
    private lastCheckVersion: number = 0;
    private ctor: Consturctor;

    constructor(target: Array<T>, mark?: ReplicateMark) {
        let objMark = mark?.getObjMark();
        if (objMark?.Constructor) {
            this.ctor = objMark?.Constructor;
        } else {
            // 如果没有指定Constructor，则target数组不得为空
            this.ctor = target[0];
        }
        this.target = target;
        this.data = [];
        this.dataIndexMap = new Map();
    }

    getTarget() {
        return this.target;
    }

    setTarget(target: any): void {
        this.target = target;
    }

    pushData(data: T, version: number, mark?: ReplicateMark) {
        let replicator = createReplicator(data, mark);
        if (replicator) {
            this.data.push({
                version: version,
                data: replicator,
                index: this.data.length
            });
        } else {
            console.error("ArrayReplicator.pushData createReplicator error:", data);
        }
    }

    makeUpDataArray(target: Array<T>, mark?: ReplicateMark) {
        for (let i = 0; i < target.length; ++i) {
            this.pushData(target[i], this.lastVersion, mark);
        }
    }

    /**
     * 清理具体某个版本的操作序列
     * @param delIndex 
     * @param actions 
     * @returns 新下标
     */
    clearActionSequence(delIndex: number, actions: number[]): number {
        // 遍历actionSequence
        for (let i = 0; i < actions.length; ++i) {
            if (actions[i] == ActionType.Insert) {
                let index = actions[i + 1];
                if (index > delIndex) {
                    actions[i + 1] = index - 1;
                }
                i += 2;
            } else if (actions[i] == ActionType.Delete) {
                let index = actions[i + 1];
                if (index > delIndex) {
                    actions[i + 1] = index - 1;
                }
                i += 2;
            } else if (actions[i] == ActionType.Move) {
                let index = actions[i + 1];
                if (index > delIndex) {
                    actions[i + 1] = index - 1;
                }
                index = actions[i + 2];
                if (index > delIndex) {
                    actions[i + 2] = index - 1;
                }
                i += 3;
            }
        }
        return delIndex;
    }

    /**
     * 优化合并已删除的元素的操作历史，避免过多的操作历史
     * @param delActions 删除的操作
     */
    mergeActionSequence(delActions: Array<any>) {
        // 因为需要支持任意一个版本更新到最新版本，所以需要保留所有的操作历史
        // // 遍历所有删除的下标（需要跳过ActionType.Delete
        // for (let j = 1; j < delActions.length; j+=2) {
        //     let delIndex = delActions[j];
        //     // 逆序遍历actionSequence
        //     for (let i = this.actionSequence.length - 1; i >= 0; --i) {
        //         let action = this.actionSequence[i];
        //         // 如果是删除操作
        //         if (action[0] == ActionType.Delete) {
        //             if (action[1] > delIndex) {
        //                 // 如果删除的下标小于当前删除的下标，则当前删除的下标减一
        //                 action[1] -= 1;
        //             }
        //             ++i; // 跳过1个参数
        //         }
        //         // 如果是插入操作
        //         else if (action[0] == ActionType.Insert) {
        //         }
        //         // 如果是移动操作
        //         else if (action[0] == ActionType.Move) {
        //         }
        //     }
        // }
    }

    /**
     * 使用二分法查找有序的actionSequence中，actionSequence.version>=version的最小index
     * @param version 
     * @returns 
     */
    getActionIndex(version: number): number {
        let left = 0;
        let right = this.actionSequence.length - 1;
        while (left <= right) {
            let mid = Math.floor((left + right) / 2);
            if (this.actionSequence[mid].version == version) {
                return mid;
            } else if (this.actionSequence[mid].version < version) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return left;
    }

    /**
     * 生成上个版本到此次版本的操作序列
     * @returns [类型1, 操作1, 操作2, 类型2, 操作2...]
     */
    genActionSequence(): Array<any> {
        let ret = [];
        // 遍历target，检查dataIndexMap中是否有对应的下标
        for (let i = 0; i < this.target.length; ++i) {
            // 如果不存在则标记为新插入的
            if (!this.dataIndexMap.has(this.target[i])) {
                ret.push(ActionType.Insert, i);
                this.dataIndexMap.set(this.target[i], i);
            } else if (i != this.dataIndexMap.get(this.target[i])) {
                ret.push(ActionType.Move, this.dataIndexMap.get(this.target[i]), i);
                // 更新下标
                this.dataIndexMap.set(this.target[i], i);
            }
        }
        if (this.dataIndexMap.size > this.target.length) {
            let delRet = [];
            // 遍历dataIndexMap，检查是否有对应的不匹配target
            for (let [obj, index] of this.dataIndexMap) {
                if (index >= this.target.length) {
                    delRet.push(ActionType.Delete, index);
                    this.dataIndexMap.delete(obj);
                } else if (obj != this.target[index]) {
                    delRet.push(ActionType.Delete, index);
                    this.dataIndexMap.delete(obj);
                }
            }
            // 实际操作的时候需要先删除，再插入和移动
            delRet.push(ret);

            // 删没了，直接清空操作序列，收到diff的length可以直接清空
            if (this.dataIndexMap.size == 0) {
                return [ActionType.Clear];
            }

            // TODO: 当出现删除时，可以回溯历史操作进行合并
            return delRet;
        }
        return ret;
    }

    genDiff(fromVersion: number, toVersion: number) {
        if (toVersion < fromVersion) {
            return false;
        }

        // 长度都为0时，不发生变化
        if (this.target.length == 0 && this.data.length == 0) {
            return false;
        }

        let needScan = this.lastCheckVersion < toVersion;
        // 如果不需要扫描，且最终版本小于fromVersion，则直接返回
        if (!needScan && fromVersion > this.lastVersion) {
            return false;
        }

        if (needScan) {
            let actions = this.genActionSequence();
            if (actions.length > 0) {
                // 如果是清空操作
                if (actions[0] == ActionType.Clear) {
                    this.actionSequence = [];
                }
                this.actionSequence.push({
                    version: toVersion,
                    actions: actions
                });
            }
            this.lastCheckVersion = toVersion;
        }

        // 获取从fromVersion到最新的操作序列
        let fromIndex = this.getActionIndex(fromVersion);
        let toIndex = this.actionSequence.length;
        let ret = [];
        for (let i = fromIndex; i <= toIndex; ++i) {
            ret.push(this.actionSequence[i].actions);
        }

        // 遍历生成[下标，Diff, 下标，Diff...]的序列
        let diffRet = [];
        for (let i = 0; i < this.data.length; ++i) {
            let diff = this.data[i].data.genDiff(fromVersion, toVersion);
            if (diff) {
                diffRet.push(i, diff);
            }
        }

        // 如果有diff，则将diff插入到ret的最后
        if (diffRet.length > 0) {
            ret.push(ActionType.Update, diffRet);
        }
    }

    applyDiff(diff: any): void {
        throw new Error("Method not implemented.");
    }
    getVersion(): number {
        throw new Error("Method not implemented.");
    }
}