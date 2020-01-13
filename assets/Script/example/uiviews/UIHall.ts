import { UIView } from "../../ui/UIView";
import { uiManager } from "../../ui/UIManager";
import { UIID } from "../UIExample";

const {ccclass, property} = cc._decorator;

@ccclass
export default class UIHall extends UIView {

    @property({type : cc.Sprite})
    weapon: cc.Sprite = null;

    public onBag() {
        uiManager.open(UIID.UIBag);
    }

    public onNotice() {
        uiManager.open(UIID.UINotice);
    }

    public onTop(preID: number, item: cc.SpriteFrame) {
        this.weapon.spriteFrame = item;
    }
}
