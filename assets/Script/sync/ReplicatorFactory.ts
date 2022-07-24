import { ReplicateScanner } from "./DiffScaner";
import { ReplicateTrigger } from "./DiffTrigger";
import ReplicateMark, { ReplicateType } from "./ReplicateMark";
import { IReplicator } from "./SyncUtil";

export function createReplicator(target: any, mark?: ReplicateMark) : IReplicator | null{
    // 根据target的类型和mark参数决定创建哪种类型的Replicator
    if (target instanceof Array) {
        // TODO: 数组类型
        return null;
    } else if (target instanceof Object) {
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