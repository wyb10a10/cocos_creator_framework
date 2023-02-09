
import { _decorator, Component, Node, Vec3, v3, geometry, physics, RigidBody, game } from 'cc';
import { AutoRecycleSc } from './AutoRecycleSc';
import { BeHitHelper } from './BeHitHelper';
import { ImpactHelperSc } from './ImpactHelperSc';
const { ccclass, property } = _decorator;

/**
 * Predefined variables
 * Name = BulletSc
 * DateTime = Sun Dec 19 2021 22:15:58 GMT+0800 (中国标准时间)
 * Author = nowpaper
 * FileBasename = BulletSc.ts
 * FileBasenameNoExtension = BulletSc
 * URL = db://assets/src/BulletSc.ts
 * ManualUrl = https://docs.cocos.com/creator/3.3/manual/zh/
 *
 */

@ccclass('BulletSc')
export class BulletSc extends Component {

    private _speed: number = 200;
    public get speed(): number {
        return this._speed;
    }
    public set speed(v: number) {
        this._speed = v;
        if (this._vector) {
            this._vector = this._vector.normalize().multiplyScalar(this.speed);
        }
    }
    private _vector: Vec3 = new Vec3();
    setVector(v: Vec3) {
        this._vector = v.clone().multiplyScalar(this.speed);
        this.node.forward = v;
        BulletSc.preCheck(this, this.speed / 60);
    }
    private _vec3 = v3();

    update(deltaTime: number) {
        if (this._vector) {
            Vec3.multiplyScalar(this._vec3, this._vector, deltaTime);
            this.node.position = this.node.position.add(this._vec3);
            BulletSc.preCheck(this, this._vec3.length());
        }
    }
    private static preCheck(b: BulletSc, len: number) {
        const p = b.node.worldPosition;
        const v = b._vector;
        const ray = geometry.Ray.create(p.x, p.y, p.z, v.x, v.y, v.z);
        const phy = physics.PhysicsSystem.instance;
        if (phy.raycast(ray, 0xffffff, len)) {
            if (phy.raycastResults.length > 0) {
                let result = phy.raycastResults[0];    
                game.emit(ImpactHelperSc.AddImpactEvent,b,result);
                if (result.collider.getComponent(RigidBody)) {
                    result.collider.getComponent(RigidBody)?.applyForce(b._vector, result.hitPoint);
                }
                if (result.collider.getComponent(BeHitHelper)) {
                    result.collider.getComponent(BeHitHelper)?.beHit();
                }
                if (b.getComponent(AutoRecycleSc))
                    b.getComponent(AutoRecycleSc)?.recycle();
            }
        }
    }
}