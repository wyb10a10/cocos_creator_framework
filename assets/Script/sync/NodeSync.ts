/* global CC_EDITOR */
import { _decorator, Component, Node, assetManager } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('NodeSync')
@executeInEditMode
export default class NodeSync extends Component {

    @property({ tooltip: "Prefab 资源路径", readonly: true })
    public myStringVar: string = '';

    onLoad() {
        if (CC_EDITOR) {
            this.updatePrefabPath();
        }
        console.log("NodeSync onLoad");
    }

    updatePrefabPath() {
        let uuid = this.node.uuid;
        let asset = assetManager.assets.get(uuid);

        if (asset) {
            let url = asset.nativeUrl;
            this.myStringVar = url;
        } else {
            this.myStringVar = "";
        }
    }
}