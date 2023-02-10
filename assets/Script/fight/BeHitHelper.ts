
import { _decorator, Component, Vec3, RigidBody} from 'cc';
const { ccclass } = _decorator;

@ccclass('BeHitHelper')
export class BeHitHelper extends Component {

    
    private alive: number = 1;
    private delayDestoryTime: number = 0.2;

    update(deltaTime: number) {
        if (!this.alive) {
            if (this.delayDestoryTime <= 0) {
                this.node.destroy();
            } else {
                this.delayDestoryTime -= deltaTime;
            }
        }
    }

    beHit() {
        this.alive = 0;
    }
}
