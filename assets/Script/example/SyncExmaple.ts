import { Component, Label, _decorator, view, director, Node, RichText, tween, Tween, math, randomRange, Vec3, Quat, ModelComponent, Color } from "cc";
import { TestArrayLinkReplicator, TestArrayReplicator, TestSimpleArrayReplicator, TestSimpleArrayReplicatorVersion } from "../sync/ArrayReplicator";
import { getReplicateMark, ReplicatedOption } from "../sync/ReplicateMark";
import { getReplicator, replicated, replicatedClass } from "../sync/SyncUtil";

const { ccclass, property } = _decorator;

class A {
    @replicated()
    a: number = 0;
    @replicated()
    b: number = 1;
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
        let b = new B();
        // 先生成第一版初始数据之后才能应用变化
        let replicatorB = getReplicator(b, true);
        b.b = 64;
        let diff1 = getReplicator(a, true)?.genDiff(0, 1);
        console.log(diff1);
        let diff2 = replicatorB?.genDiff(0, 1);
        console.log(diff2);
        //let diff = genDiff(a, 0, 1);
        //console.log(diff);

        this.makeObjectReplicated()

        //TestSimpleArrayReplicator();
        console.log("==============");
        //TestSimpleArrayReplicatorVersion();
        console.log("==============");
        //TestArrayReplicator();
        console.log("==============");
        TestArrayLinkReplicator();
        /*let vec = new Vec3(Vec3.ZERO);
        makeObjectReplicated(vec);
        vec.x = 123;
        let diff =  getReplicateObject(vec).genDiff(this.lastVersion, this.lastVersion + 1);
        console.log(`vec diff ${diff}`);*/
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
