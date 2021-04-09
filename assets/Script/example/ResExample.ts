import { assetManager } from "cc";
import { Sprite } from "cc";
import { VideoPlayer } from "cc";
import { sp } from "cc";
import { SpriteFrame } from "cc";
import { Component, Node, Label, Asset, Prefab, _decorator, instantiate, resources } from "cc";
import { resLoader } from "../res/ResLoader";

const { ccclass, property } = _decorator;

@ccclass
export default class NetExample extends Component {
    @property(Node)
    attachNode: Node | null = null;
    @property(Label)
    dumpLabel: Label | null = null;
    ress: Asset[] = [];
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
        this.attachNode!.destroyAllChildren();
        resources.release("prefabDir/HelloWorld");
    }

    onMyLoadRes() {
        if (this.ress.length > 0) {
            console.log(`this.ress.length is ${this.ress.length}`);
            return;
        }
        resLoader.loadDir("prefabDir", Prefab, (error, prefabs) => {
            if (!error) {
                this.ress.push(...prefabs);
                for (let i = 0; i < prefabs.length; ++i) {
                    instantiate(prefabs[i]).parent = this.attachNode;
                }
            }
        });
        resLoader.load("alien/alien-pro", sp.SkeletonData, (err, spineAsset)=> {
            if (!err) {
                let node = new Node();
                node.parent = this.attachNode;
                let skCom = node.addComponent(sp.Skeleton);
                skCom.skeletonData = spineAsset;
                skCom.setAnimation(0, 'run', true);
                this.ress?.push(spineAsset);
            }
        });
    }

    onMyUnloadRes() {
        this.attachNode?.destroyAllChildren();
        if (this.ress.length > 0) {
            for (let item of this.ress) {
                item.decRef(true);
            }
            this.ress = [];
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
        this.attachNode!.destroyAllChildren();
        this.remoteRes!.decRef();
    }

    onDump() {
        this.dumpLabel!.string = `当前资源总数:${assetManager.assets.count}`;
    }
}
