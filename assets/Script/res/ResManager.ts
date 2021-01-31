/**
 * cc.Asset的管理器
 * 1. 对cc.Asset进行注入，扩展其addRef和decRef方法，使其支持引用计数
 * 2. 对cc.Asset进行资源依赖管理
 * 3. 接管场景切换时，资源的引用管理，避免无引用计数的场景依赖被意外释放
 * 
 * 2021-1-21 by 宝爷
 */

import { ResKeeper } from "./ResKeeper";
import { ResUtil } from "./ResUtil";

let loader: any = cc.loader;

export default class ResManager {
    private static instance: ResManager;
    private defaultKeeper: ResKeeper = new ResKeeper();
    private persistDepends: Set<string> = new Set<string>();
    private sceneDepends: string[] = null;
    private lastScene = null;

    /**
     * 获取当前场景的持久节点应用的资源
     */
    private getPersistDepends() : Set<string> {
        let game:any = cc.game;
        var persistNodeList = Object.keys(game._persistRootNodes).map(function (x) {
            return game._persistRootNodes[x];
        });
        return ResUtil.getNodesDepends(persistNodeList);
    }

    /**
     * 处理场景切换，分两种情况，一种为根据scene的uuid找到场景的资源，另外一种为根据scene.dependAssets进行缓存
     * @param scene 
     */
    private onSceneChange(scene: cc.Scene) {
        console.log('On Scene Change');
        if (CC_EDITOR || this.lastScene == scene) {
            return;
        }

        // 获取新场景的依赖
        let depends: string[] = null;
        if (scene['dependAssets'] instanceof Array) {
            depends = scene['dependAssets'];
        } else {
            let item = loader.getItem(scene.uuid);
            if(item) {
                depends = item.dependKeys;
            } else {
                console.error(`cache scene faile ${scene}`);
                return;
            }
        }

        // 缓存新场景的依赖
        for (let i = 0; i < depends.length; ++i) {
            // 下一个场景的资源可能是之前的常驻资源，这里
            if (!this.persistDepends.has(depends[i])) {
                this.cacheAsset(depends[i]);
            }
        }

        // 获取持久节点依赖
        let persistRes : Set<string> = this.getPersistDepends();

        // 释放旧场景依赖
        if (this.sceneDepends) {
            for (let i = 0; i < this.sceneDepends.length; ++i) {
                if (persistRes.has(this.sceneDepends[i])) {
                    // 如果是常驻节点的资源，就先不释放，放到persistDepends，等待合适的时机释放
                    this.persistDepends.add(this.sceneDepends[i]);
                } else if (!this.persistDepends.has(this.sceneDepends[i])) {
                    // 当资源是上个场景的依赖，又是上上个场景的依赖和常驻资源时，释放的话会导致重复释放
                    this.releaseAsset(this.sceneDepends[i]);
                }
            }
        }

        // 释放不再是常驻节点依赖的资源，防止泄露，遍历中删除是安全的
        this.persistDepends.forEach((item) => {
            if (!persistRes.has(item)) {
                this.releaseAsset(item);
                this.persistDepends.delete(item);
            }
        });

        // 切场景时，自动释放默认资源
        this.getKeeper().releaseAssets();
        this.lastScene = scene;
    }


    // 为cc.Asset注入引用计数的功能
    private static assetInit() {
        console.log('asset init');
        if (!Object.getOwnPropertyDescriptor(cc.Asset.prototype, 'addRef')) {
            Object.defineProperties(cc.Asset.prototype, {
                refDepends: {
                    configurable: true,
                    writable: true,
                    enumerable: false,
                    value: false,
                },
                refCount: {
                    configurable: true,
                    writable: true,
                    enumerable: false,
                    value: 0,
                },
                addRef: {
                    value: function (): cc.Asset {
                        ++this.refCount;
                        return this;
                    }
                },
                decRef: {
                    value: function (autoRelease = true): cc.Asset {
                        --this.refCount;
                        if (this.refCount <= 0 && autoRelease) {
                            ResManager.Instance.releaseAsset(this);
                        }
                        return this;
                    }
                }
            });
        }
    }

    private constructor() {
        cc.game.once(cc.game.EVENT_ENGINE_INITED, ResManager.assetInit);
        cc.director.on(cc.Director.EVENT_BEFORE_SCENE_LAUNCH, (scene) => {
            this.onSceneChange(scene);
        });
    }

    public static get Instance() {
        if (!this.instance) {
            this.instance = new ResManager();
        }
        return this.instance;
    }

    public getKeeper() : ResKeeper {
        return this.defaultKeeper;
    }

    private getReferenceKey(assetOrUrlOrUuid: cc.Asset | string) {
        if (assetOrUrlOrUuid instanceof cc.Asset && !assetOrUrlOrUuid['_uuid']) {
            // 远程资源没有_uuid
            if (assetOrUrlOrUuid.url) {
                return assetOrUrlOrUuid.url;
            }
        }
        return loader._getReferenceKey(assetOrUrlOrUuid);
    }

    /**
     * 缓存一个资源
     * @param item 资源的item对象
     */
    private cacheItem(item: any) {
        if (item) {
            let asset: cc.Asset = item.content;
            if (asset instanceof cc.Asset) {
                asset.addRef();
                if (!asset.refDepends && item.dependKeys) {
                    let depends = item.dependKeys;
                    for (var i = 0; i < depends.length; i++) {
                        this.cacheItem(loader.getItem(depends[i]));
                    }
                    asset.refDepends = true;
                }
            } else {
                // 原生资源、html元素有可能走到这里，原生资源都是有对应的cc.Asset对应引用的，所以这里可以不处理
                console.log(`cacheItem ${item} is not cc.Asset ${asset}`);
            }
        } else {
            console.warn(`cacheItem error, item is ${item}`);
        }
    }

    public cacheAsset(assetOrUrlOrUuid: cc.Asset | string) {
        let key = this.getReferenceKey(assetOrUrlOrUuid);
        if (key) {
            let item = loader.getItem(key);
            if (item) {
                this.cacheItem(item);
            } else {
                console.warn(`cacheAsset error, loader.getItem ${key} is ${item}`);
            }
        } else {
            console.warn(`cacheAsset error, this.getReferenceKey ${assetOrUrlOrUuid} return ${key}`);
        }
    }

    /**
     * 释放一个资源
     * @param item 资源的item对象
     */
    private releaseItem(item: any, dec: boolean = false) {
        if (item && item.content) {
            let asset: any = item.content;
            let res = item.uuid || item.id;
            if (asset instanceof cc.Asset) {
                if (dec) {
                    asset.decRef(false);
                }
                if (asset.refCount <= 0) {
                    let depends = item.dependKeys;
                    if (depends) {
                        for (var i = 0; i < depends.length; i++) {
                            this.releaseItem(loader.getItem(depends[i]), true);
                        }
                    }

                    loader.release(res);
                    cc.log(`loader.release cc.Asset ${res}`);
                }
            } else {
                loader.release(res);
                cc.log(`loader.release ${res} rawAsset ${asset}`);
            }
        } else {
            console.warn(`releaseItem error, item is ${item}`);
        }
    }

    /**
     * 释放一个资源（会减少其引用计数）
     * @param assetOrUrlOrUuid 
     */
    public releaseAsset(assetOrUrlOrUuid: cc.Asset | string) {
        let key = this.getReferenceKey(assetOrUrlOrUuid);
        if (key) {
            let item = loader.getItem(key);
            if (item) {
                this.releaseItem(item);
            } else {
                console.warn(`releaseAsset error, loader.getItem ${key} is ${item}`);
            }
        } else {
            console.warn(`releaseAsset error, this.getReferenceKey ${assetOrUrlOrUuid} return ${key}`);
        }
    }
}
