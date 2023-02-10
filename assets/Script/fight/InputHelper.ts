import { _decorator, Component, input, Input, EventKeyboard, KeyCode, EventTarget } from 'cc';
const { ccclass } = _decorator;

export const eventInst = new EventTarget();

@ccclass("InputHelper")
export class InputHelper extends Component {

    onLoad () {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    onDestroy () {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    onKeyDown (event: EventKeyboard) {
        switch(event.keyCode) {
            case KeyCode.KEY_J:
                eventInst.emit("shooting", Input.EventType.KEY_DOWN)
                break;
        }
    }

    onKeyUp (event: EventKeyboard) {
        switch(event.keyCode) {
            case KeyCode.KEY_J:
                eventInst.emit("shooting", Input.EventType.KEY_UP)
                break;
        }
    }
}