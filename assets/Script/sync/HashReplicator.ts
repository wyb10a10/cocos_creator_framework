import ReplicateMark from "./ReplicateMark";
import { IReplicator, SimpleType } from "./SyncUtil";

/**
 * Hash对象某个版本的数据
 */
interface HashSimpleVersionInfo {
    version: number;
    data: SimpleType;
}

/**
 * SimpleHashReplicator 高效的Hash对象同步器
 * 用于同步number、string、boolean、bigint等基础类型的Hash对象
 */
export class SimpleHashReplicator implements IReplicator {
    /** 最后一个有数据变化的版本号 */
    private lastVersion: number = 0;
    /** 最后一次检测的版本号 */
    private lastCheckVersion: number = 0;
    private data: Map<SimpleType, HashSimpleVersionInfo>;
    private target: Map<SimpleType, SimpleType>;

    constructor(target: Map<SimpleType, SimpleType>, mark?: ReplicateMark) {
        this.target = target;
        this.data = new Map();
        this.makeUpDataMap(target, mark);
    }

    makeUpDataMap(target: Map<SimpleType, SimpleType>, mark?: ReplicateMark) {
        for (let [key, value] of target.entries()) {
            this.data.set(key, { version: 0, data: value });
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
        if (!needScan && fromVersion > this.lastVersion) {
            return false;
        }
        if (needScan) {
            let diff: [SimpleType, SimpleType][] = [];
            for (let [key, value] of this.target.entries()) {
                let oldValue = this.data.get(key);
                if (!oldValue) {
                    this.data.set(key, { version: toVersion, data: value });
                    diff.push([key, value]);
                } else if (oldValue.data !== value) {
                    oldValue.version = toVersion;
                    oldValue.data = value;
                    diff.push([key, value]);
                }
            }
            this.lastCheckVersion = toVersion;
            if (diff.length === 0) {
                return false;
            }
            this.lastVersion = toVersion;
            return diff;
        } else {
            let diff: [SimpleType, SimpleType][] = [];
            for (let [key, value] of this.data.entries()) {
                if (value.version >= fromVersion && value.version <= toVersion) {
                    diff.push([key, value.data]);
                }
            }
            if (diff.length === 0) {
                return false;
            }
            return diff;
        }
    }

    applyDiff(diff: any): void {
        if (diff instanceof Array) {
            for (let [key, value] of diff) {
                this.target.set(key, value);
            }
        }
    }
    getVersion(): number {
        return this.lastVersion;
    }
}

export function testSimpleHashReplicator() {
    const target1 = new Map<string, SimpleType>();
    const replicator1 = new SimpleHashReplicator(target1);

    // 添加操作
    target1.set('a', 1);
    target1.set('b', 'hello');
    target1.set('c', true);
    target1.set('d', 123);

    // 生成版本1的Diff
    const diff1 = replicator1.genDiff(0, 1);
    console.log('diff1:', diff1);

    // 应用版本1的Diff
    const target2 = new Map<string, SimpleType>();
    const replicator2 = new SimpleHashReplicator(target2);
    replicator2.applyDiff(diff1);
    console.log('target2:', target2);

    // 修改操作
    target1.set('a', 2);
    target1.set('b', 'world');
    target1.set('c', false);

    // 删除操作
    target1.delete('d');

    // 生成版本2的Diff
    const diff2 = replicator1.genDiff(1, 2);
    console.log('diff2:', diff2);

    // 应用版本2的Diff
    replicator2.applyDiff(diff2);
    console.log('target2:', target2);

    // 清空操作
    target1.clear();

    // 生成版本3的Diff
    const diff3 = replicator1.genDiff(2, 3);
    console.log('diff3:', diff3);

    // 应用版本3的Diff
    replicator2.applyDiff(diff3);
    console.log('target2:', target2);

    // 生成跨版本的Diff
    const diff4 = replicator1.genDiff(0, 3);
    console.log('diff4:', diff4);

    // 应用跨版本的Diff
    const target3 = new Map<string, SimpleType>();
    const replicator3 = new SimpleHashReplicator(target3);
    replicator3.applyDiff(diff4);
    console.log('target3:', target3);
}
