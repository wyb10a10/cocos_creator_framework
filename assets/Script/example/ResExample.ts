import ResLoader, { resLoader } from "../res/ResLoader";

const { ccclass, property } = cc._decorator;

@ccclass
export default class NetExample extends cc.Component {
    @property(cc.Node)
    attachNode: cc.Node = null;
    @property(cc.Label)
    dumpLabel: cc.Label = null;
    ress: cc.Asset[] = null;
    remoteRes: cc.Asset = null;

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
        this.attachNode.destroyAllChildren();
        cc.loader.releaseRes("prefabDir/HelloWorld");
    }

    onMyLoadRes() {
        ResLoader.loadDir("prefabDir", cc.Prefab, (error: Error, prefabs: cc.Prefab[]) => {
            if (!error) {
                this.ress = prefabs;
                for (let i = 0; i < prefabs.length; ++i) {
                    cc.instantiate(prefabs[i]).parent = this.attachNode;
                }
            }
        });
    }

    onMyUnloadRes() {
        this.attachNode.destroyAllChildren();
        if (this.ress) {
            for(let item of this.ress) {
                ResLoader.release(item);
            }
            this.ress = null;
        }
    }

    onLoadRemote() {
        ResLoader.load("http://tools.itharbors.com/christmas/res/tree.png", (err, res) => {
            if (err || !res) return;
            this.remoteRes = res;
            let spriteFrame = new cc.SpriteFrame(res);
            let node = new cc.Node("tmp");
            let sprite = node.addComponent(cc.Sprite);
            sprite.spriteFrame = spriteFrame;
            node.parent = this.attachNode;
        })
    }

    onUnloadRemote() {
        this.attachNode.destroyAllChildren();
        this.remoteRes.decRef();
    }

    onDump() {
        let Loader:any = cc.loader;
        this.dumpLabel.string = `当前资源总数:${Object.keys(Loader._cache).length}`;
    }
}
