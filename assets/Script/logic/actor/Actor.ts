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

import type { JoystickData } from "../../joystick/Joystick";
import { eventInst } from "../../fight/InputHelper";
import { GunSc } from "../../fight/GunSc";
import { IActorInput } from "./IActorInput";
import { ActorMove } from "./ActorMove";

@ccclass("Actor")
export class Actor extends Component implements IActorInput {

    _actorMove: ActorMove | undefined;

    start() {
        this._actorMove = this.node.getComponent(ActorMove)!;
    }

    onMove(move:Vec3) {
        this._actorMove?.moveDirection(move);
    }

    onRotation(x:number, y:number) {
        if (x > 90) x = 90;
        if (x < -90) x = -90;

        this._actorMove?.onRotation(x, y);
    }

    onDir(x:number, y:number) {

    }

    onFire() {

    }

    onReload() {

    }

    onPick() {

    }

    onDrop() {

    }

    onEquip(index:number) {

    }
    
    update(deltaTime: number) {
    }
}

