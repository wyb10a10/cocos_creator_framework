const { ccclass, property } = cc._decorator;
@ccclass
export default class EmptyScene extends cc.Component {
    @property(cc.Label)
    label: cc.Label = null;

    start() {
        let ccloader: any = cc.loader;
        this.label.string = `Current Scene Asset Count ${Object.keys(ccloader._cache).length}`;
    }
}
