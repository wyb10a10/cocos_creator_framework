import { Node, Component } from 'cc';
import { IReplicator } from './SyncUtil';
import { createReplicator } from './ReplicatorFactory';
import { getReplicateMark } from './ReplicateMark';

/**
 * NodeReplicator用于管理当前节点及其子节点的所有标记为同步的组件
 * 维护这些组件的Replicator，以及生成Diff
 * NodeReplicator当前的版本不支持节点和组件的动态添加和删除
 */
export default class NodeReplicator implements IReplicator {
    private target: Node;
    private replicators: Map<string, IReplicator> = new Map();
    private version: number = 0;
    private lastCheckVersion: number = 0;

    constructor(target: Node) {
        this.target = target;
        this.scanNode(target);
    }

    private scanNode(node: Node): void {
        for (const component of node.components) {
            if (this.isReplicated(component)) {
                const key = this.getComponentKey(node, component);
                const replicator = createReplicator(component);
                if (replicator) {
                    this.replicators.set(key, replicator);
                    console.log(`NodeReplicator scanNode, key: ${key}`);
                } else {
                    console.error(`NodeReplicator scanNode error, key: ${key}`);
                }
            }
            console.log(`NodeReplicator scanNode, component: ${component.constructor.name}`);
        }

        for (const child of node.children) {
            this.scanNode(child);
        }
    }

    private isReplicated(component: Component): boolean {
        // TODO:是否需要检查component本身是否有ReplicateMark
        if (getReplicateMark(component.constructor, false)) {
            return true;
        }
        return false;
    }

    private getComponentKey(node: Node, component: Component): string {
        return `${this.getNodePath(node)}:${component.constructor.name}`;
    }

    private getNodePath(node: Node): string {
        let path = node.name;
        let current = node.parent;
    
        while (current) {
            path = `${current.name}/${path}`;
            current = current.parent;
        }
    
        return path;
    }

    genDiff(fromVersion: number, toVersion: number): any {
        if (toVersion < fromVersion || this.target === null) {
            return false;
        }
        let needScan = this.lastCheckVersion < toVersion;
        // 如果不需要扫描，且最终版本小于fromVersion，则直接返回
        if (!needScan && fromVersion > this.version) {
            return false;
        }

        const diff: any = {};

        for (const [key, replicator] of this.replicators) {
            const componentDiff = replicator.genDiff(fromVersion, toVersion);
            if (componentDiff) {
                diff[key] = componentDiff;
            }
        }

        this.lastCheckVersion = toVersion;

        if (Object.keys(diff).length > 0) {
            this.version = toVersion;
            return diff;
        }
        return false;
    }

    applyDiff(diff: any): void {
        for (const key in diff) {
            const replicator = this.replicators.get(key);
            if (replicator) {
                replicator.applyDiff(diff[key]);
            } else {
                console.error(`NodeReplicator applyDiff error, key: ${key}`);
            }
        }
    }

    getVersion(): number {
        return this.version;
    }

    getTarget(): Node {
        return this.target;
    }

    setTarget(target: Node): void {
        this.target = target;
    }
}