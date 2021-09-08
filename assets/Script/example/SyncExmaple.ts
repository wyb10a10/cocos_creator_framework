import { Component, Label, _decorator, view, director, Node, RichText, tween, Tween, math, randomRange, Vec3 } from "cc";
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
        makeObjectReplicated(this.leftNode.scale);
        makeObjectReplicated(this.leftNode.position);
    }

    onSyncClick() {
        let diffScale =  getReplicateObject(this.leftNode.scale).genDiff(this.lastVersion, this.lastVersion + 1);
        let diffPos =  getReplicateObject(this.leftNode.position).genDiff(this.lastVersion, this.lastVersion + 1);
        let diff = {scale : diffScale, position: diffPos};
        applyDiff(diff, this.rightNode);
    }

    onRotateClick() {
        let rot = this.leftNode.getRotation();
        this.leftNode.rotate(rot);
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
