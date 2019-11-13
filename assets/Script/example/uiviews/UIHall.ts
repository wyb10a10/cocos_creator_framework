import { UIView } from "../../ui/UIView";
import { uiManager } from "../../ui/UIManager";
import { UIID } from "../UIExample";

const {ccclass, property} = cc._decorator;

@ccclass
export default class UIHall extends UIView {

    public onBag() {
        uiManager.open(UIID.UIBag);
    }

    public onNotice() {
        uiManager.open(UIID.UINotice);
    }

    public onTop(preID: number, item: number) {

    }
}
