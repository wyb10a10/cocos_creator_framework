import { UIView } from "../../ui/UIView";
import { uiManager } from "../../ui/UIManager";
import { UIID } from "../UIExample";
import { _decorator } from "cc";

const {ccclass} = _decorator;

@ccclass
export default class UILogin extends UIView {

    public onLogin() {
        // 连续打开2个界面
        uiManager.replace(UIID.UIHall);
        uiManager.open(UIID.UINotice);
    }
}
