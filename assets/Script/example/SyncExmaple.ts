import { Component, Label, _decorator, view, director, Node, RichText } from "cc";

const { ccclass, property } = _decorator;

@ccclass
export default class SyncExample extends Component {
    @property(Node)
    leftNode: Node = null!;
    @property(Node)
    rightNode: Node = null!;

    onLoad() {
    }

    onSyncClick() {
    }

    onRotateClick() {
    }

    onPosClick() {
    }

    onScaleClick() {
        
    }

    // update (dt) {}
}
