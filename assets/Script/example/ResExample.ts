import { assetManager } from "cc";
import { Sprite } from "cc";
import { SpriteFrame } from "cc";
import { Component, Node, Label, Asset, Prefab, _decorator, instantiate, resources } from "cc";
import ResLoader, { resLoader } from "../res/ResLoader";

const { ccclass, property } = _decorator;

@ccclass
export default class NetExample extends Component {
    @property(Node)
    attachNode: Node | null = null;
    @property(Label)
    dumpLabel: Label | null = null;
    ress: Asset[] | null = null;
    remoteRes: Asset | null = null;

    start() {
    }

    onLoadRes() {
        // 动态加载资源
        resources.load("prefabDir/HelloWorld", Prefab,
            (error, prefab) => {
                if (!error) {
                    instantiate(prefab).parent = this.attachNode;
                }
            });
    }

    onUnloadRes() {
        // 释放动态加载的资源
        this.attachNode!.removeAllChildren();
        resources.release("prefabDir/HelloWorld");
    }

    onMyLoadRes() {
        resLoader.loadDir("prefabDir", Prefab, (error, prefabs) => {
            if (!error) {
                this.ress = prefabs;
                for (let i = 0; i < prefabs.length; ++i) {
                    instantiate(prefabs[i]).parent = this.attachNode;
                }
            }
        });
    }

    onMyUnloadRes() {
        this.attachNode!.removeAllChildren();
        if (this.ress) {
            for (let item of this.ress) {
                item.decRef(true);
            }
            this.ress = null;
        }
    }

    onLoadRemote() {
        resLoader.load("http://tools.itharbors.com/christmas/res/tree.png", (err, res) => {
            if (err || !res) return;
            this.remoteRes = res;
            let spriteFrame = new SpriteFrame();
            spriteFrame.texture = res;
            let node = new Node("tmp");
            let sprite = node.addComponent(Sprite);
            sprite.spriteFrame = spriteFrame;
            node.parent = this.attachNode;
        })
    }

    onUnloadRemote() {
        this.attachNode!.removeAllChildren();
        this.remoteRes!.decRef();
    }

    onDump() {
        this.dumpLabel!.string = `当前资源总数:${assetManager.assets.count}`;
    }
}
