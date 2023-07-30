import { UIConf, uiManager } from "../ui/UIManager";
import { resLoader } from "../res/ResLoader";
import { Component, _decorator } from "cc";

// Learn TypeScript:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/typescript.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html

const { ccclass, property } = _decorator;

export enum UIID {
    UILogin,
    UIHall,
    UINotice,
    UIBag,
}

export let UICF: { [key: number]: UIConf } = {
    [UIID.UILogin]: { prefab: "Prefab/Login" },
    [UIID.UIHall]: { prefab: "Prefab/Hall" },
    [UIID.UINotice]: { prefab: "Prefab/Notice" },
    [UIID.UIBag]: { prefab: "Prefab/Bag", preventTouch: true },
}

@ccclass
export default class UIExample extends Component {

    start() {
        uiManager.initUIConf(UICF);
        uiManager.open(UIID.UILogin);
    }

    // update (dt) {}
}
