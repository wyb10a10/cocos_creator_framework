import { Component, _decorator, Node, tween, randomRange, Vec3, ModelComponent, Color } from "cc";
import { getReplicateMark, ReplicatedOption } from "../sync/ReplicateMark";
import { getReplicator } from "../sync/SyncUtil";

const { ccclass, property } = _decorator;

@ccclass
export default class SyncExample extends Component {
    @property(Node)
    leftNode: Node = null!;
    @property(Node)
    rightNode: Node = null!;
    lastVersion = 0;

    onLoad() {
        this.makeObjectReplicated();
    }

    makeObjectReplicated() {
        // 跟踪的属性并不能直接apply，而是需要调用接收者的如setPosition等方法使其生效
        // 这里可以考虑将Node的同步作为一个组件进行挂载，专门负责与Cocos节点相关的同步工作
        // 也可以考虑通过装饰器参数的描述来处理这种情况，比如 { name : _lpos, setter : setPosition, }
        let syncProperty : ReplicatedOption[] = [
            {Name : '_lscale', Setter: 'setScale'}, 
            {Name : '_lpos', Setter: 'setPosition'}, 
            {Name : '_euler', Setter: 'setRotationFromEuler'}];
        //makeObjectReplicated(this.leftNode, { SyncProperty : syncProperty});
        
        let mark = getReplicateMark(this.leftNode, true, { SyncProperty : syncProperty});
        getReplicator(this.leftNode, true, mark);
        getReplicator(this.rightNode, true, mark);
    }

    onSyncClick() {
        let diff = getReplicator(this.leftNode)?.genDiff(this.lastVersion, this.lastVersion + 1);
        if (diff) {
            getReplicator(this.rightNode)?.applyDiff(diff);
            this.lastVersion += 1;
        }
    }

    onRotateClick() {
        tween(this.leftNode)
        .by(3.0, {eulerAngles : new Vec3(0, randomRange(0, 180), 0)})
        .start();
        /*
        // 使用tween旋转四元数会导致拉伸，应该使用欧拉角进行线性旋转
        let rot = this.leftNode.getRotation();
        let out : Quat = new Quat();
        Quat.rotateAroundLocal(out, rot, Vec3.UP, Math.PI * 0.05);
        tween(this.leftNode)
        .to(3.0, {rotation : out })
        .start();*/
    }

    onPosClick() {
        let x = randomRange(-3, 3);
        let y = randomRange(-3, 3);
        let z = randomRange(-3, 3);
        tween(this.leftNode)
        .to(3.0, {position : new Vec3(x, y, z)})
        .start();
    }

    onScaleClick() {
        let scale = randomRange(0.1, 2.5);
        tween(this.leftNode)
        .to(3.0, {scale : new Vec3(scale, scale, scale)})
        .start();
    }

    onColorClick() {
        this.leftNode.getComponent(ModelComponent)?.material?.setProperty("mainColor", Color.BLUE);
    }

    // update (dt) {}
}
