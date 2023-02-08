
import { _decorator, Component, Node, Prefab, game, PhysicsRayResult, instantiate } from 'cc';
import { BulletSc } from './BulletSc';
const { ccclass, property } = _decorator;

/**
 * Predefined variables
 * Name = ImpactHelperSc
 * DateTime = Tue Dec 21 2021 00:05:06 GMT+0800 (中国标准时间)
 * Author = nowpaper
 * FileBasename = ImpactHelperSc.ts
 * FileBasenameNoExtension = ImpactHelperSc
 * URL = db://assets/src/ImpactHelperSc.ts
 * ManualUrl = https://docs.cocos.com/creator/3.3/manual/zh/
 *
 */
 
@ccclass('ImpactHelperSc')
export class ImpactHelperSc extends Component {
    public static AddImpactEvent:string = "AddImpactEvent";
    @property(Prefab)
    impact1:Prefab = null;

    start () {
        game.on(ImpactHelperSc.AddImpactEvent,<any>this.onAddImpactEvent,this);
    }
    private onAddImpactEvent(b:BulletSc,e:PhysicsRayResult) {
        const impact = instantiate(this.impact1);
        impact.worldPosition = e.hitPoint.add(e.hitNormal.multiplyScalar(0.01));
        impact.forward=e.hitNormal.multiplyScalar(-1);
        impact.scale = b.node.scale;
        impact.setParent(e.collider.node,true);
        
    }
    // update (deltaTime: number) {
    //     // [4]
    // }
}

/**
 * [1] Class member could be defined like this.
 * [2] Use `property` decorator if your want the member to be serializable.
 * [3] Your initialization goes here.
 * [4] Your update function goes here.
 *
 * Learn more about scripting: https://docs.cocos.com/creator/3.3/manual/zh/scripting/
 * Learn more about CCClass: https://docs.cocos.com/creator/3.3/manual/zh/scripting/ccclass.html
 * Learn more about life-cycle callbacks: https://docs.cocos.com/creator/3.3/manual/zh/scripting/life-cycle-callbacks.html
 */
