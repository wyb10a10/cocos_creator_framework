/**
 * cc.Asset的管理器
 * 1. 对cc.Asset进行注入，扩展其addRef和decRef方法，使其支持引用计数
 * 2. 对cc.Asset进行资源依赖管理
 * 3. 接管场景切换时，资源的引用管理，避免无引用计数的场景依赖被意外释放
 * 
 * 2021-1-21 by 宝爷
 */

let loader: any = cc.loader;

export default class ResManager {
    private static instance: ResManager;
    private static lastScene: cc.Scene = null;

    // 处理场景切换，分两种情况，一种为根据scene的uuid找到场景的资源，另外一种为根据scene.dependAssets进行缓存
    private static onSceneChange(scene: cc.Scene) {
        console.log('On Scene Change');
        if (CC_EDITOR || this.lastScene == scene) {
            return;
        }

        if (scene['dependAssets']) {
            let depends = scene['dependAssets'];
            for (let i = 0; i < depends.length; ++i) {
                ResManager.Instance.cacheAsset(depends[i]);
            }
            if (this.lastScene && this.lastScene['dependAssets']) {
                let depends = this.lastScene['dependAssets'];
                for (let i = 0; i < depends.length; ++i) {
                    ResManager.Instance.releaseAsset(depends[i]);
                }
            }
        } else {
            ResManager.Instance.cacheAsset(scene.uuid);
            if (this.lastScene) {
                ResManager.Instance.releaseAsset(this.lastScene.uuid);
            }
        }
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
                    value: 1,
                },
                addRef: {
                    value: function (): cc.Asset {
                        ++this.refCount;
                        return this;
                    }
                },
                decRef: {
                    value: function (): cc.Asset {
                        --this.refCount;
                        if (this.refCount <= 0) {
                            ResManager.Instance.releaseAsset(this);
                        }
                        return this;
                    }
                }
            });
        }
    }

    private constructor() {
        cc.director.on(cc.Director.EVENT_BEFORE_SCENE_LAUNCH, ResManager.onSceneChange);
        cc.game.once(cc.game.EVENT_ENGINE_INITED, ResManager.assetInit);
    }

    public static get Instance() {
        if (!this.instance) {
            this.instance = new ResManager();
        }
        return this.instance;
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
                // 原生资源、html元素有可能走到这里
                console.log(`cacheItem ${item} is not cc.Asset ${asset}`);
            }
        } else {
            console.warn(`cacheItem error, item is ${item}`);
        }
    }

    public cacheAsset(assetOrUrlOrUuid: cc.Asset | string) {
        let key = loader._getReferenceKey(assetOrUrlOrUuid);
        if (key) {
            let item = loader.getItem(key);
            if (item) {
                this.cacheItem(item);
            } else {
                console.warn(`cacheAsset error, loader.getItem ${key} is ${item}`);
            }
        } else {
            console.warn(`cacheAsset error, loader._getReferenceKey ${assetOrUrlOrUuid} return ${key}`);
        }
    }

    /**
     * 释放一个资源
     * @param item 资源的item对象
     */
    private releaseItem(item: any) {
        if (item && item.content) {
            let asset: any = item.content;
            let res = item.uuid || item.id;
            if (asset instanceof cc.Asset) {
                asset.decRef();
                if (asset.refCount == 0) {
                    let depends = item.dependKeys;
                    if (depends) {
                        for (var i = 0; i < depends.length; i++) {
                            this.releaseItem(depends[i]);
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

    public releaseAsset(assetOrUrlOrUuid: cc.Asset | string) {
        let key = loader._getReferenceKey(assetOrUrlOrUuid);
        if (key) {
            let item = loader.getItem(key);
            if (item) {
                this.releaseItem(item);
            } else {
                console.warn(`releaseAsset error, loader.getItem ${key} is ${item}`);
            }
        } else {
            console.warn(`releaseAsset error, loader._getReferenceKey ${assetOrUrlOrUuid} return ${key}`);
        }
    }
}
