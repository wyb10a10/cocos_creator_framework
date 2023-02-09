
import { _decorator, Component, Vec3, RigidBody} from 'cc';
const { ccclass } = _decorator;

@ccclass('AiAction')
export class AiAction extends Component {

    
    private _curDir: Vec3 = new Vec3();

    private _keepTime: number = 0;

    private _index = 0;

    changeDir(val: number) {
        let tmpDir = this._curDir.clone();
        tmpDir.x = ((val >> 1) & 1) ? 1 : -1;
        tmpDir.z = (val & 1) ? 1 : -1;
        tmpDir = tmpDir.normalize();
        this._curDir = new Vec3(0, 0, 1);
    }

    update(deltaTime: number) {
        if (this._keepTime <= 0) {
            this._index = (this._index) % 4;
            this.changeDir(this._index);
            this._keepTime = 1;
        }
        let rigidBody = this.node.getComponent(RigidBody);
        let curSpeed = new Vec3(5 * Math.sin(this._curDir.x / 1.0), 0, 1 * Math.sin(this._curDir.z / 1.0));
        console.log(curSpeed);
        rigidBody?.setLinearVelocity(curSpeed);
        this._keepTime -= deltaTime;
    }
}
