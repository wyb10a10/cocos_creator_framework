import { Component, _decorator } from "cc";
import { replicated } from "../../sync/SyncUtil";
import { CCString } from "cc";
import { CCInteger } from "cc";

const { ccclass, property } = _decorator;

@ccclass
export default class SyncCube extends Component {
    // 定义一个字符串类型的同步属性
    @replicated()
    @property({type : CCString})
    public cubeName: string = "cube";

    @replicated()
    @property({type : CCInteger})
    public cubeX = 0;

    @property({type : CCInteger})
    public dontSync = 0;

    @replicated()
    @property({type : Array<number>})
    public cubePos: number[] = [0, 0, 0];

    onLoad() {
        // 随机生成一个cubeName，后面接的随机数为0-1000的整数
        this.cubeName = "cube" + Math.floor(Math.random() * 1000);
        
        // 随机生成一个cubeX，后面接的随机数为0-1000的整数
        this.cubeX = Math.floor(Math.random() * 1000);

        // 随机生成一个cubePos，后面接的随机数为0-1000的整数
        this.cubePos = [Math.floor(Math.random() * 1000), Math.floor(Math.random() * 1000), Math.floor(Math.random() * 1000)];

        // 随机生成一个dontSync，后面接的随机数为0-1000的整数
        this.dontSync = Math.floor(Math.random() * 1000);

        console.log("onLoad", this.node.uuid, this.cubeName, this.cubeX, this.cubePos, this.dontSync);
    }
    // update (dt) {}
}
