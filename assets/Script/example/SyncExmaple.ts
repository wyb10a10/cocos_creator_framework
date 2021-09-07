import { Component, Label, _decorator, view, director, Node, RichText, tween, Tween, math, randomRange, Vec3 } from "cc";

const { ccclass, property } = _decorator;

@ccclass
export default class SyncExample extends Component {
    @property(Node)
    leftNode: Node = null!;
    @property(Node)
    rightNode: Node = null!;

    onLoad() {
    }

    onSyncClick() {
    }

    onRotateClick() {
        let rot = this.leftNode.getRotation();
        this.leftNode.rotate(rot);
    }

    onPosClick() {
        let x = randomRange(-5, 5);
        let y = randomRange(-5, 5);
        let z = randomRange(-5, 5);
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
