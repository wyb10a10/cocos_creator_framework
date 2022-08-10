import ReplicateMark from "./ReplicateMark";
import { createReplicator } from "./ReplicatorFactory";
import { IReplicator } from "./SyncUtil";

export type SimpleType = number | string | boolean | bigint;

/**
 * 数组对象某个版本的数据
 */
interface ArrayVersionInfo {
    version: number;
    data: SimpleType;
}

export class SimpleArrayReplicator implements IReplicator {
    /** 最后一个有数据变化的版本号 */
    private lastVersion: number = 0;
    /** 最后一次检测的版本号 */
    private lastCheckVersion: number = 0;
    /** 数组长度发生变化的最后一个版本 */
    private lastLengthVersion: number = 0;
    private data: ArrayVersionInfo[];
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

export class ArrayReplicator<T> implements IReplicator {
    private data: Array<any>;
    private target: Array<T>;

    constructor(target: Array<T>, mark?: ReplicateMark) {
        this.target = target;
        this.data = [];
        this.makeUpDataArray(target, mark);
    }

    pushData(data: T, mark?: ReplicateMark) {
        if (data instanceof Object) {
            this.data.push(createReplicator(data, mark));
        } else {
            this.data.push(data);
        }
    }

    makeUpDataArray(target: Array<T>, mark?: ReplicateMark) {
        for (let i = 0; i < target.length; ++i) {
            this.pushData(target[i], mark);
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

        // 先记录长度，再比较数据
        let ret: Array<any> = [this.target.length];
        for (let i = 0; i < this.target.length; i++) {
            // 如果i大于data的长度，表示插入了一个新的对象
            if (i >= this.data.length) {
                this.pushData(this.target[i]);
                // 如果是一个新插入的对象，是否需要添加特殊的标识？方便对端实例化这个新对象
                // continue;
            }
            let data: any = this.data[i];
            if (data instanceof Object && "genDiff" in data) {
                let diff = data.genDiff(fromVersion, toVersion);
                if (diff) {
                    ret.push(i, diff);
                }
            } else if (data != this.target[i]) {
                ret.push(i, this.target[i]);
                this.data[i] = this.target[i];
            }
        }

        // 如果没有差异（ret的长度为1），且长度相同，则返回false
        if (ret.length == 1 && ret[0] == this.data.length) {
            return false;
        }

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
            for (let i = 1; i < diff.length; ++i) {
                // 如果需要创建新的对象
                if (i > this.target.length) {
                    //todo 为提高效率，可以把简单类型和复杂类型区分开
                    //this.target.push(new T());
                }
                this.target.push(...diff);
            }
        }
    }

    getVersion(): number {
        return 0;
    }
}