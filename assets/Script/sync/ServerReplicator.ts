import { _decorator, Component, Node, Prefab, instantiate } from 'cc';
import { NodeSync } from './NodeSync';
const { ccclass, property } = _decorator;

@ccclass('ServerReplicator')
export class ServerReplicator extends Component {
    @property({ type: [Prefab] })
    public prefabs: Prefab[] = [];

    private instanceCounter: number = 0;

    public createRandomPrefab() {
        const randomIndex = Math.floor(Math.random() * this.prefabs.length);
        const prefab = this.prefabs[randomIndex];
        const instance = instantiate(prefab);
        const nodeSync = instance.getComponent(NodeSync);
        if (nodeSync) {
            nodeSync.setInstanceId(this.instanceCounter++);
            this.node.addChild(instance);
            console.log(`create instance ${nodeSync.instanceId}`);
        }
    }

    public generateSyncData(): any {
        const syncData = [];
        const nodeSyncs = this.node.getComponentsInChildren(NodeSync);
        for (const nodeSync of nodeSyncs) {
            syncData.push({
                instanceId: nodeSync.instanceId,
                prefabPath: nodeSync.prefabPath,
                position: nodeSync.node.position
            });
        }
        return syncData;
    }

    public registerNodeSync(nodeSync: NodeSync) {
        if (nodeSync.instanceId === -1) {
            nodeSync.setInstanceId(this.instanceCounter++);
        }
    }
}