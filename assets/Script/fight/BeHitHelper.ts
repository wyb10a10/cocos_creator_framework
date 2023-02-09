
import { _decorator, Component, Vec3, RigidBody} from 'cc';
const { ccclass } = _decorator;

@ccclass('BeHitHelper')
export class BeHitHelper extends Component {

    
    update(deltaTime: number) {

    }

    beHit() {
        this.node.destroy();
    }
}
