/**
 * 实现Cocos一些内置类型的Replicator
 */

import { Vec3 } from "cc";
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

    getTarget() {
        return this.target;
    }

    setTarget(target: any): void {
        if (target instanceof Vec3) {
            this.target = target;
        }
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
