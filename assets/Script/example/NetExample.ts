import { WebSock } from "../network/WebSock";
import { NetManager } from "../network/NetManager";
import { NetNode } from "../network/NetNode";
import { DefStringProtocol, NetData } from "../network/NetInterface";



const { ccclass, property } = cc._decorator;

@ccclass
export default class NewClass extends cc.Component {
    @property(cc.Label)
    textLabel: cc.Label = null;
    @property(cc.Label)
    urlLabel: cc.Label = null;
    @property(cc.RichText)
    msgLabel: cc.RichText = null;
    private lineCount: number = 0;

    onLoad() {
        let Node = new NetNode();
        Node.init(new WebSock(), new DefStringProtocol());
        Node.setResponeHandler(0, (cmd: number, data: NetData) => {
            if (this.lineCount > 5) {
                let idx = this.msgLabel.string.search("\n");
                this.msgLabel.string = this.msgLabel.string.substr(idx + 1);
            }
            this.msgLabel.string += `${data}\n`;
            ++this.lineCount;
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
