import {
    _decorator,
    EventTarget,
    Component,
    EventTouch,
    Input,
} from "cc";
const { ccclass, property } = _decorator;

export const shootEventInst = new EventTarget()

@ccclass("ShootOp")
export class ShootOp extends Component {

    onLoad() {
        this._initTouchEvent();
    }

    /**
    * 初始化触摸事件
    */
    _initTouchEvent() {
        this.node.on(Input.EventType.TOUCH_START, this._touchStartEvent, this);
        this.node.on(Input.EventType.TOUCH_MOVE, this._touchMoveEvent, this);
        this.node.on(Input.EventType.TOUCH_END, this._touchEndEvent, this);
        this.node.on(Input.EventType.TOUCH_CANCEL, this._touchEndEvent, this);
    }

    _touchStartEvent(event: EventTouch) {
        console.log("start shoot");
        shootEventInst.emit(Input.EventType.TOUCH_START, event);
    }

    _touchMoveEvent(event: EventTouch) {
        console.log("keep shoot");
    }

    _touchEndEvent(event: EventTouch) {
        console.log("keep shoot");
        shootEventInst.emit(Input.EventType.TOUCH_END, event);
    }

}
