import { ResLeakChecker } from "./ResLeakChecker";

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
export type CompletedCallback = (error: Error, resource: any | any[]) => void;

export default class ResLoader {

    public resLeakChecker: ResLeakChecker = null;

    /**
     * 开始加载资源
     * @param url           资源url
     * @param type          资源类型，默认为null
     * @param onProgess     加载进度回调
     * @param onCompleted   加载完成回调
     * @param use           资源使用key，根据makeUseKey方法生成
     */
    public loadRes(url: string | string[]);
    public loadRes(url: string | string[], onCompleted: CompletedCallback);
    public loadRes(url: string | string[], onProgess: ProcessCallback, onCompleted: CompletedCallback);
    public loadRes(url: string | string[], type: typeof cc.Asset);
    public loadRes(url: string | string[], type: typeof cc.Asset, onCompleted: CompletedCallback);
    public loadRes(url: string | string[], type: typeof cc.Asset, onProgess: ProcessCallback, onCompleted: CompletedCallback);
    public loadRes() {
        cc.resources.load.apply(cc.resources, arguments);
    }

    public loadResDir(dir: string);
    public loadResDir(url: string, onCompleted: CompletedCallback);
    public loadResDir(url: string, onProgess: ProcessCallback, onCompleted: CompletedCallback);
    public loadResDir(url: string, type: typeof cc.Asset);
    public loadResDir(url: string, type: typeof cc.Asset, onCompleted: CompletedCallback);
    public loadResDir(url: string, type: typeof cc.Asset, onProgess: ProcessCallback, onCompleted: CompletedCallback);
    public loadResDir() {
        cc.resources.loadDir.apply(cc.resources, arguments);
        /* let stack: string;
        if (this.resLeakChecker && this.resLeakChecker.checkFilter(arguments[0])) {
            stack = ResLeakChecker.getCallStack(1);
        }*/
    }

    public loadRemoteRes<T extends cc.Asset>(url: string, options: Record<string, any>, onComplete: (err: Error, asset: T) => void): void;
    public loadRemoteRes<T extends cc.Asset>(url: string, options: Record<string, any>): void;
    public loadRemoteRes<T extends cc.Asset>(url: string, onComplete: (err: Error, asset: T) => void): void;
    public loadRemoteRes<T extends cc.Asset>(url: string): void;	
    public loadRemoteRes() {
        cc.assetManager.loadRemote.apply(cc.assetManager, arguments);
    }

    public releaseArray(assets: cc.Asset[]) {
        for (let i = 0; i < assets.length; ++i) {
            this.releaseAsset(assets[i]);
        }
    }

    /**
     * 直接通过asset释放资源（如cc.Prefab、cc.SpriteFrame）
     * @param asset 要释放的asset
     */
    public releaseAsset(asset: cc.Asset) {
        asset.decRef();
    }
}

export let resLoader: ResLoader = new ResLoader();

