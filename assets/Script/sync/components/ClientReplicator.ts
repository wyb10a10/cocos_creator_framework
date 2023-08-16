import { _decorator, Component, Node, resources, Prefab, Vec3, instantiate } from 'cc';
import { NodeSync } from './NodeSync';
const { ccclass, property } = _decorator;

@ccclass('ClientReplicator')
export class ClientReplicator extends Component {
    private instanceMap: Map<number, Node> = new Map();

    private loadPrefab(path: string): Promise<Prefab> {
        return new Promise((resolve, reject) => {
            resources.load(path, Prefab, (err, prefab) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(prefab as Prefab);
                }
            });
        });
    }

    public async syncInstances(syncData: any[]) {
        for (const data of syncData) {
            let instanceNode = this.instanceMap.get(data.instanceId);
            if (!instanceNode) {
                const prefab = await this.loadPrefab(data.prefabPath);
                instanceNode = instantiate(prefab);
                const nodeSync = (instanceNode as Node).getComponent(NodeSync);
                if (nodeSync) {
                    nodeSync.setInstanceId(data.instanceId);
                    nodeSync.setPrefabPath(data.prefabPath);
                    this.node.addChild(instanceNode);
                    this.instanceMap.set(data.instanceId, instanceNode);
                }
            }
            instanceNode.setPosition(new Vec3(data.position.x, data.position.y, data.position.z));
            if (data.data) {
                const nodeSync = (instanceNode as Node).getComponent(NodeSync);
                if (nodeSync) {
                    nodeSync.applyDiff(data.data);
                }
            }
            console.log(`sync instance ${data.instanceId}`);
        }
    }
}