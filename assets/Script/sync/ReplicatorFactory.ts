import { Vec3, Node } from "cc";
import { ArrayLinkReplicator, ArrayReplicator, SimpleArrayReplicator } from "./ArrayReplicator";
import { CCVec3Replicator } from "./CocosReplicator";
import { ReplicateScanner } from "./DiffScaner";
import { ReplicateTrigger } from "./DiffTrigger";
import ReplicateMark, { ReplicateType, getReplicateMark } from "./ReplicateMark";
import { IReplicator, isSimpleType } from "./SyncUtil";
import { SimpleSetReplicator } from "./SetReplicator";
import { HashReplicator, SimpleHashReplicator } from "./HashReplicator";
import NodeReplicator from "./NodeReplicator";

export function createReplicator(target: any, mark?: ReplicateMark): IReplicator | null {
    // 根据target的类型和mark参数决定创建哪种类型的Replicator
    if (target instanceof Array) {
        if (mark) {
            let objMark = mark.getObjMark();
            if (objMark) {
                if (objMark.Type == ReplicateType.REPLICATE_SIMPLE_ARRAY) {
                    return new SimpleArrayReplicator(target, mark);
                } else if (objMark.Type == ReplicateType.REPLICATE_ARRAY) {
                    return new ArrayReplicator(target, mark);
                } else if (objMark.Type == ReplicateType.REPLICATE_LINK_ARRAY) {
                    return new ArrayLinkReplicator(target, mark);
                }
            }
        }
        if (target.length > 0) {
            if (isSimpleType(target[0])) {
                return new SimpleArrayReplicator(target, mark);
            } else {
                return new ArrayReplicator(target, mark);
            }
        }
        return null;
    } else if (target instanceof Vec3) {
        return new CCVec3Replicator(target);
    } else if (target instanceof Node) {
        return new NodeReplicator(target);
    } else if (target instanceof Set) {
        return new SimpleSetReplicator(target, mark);
    } else if (target instanceof Map) {
        if (mark) {
            let objMark = mark.getObjMark();
            if (objMark) {
                switch (objMark.Type) {
                    case ReplicateType.REPLICATE_SIMPLE_HASH:
                        return new SimpleHashReplicator(target, mark);
                    case ReplicateType.REPLICATE_HASH:
                        return new HashReplicator(target, mark);
                }
            }
        }
        // 如果长度大于0，且第一个元素的value简单类型，则创建SimpleHashReplicator
        if (target.size > 0) {
            let firstValue = target.values().next().value;
            if (isSimpleType(firstValue)) {
                return new SimpleHashReplicator(target, mark);
            } else {
                return new HashReplicator(target, mark);
            }
        }
        return null;
    } else if (target instanceof Object) {
        if (!mark) {
            // 尝试从类的定义中获取ReplicateMark
            mark = getReplicateMark(target.constructor, false);
        }
        if (mark) {
            let objMark = mark.getObjMark();
            if (objMark && objMark.Type == ReplicateType.REPLICATE_TRIGGER) {
                return new ReplicateTrigger(target, mark);
            }
        }
        return new ReplicateScanner(target, mark);
    } else {
        return null;
    }
}