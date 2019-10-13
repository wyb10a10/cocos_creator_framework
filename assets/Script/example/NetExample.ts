import { WebSock } from "../network/WebSock";
import { NetManager } from "../network/NetManager";
import { NetNode } from "../network/NetNode";
import { DefStringProtocol, NetData } from "../network/NetInterface";



const { ccclass, property } = cc._decorator;

@ccclass
export default class NewClass extends cc.Component {
    @property
    text: string = 'hello';
    @property(cc.Label)
    textLabel: cc.Label = null;
    @property(cc.Label)
    urlLabel: cc.Label = null;

    onLoad() {
        let Node = new NetNode();
        Node.init(new WebSock(), new DefStringProtocol());
        Node.setResponeHandler(0, (cmd: number, data: NetData) => { 
            console.log(`${data}`);
        });
        NetManager.getInstance().setNetNode(Node);

    }

    onConnectClick() {
        NetManager.getInstance().connect({ url: this.urlLabel.string });
    }

    onSendClick() {
        NetManager.getInstance().send(this.textLabel.string);
    }

    onDisconnectClick() {
        NetManager.getInstance().close();
    }

    // update (dt) {}
}
