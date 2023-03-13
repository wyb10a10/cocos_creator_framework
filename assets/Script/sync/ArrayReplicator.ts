import ReplicateMark from "./ReplicateMark";
import { createReplicator } from "./ReplicatorFactory";
import { Consturctor, getConsturctor, IReplicator, replicated } from "./SyncUtil";

export type SimpleType = number | string | boolean | bigint;

export function isSimpleType(obj: any): boolean {
    return typeof obj === "number" || typeof obj === "string" || typeof obj === "boolean" || typeof obj === "bigint";
}

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
            for (let i = 0; i < this.target.length; i++) {
                if (this.data.length <= i) {
                    this.data.push({ version: toVersion, data: this.target[i] });
                    diff.push(i, this.target[i]);
                } else if (this.data[i].data != this.target[i]) {
                    this.data[i].version = toVersion;
                    this.data[i].data = this.target[i];
                    diff.push(i, this.target[i]);
                } else if (this.data[i].version >= fromVersion && this.data[i].version <= toVersion) {
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

/**
 * 测试SimpleArrayReplicator的diff生成与应用
 */
export function TestSimpleArrayReplicator() {
    let source: number[] = [1, 2, 3, 4, 5];
    let sourceRp = new SimpleArrayReplicator(source);
    let target: number[] = [1, 2, 3, 4, 5];
    let targetRp = new SimpleArrayReplicator(target);

    source.push(6);
    source.push(7);
    source.splice(1, 0, 8);
    source.splice(3, 1);
    // swap source[3] and source[4]
    let temp = source[3];
    source[3] = source[4];
    source[4] = temp;

    let diff = sourceRp.genDiff(0, 1);
    console.log(diff);
    targetRp.applyDiff(diff);
    console.log(source);
    console.log(target);
}

export function TestSimpleArrayReplicatorVersion() {
    let source: number[] = [];
    let sourceRp = new SimpleArrayReplicator(source);
    let target1: number[] = [];
    let targetRp1 = new SimpleArrayReplicator(target1);
    let target2: number[] = [];
    let targetRp2 = new SimpleArrayReplicator(target2);

    source.push(1, 3, 5);
    let diff1 = sourceRp.genDiff(0, 1);
    console.log(diff1);
    targetRp1.applyDiff(diff1);
    console.log(source);
    console.log(target1);

    source.push(2, 4, 6);
    source.splice(0, 0, 1);
    let diff2 = sourceRp.genDiff(1, 2);
    console.log(diff2);
    targetRp1.applyDiff(diff2);
    console.log(source);
    console.log(target1);

    source.splice(0, 1);
    source.push(7, 8, 9);
    let diff3 = sourceRp.genDiff(0, 3);
    console.log(diff3);
    targetRp2.applyDiff(diff3);
    console.log(source);
    console.log(target2);

    let diff4 = sourceRp.genDiff(2, 3);
    console.log(diff4);
    targetRp1.applyDiff(diff4);
    console.log(target1);
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
export class ArrayReplicator<T> implements IReplicator {
    private data: ArrayObjectVersionInfo[];
    private target: Array<T>;
    private lastVersion: number = 0;
    private lastCheckVersion: number = 0;
    private ctor: Consturctor<T>;

    constructor(target: Array<T>, mark?: ReplicateMark) {
        let objMark = mark?.getObjMark();
        if (objMark?.Constructor) {
            this.ctor = objMark?.Constructor;
        } else {
            // 如果没有指定Constructor，则target数组不得为空
            this.ctor = getConsturctor(target[0]);
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
                    if (data.getTarget() != this.target[i]) {
                        data.setTarget(this.target[i]);
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

export function TestArrayReplicator() {
    class Point {
        @replicated()
        x: number = 0;
        @replicated()
        y: number = 0;
        constructor(x: any = 0, y: any = 0) {
            this.x = x;
            this.y = y;
        }
    }

    let source: Array<Point> = [new Point(1, 2), new Point(3, 4)];
    let replicator = new ArrayReplicator(source);
    let target: Array<Point> = [new Point(1, 2), new Point(3, 4)];
    let targetReplicator = new ArrayReplicator(target);
    source.push(new Point(5, 6));
    source.push(new Point(7, 8));
    source[0].x = 10;
    source[1].y = 20;
    console.log(source);
    let diff = replicator.genDiff(0, 1);
    console.log(diff);
    targetReplicator.applyDiff(diff);
    console.log(target);

    source.splice(1, 2);
    diff = replicator.genDiff(1, 2);
    console.log(diff);
    targetReplicator.applyDiff(diff);
    console.log(source);
    console.log(target);

    let target2: Array<Point> = [new Point(1, 2), new Point(3, 4)];
    let targetReplicator2 = new ArrayReplicator(target2);
    diff = replicator.genDiff(0, 2);
    console.log(diff);
    targetReplicator2.applyDiff(diff);
    console.log(source);
    console.log(target2);
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

interface SwapInfo {
    targetIndex: number,
    sourceIndex: number,
    sourceData?: ArrayObjectVersionInfo
}

function fillSwapInfo(map: Map<any, SwapInfo>, source: any, target: any, sourceData: ArrayObjectVersionInfo, index: number) {
    let sourceSwapInfo = map.get(source);
    if (!sourceSwapInfo) {
        sourceSwapInfo = {
            targetIndex: -1,
            sourceIndex: index,
            sourceData: sourceData
        };
        map.set(source, sourceSwapInfo);
    } else {
        sourceSwapInfo.sourceIndex = index;
    }

    let targetSwapInfo = map.get(target);
    if (!targetSwapInfo) {
        targetSwapInfo = {
            targetIndex: index,
            sourceIndex: -1,
        };
        map.set(target, targetSwapInfo);
    } else {
        targetSwapInfo.targetIndex = index;
    }
}

export class ArrayLinkReplicator<T> implements IReplicator {
    private data: Array<ArrayObjectVersionInfo>;
    private dataIndexMap: Map<T, number>;
    private target: Array<T>;
    private actionSequence: Array<ArrayActionInfo> = [];
    private lastVersion: number = 0;
    private lastCheckVersion: number = 0;
    private ctor: Consturctor<T>;

    constructor(target: Array<T>, mark?: ReplicateMark) {
        let objMark = mark?.getObjMark();
        if (objMark?.Constructor) {
            this.ctor = objMark?.Constructor;
        } else {
            // 如果没有指定Constructor，则target数组不得为空
            this.ctor = getConsturctor(target[0]);
        }
        this.target = target;
        this.data = [];
        this.dataIndexMap = new Map();
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
                version: version,
                data: replicator,
                index: this.data.length
            });
        } else {
            console.error("ArrayReplicator.pushData createReplicator error:", data);
        }
    }

    insertData(data: T, index: number, version: number, mark?: ReplicateMark) {
        let replicator = createReplicator(data, mark);
        if (replicator) {
            this.data.splice(index, 0, {
                version: version,
                data: replicator,
                index: index
            });
        } else {
            console.error("ArrayReplicator.insertData createReplicator error:", data);
        }
    }

    makeUpDataArray(target: Array<T>, mark?: ReplicateMark) {
        for (let i = 0; i < target.length; ++i) {
            this.pushData(target[i], this.lastVersion, mark);
        }
    }

    /**
     * 清理具体某个版本的操作序列，actions是操作序列，包含了插入、删除、移动3种情况，格式如下：
     * 插入和删除操作的格式为：[action, index]，其中action是操作类型，index是操作的位置
     * 移动操作序列的格式为：[action, index, to]，其中action是操作类型，index是操作的位置，to是移动的目标位置
     * 当delIndex在当前的操作序列中匹配到插入操作时，则删除这个操作，返回-1表示结束
     * 当delIndex在当前的操作序列中匹配到移动操作的to位置时，for循环结束后，应该修改为该移动操作的index位置
     * @param delIndex 
     * @param actions 
     * @returns 新下标
     */
    clearActionSequence(delIndex: number, actions: number[]): number {
        let insertIndex = -1;
        let beforeMoveIndex = -1;
        for (let i = 0; i < actions.length; ++i) {
            let action = actions[i];
            let index1 = actions[i + 1];

            // 如果是插入操作，且插入的位置是要删除的位置，则删除这个插入操作
            if (ActionType.Insert == action && index1 == delIndex) {
                insertIndex = i;
            }

            ++i;
            if (index1 > delIndex) {
                actions[i] = index1 - 1;
            }

            if (ActionType.Move == action) {
                ++i;
                let index2 = actions[i];
                if (index2 > delIndex) {
                    actions[i] = index2 - 1;
                } else if (index2 == delIndex) {
                    beforeMoveIndex = index1;
                }
            }
        }

        if (insertIndex >= 0) {
            actions.splice(insertIndex, 2);
            return -1;
        }

        if (beforeMoveIndex >= 0) {
            return beforeMoveIndex;
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
        // 先检测插入和删除操作，如果执行完插入和删除，下标不一致的，才需要进行移动操作
        let ret = [];

        let hasChange = false;
        // 遍历target，检查dataIndexMap中是否有对应target的下标
        for (let i = 0; i < this.target.length; ++i) {
            // 如果不存在则标记为新插入的
            if (!this.dataIndexMap.has(this.target[i])) {
                ret.push(ActionType.Insert, i);
                this.dataIndexMap.set(this.target[i], i);
                hasChange = true;
                // 并插入到data中，这里的i就是最终下标，先不insertData，因为删除操作未执行
                // this.insertData(this.target[i], i, this.lastVersion);
            } else if (!hasChange && this.dataIndexMap.get(this.target[i]) != i) {
                hasChange = true;
            }
        }

        // 删没了，直接清空操作序列，收到diff的length可以直接清空
        if (this.target.length == 0) {
            return [ActionType.Clear];
        }

        // 没有变化就直接返回
        if (!hasChange) {
            return ret;
        }

        // 如果有删除操作，先应用删除操作
        let delCnt = this.dataIndexMap.size - this.target.length;
        let delRet = [];
        if (delCnt > 0) {
            let tmpTargetMap = new Map<T, number>();
            for (let i = 0; i < this.target.length; ++i) {
                tmpTargetMap.set(this.target[i], i);
            }

            // 逆序遍历data，如果dataIndexMap中不存在，则删除
            for (let i = this.data.length - 1; i >= 0; --i) {
                let target = this.data[i].data.getTarget();
                if (!tmpTargetMap.has(target)) {
                    delRet.push(ActionType.Delete, i);
                    this.dataIndexMap.delete(target);
                    this.data.splice(i, 1);

                    if (--delCnt == 0) {
                        break;
                    }
                }
            }
        }

        // 如果有插入操作，先应用插入操作
        for (let i = 0; i < ret.length; i += 2) {
            if (ret[i] == ActionType.Insert) {
                this.insertData(this.target[ret[i + 1]], ret[i + 1], this.lastVersion);
            }
        }

        // 需要先删除，再插入
        if (delRet.length > 0) {
            ret = delRet.concat(ret);
        }

        // 断言，this.data的长度和this.target的长度一致
        if (this.data.length != this.target.length) {
            console.error("this.data.length != this.target.length");
        }

        // 最后检测移动操作，移动操作都是成对出现的——交换(连续交换)
        let swapMap = new Map<any, SwapInfo>();
        for (let i = 0; i < this.data.length; ++i) {
            let target = this.data[i].data.getTarget();
            // 例如下标1和2交换，2和3又交换
            // target:  [1, 2, 3]
            // data:    [2, 3, 1]
            // 如果直接执行两两交换，先前交换的下标会影响后续的交换
            if (this.target[i] != target) {
                fillSwapInfo(swapMap, target, this.target[i], this.data[i], i);
            }
        }

        // 遍历swapMap，应用交换
        for (let [key, value] of swapMap) {
            if (value.sourceData) {
                this.data[value.targetIndex] = value.sourceData;
            }
            this.dataIndexMap.set(key, value.targetIndex);
            ret.push(ActionType.Move, value.sourceIndex, value.targetIndex);
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
                    this.actionSequence = [{
                        version: toVersion,
                        actions: actions
                    }];
                    return actions;
                } else {
                    this.actionSequence.push({
                        version: toVersion,
                        actions: actions
                    });
                }
            }
            this.lastCheckVersion = toVersion;
        }

        // 获取从fromVersion到最新的操作序列
        let fromIndex = this.getActionIndex(fromVersion);
        let toIndex = this.actionSequence.length;
        let ret = [];
        for (let i = fromIndex; i < toIndex; ++i) {
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
        if (!(diff instanceof Array)) {
            return;
        }

        for (let i = 0; i < diff.length; ++i) {
            let action = diff[i];
            if (action == ActionType.Insert) {
                let target = new this.ctor();
                ++i;
                this.target.splice(diff[i], 0, target);
                this.insertData(target, diff[i], this.lastVersion);
            } else if (action == ActionType.Delete) {
                ++i;
                this.data.splice(diff[i], 1);
                this.target.splice(diff[i], 1);
            } else if (action == ActionType.Move) {
                let tmp = this.data[diff[i + 1]];
                this.data[diff[i + 1]] = this.data[diff[i + 2]];
                this.data[diff[i + 2]] = tmp;
                let tmp2 = this.target[diff[i + 1]];
                this.target[diff[i + 1]] = this.target[diff[i + 2]];
                this.target[diff[i + 2]] = tmp2;
                i += 2;
            } else if (action == ActionType.Update) {
                this.data[diff[i + 1]].data.applyDiff(diff[i + 2]);
                i += 2;
            } else if (action == ActionType.Clear) {
                this.target = [];
                this.data = [];
            }
        }
    }

    getVersion(): number {
        return this.lastVersion;
    }
}

export function TestArrayLinkReplicator() {
    class Point {
        @replicated()
        x: number = 0;
        @replicated()
        y: number = 0;
        constructor(x: any = 0, y: any = 0) {
            this.x = x;
            this.y = y;
        }
    }

    let source: Array<Point> = [new Point(1, 2), new Point(3, 4)];
    let replicator = new ArrayLinkReplicator(source);
    let target: Array<Point> = [new Point(1, 2), new Point(3, 4)];
    let targetReplicator = new ArrayLinkReplicator(target);
    source.push(new Point(5, 6));
    source.push(new Point(7, 8));
    source[0].x = 10;
    source[1].y = 20;
    console.log(source);
    let diff = replicator.genDiff(0, 1);
    console.log(diff);
    targetReplicator.applyDiff(diff);
    console.log(target);

    source.splice(1, 2);
    diff = replicator.genDiff(1, 2);
    console.log(diff);
    targetReplicator.applyDiff(diff);
    console.log(source);
    console.log(target);

    let target2: Array<Point> = [new Point(1, 2), new Point(3, 4)];
    let targetReplicator2 = new ArrayLinkReplicator(target2);
    diff = replicator.genDiff(0, 2);
    console.log(diff);
    targetReplicator2.applyDiff(diff);
    console.log(source);
    console.log(target2);
}