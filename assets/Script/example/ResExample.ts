import ResLoader from "../res/ResLoader";

const { ccclass, property } = cc._decorator;

@ccclass
export default class NetExample extends cc.Component {
    @property(cc.Node)
    attachNode: cc.Node = null;
    @property(cc.Label)
    dumpLabel: cc.Label = null;

    onLoadRes() {
        cc.loader.loadRes("Prefab/HelloWorld", cc.Prefab, (error: Error, prefab: cc.Prefab) => {
            if (!error) {
                cc.instantiate(prefab).parent = this.attachNode;
            }
        });
    }

    onUnloadRes() {
        this.attachNode.removeAllChildren(true);
        cc.loader.releaseRes("Prefab/HelloWorld");
    }

    onMyLoadRes() {
        ResLoader.getInstance().loadRes("Prefab/HelloWorld", cc.Prefab, (error: Error, prefab: cc.Prefab) => {
            if (!error) {
                cc.instantiate(prefab).parent = this.attachNode;
            }
        });
    }

    onMyUnloadRes() {
        this.attachNode.removeAllChildren(true);
        ResLoader.getInstance().releaseRes("Prefab/HelloWorld");
    }

    onDump() {
        let Loader:any = cc.loader;
        this.dumpLabel.string = `当前资源总数:${Object.keys(Loader._cache).length}`;
    }
}
