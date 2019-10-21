import ResLoader from "./ResLoader";

/**
 * Prefab对象池类
 * 1. 占用并复用资源，使用ResLoader加载资源并标记为资源池占用
 * 2. Prefab对象管理、缓存、创建，每个Prefab资源对应一个池子
 * 3. 针对每个Prefab对象池的水位控制
 * 4. freePrefab 里面检测node是否有效，无效的node报错提示，_createCount--
 * 
 * 2018-7-26 by 宝爷
 */

export class PrefabPool {
    private _createCount: number = 0;
    private _warterMark: number = 10;
    private _url: string;
    private _res: cc.Prefab = null;
    private _nodes: Array<cc.Node> = new Array<cc.Node>();

    public constructor(url: string, prefab: cc.Prefab) {
        this._url = url;
        this._res = prefab;
    }

    /**
     * 获取url
     */
    public getUrl(): string {
      return this._url;
    }

    /**
     * 获取prefab
     * @param url prefab的url
     */
    public getPrefab(): cc.Node {
        if (this._nodes.length > 0) {
            return this._nodes.pop();
        } else {
            this._createCount++;
            return cc.instantiate(this._res);
        }
    }

    /**
     * 回收prefab
     * @param url prefab的url
     * @param node 
     */
    public freePrefab(node: cc.Node) {
        if (!(node && cc.isValid(node))) {
            cc.error('[ERROR] PrefabPool: freePrefab: isValid node');
            this._createCount--;
            return;
        }
        if (this._warterMark < this._nodes.length) {
            this._createCount--;
            node.destroy();
        } else {
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
            cc.error('PrefabPool: _nodes.length > _createCount');
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
        ResLoader.getInstance().releaseRes(this._url, ResLoader.makeUseKey("PrefabPool"));
    }
}

class CPrefabPoolMgr {
    private _pools: Map<string, PrefabPool> = new Map<string, PrefabPool>();
    private static _prefabPoolMgr: CPrefabPoolMgr = null;

    public static getInstance(): CPrefabPoolMgr {
        if (!this._prefabPoolMgr) {
            this._prefabPoolMgr = new CPrefabPoolMgr();
        }
        return this._prefabPoolMgr;
    }

    public static destroy(): void {
        if (this._prefabPoolMgr) {
            this._prefabPoolMgr = null;
        }
    }

    private constructor() {
    }

    /**
     * 初始化prefab池
     * @param url prefab的url
     * @param finishCallback 初始化结束回调
     * @param warterMark 最大水位（最大缓存数量）
     */
    public initPrefabPool(url: string, finishCallback: (err: Error, pool: PrefabPool) => void = null, warterMark: number = 32) {
        if (this._pools.has(url)) {
            finishCallback && finishCallback(null, this._pools.get(url));
            return;
        }
        ResLoader.getInstance().loadRes(url, cc.Prefab, (error, res) => {
            let pool: PrefabPool = null;
            if (!error) {
                pool = new PrefabPool(url, res);
                pool.setWaterMark(warterMark);
                this._pools.set(url, pool);
            }
            if (finishCallback) {
                finishCallback(error, pool)
            }
        }, ResLoader.makeUseKey("PrefabPool"));
    }

    /**
     * 获取prefab池
     * @param url prefab的url
     */
    public getPool(url: string): PrefabPool {
        return this._pools.get(url);
    }

    /**
     * 判断是不是有prefab池
     * @param url prefab的url
     */
    public hasPool(url: string) {
        return this._pools.has(url);
    }

    /**
     * 销毁prefab池
     * @param url prefab的url
     */
    public destroyPool(url: string) {
        if (this._pools.has(url)) {
            this._pools.get(url).destory();
            this._pools.delete(url);
        }
    }

    /**
     * 初始化预设池，并返回Promise
     */
    public initPrefabPoolAsync(url: string, warterMark: number = 32): Promise<PrefabPool> {
      return new Promise((resolve, reject) => {
        if (this._pools.has(url)) {
          resolve(this._pools.get(url));
        } else {
          ResLoader.getInstance().loadRes(url, cc.Prefab, (error, res) => {
            let pool: PrefabPool = null;
            if (!error) {
                pool = new PrefabPool(url, res);
                pool.setWaterMark(warterMark);
                this._pools.set(url, pool);
                resolve(pool);
            } else {
              reject(error);
            }
        }, ResLoader.makeUseKey("PrefabPool"));
        }
      });
    }
}

let PrefabPoolMgr = CPrefabPoolMgr.getInstance();
export { PrefabPoolMgr }