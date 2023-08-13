import { _decorator, Component, Node } from 'cc';
import { ServerReplicator } from './ServerReplicator';
import NodeReplicator from '../NodeReplicator';
const { ccclass, property } = _decorator;

@ccclass('NodeSync')
export class NodeSync extends Component {
    @property
    public instanceId: number = -1;

    @property
    public prefabPath: string = '';

    @property
    public replicator: NodeReplicator | null = null;

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
        if (!this.replicator) {
            this.replicator = new NodeReplicator(this.node);
        }
    }

    /**
     * 生成一个Diff对象
     */
    genDiff(fromVersion: number, toVersion: number): any {
        return this.replicator?.genDiff(fromVersion, toVersion);
    }
    
    /**
     * 应用一个Diff对象
     * @param diff Diff对象
     */
    applyDiff(diff: any): void {
        this.replicator?.applyDiff(diff);
    }

    /**
     * 获取当前版本
     */
    getVersion(): number {
        return this.replicator?.getVersion() || 0;
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
                break;
            }

            currentNode = currentNode.parent;
        }
    }
}