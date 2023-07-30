import ReplicateMark from "./ReplicateMark";
import { createReplicator } from "./ReplicatorFactory";
import { Consturctor, IReplicator, SimpleType, customRandom, getConsturctor, isEqual, replicated } from "./SyncUtil";

/**
 * Hash对象某个版本的数据
 */
interface HashSimpleVersionInfo {
    version: number;
    actions: SimpleType[];
}

enum HashActionType {
    Add,    // 添加：count, key1, value1, key2, value2, ...
    Delete, // 删除：count, key1, key2, ...
    Update, // 更新，key1, diff1, key2, diff1, ...
    Clear,  // 清空
}

export class SimpleHashReplicator implements IReplicator {
    private lastVersion: number = 0;
    private lastCheckVersion: number = 0;
    private clone: Map<SimpleType, SimpleType>;
    private target: Map<SimpleType, SimpleType>;
    private actionSequence: HashSimpleVersionInfo[] = [];

    constructor(target: Map<SimpleType, SimpleType>, _mark?: ReplicateMark) {
        this.target = target;
        this.clone = new Map(target);
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
            ret.push(HashActionType.Clear);
            this.clone.clear();
            return ret;
        }

        // 遍历target，找出需要添加的元素
        let addItems: SimpleType[] = [];
        for (let [key, value] of this.target) {
            if (!this.clone.has(key) || this.clone.get(key) !== value) {
                addItems.push(key, value);
                this.clone.set(key, value);
            }
        }
        if (addItems.length > 0) {
            ret.push(HashActionType.Add, addItems.length / 2, ...addItems);
        }

        // 如果长度匹配则直接返回
        if (this.target.size == this.clone.size) {
            return ret;
        }

        // 遍历clone，找出需要删除的元素
        let deleteItems: SimpleType[] = [];
        for (let key of this.clone.keys()) {
            if (!this.target.has(key)) {
                deleteItems.push(key);
                this.clone.delete(key);
            }
        }
        if (deleteItems.length > 0) {
            ret.push(HashActionType.Delete, deleteItems.length, ...deleteItems);
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
                if (actions[0] == HashActionType.Clear) {
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

        // diff的格式为：[MapActionType, count, key1, value1/key2, ...]
        for (let i = 0; i < diff.length;) {
            let actionType = diff[i++];
            switch (actionType) {
                case HashActionType.Add: {
                    let count = diff[i++];
                    for (let j = 0; j < count; ++j) {
                        let key = diff[i++];
                        let value = diff[i++];
                        this.target.set(key, value);
                    }
                    break;
                }
                case HashActionType.Delete: {
                    let count = diff[i++];
                    for (let j = 0; j < count; ++j) {
                        this.target.delete(diff[i++]);
                    }
                    break;
                }
                case HashActionType.Clear: {
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
        if (this.target.size !== this.clone.size) {
            console.error("target.size != clone.size");
            // 把target和clone的key组成数组都打印出来
            let targetKeys = Array.from(this.target.keys());
            let cloneKeys = Array.from(this.clone.keys());
            console.error("targetKeys:", targetKeys);
            console.error("cloneKeys:", cloneKeys);
            return;
        }
        for (let [key, value] of this.target) {
            if (!this.clone.has(key) || this.clone.get(key) !== value) {
                console.error("target has key not in clone, key:", key, "value:", value);
                return;
            }
        }
    }
}

export function TestSimpleHashReplicator() {
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

    function performRandomOperations(source: Map<SimpleType, SimpleType>, n: number) {
        let beforStr = Array.from(source).join(', ');
        for (let i = 0; i < n; i++) {
            let operationType = getRandomOperationType(operationWeights);
            switch (operationType) {
                case 0: // insert
                    let item = Math.floor(customRandom() * 1000);
                    let value = Math.floor(customRandom() * 1000);
                    source.set(item, value);
                    console.log(`performRandomOperations: insert 1 item ${item}, length is ${source.size}`);
                    break;
                case 1: // delete
                    if (source.size > 0) {
                        // 随机删除一个元素
                        let index = Math.floor(customRandom() * source.size);
                        let item = [...source][index];
                        source.delete(item[0]);
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
        source: Map<SimpleType, SimpleType>,
        target: Map<SimpleType, SimpleType>,
        replicator: SimpleHashReplicator,
        targetReplicator: SimpleHashReplicator,
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

    let source: Map<SimpleType, SimpleType> = new Map([[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]]);
    let target1: Map<SimpleType, SimpleType> = new Map([[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]]);
    let target2: Map<SimpleType, SimpleType> = new Map([[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]]);
    let replicator = new SimpleHashReplicator(source);
    let targetReplicator1 = new SimpleHashReplicator(target1);
    let targetReplicator2 = new SimpleHashReplicator(target2);

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

export class HashReplicator<T> implements IReplicator {
    private lastVersion: number = 0;
    private lastCheckVersion: number = 0;
    private clone: Map<SimpleType, [IReplicator, number]>;
    private target: Map<SimpleType, T>;
    private actionSequence: HashSimpleVersionInfo[] = [];
    private ctor: Consturctor<T>;

    constructor(target: Map<SimpleType, T>, mark?: ReplicateMark) {
        this.target = target;
        let objMark = mark?.getObjMark();
        if (objMark?.Constructor) {
            this.ctor = objMark?.Constructor;
        } else {
            // 从target中获取第一个元素的构造函数
            let item = target.values().next();
            this.ctor = getConsturctor(item.value);
        }
        this.clone = new Map();
        this.makeUpCloneData(mark);
    }

    getTarget() {
        return this.target;
    }

    setTarget(target: any): void {
        this.target = target;
    }

    makeUpCloneData(mark?: ReplicateMark) {
        for (let [key, value] of this.target) {
            this.insertData(key, value, this.lastVersion, mark);
        }
    }

    insertData(key: SimpleType, data: T, version: number, mark?: ReplicateMark) {
        let replicator = createReplicator(data, mark);
        if (replicator) {
            this.clone.set(key, [replicator, version]);
        } else {
            console.error("HashReplicator insertData error, data:", data);
        }
    }

    /**
     * 生成序列操作
     */
    genSequenceAction(currentVersion: number): any[] {
        let ret: any[] = [];
        if (this.target.size === 0) {
            ret.push(HashActionType.Clear);
            this.clone.clear();
            return ret;
        }

        // 遍历target，找出需要添加的元素
        let addItems: any[] = [];
        for (let [key, value] of this.target) {
            let item = this.clone.get(key);
            if (!item || item[0] !== value) {
                addItems.push(key);
                this.insertData(key, value, currentVersion);
            }
        }
        if (addItems.length > 0) {
            ret.push(HashActionType.Add, addItems.length, ...addItems);
        }

        // 如果长度匹配则直接返回
        if (this.target.size == this.clone.size) {
            return ret;
        }

        // 遍历clone，找出需要删除的元素
        let deleteItems: any[] = [];
        for (let key of this.clone.keys()) {
            if (!this.target.has(key)) {
                deleteItems.push(key);
                this.clone.delete(key);
            }
        }
        if (deleteItems.length > 0) {
            ret.push(HashActionType.Delete, deleteItems.length, ...deleteItems);
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
            let actions = this.genSequenceAction(toVersion);
            this.lastCheckVersion = toVersion;
            if (actions.length > 0) {
                // 如果是清空操作
                if (actions[0] == HashActionType.Clear) {
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

        // 遍历data生成[Key，Diff, Key，Diff...]的序列
        let diffRet = [];
        for (let [key, value] of this.clone) {
            let from = value[1] > fromVersion ? 0 : fromVersion;
            let diff = value[0].genDiff(from, toVersion);
            if (diff) {
                diffRet.push(key, diff);
            }
        }

        if (diffRet.length > 0) {
            ret.push(HashActionType.Update, ...diffRet);
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

        // diff的格式为：[MapActionType, count, key1, value1/key2, ...]
        for (let i = 0; i < diff.length;) {
            let actionType = diff[i++];
            switch (actionType) {
                case HashActionType.Add: {
                    let count = diff[i++];
                    for (let j = 0; j < count; ++j) {
                        let key = diff[i++];
                        let value = new this.ctor();
                        this.target.set(key, value);
                        this.insertData(key, value, this.lastVersion);
                    }
                    break;
                }
                case HashActionType.Delete: {
                    let count = diff[i++];
                    for (let j = 0; j < count; ++j) {
                        let key = diff[i++];
                        this.target.delete(key);
                        this.clone.delete(key);
                    }
                    break;
                }
                case HashActionType.Clear: {
                    this.target.clear();
                    this.clone.clear();
                    break;
                }
                case HashActionType.Update: {
                    for (; i < diff.length; i += 2) {
                        let key = diff[i];
                        let value = diff[i + 1];
                        let item = this.clone.get(key);
                        if (item) {
                            item[0].applyDiff(value);
                        } else {
                            console.error("HashReplicator applyDiff error, key:", key, "value:", value);
                        }
                    }
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
        if (this.target.size !== this.clone.size) {
            console.error("target.size != clone.size");
            // 把target和clone的key组成数组都打印出来
            let targetKeys = Array.from(this.target.keys());
            let cloneKeys = Array.from(this.clone.keys());
            console.error("targetKeys:", targetKeys);
            console.error("cloneKeys:", cloneKeys);
            return;
        }
        for (let [key, value] of this.target) {
            if (!this.clone.has(key) || this.clone.get(key) !== value) {
                console.error("target has key not in clone, key:", key, "value:", value);
                return;
            }
        }
    }
}

export function TestHashReplicator() {
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
    const operationWeights = [4, 2, 2, 1]; // Adjust the weights of operations: [insert, delete, update, swap]

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

    function performRandomOperations(source: Map<SimpleType, Point>, n: number) {
        let beforStr = Array.from(source).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(',');
        for (let i = 0; i < n; i++) {
            let operationType = getRandomOperationType(operationWeights);
            switch (operationType) {
                case 0: // insert
                    let item = Math.floor(customRandom() * 1000);
                    let value = new Point(Math.floor(customRandom() * 1000), Math.floor(customRandom() * 1000));
                    source.set(item, value);
                    console.log(`performRandomOperations: insert 1 item ${item} - ${JSON.stringify(value)}, length is ${source.size}`);
                    break;
                case 1: // delete
                    if (source.size > 0) {
                        // 随机删除一个元素
                        let index = Math.floor(customRandom() * source.size);
                        let item = [...source][index];
                        source.delete(item[0]);
                        console.log(`performRandomOperations: delete 1 item ${item[0]} - ${JSON.stringify(item[1])}, length is ${source.size}`);
                    }
                    break;
                case 2: // update
                    if (source.size > 0) {
                        // 随机更新一个元素
                        let index = Math.floor(customRandom() * source.size);
                        let item = [...source][index];
                        item[1].x = Math.floor(customRandom() * 1000);
                        item[1].y = Math.floor(customRandom() * 1000);
                        console.log(`performRandomOperations: update 1 item ${item[0]} - ${JSON.stringify(item[1])}, length is ${source.size}`);
                    }
                    break;
                case 3: // clear
                    source.clear();
                    console.log(`performRandomOperations: clear all items, length is ${source.size}`);
                    break;
            }
        }
        // 打印前后对比
        console.log("performRandomOperations befor : " + beforStr);
        console.log("performRandomOperations after : " + Array.from(source).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(','));
        console.log("perform end ================================================");
    }

    function performTest(
        source: Map<SimpleType, Point>,
        target: Map<SimpleType, Point>,
        replicator: HashReplicator<Point>,
        targetReplicator: HashReplicator<Point>,
        startVersion: number,
        endVersion: number
    ) {
        let diff = replicator.genDiff(startVersion, endVersion);
        console.log(JSON.stringify(diff));
        console.log(Array.from(source).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(','))
        targetReplicator.applyDiff(diff);

        if (!isEqual(source, target)) {
            console.log(Array.from(source).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(','))
            console.error("source != target");
        }
    }

    let source: Map<SimpleType, Point> = new Map([[1, new Point(1, 1)], [2, new Point(2, 2)], [3, new Point(3, 3)], [4, new Point(4, 4)], [5, new Point(5, 5)]]);
    let target1 = new Map(source);
    let target2 = new Map(source);
    let replicator = new HashReplicator<Point>(source);
    let targetReplicator1 = new HashReplicator<Point>(target1);
    let targetReplicator2 = new HashReplicator<Point>(target2);

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