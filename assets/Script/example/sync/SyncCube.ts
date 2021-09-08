import { Component, Label, _decorator, view, director, Node, RichText } from "cc";
import { replicated } from "../../sync/SyncUtil";

const { ccclass, property } = _decorator;

@ccclass
export default class SyncCube extends Component {

    @replicated()
    posX = 0;

    onLoad() {
    }

    // update (dt) {}
}
