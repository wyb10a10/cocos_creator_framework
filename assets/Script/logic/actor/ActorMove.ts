import { _decorator, Component, math, Node, RigidBody, v3, Vec3, CCFloat } from 'cc';
const { ccclass, property } = _decorator;

let tempRotationSideVector = v3(0, 0, 0);

@ccclass('ActorMove')
export class ActorMove extends Component {

    @property({ type: CCFloat, tooltip: 'Move Speed. ' })
    speed = 1;

    smoothMove = 5;

    angleVertical = 0;

    velocity = v3(0, 0, 0);
    velocityLocal = v3(0, 0, 0);
    currentVelocity: Vec3 = v3(0, 0, 0);
    moveVec3 = new Vec3(0, 0, 0);

    currentDirection = v3(0, 0, 0);
    direction = v3(0, 0, 0);
    angleHead = 0;

    rigid: RigidBody | undefined;

    @property
    angleVerticalMax = 30;

    @property
    angleVerticalMin = -30;

    @property
    faceMove = true;

    angle = 0;

    isStopMove = false;

    start () {
        this.rigid = this.node.getComponent(RigidBody)!;
        this.node.setRotationFromEuler(0, 180, 0);
        this.onRotation(180, 0);
    }

    lateUpdate (deltaTime: number) {
        if (this.isStopMove) return;
        this.movePosition(deltaTime);
        this.moveRotation();
    }

    movePosition (deltaTime: number) {
        //Lerp velocity.
        Vec3.lerp(this.velocityLocal, this.velocityLocal, this.moveVec3, deltaTime * this.smoothMove);
        this.velocity = this.velocityLocal.clone();

        //rotate y.
        if (this.faceMove)
            Vec3.rotateY(this.velocity, this.velocity, Vec3.ZERO, math.toRadian(this.node.eulerAngles.y));

        this.rigid?.getLinearVelocity(this.currentVelocity);
        this.velocity.y = this.currentVelocity.y;

        this.rigid?.setLinearVelocity(this.velocity);
    }

    moveRotation () {
        this.currentDirection = this.direction.clone();
        this.angle = Math.abs(Vec3.angle(this.currentDirection, this.node.forward));
        if (this.angle > 0.001) {
            tempRotationSideVector = this.currentDirection.clone();
            const side = Math.sign(-tempRotationSideVector.cross(this.node.forward).y);
            const angle = side * this.angle * 20 + this.node.eulerAngles.y;
            this.node.setRotationFromEuler(0, angle, 0);
        }
    }

    moveDirection (direction: Vec3) {
        this.moveVec3 = direction.clone();
        this.moveVec3.multiplyScalar(this.speed);
    }

    onRotation (x: number, y: number) {
        this.angleHead += x;
        this.direction.z = -Math.cos(Math.PI / 180.0 * this.angleHead);
        this.direction.x = Math.sin(Math.PI / 180.0 * this.angleHead);
        this.angleVertical -= y;
        if (this.angleVertical >= this.angleVerticalMax)
            this.angleVertical = this.angleVerticalMax;

        if (this.angleVertical <= this.angleVerticalMin)
            this.angleVertical = this.angleVerticalMin;
    }

    onDirection (x: number, y: number, z: number) {

        this.direction.x = x;
        this.direction.z = z;

        this.angleVertical = y;
        if (this.angleVertical >= this.angleVerticalMax)
            this.angleVertical = this.angleVerticalMax;

        if (this.angleVertical <= this.angleVerticalMin)
            this.angleVertical = this.angleVerticalMin;

    }

    stop () {
        this.rigid!.getLinearVelocity(this.velocity);
        this.velocity.x = 0;
        this.velocity.z = 0;
        this.velocity.y = 0;
        this.rigid!.setLinearVelocity(this.velocity);
    }


}

