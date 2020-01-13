/**
 * 资源加载类
 * 1. 加载完成后自动记录引用关系，根据DependKeys记录反向依赖
 * 2. 支持资源使用，如某打开的UI使用了A资源，其他地方释放资源B，资源B引用了资源A，如果没有其他引用资源A的资源，会触发资源A的释放，
 * 3. 能够安全释放依赖资源（一个资源同时被多个资源引用，只有当其他资源都释放时，该资源才会被释放）
 * 
 * 2018-7-17 by 宝爷
 */

// 资源加载的处理回调
export type ProcessCallback = (completedCount: number, totalCount: number, item: any) => void;
// 资源加载的完成回调
export type CompletedCallback = (error: Error, resource: any) => void;
export type CompletedArrayCallback = (error: Error, resource: any[], urls?: string[]) => void;

// 引用和使用的结构体
interface CacheInfo {
    refs: Set<string>,
    uses: Set<string>,
    useId: number
}

// LoadRes方法的参数结构
interface LoadResArgs {
    url?: string,
    urls?: string[],
    type?: typeof cc.Asset,
    onCompleted?: (CompletedCallback | CompletedArrayCallback),
    onProgess?: ProcessCallback,
    use?: string,
}

// ReleaseRes方法的参数结构
interface ReleaseResArgs {
    url?: string,
    urls?: string[],
    type?: typeof cc.Asset,
    use?: string,
}

// 兼容性处理
let isChildClassOf = cc.js["isChildClassOf"]
if (!isChildClassOf) {
    isChildClassOf = cc["isChildClassOf"];
}

export default class ResLoader {

    private _resMap: Map<string, CacheInfo> = new Map<string, CacheInfo>();

    /**
     * 从cc.loader中获取一个资源的item
     * @param url 查询的url
     * @param type 查询的资源类型
     */
    private _getResItem(url: string, type: typeof cc.Asset): any {
        let ccloader: any = cc.loader;
        let item = ccloader._cache[url];
        if (!item) {
            let uuid = ccloader._getResUuid(url, type, false);
            if (uuid) {
                let ref = ccloader._getReferenceKey(uuid);
                item = ccloader._cache[ref];
            }
        }
        return item;
    }

    /**
     * loadRes方法的参数预处理
     */
    private _makeLoadResArgs(): LoadResArgs {
        if (arguments.length < 1) {
            console.error(`_makeLoadResArgs error ${arguments}`);
            return null;
        }

        let ret: LoadResArgs = {};
        if (typeof arguments[0] == "string") {
            ret.url = arguments[0];
        } else if (arguments[0] instanceof Array) {
            ret.urls = arguments[0];
        } else {
            console.error(`_makeLoadResArgs error ${arguments}`);
            return null;
        }

        for (let i = 1; i < arguments.length; ++i) {
            if (i == 1 && isChildClassOf(arguments[i], cc.RawAsset)) {
                // 判断是不是第一个参数type
                ret.type = arguments[i];
            } else if (i == arguments.length - 1 && typeof arguments[i] == "string") {
                // 判断是不是最后一个参数use
                ret.use = arguments[i];
            } else if (typeof arguments[i] == "function") {
                // 其他情况为函数
                if (arguments.length > i + 1 && typeof arguments[i + 1] == "function") {
                    ret.onProgess = arguments[i];
                } else {
                    ret.onCompleted = arguments[i];
                }
            }
        }
        return ret;
    }

    /**
     * releaseRes方法的参数预处理
     */
    private _makeReleaseResArgs(): ReleaseResArgs {
        if (arguments.length < 1) {
            console.error(`_makeReleaseResArgs error ${arguments}`);
            return null;
        }
        let ret: ReleaseResArgs = {};
        if (typeof arguments[0] == "string") {
            ret.url = arguments[0];
        } else if (arguments[0] instanceof Array) {
            ret.urls = arguments[0];
        } else {
            console.error(`_makeReleaseResArgs error ${arguments}`);
            return null;
        }

        for (let i = 1; i < arguments.length; ++i) {
            if (typeof arguments[i] == "string") {
                ret.use = arguments[i];
            } else {
                ret.type = arguments[i];
            }
        }
        return ret;
    }

    /**
     * 生成一个资源使用Key
     * @param where 在哪里使用，如Scene、UI、Pool
     * @param who 使用者，如Login、UIHelp...
     * @param why 使用原因，自定义...
     */
    public makeUseKey(where: string, who: string = "none", why: string = ""): string {
        return `use_${where}_by_${who}_for_${why}`;
    }

    /**
     * 获取资源缓存信息
     * @param key 要获取的资源url
     */
    public getCacheInfo(key: string): CacheInfo {
        if (!this._resMap.has(key)) {
            this._resMap.set(key, {
                refs: new Set<string>(),
                uses: new Set<string>(),
                useId: 0
            });
        }
        return this._resMap.get(key);
    }

    private _buildDepend(item: any, refKey: string) {
        // 反向关联引用（为所有引用到的资源打上本资源引用到的标记）
        if (item && item.dependKeys && Array.isArray(item.dependKeys)) {
            for (let depKey of item.dependKeys) {
                // 记录该资源被我引用
                let cacheInfo = this.getCacheInfo(depKey);
                if (!cacheInfo.refs.has(refKey)) {
                    this.getCacheInfo(depKey).refs.add(refKey);
                    cc.log(`${depKey} ref by ${refKey}`);
                    let ccloader: any = cc.loader;
                    let depItem = ccloader._cache[depKey]
                    this._buildDepend(depItem, depItem && depItem.id ? depItem.id : refKey);
                }
            }
        }
    }

    private _finishItem(url: string, assetType: typeof cc.Asset, use?: string) {
        let item = this._getResItem(url, assetType);
        if (item && item.id) {
            let info = this.getCacheInfo(item.id);
            if (use) {
                info.uses.add(use);
            }
            if (!info.refs.has(item.id)) {
                info.refs.add(item.id);
                this._buildDepend(item, item.id);
            }
        } else {
            cc.warn(`addDependKey item error! for ${url}`);
        }
    }

    /**
     * 开始加载资源
     * @param url           资源url
     * @param type          资源类型，默认为null
     * @param onProgess     加载进度回调
     * @param onCompleted   加载完成回调
     * @param use           资源使用key，根据makeUseKey方法生成
     */
    public loadRes(url: string, use?: string);
    public loadRes(url: string, onCompleted: CompletedCallback, use?: string);
    public loadRes(url: string, onProgess: ProcessCallback, onCompleted: CompletedCallback, use?: string);
    public loadRes(url: string, type: typeof cc.Asset, use?: string);
    public loadRes(url: string, type: typeof cc.Asset, onCompleted: CompletedCallback, use?: string);
    public loadRes(url: string, type: typeof cc.Asset, onProgess: ProcessCallback, onCompleted: CompletedCallback, use?: string);
    public loadRes() {
        let resArgs: LoadResArgs = this._makeLoadResArgs.apply(this, arguments);
        console.time("loadRes|" + resArgs.url);
        let finishCallback = (error: Error, resource: any) => {
            if (!error) {
                this._finishItem(resArgs.url, resArgs.type, resArgs.use);
            }
            if (resArgs.onCompleted) {
                resArgs.onCompleted(error, resource);
            }
            console.timeEnd("loadRes|" + resArgs.url);
        };

        // 预判是否资源已加载
        let res = cc.loader.getRes(resArgs.url, resArgs.type);
        if (res) {
            finishCallback(null, res);
        } else {
            let ccloader: any = cc.loader;
            let uuid = ccloader._getResUuid(resArgs.url, resArgs.type, false);
            if (uuid) {
                cc.loader.loadRes(resArgs.url, resArgs.type, resArgs.onProgess, finishCallback);
            } else {
                cc.loader.load(resArgs.url, resArgs.onProgess, finishCallback);
            }
        }
    }

    public loadArray(urls: string[], use?: string);
    public loadArray(urls: string[], onCompleted: CompletedArrayCallback, use?: string);
    public loadArray(urls: string[], onProgess: ProcessCallback, onCompleted: CompletedArrayCallback, use?: string);
    public loadArray(urls: string[], type: typeof cc.Asset, use?: string);
    public loadArray(urls: string[], type: typeof cc.Asset, onCompleted: CompletedArrayCallback, use?: string);
    public loadArray(urls: string[], type: typeof cc.Asset, onProgess: ProcessCallback, onCompleted: CompletedArrayCallback, use?: string);
    public loadArray() {
        let resArgs: LoadResArgs = this._makeLoadResArgs.apply(this, arguments);
        let finishCallback = (error: Error, resource: any[], urls?: string[]) => {
            if (!error) {
                for (let i = 0; i < resArgs.urls.length; ++i) {
                    this._finishItem(resArgs.urls[i], resArgs.type, resArgs.use);
                }
            }
            if (resArgs.onCompleted) {
                resArgs.onCompleted(error, resource);
            }
        }
        cc.loader.loadResArray(resArgs.urls, resArgs.type, resArgs.onProgess, finishCallback);
    }

    public loadResDir(url: string, use?: string);
    public loadResDir(url: string, onCompleted: CompletedArrayCallback, use?: string);
    public loadResDir(url: string, onProgess: ProcessCallback, onCompleted: CompletedArrayCallback, use?: string);
    public loadResDir(url: string, type: typeof cc.Asset, use?: string);
    public loadResDir(url: string, type: typeof cc.Asset, onCompleted: CompletedArrayCallback, use?: string);
    public loadResDir(url: string, type: typeof cc.Asset, onProgess: ProcessCallback, onCompleted: CompletedArrayCallback, use?: string);
    public loadResDir() {
        let resArgs: LoadResArgs = this._makeLoadResArgs.apply(this, arguments);
        let finishCallback = (error: Error, resource: any[], urls?: string[]) => {
            if (!error && urls) {
                for (let i = 0; i < urls.length; ++i) {
                    this._finishItem(urls[i], resArgs.type, resArgs.use);
                }
            }
            if (resArgs.onCompleted) {
                resArgs.onCompleted(error, resource);
            }
        }
        cc.loader.loadResDir(resArgs.url, resArgs.type, resArgs.onProgess, finishCallback);
    }

    public releaseArray(urls: string[], use?: string);
    public releaseArray(urls: string[], type: typeof cc.Asset, use?: string)
    public releaseArray() {
        let resArgs: ReleaseResArgs = this._makeReleaseResArgs.apply(this, arguments);
        for (let i = 0; i < resArgs.urls.length; ++i) {
            this.releaseRes(resArgs.urls[i], resArgs.type, resArgs.use);
        }
    }

    public releaseResDir(url: string, use?: string);
    public releaseResDir(url: string, type: typeof cc.Asset, use?: string)
    public releaseResDir() {
        let resArgs: ReleaseResArgs = this._makeReleaseResArgs.apply(this, arguments);
        let ccloader: any = cc.loader;
        let urls: string[] = [];
        ccloader._assetTables.assets.getUuidArray(resArgs.url, resArgs.type, urls);
        for (let i = 0; i < urls.length; ++i) {
            this.releaseRes(urls[i], resArgs.type, resArgs.use);
        }
    }

    /**
     * 释放资源
     * @param url   要释放的url
     * @param type  资源类型
     * @param use   要解除的资源使用key，根据makeUseKey方法生成
     */
    public releaseRes(url: string, use?: string);
    public releaseRes(url: string, type: typeof cc.Asset, use?: string)
    public releaseRes() {
        /**暂时不释放资源 */
        // return;

        let resArgs: ReleaseResArgs = this._makeReleaseResArgs.apply(this, arguments);
        let item = this._getResItem(resArgs.url, resArgs.type);
        if (!item) {
            console.warn(`releaseRes item is null ${resArgs.url} ${resArgs.type}`);
            return;
        }
        cc.log("resloader release item");
        // cc.log(arguments);
        let cacheInfo = this.getCacheInfo(item.id);
        if (resArgs.use) {
            cacheInfo.uses.delete(resArgs.use)
        }

        if (cacheInfo.uses.size == 0) {
            this._release(item, item.id);
        }
    }

    // 释放一个资源
    private _release(item, itemUrl) {
        let cacheInfo = this.getCacheInfo(item.id);
        if (!item || !cacheInfo.refs.has(itemUrl)) {
            return;
        }

        // 解除自身对自己的引用
        cacheInfo.refs.delete(itemUrl);
        let ccloader: any = cc.loader;
        if (cacheInfo.uses.size == 0 && cacheInfo.refs.size == 0) {
            if (item.dependKeys && Array.isArray(item.dependKeys)) {
                for (let depKey of item.dependKeys) {
                    let depItem = ccloader._cache[depKey]
                    this._release(depItem, item.id);
                }
            }

            //如果没有uuid,就直接释放url
            if (this._isSceneDepend(item.id)) {
                cc.log("resloader skip release scene depend assets :" + item.id);
            } else if (item.uuid) {
                cc.loader.release(item.uuid);
                cc.log("resloader release item by uuid :" + item.id);
            } else {
                cc.loader.release(item.id);
                cc.log("resloader release item by url:" + item.id);
            }
            this._resMap.delete(item.id);
        }
    }

    private _isSceneDepend(itemUrl) {
        let scene: any = cc.director.getScene();
        if (!scene) {
            return false;
        }
        let len = scene.dependAssets.length;
        for (let i = 0; i < len; ++i) {
            if (scene.dependAssets[i] == itemUrl)
                return true;
        }
        return false;
    }

    /**
     * 判断一个资源能否被释放
     * @param url 资源url
     * @param type  资源类型
     * @param use   要解除的资源使用key，根据makeUseKey方法生成
     */
    public checkReleaseUse(url: string, use?: string): boolean;
    public checkReleaseUse(url: string, type: typeof cc.Asset, use?: string): boolean
    public checkReleaseUse() {
        let resArgs: ReleaseResArgs = this._makeReleaseResArgs.apply(this, arguments);
        let item = this._getResItem(resArgs.url, resArgs.type);
        if (!item) {
            console.log(`cant release,item is null ${resArgs.url} ${resArgs.type}`);
            return true;
        }

        let cacheInfo = this.getCacheInfo(item.id);
        let checkUse = false;
        let checkRef = false;

        if (resArgs.use && cacheInfo.uses.size > 0) {
            if (cacheInfo.uses.size == 1 && cacheInfo.uses.has(resArgs.use)) {
                checkUse = true;
            } else {
                checkUse = false;
            }
        } else {
            checkUse = true;
        }

        if ((cacheInfo.refs.size == 1 && cacheInfo.refs.has(item.id)) || cacheInfo.refs.size == 0) {
            checkRef = true;
        } else {
            checkRef = false;
        }

        return checkUse && checkRef;
    }
}

export let resLoader: ResLoader = new ResLoader();

