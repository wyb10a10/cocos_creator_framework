import { Component, _decorator } from "cc";
import { replicated } from "../../sync/SyncUtil";
import { CCString } from "cc";

const { ccclass, property } = _decorator;

@ccclass
export default class SyncCube extends Component {
    // 定义一个字符串类型的同步属性
    @replicated()
    @property({type : CCString})
    public cubeName: string = "cube";

    onLoad() {
        // 随机生成一个cubeName，后面接的随机数为0-1000的整数
        this.cubeName = "cube" + Math.floor(Math.random() * 1000);
        console.log("cubeName: " + this.cubeName);
    }
    // update (dt) {}
}
