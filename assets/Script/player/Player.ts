import {
    _decorator,
    Component,
    CCInteger,
    EventTouch,
    Input,
    Vec3,
    Animation,
    Node,
    RigidBody,
} from "cc";
const { ccclass, property } = _decorator;

import { eventInst } from "../joystick/Joystick";
import type { JoystickData } from "../joystick/Joystick";
import { shootEventInst } from "../fight/ShootOp";
import { GunSc } from "../fight/GunSc";

@ccclass("Player")
export class Player extends Component {
    @property({
        type: RigidBody,
        displayName: "rigidbody",
        tooltip: "刚体"
    })
    rigidBody: RigidBody | null = null;

    @property({
        type: Vec3,
        displayName: "Move Dir",
        tooltip: "移动方向",
    })
    moveDir = new Vec3(0, 0, 0);

    @property({
        type: CCInteger,
        tooltip: "移动速度",
    })
    moveSpeed = 100;

    @property({
        type: Node,
        displayName: "player",
        tooltip: "人物对象",
    })
    player: Node | null = null;

    @property({
        type: Node,
        displayName: "Gun",
        tooltip: "人物对象",
    })
    gun: Node | null = null;

    @property({
        type: CCInteger,
    })
    _moveSpeed = 0;

    // 射击状态
    _isShooting = false;

    // 视角控制
    _oriRotation: Vec3 = new Vec3(0, 0, 0);
    _curRotation: Vec3 = new Vec3(0, 0, 0);
    _targetRotation: Vec3 = new Vec3(0, 0, 0);

    // 动画插件
    _animationComponent: Animation | null = null;

    onLoad() {
        eventInst.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        eventInst.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        eventInst.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);

        shootEventInst.on(Input.EventType.TOUCH_START, this.startShooting, this)
        shootEventInst.on(Input.EventType.TOUCH_END, this.stopShooting, this)

        this._animationComponent = this.player!.getComponent(Animation);
    }

    onTouchStart() {
    }

    onTouchMove(event: EventTouch, data: JoystickData) {
        if (this._moveSpeed === 0) {
            this._animationComponent!.play("walk");
        }
        this._moveSpeed = this.moveSpeed;
        const curMoveDir = new Vec3(-data.moveDir.y, data.moveDir.z, -data.moveDir.x);
        this.moveDir = curMoveDir;
    }

    onTouchEnd(event: EventTouch, data: JoystickData) {
        this._animationComponent?.crossFade("idle");
        this._moveSpeed = 0;
        this.rigidBody?.clearVelocity();
    }

    startShooting() {
        this._isShooting = true;
    }

    stopShooting() {
        this._isShooting = false;
    }

    move(deltaTime: number) {

        // 如果视角不一样，旋转
        if (!Vec3.equals(this._curRotation, this._targetRotation, 0.01)) {
            Vec3.lerp(this._curRotation, this._curRotation, this._targetRotation, 1.0 / 6);
            this._curRotation.y = this._curRotation.y < 0 ? this._curRotation.y + 360 : this._curRotation.y > 360 ? this._curRotation.y - 360 : this._curRotation.y;
            this.player!.eulerAngles = this._curRotation;
        }

        let angleY = Math.round(Math.atan2(this.moveDir.x, this.moveDir.z) * 180 / Math.PI);
        this._targetRotation.y = this._oriRotation.y + angleY;
        this._targetRotation.y = this._targetRotation.y < 0 ? this._targetRotation.y + 360 : this._targetRotation.y > 360 ? this._targetRotation.y - 360 : this._targetRotation.y;

        if (Math.abs(this._targetRotation.y - this._curRotation.y) > 180) {
            if (this._targetRotation.y > this._curRotation.y) {
                this._targetRotation.y -= 360;
            } else {
                this._targetRotation.y += 360;
            }
        }

        let curSpeed = new Vec3(this._moveSpeed * Math.sin(this.moveDir.x / 1.0), 0, this._moveSpeed * Math.sin(this.moveDir.z / 1.0));
        /*
        const oldPos = this.node.getPosition();
        const newPos = oldPos?.add(
            this.moveDir.clone().multiplyScalar(this._moveSpeed * deltaTime)
        );
        this.node.setPosition(newPos);
        console.log(newPos);
        */
       this.rigidBody?.setLinearVelocity(curSpeed);
        
    }

    update(deltaTime: number) {
        if (this._moveSpeed !== 0 && this.player !== null) {
            this.move(deltaTime);
        }
       if (this._isShooting) {
            let gunSc = this.gun?.getComponent(GunSc);
            gunSc?.shot();
       }
    }
}

