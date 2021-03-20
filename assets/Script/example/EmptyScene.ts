import { _decorator, Component, Label, assetManager } from 'cc';
const { ccclass, property } = _decorator;

@ccclass
export default class EmptyScene extends Component {
    @property(Label)
    label: Label | null = null;

    update() {
        if (this.label) {
            this.label.string = `Current Scene Asset Count ${assetManager.assets.count}`;
        }
    }
}
