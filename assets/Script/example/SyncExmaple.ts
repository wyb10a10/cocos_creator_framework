import { Component, Label, _decorator, view, director, Node, RichText, tween, Tween, math, randomRange, Vec3, Quat, ModelComponent, Color } from "cc";
import { applyDiff, genDiff, getReplicateObject, makeObjectReplicated, replicated, replicatedClass, ReplicatedOption } from "../sync/SyncUtil";

const { ccclass, property } = _decorator;

class A {
    @replicated()
    a: number = 0;
}

@replicatedClass()
class B {
    a : number = 1;
    b : number = 2;
}

@ccclass
export default class SyncExample extends Component {
    @property(Node)
    leftNode: Node = null!;
    @property(Node)
    rightNode: Node = null!;
    lastVersion = 0;

    onLoad() {
        let a = new A();
        a.a = 12;
        let diff = genDiff(a, 0, 1);
        console.log(`${diff}`);

        let b = new B();
        b.a = 12;
        diff = genDiff(b, 0, 1);
        console.log(`${diff}`);

        /*let vec = new Vec3(Vec3.ZERO);
        makeObjectReplicated(vec);
        vec.x = 123;
        let diff =  getReplicateObject(vec).genDiff(this.lastVersion, this.lastVersion + 1);
        console.log(`vec diff ${diff}`);*/
        // 跟踪的属性并不能直接apply，而是需要调用接收者的如setPosition等方法使其生效
        // 这里可以考虑将Node的同步作为一个组件进行挂载，专门负责与Cocos节点相关的同步工作
        // 也可以考虑通过装饰器参数的描述来处理这种情况，比如 { name : _lpos, setter : setPosition, }
        let syncProperty : ReplicatedOption[] = [
            {Name : '_lscale', Setter: 'setScale'}, 
            {Name : '_lpos', Setter: 'setPosition'}, 
            {Name : '_euler', Setter: 'eulerAngles'}];
        makeObjectReplicated(this.leftNode, { SyncProperty : syncProperty});
    }

    onSyncClick() {
        /*let diffScale =  getReplicateObject(this.leftNode.scale).genDiff(this.lastVersion, this.lastVersion + 1);
        let diffPos =  getReplicateObject(this.leftNode.position).genDiff(this.lastVersion, this.lastVersion + 1);
        let diffRot =  getReplicateObject(this.leftNode.eulerAngles).genDiff(this.lastVersion, this.lastVersion + 1);
        let diff = {scale : diffScale, position: diffPos, eulerAngles: diffRot};*/
        let diff = getReplicateObject(this.leftNode).genDiff(this.lastVersion, this.lastVersion + 1);
        if (diff) {
            applyDiff(diff, this.rightNode);
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
