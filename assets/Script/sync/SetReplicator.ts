import ReplicateMark from "./ReplicateMark";
import { SimpleType, IReplicator, customRandom, isEqual } from "./SyncUtil";

interface SetSimpleVersionInfo {
    version: number;
    actions: SimpleType[];
}

enum SetActionType {
    Add,    // 添加：count, value1, value2, ...
    Delete, // 删除：count, value1, value2, ...
    Clear,  // 清空
}

export class SimpleSetReplicator implements IReplicator {
    private lastVersion: number = 0;
    private lastCheckVersion: number = 0;
    private clone: Set<SimpleType>;
    private target: Set<SimpleType>;
    private actionSequence: SetSimpleVersionInfo[] = [];

    constructor(target: Set<SimpleType>, _mark?: ReplicateMark) {
        this.target = target;
        this.clone = new Set(target);
    }

    getTarget() {
        return this.target;
    }

    setTarget(target: any): void {
        this.target = target;
    }

    /**
     * 生成序列操作
     */
    genSequenceAction(): SimpleType[] {
        let ret: SimpleType[] = [];
        if (this.target.size === 0) {
            ret.push(SetActionType.Clear);
            this.clone.clear();
            return ret;
        }

        // 遍历target，找出需要添加的元素
        let addItems: SimpleType[] = [];
        for (let item of this.target) {
            if (!this.clone.has(item)) {
                addItems.push(item);
                this.clone.add(item);
            }
        }
        if (addItems.length > 0) {
            ret.push(SetActionType.Add, addItems.length, ...addItems);
        }

        // 遍历clone，找出需要删除的元素
        if (this.clone.size > this.target.size) {
            let deleteCount = this.clone.size - this.target.size;
            let deleteItems: SimpleType[] = [];
            for (let item of this.clone) {
                if (!this.target.has(item)) {
                    deleteItems.push(item);
                    this.clone.delete(item);
                    deleteCount--;
                    if (deleteCount === 0) {
                        break;
                    }
                }
            }
            if (deleteItems.length > 0) {
                ret.push(SetActionType.Delete, deleteItems.length, ...deleteItems);
            }
        }
        return ret;
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

    genDiff(fromVersion: number, toVersion: number): any {
        if (toVersion < fromVersion) {
            return false;
        }
        let needScan = this.lastCheckVersion < toVersion;
        if (!needScan && fromVersion > this.lastVersion) {
            return false;
        }
        if (needScan) {
            let actions = this.genSequenceAction();
            this.lastCheckVersion = toVersion;
            if (actions.length > 0) {
                // 如果是清空操作
                if (actions[0] == SetActionType.Clear) {
                    this.actionSequence = [{
                        version: toVersion,
                        actions: actions
                    }];
                    this.lastVersion = toVersion;
                    return actions;
                } else {
                    this.actionSequence.push({
                        version: toVersion,
                        actions: actions
                    });
                }
            }
        }

        // 获取从fromVersion到最新的操作序列，从fromVersion的下一个操作开始
        let fromIndex = 0;
        if (fromVersion > 0) {
            fromIndex = this.getActionIndex(fromVersion + 1);
        }
        let toIndex = this.actionSequence.length;
        let ret = [];
        for (let i = fromIndex; i < toIndex; ++i) {
            ret.push(...this.actionSequence[i].actions);
        }

        if (ret.length === 0) {
            return false;
        }
        this.lastVersion = toVersion;
        return ret;
    }

    applyDiff(diff: any): void {
        if (!(diff instanceof Array)) {
            return;
        }

        // diff的格式为：[SetActionType, count, value1, value2, ...]
        for (let i = 0; i < diff.length;) {
            let actionType = diff[i++];
            switch (actionType) {
                case SetActionType.Add: {
                    let count = diff[i++];
                    for (let j = 0; j < count; ++j) {
                        this.target.add(diff[i++]);
                    }
                    break;
                }
                case SetActionType.Delete: {
                    let count = diff[i++];
                    for (let j = 0; j < count; ++j) {
                        this.target.delete(diff[i++]);
                    }
                    break;
                }
                case SetActionType.Clear: {
                    this.target.clear();
                    break;
                }
            }
        }
    }

    getVersion(): number {
        return this.lastVersion;
    }

    /**
     * 用于调试，检查数据是否正确
     * 不正确则打印错误的数据
     */
    debugCheck() {
        let set1 = new Set(this.target);
        let set2 = new Set(this.clone);
        if (set1.size !== set2.size) {
            console.error("SetReplicator: size not equal");
            console.error(set1);
            console.error(set2);
            return;
        }
        for (let item of set1) {
            if (!set2.has(item)) {
                console.error("SetReplicator: data not equal");
                console.error(set1);
                console.error(set2);
                return;
            }
        }
    }
}

export function TestSimpleSetReplicator() {
    const operationWeights = [4, 2, 1]; // Adjust the weights of operations: [insert, delete, update, swap]

    function getRandomOperationType(operationWeights: number[]) {
        const totalWeight = operationWeights.reduce((a, b) => a + b, 0);
        let randomWeight = customRandom() * totalWeight;
        let operationType = -1;

        for (let i = 0; i < operationWeights.length; i++) {
            randomWeight -= operationWeights[i];
            if (randomWeight < 0) {
                operationType = i;
                break;
            }
        }

        return operationType;
    }

    function performRandomOperations(source: Set<SimpleType>, n: number) {
        let beforStr = Array.from(source).join(', ');
        for (let i = 0; i < n; i++) {
            let operationType = getRandomOperationType(operationWeights);
            switch (operationType) {
                case 0: // insert
                    let item = Math.floor(customRandom() * 1000);
                    source.add(item);
                    console.log(`performRandomOperations: insert 1 item ${item}, length is ${source.size}`);
                    break;
                case 1: // delete
                    if (source.size > 0) {
                        // 随机删除一个元素
                        let index = Math.floor(customRandom() * source.size);
                        let item = [...source][index];
                        source.delete(item);
                        console.log(`performRandomOperations: delete 1 item ${item}, length is ${source.size}`);
                    }
                    break;
                case 2: // clear
                    source.clear();
                    console.log(`performRandomOperations: clear all items, length is ${source.size}`);
                    break;
            }
        }
        // 打印前后对比
        console.log("performRandomOperations befor : " + beforStr);
        console.log("performRandomOperations after : " + Array.from(source).join(', '));
        console.log("perform end ================================================");

    }

    function performTest(
        source: Set<SimpleType>,
        target: Set<SimpleType>,
        replicator: SimpleSetReplicator,
        targetReplicator: SimpleSetReplicator,
        startVersion: number,
        endVersion: number
    ) {
        let diff = replicator.genDiff(startVersion, endVersion);
        console.log(JSON.stringify(diff));
        console.log(Array.from(source).join(', '));
        targetReplicator.applyDiff(diff);

        if (!isEqual(source, target)) {
            console.log(Array.from(target).join(', '));
            console.error("source != target");
        }
    }

    let source: Set<SimpleType> = new Set([1, 2, 3, 4, 5]);
    let target1: Set<SimpleType> = new Set([1, 2, 3, 4, 5]);
    let target2: Set<SimpleType> = new Set([1, 2, 3, 4, 5]);
    let replicator = new SimpleSetReplicator(source);
    let targetReplicator1 = new SimpleSetReplicator(target1);
    let targetReplicator2 = new SimpleSetReplicator(target2);

    let totalVersions = 500;
    let version1 = 0;
    let version2 = 0;

    for (let i = 0; i < totalVersions; i++) {
        console.log(`performTest: version i = ${i} ==========`);
        performRandomOperations(source, Math.floor(customRandom() * 10) + 1);

        let updateFrequency1 = Math.floor(customRandom() * 5) + 1;
        let updateFrequency2 = Math.floor(customRandom() * 5) + 1;

        if (i % updateFrequency1 === 0) {
            console.log(`performTest: version1 = ${version1}, endVersion1 = ${i + 1}************************`);
            performTest(source, target1, replicator, targetReplicator1, version1, i + 1);
            version1 = i + 1;
        }

        if (i % updateFrequency2 === 0) {
            console.log(`performTest: version2 = ${version2}, endVersion2 = ${i + 1}************************`);
            performTest(source, target2, replicator, targetReplicator2, version2, i + 1);
            version2 = i + 1;
        }
    }
}