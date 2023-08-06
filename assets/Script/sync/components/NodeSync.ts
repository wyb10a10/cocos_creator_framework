import { _decorator, Component, Node } from 'cc';
import { ServerReplicator } from './ServerReplicator';
const { ccclass, property } = _decorator;

@ccclass('NodeSync')
export class NodeSync extends Component {
    @property
    public instanceId: number = -1;

    @property
    public prefabPath: string = '';

    public childrenNodeSync: NodeSync[] = [];

    public setInstanceId(id: number) {
        this.instanceId = id;
    }

    public setPrefabPath(path: string) {
        this.prefabPath = path;
    }

    public addChildNodeSync(nodeSync: NodeSync) {
        this.childrenNodeSync.push(nodeSync);
    }

    onEnable() {
        this.registerToParent();
    }

    private registerToParent() {
        let currentNode: Node | null = this.node.parent;
        while (currentNode) {
            const serverReplicator = currentNode.getComponent(ServerReplicator);
            if (serverReplicator) {
                serverReplicator.registerNodeSync(this);
                break;
            }

            const parentNodeSync = currentNode.getComponent(NodeSync);
            if (parentNodeSync) {
                parentNodeSync.addChildNodeSync(this);
                this.setInstanceId(parentNodeSync.instanceId);
                break;
            }

            currentNode = currentNode.parent;
        }
    }
}