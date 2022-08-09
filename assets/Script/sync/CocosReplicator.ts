/**
 * 实现Cocos一些内置类型的Replicator
 */

import { Vec3 } from "cc";
import ReplicateMark from "./ReplicateMark";
import { createReplicator } from "./ReplicatorFactory";
import { IReplicator } from "./SyncUtil";

export class CCVec3Replicator implements IReplicator {
    private data: Vec3;
    private target: Vec3;
    private version: number;

    constructor(target: Vec3) {
        this.target = target;
        this.data = target.clone();
        this.version = 0;
    }

    genDiff(fromVersion: number, toVersion: number): any {
        if (toVersion < fromVersion) {
            return false;
        }
        if(this.target.equals(this.data)) {
            return false;
        }
        this.data.set(this.target);
        this.version = toVersion;
        return [this.target.x, this.target.y, this.target.z];
    }

    applyDiff(diff: any): void {
        if (diff) {
            this.target.set(diff[0], diff[1], diff[2]);
        }
    }

    getVersion(): number {
        return this.version;
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
            let data : any = this.data[i];
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
            if(length < this.target.length) {
                this.target.splice(length, this.target.length - length);
            }
            // 遍历修改或push
            for (let i = 1; i < diff.length; ++i) {
                // 如果需要创建新的对象
                if(i > this.target.length) {
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