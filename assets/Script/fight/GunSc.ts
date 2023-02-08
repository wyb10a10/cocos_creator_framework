
import { _decorator, Component, Node, Prefab, Vec3, v3, instantiate, director, Quat, ParticleSystem} from 'cc';
import { BulletSc } from './BulletSc';
import { ParticleEffectHelper } from './ParticleEffectHelper';
const { ccclass, property } = _decorator;

/**
 * Predefined variables
 * Name = GunSc
 * DateTime = Sun Dec 19 2021 22:32:20 GMT+0800 (中国标准时间)
 * Author = nowpaper
 * FileBasename = GunSc.ts
 * FileBasenameNoExtension = GunSc
 * URL = db://assets/src/GunSc.ts
 * ManualUrl = https://docs.cocos.com/creator/3.3/manual/zh/
 *
 */

@ccclass('GunSc')
export class GunSc extends Component {
    @property(Node)
    fireEffect: Node | null = null;
    @property(Prefab)
    bullet: Prefab | null = null;
    @property(Node)
    muzzleNode: Node | null = null;
    private vec3: Vec3 = v3();
    shot() {
        this.createBullet();
        const arr = this.fireEffect!.getComponentsInChildren(ParticleSystem);
        for(let a of arr){
            a.stop();
            a.play();
        }
    }
    private _quat = new Quat();
    private createBullet() {
        Vec3.subtract(this.vec3, this.muzzleNode!.worldPosition, this.node.worldPosition);
        const b = instantiate(this.bullet);
        director.getScene().addChild(b);
        b.setWorldPosition(this.muzzleNode!.worldPosition);
        b.setWorldRotation(this.muzzleNode!.worldRotation);
        let rot = this._quat;
        const speadValue = 0;
        Quat.fromEuler(rot, (Math.random() * 2 - 1) * speadValue,
            (Math.random() * 2 - 1) * speadValue, (Math.random() * 2 - 1) * speadValue);
        Vec3.transformQuat(this.vec3,this.vec3.normalize(),rot);
        b.forward = this.vec3;
        b.getComponent(BulletSc).setVector(b.forward);
    }
}