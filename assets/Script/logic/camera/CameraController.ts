import { _decorator, Component, math, Node, v3, CCFloat } from 'cc';
import { ActorMove } from '../actor/ActorMove';
const { ccclass, property } = _decorator;

@ccclass('CameraController')
export class CameraController extends Component {

    @property(Node)
    rotationNode: Node | undefined;

    @property({ type: ActorMove, tooltip: 'Test actor move.' })
    actorMove: ActorMove | undefined;

    @property(CCFloat)
    smoothAngle = 20;

    targetAngle = v3(0, 0, 0);
    currentAngle = v3(0, 0, 0);

    start () {
        this.targetAngle = this.rotationNode!.eulerAngles;
        this.currentAngle = this.targetAngle;

    }

    update (deltaTime: number) {

        this.rotationX(this.actorMove!.angleVertical);

        this.currentAngle.x = math.lerp(this.currentAngle.x, this.targetAngle.x, this.smoothAngle * deltaTime);

        this.rotationNode?.setRotationFromEuler(this.currentAngle);

    }

    rotationX (angleX: number) {

        this.targetAngle.x = angleX;

    }

}

