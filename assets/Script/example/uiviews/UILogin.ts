import { UIView } from "../../ui/UIView";
import { uiManager } from "../../ui/UIManager";
import { UIID } from "../UIExample";

const {ccclass, property} = cc._decorator;

@ccclass
export default class UILogin extends UIView {

    public onLogin() {
        // 连续打开2个界面
        uiManager.replace(UIID.UIHall);
        uiManager.open(UIID.UINotice);
    }
}
