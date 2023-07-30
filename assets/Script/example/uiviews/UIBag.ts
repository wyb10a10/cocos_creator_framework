import { UIView } from "../../ui/UIView";
import { uiManager } from "../../ui/UIManager";
import { _decorator } from "cc";
import { SpriteFrame } from "cc";
import { Sprite, Node } from "cc";

// Learn TypeScript:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/typescript.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html

const {ccclass, property} = _decorator;

@ccclass
export default class UIBag extends UIView {
    private selectItem: SpriteFrame | null= null;
    private selectNode: Node | null = null;
    
    public init() {

    }

    public onClick(event : any) {
        if (this.selectNode) {
            this.selectNode.setScale(1, 1, 1);
        }

        let node : Node = event.target;
        this.selectNode = node;
        this.selectNode.setScale(1.5, 1.5, 1.5);

        let sprite = node.getComponent(Sprite);
        this.selectItem = sprite!.spriteFrame;
    }

    public onOkClick() {
        uiManager.close();
    }

    public onClose(): any {
        return this.selectItem;
    }
}
