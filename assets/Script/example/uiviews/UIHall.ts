import { UIView } from "../../ui/UIView";
import { uiManager } from "../../ui/UIManager";
import { UIID } from "../UIExample";
import { Sprite, _decorator } from "cc";
import { SpriteFrame } from "cc";

const {ccclass, property} = _decorator;

@ccclass
export default class UIHall extends UIView {

    @property({type : Sprite})
    weapon: Sprite | null = null;

    public onBag() {
        uiManager.open(UIID.UIBag);
    }

    public onNotice() {
        uiManager.open(UIID.UINotice);
    }

    public onTop(preID: number, item: SpriteFrame) {
        this.weapon!.spriteFrame = item;
    }
}
