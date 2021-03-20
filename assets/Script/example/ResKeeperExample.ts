import { assetManager } from "cc";
import { SpriteFrame } from "cc";
import { Sprite } from "cc";
import { director, _decorator, Component, Label, Node, Prefab } from "cc";
import { ResLeakChecker } from "../res/ResLeakChecker";
import { resLoader } from "../res/ResLoader";
import { ResUtil } from "../res/ResUtil";

const { ccclass, property } = _decorator;

@ccclass
export default class NetExample extends Component {
    @property(Boolean)
    resUtilMode = true;
    @property(Node)
    attachNode: Node | null = null;
    @property(Label)
    dumpLabel: Label | null = null;
    checker = new ResLeakChecker();

    start() {
        this.checker.startCheck();
    }

    onAdd() {
        resLoader.load("prefabDir/HelloWorld", Prefab, (error, prefab) => {
            if (!error) {
                let myNode = ResUtil.instantiate(prefab);
                myNode.parent = this.attachNode;
                myNode.setPosition((Math.random() * 500) - 250, myNode.position.y);
                console.log(myNode.position);
            }
        });
    }

    onSub() {
        if (this.attachNode!.children.length > 0) {
            this.attachNode!.children[this.attachNode!.children.length - 1].destroy();
        }
    }

    onAssign() {
        resLoader.load("images/test/spriteFrame", SpriteFrame, (error, sp) => {
            this.checker.traceAsset(sp);
            if (this.attachNode!.children.length > 0) {
                let targetNode = this.attachNode!.children[this.attachNode!.children.length - 1];
                targetNode.getComponent(Sprite)!.spriteFrame = ResUtil.assignWith(sp, targetNode, true);
            }
        });
    }

    onClean() {
        this.attachNode!.destroyAllChildren();
    }

    onDump() {
        this.checker.dump();
        this.dumpLabel!.string = `当前资源总数:${assetManager.assets.count}`;
    }

    onLoadClick() {
        this.checker.reset();
        director.loadScene("example_empty");
    }

    onPreloadClick() {
        director.preloadScene("example_empty");    }
}
