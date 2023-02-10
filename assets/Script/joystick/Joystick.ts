import {
    _decorator,
    EventTarget,
    Component,
    Node,
    Enum,
    EventTouch,
    Vec3,
    Vec2,
    Input,
    UIOpacity,
    CCInteger,
    UITransform,
    Size,
} from "cc";
const { ccclass, property } = _decorator;

import { eventInst } from "../fight/InputHelper";

export enum JoystickType {
    FIXED,
    FOLLOW,
}

export interface JoystickData {
    moveDir: Vec3
}

@ccclass("Joystick")
export class Joystick extends Component {
    @property({
        type: Node,
        displayName: "Dot",
        tooltip: "摇杆操纵点",
    })
    dot: Node | null = null;

    @property({
        type: Node,
        displayName: "Ring",
        tooltip: "摇杆背景节点",
    })
    ring: Node | null = null;

    @property({
        type: Enum(JoystickType),
        displayName: "Touch Type",
        tooltip: "触摸类型",
    })
    joystickType = JoystickType.FIXED;

    @property({
        type: Vec3,
        tooltip: "摇杆所在位置",
    })
    _stickPos = new Vec3();

    @property({
        type: Vec2,
        tooltip: "触摸位置",
    })
    _touchLocation = new Vec2();

    @property({
        type: CCInteger,
        displayName: "Ring Radius",
        tooltip: "半径",
    })
    radius = 50;

    onLoad() {
        if (!this.dot) {
            console.log("Joystick Dot is null");
            return;
        }

        if (!this.ring) {
            console.log("Joystick Ring is null");
            return;
        }

        const size = this.radius * 2;
        const ringSize = new Size(size, size);

        this.ring.getComponent(UITransform)?.
            setContentSize(ringSize);

        this.ring.getChildByName("bg")?.
            getComponent(UITransform)?.
            setContentSize(ringSize);


        this._initTouchEvent();

        // 隐藏
        let uiOpacity = this.node.getComponent(UIOpacity);
        if (this.joystickType === JoystickType.FOLLOW && uiOpacity) {
            uiOpacity.opacity = 0
        }
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
        if (!this.ring || !this.dot) {
            return;
        }

        eventInst.emit(Input.EventType.TOUCH_START, event);

        const touchLocation = event.getUILocation();
        const touchPos = new Vec3(touchLocation.x, touchLocation.y);

        if (this.joystickType === JoystickType.FIXED) {
            this._stickPos = this.ring.getPosition();

            const moveVec = touchPos.subtract(this.ring.getPosition());
            const distance = moveVec.length()

            // 触点在圈内
            if (this.radius > distance) {
                this.dot.setPosition(moveVec);
            }
        } else if (this.joystickType === JoystickType.FOLLOW) {
            this._stickPos = touchPos;
            // 展示圆环
            this.node.getComponent(UIOpacity)!.opacity = 255;

            // 设置location
            this._touchLocation = event.getUILocation();

            // 设置摇杆位置，dot相对ring的位置
            this.ring.setPosition(touchPos);
            this.dot.setPosition(new Vec3());
        }
    }

    _touchMoveEvent(event: EventTouch) {
        if (!this.ring || !this.dot) {
            return;
        }

        const location = event.getUILocation();
        // 没有移动
        if (this.joystickType === JoystickType.FOLLOW && this._touchLocation === location) {
            return;
        }

        const touchPos = new Vec3(location.x, location.y);

        //  move vector
        const moveVec = touchPos.subtract(this.ring.getPosition());
        const distance = moveVec.length();

        if (this.radius > distance) {
            this.dot.setPosition(moveVec);
        } else {
            this.dot.setPosition(moveVec.normalize().multiplyScalar(this.radius));
        }

        eventInst.emit(Input.EventType.TOUCH_MOVE, event, {
            moveDir: moveVec.normalize(),
        })
    }

    _touchEndEvent(event: EventTouch) {
        if (!this.dot || !this.ring) return;

        this.dot.setPosition(new Vec3());
        if (this.joystickType === JoystickType.FOLLOW) {
            this.node.getComponent(UIOpacity)!.opacity = 0;
        }

        eventInst.emit(Input.EventType.TOUCH_END, event);
    }
}
