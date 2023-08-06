import { _decorator, Component, Button } from 'cc';
import { ClientReplicator } from '../../sync/components/ClientReplicator';
import { ServerReplicator } from '../../sync/components/ServerReplicator';
const { ccclass, property } = _decorator;

@ccclass('SyncUI')
export class SyncUI extends Component {
    @property({ type: ServerReplicator })
    public serverReplicator: ServerReplicator | null = null;

    @property({ type: ClientReplicator })
    public clientReplicator: ClientReplicator | null = null;

    @property({ type: Button })
    public createButton: Button | null = null;

    @property({ type: Button })
    public syncButton: Button | null = null;

    start() {
        this.createButton?.node.on(Button.EventType.CLICK, this.onCreateButtonClick, this);
        this.syncButton?.node.on(Button.EventType.CLICK, this.onSyncButtonClick, this);
    }

    private onCreateButtonClick() {
        console.log("create button click");
        this.serverReplicator?.createRandomPrefab();
    }

    private async onSyncButtonClick() {
        console.log("sync button click");
        const syncData = this.serverReplicator?.generateSyncData();
        if (syncData) {
            await this.clientReplicator?.syncInstances(syncData);
        }
    }
}