import { ResLeakChecker } from "./ResLeakChecker";
import { ResUtil } from "./ResUtil";
import ResKeeper from "./ResKeeper";

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
export interface CacheInfo {
    refs: Set<string>,
    uses: Set<string>,
    useId?: number,
}

// LoadRes方法的参数结构
export class LoadResArgs {
    url?: string;
    urls?: string[];
    type?: typeof cc.Asset;
    onCompleted?: (CompletedCallback | CompletedArrayCallback);
    onProgess?: ProcessCallback;
    use?: string;
}

// ReleaseRes方法的参数结构
export interface ReleaseResArgs {
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

let ccloader: any = cc.loader;

export default class ResLoader {

    private static _sceneUseKey: string;
    private _resMap: Map<string, CacheInfo> = new Map<string, CacheInfo>();
    private _globalUseId: number = 0;
    private _lastScene: string = null;
    private _sceneDepends: string[] = null;
    private _sceneResKeeper: ResKeeper = new ResKeeper();
    public resLeakChecker: ResLeakChecker = null;

    public static getSceneUseKey() {
        return ResLoader._sceneUseKey;
    }

    public constructor() {
        // 1. 构造当前场景依赖
        let scene = cc.director.getScene();
        if (scene) {
            this._cacheScene(scene);
        }
        // 2. 监听场景切换
        cc.director.on(cc.Director.EVENT_BEFORE_SCENE_LAUNCH, (scene) => {
            this._sceneResKeeper.releaseAutoRes();
            this._cacheScene(scene);
        });
    }

    /**
     * 从cc.loader中获取一个资源的item
     * @param url 查询的url
     * @param type 查询的资源类型
     */
    private _getResItem(url: string, type: typeof cc.Asset): any {
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
    public static makeLoadResArgs(): LoadResArgs {
        if (arguments.length < 1) {
            console.error(`_makeLoadResArgs error ${arguments}`);
            return null;
        }

        if (arguments.length == 1 && (arguments[0] instanceof LoadResArgs)) {
            return arguments[0];
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
    public static makeReleaseResArgs(): ReleaseResArgs {
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
     * 场景的默认ResKeeper，由于最顶层的场景节点无法挂载组件，所以在这里维护一个
     */
    public getResKeeper() {
        return this._sceneResKeeper;
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
     * 自动生成一个唯一的资源id
     */
    public nextUseKey(): string {
        return `@${++this._globalUseId}`;
    }

    /**
     * 获取资源缓存信息
     * @param key 要获取的资源url
     */
    public getCacheInfo(key: string): CacheInfo {
        if (!this._resMap.has(key)) {
            this._resMap.set(key, {
                refs: new Set<string>(),
                uses: new Set<string>()
            });
        }
        return this._resMap.get(key);
    }

    /**
     * 获取资源的reference url
     * @param asset 
     */
    public getResKeyByAsset(asset: cc.Asset): string {
        let checkAsset: any = asset;
        if (checkAsset && checkAsset._uuid) {
            return ccloader._getReferenceKey(checkAsset._uuid);;
        }
        console.error(`getResKeyByAsset error ${asset}`);
        return null;
    }

    /**
     * 获取源url对应的reference url
     * @param url 
     * @param type 
     */
    public getResKeyByUrl(url: string, type: typeof cc.Asset): string {
        let uuid = ccloader._getResUuid(url, type, false);
        if (uuid) {
            return ccloader._getReferenceKey(uuid);
        }
        return null;
    }

    /**
     * 为某资源增加一个新的use
     * @param key 资源的url
     * @param use 新的use字符串
     */
    public addUse(key: string, use: string): boolean {
        if (this._resMap.has(key)) {
            let uses = this._resMap.get(key).uses;
            if (!uses.has(use)) {
                uses.add(use);
                if (this.resLeakChecker) {
                    this.resLeakChecker.logLoad(key, use);
                }
                return true;
            } else {
                console.warn(`addUse ${key} by ${use} faile, repeating use key`);
                return false;
            }
        }
        console.warn(`addUse ${key} faile, key nofound, make sure you load with resloader`);
        return false;
    }

    private _buildDepend(item: any, refKey: string) {
        // 反向关联引用（为所有引用到的资源打上本资源引用到的标记）
        if (item && item.dependKeys && Array.isArray(item.dependKeys)) {
            for (let depKey of item.dependKeys) {
                // 记录该资源被我引用
                let cacheInfo = this.getCacheInfo(depKey);
                if (!cacheInfo.refs.has(refKey)) {
                    this.getCacheInfo(depKey).refs.add(refKey);
                    // cc.log(`${depKey} ref by ${refKey}`);
                    let ccloader: any = cc.loader;
                    let depItem = ccloader._cache[depKey]
                    if (depItem) {
                        this._buildDepend(depItem, depItem.id);
                    }
                }
            }
        }
    }

    /**
     * 缓存一个Item
     * @param item 
     * @param use 
     */
    private _cacheItem(item: any, use?: string, stack?: string): boolean {
        if (item && item.id) {
            let info = this.getCacheInfo(item.id);
            if (use) {
                info.uses.add(use);
                if (this.resLeakChecker) {
                    this.resLeakChecker.logLoad(item.id, use, stack);
                }
            }
            if (!info.refs.has(item.id)) {
                info.refs.add(item.id);
                this._buildDepend(item, item.id);
            }
            return true;
        }
        return false;
    }

    /**
     * 完成一个Item的加载
     * @param url 
     * @param assetType 
     * @param use 
     */
    private _finishItem(url: string, assetType: typeof cc.Asset, use?: string, stack?: string) {
        let item = this._getResItem(url, assetType);
        if (!this._cacheItem(item, use, stack)) {
            cc.warn(`addDependKey item error! for ${url}`);
        }
    }

    /**
     * 获得持久节点列表
     */
    private _getPersistNodeList() {
        let game:any = cc.game;
        var persistNodeList = Object.keys(game._persistRootNodes).map(function (x) {
            return game._persistRootNodes[x];
        });
        return persistNodeList;
    }

    private _releaseSceneDepend() {
        if (this._sceneDepends) {
            let persistDepends : Set<string> = ResUtil.getNodesDepends(this._getPersistNodeList());
            for (let i = 0; i < this._sceneDepends.length; ++i) {
                // 判断是不是已经被场景切换自动释放的资源，是则直接移除缓存Item（失效项）
                let item = this._getResItem(this._sceneDepends[i], undefined);
                if (!item) {
                    this._resMap.delete(this._sceneDepends[i]);
                    cc.log(`delete untrack res ${this._sceneDepends[i]}`);
                }
                // 判断是不是持久节点依赖的资源
                else if (!persistDepends.has(this._sceneDepends[i])) {
                    this.releaseRes(this._sceneDepends[i], ResLoader._sceneUseKey);
                }
            }
            this._sceneDepends = null;
        }
    }

    private _cacheSceneDepend(depends :string[], useKey: string): string[] {
        for (let i = 0; i < depends.length; ++i) {
            let item = ccloader._cache[depends[i]];
            this._cacheItem(item, useKey);
        }
        return depends;
    }

    /**
     * 缓存场景
     * @param scene 
     */
    private _cacheScene(scene: cc.Scene) {
        // 切换的场景名相同，无需清理资源
        if (scene.name == this._lastScene) {
            return;
        }
        // 获取场景资源（这只对预加载场景有效）
        let refKey = ccloader._getReferenceKey(scene.uuid);
        let item = ccloader._cache[refKey];
        let newUseKey = `@Scene${this.nextUseKey()}`;
        let depends: string[] = null;
        // 获取新场景的依赖
        if (item) {
            depends = this._cacheSceneDepend(item.dependKeys, newUseKey);
        } else if(scene["dependAssets"]) {
            depends = this._cacheSceneDepend(scene["dependAssets"], newUseKey);
        } else {
            console.error(`cache scene faile ${scene}`);
            return;
        }
        // 释放旧场景的依赖
        this._releaseSceneDepend();
        this._lastScene = scene.name;
        ResLoader._sceneUseKey = newUseKey;
        this._sceneDepends = depends;
    }

    /**
     * 开始加载资源
     * @param url           资源url
     * @param type          资源类型，默认为null
     * @param onProgess     加载进度回调
     * @param onCompleted   加载完成回调
     * @param use           资源使用key，根据makeUseKey方法生成
     */
    public loadRes(resArgs: LoadResArgs)
    public loadRes(url: string, use?: string);
    public loadRes(url: string, onCompleted: CompletedCallback, use?: string);
    public loadRes(url: string, onProgess: ProcessCallback, onCompleted: CompletedCallback, use?: string);
    public loadRes(url: string, type: typeof cc.Asset, use?: string);
    public loadRes(url: string, type: typeof cc.Asset, onCompleted: CompletedCallback, use?: string);
    public loadRes(url: string, type: typeof cc.Asset, onProgess: ProcessCallback, onCompleted: CompletedCallback, use?: string);
    public loadRes() {
        let resArgs: LoadResArgs = ResLoader.makeLoadResArgs.apply(this, arguments);
        let stack: string;
        if (this.resLeakChecker && this.resLeakChecker.checkFilter(resArgs.url)) {
            stack = ResLeakChecker.getCallStack(1);
        }
        console.time("loadRes|" + resArgs.url);
        let finishCallback = (error: Error, resource: any) => {
            if (!error) {
                this._finishItem(resArgs.url, resArgs.type, resArgs.use, stack);
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
        let resArgs: LoadResArgs = ResLoader.makeLoadResArgs.apply(this, arguments);
        let stack: string;
        if (this.resLeakChecker && this.resLeakChecker.checkFilter(resArgs.url)) {
            stack = ResLeakChecker.getCallStack(1);
        }
        let finishCallback = (error: Error, resource: any[], urls?: string[]) => {
            if (!error) {
                for (let i = 0; i < resArgs.urls.length; ++i) {
                    this._finishItem(resArgs.urls[i], resArgs.type, resArgs.use, stack);
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
        let resArgs: LoadResArgs = ResLoader.makeLoadResArgs.apply(this, arguments);
        let stack: string;
        if (this.resLeakChecker && this.resLeakChecker.checkFilter(resArgs.url)) {
            stack = ResLeakChecker.getCallStack(1);
        }
        let finishCallback = (error: Error, resource: any[], urls?: string[]) => {
            if (!error && urls) {
                for (let i = 0; i < urls.length; ++i) {
                    this._finishItem(urls[i], resArgs.type, resArgs.use, stack);
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
        let resArgs: ReleaseResArgs = ResLoader.makeReleaseResArgs.apply(this, arguments);
        for (let i = 0; i < resArgs.urls.length; ++i) {
            this.releaseRes(resArgs.urls[i], resArgs.type, resArgs.use);
        }
    }

    public releaseResDir(url: string, use?: string);
    public releaseResDir(url: string, type: typeof cc.Asset, use?: string)
    public releaseResDir() {
        let resArgs: ReleaseResArgs = ResLoader.makeReleaseResArgs.apply(this, arguments);
        let ccloader: any = cc.loader;
        let urls: string[] = [];
        ccloader._assetTables.assets.getUuidArray(resArgs.url, resArgs.type, urls);
        for (let i = 0; i < urls.length; ++i) {
            this.releaseRes(urls[i], resArgs.type, resArgs.use);
        }
    }

    /**
     * 直接通过asset释放资源（如cc.Prefab、cc.SpriteFrame）
     * @param asset 要释放的asset
     */
    public releaseAsset(asset: any, use?: string) {
        if (asset && asset._uuid) {
            let id = ccloader._getReferenceKey(asset._uuid);
            if (id) {
                let item = ccloader._cache[id];
                if (item) {
                    let cacheInfo = this.getCacheInfo(id);
                    if (use) {
                        cacheInfo.uses.delete(use)
                        if (this.resLeakChecker) {
                            this.resLeakChecker.logRelease(id, use);
                        }
                    }
                    if (cacheInfo.uses.size == 0) {
                        this._release(item, id);
                    }
                }
            }
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
        let resArgs: ReleaseResArgs = ResLoader.makeReleaseResArgs.apply(this, arguments);
        let item = this._getResItem(resArgs.url, resArgs.type);
        if (!item) {
            console.warn(`releaseRes item is null ${resArgs.url} ${resArgs.type}`);
            return;
        }
        // cc.log(arguments);
        let cacheInfo = this.getCacheInfo(item.id);
        if (resArgs.use) {
            cacheInfo.uses.delete(resArgs.use)
            if (this.resLeakChecker) {
                this.resLeakChecker.logRelease(item.id, resArgs.use);
            }
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
                    if (depItem) {
                        this._release(depItem, item.id);
                    }
                }
            }

            //如果没有uuid,就直接释放url
            if (item.uuid) {
                cc.loader.release(item.uuid);
                cc.log("resloader release item by uuid :" + item.id);
            } else {
                cc.loader.release(item.id);
                cc.log("resloader release item by url:" + item.id);
            }
            this._resMap.delete(item.id);
        }
    }

    /**
     * 是否可以释放某资源
     * @param url 
     * @param use 
     */
    public canRelease(url: string, use: string): boolean {
        let cacheInfo = this.getCacheInfo(url);
        // 有其它Res引用它
        if (cacheInfo.refs.size > 1 || !cacheInfo.refs.has(url)) return false;
        // 有其它的Use使用
        if (cacheInfo.uses.size > 1 || !cacheInfo.uses.has(use)) return false;
        return true;
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
        let resArgs: ReleaseResArgs = ResLoader.makeReleaseResArgs.apply(this, arguments);
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

