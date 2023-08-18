import { _decorator, Component, Node, Prefab, instantiate } from 'cc';
import { NodeSync } from './NodeSync';
const { ccclass, property } = _decorator;

@ccclass('ServerReplicator')
export class ServerReplicator extends Component {
    @property({ type: [Prefab] })
    public prefabs: Prefab[] = [];

    private instanceCounter: number = 0;
    private serverVersion: number = 0;

    public createRandomPrefab() {
        const randomIndex = Math.floor(Math.random() * this.prefabs.length);
        const prefab = this.prefabs[randomIndex];
        const instance = instantiate(prefab);
        const nodeSync = instance.getComponent(NodeSync);
        if (nodeSync) {
            nodeSync.setInstanceId(this.instanceCounter++);
            // 随机位置在-3到3之间
            instance.setPosition(Math.random() * 6 - 3, 0, Math.random() * 6 - 3);
            let node: Node | null = this.node;
            const childNode = this.getRandomChildNode();
            if (this.node.children.length > 2 && childNode) {
                node = childNode;
            }
            node.addChild(instance);
            console.log(`create instance ${nodeSync.instanceId} counter ${this.instanceCounter}`);
        }
    }

    public getRandomChildNode(): Node | null {
        if (this.node.children.length > 0) {
            const randomIndex = Math.floor(Math.random() * this.node.children.length);
            return this.node.children[randomIndex];
        }
        return null;
    }

    public generateSyncData(): any {
        const syncData = [];
        const nodeSyncs = this.node.getComponentsInChildren(NodeSync);
        for (const nodeSync of nodeSyncs) {
            syncData.push({
                instanceId: nodeSync.instanceId,
                prefabPath: nodeSync.prefabPath,
                position: nodeSync.node.position,
                data: nodeSync.genDiff(this.serverVersion, ++this.serverVersion),
            });
        }
        console.log(`generate sync data ${JSON.stringify(syncData)}`);
        return syncData;
    }

    public registerNodeSync(nodeSync: NodeSync) {
        if (nodeSync.instanceId === -1) {
            nodeSync.setInstanceId(this.instanceCounter++);
        }
    }
}