import { UIView } from "../../ui/UIView";
import { uiManager } from "../../ui/UIManager";
import { UIID } from "../UIExample";

const {ccclass, property} = cc._decorator;

@ccclass
export default class UILogin extends UIView {

    public onLogin() {
        uiManager.replace(UIID.UIHall);
    }
}
