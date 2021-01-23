/**
 * cc.Asset的管理器
 * 1. 对cc.Asset进行注入，扩展其addRef和decRef方法，使其支持引用计数
 * 2. 对cc.Asset进行资源依赖管理
 * 
 * 2021-1-21 by 宝爷
 */

let loader: any = cc.loader;

function assetInit() {
    console.log('asset init');
    if (!Object.getOwnPropertyDescriptor(cc.Asset.prototype, 'addRef')) {
        Object.defineProperties(cc.Asset.prototype, {
            refCount : {
                configurable: true,
                writable: true,
                enumerable: false,
                value : 1,
            },
            addRef : {
                value : function () : cc.Asset {
                    ++this.refCount;
                    return this;
                }
            },
            decRef : {
                value : function () : cc.Asset {
                    --this.refCount;
                    if (this.refCount <= 0) {
                        ABCAssetManager.Instance.releaseAsset(this);
                    }
                    return this;
                }
            }
        });
    }
}
// cc.game.once(cc.game.EVENT_ENGINE_INITED, assetInit);

export default class ResManager {
    private static instance: ResManager;

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
                let depends = item.dependKeys;
                if (depends) {
                    for (var i = 0; i < depends.length; i++) {
                        this.cacheItem(loader.getItem(depends[i]));
                    }
                }    
            } else {
                // console.warn(`cacheItem error, ${item} has not asset content`);
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
        if (item) {
            let asset: any = item.content;
            if (asset instanceof cc.Asset) {
                asset.decRef();
                if (asset.refCount == 0) {
                    let depends = item.dependKeys;
                    if (depends) {
                        for (var i = 0; i < depends.length; i++) {
                            this.releaseItem(depends[i]);
                        }
                    }
    
                    if (item.uuid) {
                        loader.release(item.uuid);
                        cc.log("releaseItem by uuid :" + item.id);
                    } else {
                        loader.release(item.id);
                        cc.log("releaseItem item by url:" + item.id);
                    }
                }
            } else {
                // console.warn(`releaseItem error, ${item} has not asset content`);
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
