import { resLoader } from "../res/ResLoader";
import { ResLeakChecker } from "../res/ResLeakChecker";

const { ccclass, property } = cc._decorator;

@ccclass
export default class NetExample extends cc.Component {
    @property(cc.Node)
    attachNode: cc.Node = null;
    @property(cc.Label)
    dumpLabel: cc.Label = null;
    _dirPrefabs: cc.Prefab[] = null;
    _remoteRes: any = null;

    start() {
        let checker = new ResLeakChecker();
        checker.startCheck();
        resLoader.resLeakChecker = checker;
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
        this.attachNode.destroyAllChildren();
        cc.loader.releaseRes("prefabDir/HelloWorld");
    }

    onMyLoadRes() {
        resLoader.loadResDir("prefabDir", cc.Prefab, (error: Error, prefabs: cc.Prefab[]) => {
            if (!error) {
                this._dirPrefabs = prefabs;
                for (let i = 0; i < prefabs.length; ++i) {
                    cc.instantiate(prefabs[i]).parent = this.attachNode;
                }
            }
        });
    }

    onMyUnloadRes() {
        this.attachNode.removeAllChildren(true);
        this.attachNode.destroyAllChildren();
        resLoader.releaseArray(this._dirPrefabs);
    }

    onLoadRemote() {
        resLoader.loadRemoteRes("http://tools.itharbors.com/christmas/res/tree.png", (err, res) => {
            if (err || !res) return;
            this._remoteRes = res;
            let spriteFrame = new cc.SpriteFrame(res);
            let node = new cc.Node("tmp");
            let sprite = node.addComponent(cc.Sprite);
            sprite.spriteFrame = spriteFrame;
            node.parent = this.attachNode;
        })
    }

    onUnloadRemote() {
        this.attachNode.removeAllChildren(true);
        this.attachNode.destroyAllChildren();
        resLoader.releaseAsset(this._remoteRes);
    }

    onDump() {
        let Loader:any = cc.loader;
        this.dumpLabel.string = `当前资源总数:${Object.keys(Loader._cache).length}`;
        resLoader.resLeakChecker.dump();
    }
}
