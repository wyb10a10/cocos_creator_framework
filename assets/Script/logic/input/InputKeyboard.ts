import { _decorator, EventKeyboard, input, Input, KeyCode, game, v3, EventMouse, Component, } from 'cc';
import { Actor } from '../actor/Actor';
import { IActorInput } from '../actor/IActorInput';
const { ccclass, property } = _decorator;


@ccclass('InputKeyboard')
export class InputKeyboard extends Component {

    _dir = v3(0, 0, 0);
    key_count = 0;

    _actor : IActorInput | undefined | null;
    direction_up = 0;
    direction_down = 0;
    direction_left = 0;
    direction_right = 0;

    start () {

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);

        input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
        input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);

        let actor = this.node.parent?.getComponent(Actor);
        this._actor = actor;
        console.log(this._actor);
    }

    onDestroy () {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);

        input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
    }

    hasKey (event: EventKeyboard): boolean {
        return (event.keyCode === KeyCode.KEY_W ||
            event.keyCode === KeyCode.KEY_S ||
            event.keyCode === KeyCode.KEY_A ||
            event.keyCode === KeyCode.KEY_D ||
            event.keyCode === KeyCode.KEY_R
        );
    }

    onKeyDown (event: EventKeyboard) {

        if (!this.hasKey(event)) return;

        this.key_count++;

        if (event.keyCode === KeyCode.KEY_W) this.direction_up = -1;
        if (event.keyCode === KeyCode.KEY_S) this.direction_down = 1;
        if (event.keyCode === KeyCode.KEY_A) this.direction_left = -1;
        if (event.keyCode === KeyCode.KEY_D) this.direction_right = 1;

        if (event.keyCode === KeyCode.KEY_R) this._actor?.onReload();
    }

    onKeyUp (event: EventKeyboard) {

        if (event.keyCode === 0 || this.key_count <= 0) {
            this.clear();
            return;
        }

        if (!this.hasKey(event)) return;

        this.key_count--;

        if (event.keyCode === KeyCode.KEY_W || event.keyCode === KeyCode.ARROW_UP) this.direction_up = 0;
        if (event.keyCode === KeyCode.KEY_S || event.keyCode === KeyCode.ARROW_DOWN) this.direction_down = 0;
        if (event.keyCode === KeyCode.KEY_A || event.keyCode === KeyCode.ARROW_LEFT) this.direction_left = 0;
        if (event.keyCode === KeyCode.KEY_D || event.keyCode === KeyCode.ARROW_RIGHT) this.direction_right = 0;

    }

    onMouseDown (event: EventMouse) {

        if (event.getButton() === 0) {
            this._actor?.onFire();
        }

    }

    onMouseUp (event: EventMouse) {

    }

    onMouseMove (event: EventMouse) {
        const x = event.movementX;
        const y = event.movementY;

        const screenXRate = x / game.canvas!.width;
        const screenYRate = y / game.canvas!.height;

        const rotateX = 360 * screenXRate;
        const rotateY = 180 * screenYRate;

        this._actor?.onRotation(rotateX, rotateY);
    }

    onMove () {
        this._dir.x = this.direction_left + this.direction_right;
        this._dir.z = this.direction_up + this.direction_down;
        this._dir.y = 0;
        this._actor?.onMove(this._dir.normalize());
    }

    clear () {
        this.direction_up = 0;
        this.direction_down = 0;
        this.direction_left = 0;
        this.direction_right = 0;
    }

    update (deltaTime: number) {
        this.onMove();
    }
}

