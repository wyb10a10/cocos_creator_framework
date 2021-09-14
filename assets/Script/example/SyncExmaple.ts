import { Component, Label, _decorator, view, director, Node, RichText, tween, Tween, math, randomRange, Vec3, Quat } from "cc";
import { applyDiff, getReplicateObject, makeObjectReplicated } from "../sync/SyncUtil";

const { ccclass, property } = _decorator;

@ccclass
export default class SyncExample extends Component {
    @property(Node)
    leftNode: Node = null!;
    @property(Node)
    rightNode: Node = null!;
    lastVersion = 0;

    onLoad() {
        /*let vec = new Vec3(Vec3.ZERO);
        makeObjectReplicated(vec);
        vec.x = 123;
        let diff =  getReplicateObject(vec).genDiff(this.lastVersion, this.lastVersion + 1);
        console.log(`vec diff ${diff}`);*/
        let syncProperty = ['_scale', '_position', '_eulerAngles'];
        makeObjectReplicated(this.leftNode, { SyncProperty : syncProperty});
    }

    onSyncClick() {
        /*let diffScale =  getReplicateObject(this.leftNode.scale).genDiff(this.lastVersion, this.lastVersion + 1);
        let diffPos =  getReplicateObject(this.leftNode.position).genDiff(this.lastVersion, this.lastVersion + 1);
        let diffRot =  getReplicateObject(this.leftNode.eulerAngles).genDiff(this.lastVersion, this.lastVersion + 1);

        let diff = {scale : diffScale, position: diffPos, eulerAngles: diffRot};*/
        let diff = getReplicateObject(this.leftNode).genDiff(this.lastVersion, this.lastVersion + 1);
        applyDiff(diff, this.rightNode);
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

    // update (dt) {}
}
