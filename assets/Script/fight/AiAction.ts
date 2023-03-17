
import { _decorator, Component, Vec3, RigidBody} from 'cc';
const { ccclass } = _decorator;

enum STAGE {
    WALKING = 1,
    Rotating = 2,
}

@ccclass('AiAction')
export class AiAction extends Component {


    private _originPos = new Vec3();
    private _targetPos: Vec3 = new Vec3();
    private _targetRotation: Vec3 = new Vec3();
    private _moveDir: Vec3 = new Vec3();
    private _distance: number = 0;
    private _moveSpeed: number = 1;

    // 加载的时候进行初始化
    onLoad() {
        this._originPos = this.node.position;
        this.updateTargetPos();
    }

    standardAngle(angle: number): number {
        angle = angle < 0 ? angle + 360 : angle > 360 ? angle - 360 : angle;
        return angle;
    }

    calcAngleY(moveDir: Vec3) {
        let angleY = Math.round(Math.atan2(moveDir.x, moveDir.z) * 180 / Math.PI);
        angleY = this.standardAngle(angleY)
        return angleY
    }

    getNextTargetPos() {
        let angle = Math.random() * 360;
        let len = Math.random() * 2 + 1;
        return this._originPos.clone().add(new Vec3(len * Math.sin(angle), 0, len * Math.cos(angle)))
    }

    updateTargetPos() {
        this._targetPos = this.getNextTargetPos();
        let movDir = this._targetPos.clone();
        movDir = movDir.subtract(this.node.position).normalize();
        movDir.y = 0;
        this._moveDir = movDir;
        this._targetRotation.y = this.calcAngleY(movDir);
        this._distance = this._targetPos.clone().subtract(this.node.position).length()
    }

    // 目前人物行为，只包含移动。这里先旋转完之后，在移动
    update(deltaTime: number) {
        let curRotation = this.node.eulerAngles.clone();
        curRotation.y = this.standardAngle(curRotation.y);
        if (!Vec3.equals(curRotation, this._targetRotation, 0.01)) {
            Vec3.lerp(curRotation, curRotation, this._targetRotation, 1.0 / 6);
            curRotation.y = this.standardAngle(curRotation.y);
            this.node!.eulerAngles = curRotation;
            return;
        }

        // 已移动到目的地
        if (this._distance <= 0.01) {
            this.node.getComponent(RigidBody)?.clearVelocity();
            this.updateTargetPos();
            return;
        }

        let moveLen = this._moveSpeed * deltaTime;
        if (moveLen > this._distance) {
            moveLen = this._distance;
        }
        this._distance -= moveLen;
        /*
        const newPos = oldPos?.add(
            this._moveDir.clone().multiplyScalar(moveLen)
        );
        this.node.setPosition(newPos);
        */
        let curSpeed = new Vec3(this._moveSpeed * (this._moveDir.x / 1.0), 0, this._moveSpeed * (this._moveDir.z / 1.0));
        this.node.getComponent(RigidBody)?.setLinearVelocity(curSpeed);
    }
}
