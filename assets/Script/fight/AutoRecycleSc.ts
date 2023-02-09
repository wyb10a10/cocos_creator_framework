
import { _decorator, Component} from 'cc';
const { ccclass, property } = _decorator;

/**
 * Predefined variables
 * Name = AutoRecycleSc
 * DateTime = Sun Dec 19 2021 22:27:12 GMT+0800 (中国标准时间)
 * Author = nowpaper
 * FileBasename = AutoRecycleSc.ts
 * FileBasenameNoExtension = AutoRecycleSc
 * URL = db://assets/src/AutoRecycleSc.ts
 * ManualUrl = https://docs.cocos.com/creator/3.3/manual/zh/
 *
 */
 
@ccclass('AutoRecycleSc')
export class AutoRecycleSc extends Component {
    // [1]
    // dummy = '';

    // [2]
    @property
    deltaTime = 10;

    start () {
        // [3]
    }

    update (dt: number) {
        this.deltaTime -= dt;
        if(this.deltaTime <=0){
            this.recycle();
        }
    }
    recycle(){
        this.deltaTime = 1000;
        this.node.destroy();
    }
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
