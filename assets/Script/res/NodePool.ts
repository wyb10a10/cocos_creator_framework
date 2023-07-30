import { isValid } from "cc";
import { error } from "cc";
import { instantiate } from "cc";
import { Prefab, Node } from "cc";
import { resLoader } from "./ResLoader";

/**
 * Prefab的实例对象管理，目标为减少instantiate的次数，复用Node
 * 
 * 2020-1-19 by 宝爷
 */
export type NodePoolCallback = (error: Error | null, nodePool: NodePool) => void;

export class NodePool {
    private _isReady: boolean = false;
    private _createCount: number = 0;
    private _warterMark: number = 10;
    private _res: Prefab | null = null;
    private _nodes: Array<Node> = new Array<Node>();
    public isReady() { return this._isReady; }
    /**
     * 初始化NodePool，可以传入使用resloader加载的prefab，或者传入url异步加载
     * 如果使用url来初始化，需要检查isReady，否则获取node会返回null
     * @param prefab 
     * @param url
     */
    public init(prefab: Prefab) : void
    public init(url: string, finishCallback: NodePoolCallback) : void
    public init(urlOrPrefab : Prefab | string, finishCallback?: NodePoolCallback) {
        if (urlOrPrefab instanceof Prefab) {
            this._res = urlOrPrefab;
            urlOrPrefab.addRef();
        } else {
            resLoader.load(urlOrPrefab, Prefab, (error, prefab) => {
                if (!error) {
                    this._res = prefab;
                    this._isReady = true;
                }
                if (finishCallback) {
                    finishCallback(error, this);
                }
            });
            return;
        }
        console.error(`NodePool init error ${arguments[0]}`);
    }

    /**
     * 获取或创建一个Prefab实例Node
     */
    public getNode(): Node | null | undefined {
        if (!this.isReady) {
            return null;
        }
        if (this._nodes.length > 0) {
            return this._nodes.pop();
        } else {
            this._createCount++;
            return instantiate(this._res!);
        }
    }
    /**
     * 回收Node实例
     * @param node 要回收的Prefab实例
     */
    public freeNode(node: Node) {
        if (!(node && isValid(node))) {
            error('[ERROR] PrefabPool: freePrefab: isValid node');
            this._createCount--;
            return;
        }
        if (this._warterMark < this._nodes.length) {
            this._createCount--;
            node.destroy();
        } else {
            node.removeFromParent();
            this._nodes.push(node);
        }
    }
    /**
     * 设置回收水位
     * @param waterMakr 水位
     */
    public setWaterMark(waterMakr: number) {
        this._warterMark = waterMakr;
    }
    /**
     * 池子里的prefab是否都没有使用
     */
    public isUnuse() {
        if (this._nodes.length > this._createCount) {
            error('PrefabPool: _nodes.length > _createCount');
        }
        return this._nodes.length == this._createCount;
    }
    /**
     * 清空prefab
     */
    public destory() {
        // 清空节点、回收资源
        for (let node of this._nodes) {
            node.destroy();
        }
        this._createCount -= this._nodes.length;
        this._nodes.length = 0;
        if (this._res) {
            this._res.decRef();
        }
    }
}