import ResLoader, { resLoader } from "../res/ResLoader";

const { ccclass, property } = cc._decorator;

@ccclass
export default class NetExample extends cc.Component {
    @property(cc.Node)
    attachNode: cc.Node = null;
    @property(cc.Label)
    dumpLabel: cc.Label = null;

    start() {
    }

    onLoadRes() {
        cc.loader.loadRes("prefabDir/HelloWorld", cc.Prefab, (error: Error, prefab: cc.Prefab) => {
            if (!error) {
                cc.instantiate(prefab).parent = this.attachNode;
            }
        });
    }

    onUnloadRes() {
        this.attachNode.removeAllChildren(true);
        cc.loader.releaseRes("prefabDir/HelloWorld");
    }

    onMyLoadRes() {
        ResLoader.load("prefabDir", cc.Prefab, (error: Error, prefabs: cc.Prefab[]) => {
            if (!error) {
                for (let i = 0; i < prefabs.length; ++i) {
                    cc.instantiate(prefabs[i]).parent = this.attachNode;
                }
            }
        });
    }

    onMyUnloadRes() {
        this.attachNode.removeAllChildren(true);
        ResLoader.release("prefabDir", cc.Prefab);
    }

    onLoadRemote() {
        ResLoader.load("http://tools.itharbors.com/christmas/res/tree.png", (err, res) => {
            if (err || !res) return;
            let spriteFrame = new cc.SpriteFrame(res);
            let node = new cc.Node("tmp");
            let sprite = node.addComponent(cc.Sprite);
            sprite.spriteFrame = spriteFrame;
            node.parent = this.attachNode;
        })
    }

    onUnloadRemote() {
        this.attachNode.removeAllChildren(true);
        ResLoader.release("http://tools.itharbors.com/christmas/res/tree.png");
    }

    onDump() {
        let Loader:any = cc.loader;
        this.dumpLabel.string = `当前资源总数:${Object.keys(Loader._cache).length}`;
    }
}
