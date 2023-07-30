import { Asset, Component, _decorator } from "cc";
import { AssetType, CompleteCallback, ProgressCallback, resLoader } from "./ResLoader";
/**
 * 资源引用类
 * 1. 提供加载功能，并记录加载过的资源
 * 2. 在node释放时自动清理加载过的资源
 * 3. 支持手动添加记录
 * 
 * 2019-12-13 by 宝爷
 */
const { ccclass } = _decorator;

@ccclass
export class ResKeeper extends Component {

    private resCache = new Set<Asset>();

    /**
     * 开始加载资源
     * @param bundle        assetbundle的路径
     * @param url           资源url或url数组
     * @param type          资源类型，默认为null
     * @param onProgess     加载进度回调
     * @param onCompleted   加载完成回调
     */
    public load<T extends Asset>(bundleName: string, paths: string | string[], type: AssetType<T> | null, onProgress: ProgressCallback | null, onComplete: CompleteCallback<T> | null): void;
    public load<T extends Asset>(bundleName: string, paths: string | string[], onProgress: ProgressCallback | null, onComplete: CompleteCallback<T> | null): void;
    public load<T extends Asset>(bundleName: string, paths: string | string[], onComplete?: CompleteCallback<T> | null): void;
    public load<T extends Asset>(bundleName: string, paths: string | string[], type: AssetType<T> | null, onComplete?: CompleteCallback<T> | null): void;
    public load<T extends Asset>(paths: string | string[], type: AssetType<T> | null, onProgress: ProgressCallback | null, onComplete: CompleteCallback<T> | null): void;
    public load<T extends Asset>(paths: string | string[], onProgress: ProgressCallback | null, onComplete: CompleteCallback<T> | null): void;
    public load<T extends Asset>(paths: string | string[], onComplete?: CompleteCallback<T> | null): void;
    public load<T extends Asset>(paths: string | string[], type: AssetType<T> | null, onComplete?: CompleteCallback<T> | null): void;
    public load(...args: any) {
        // 调用加载接口
        resLoader.load.apply(resLoader, args);
    }

    /**
     * 缓存资源
     * @param asset 
     */
    public cacheAsset(asset: Asset) {
        if (!this.resCache.has(asset)) {
            asset.addRef();
            this.resCache.add(asset);
        }
    }

    /**
     * 组件销毁时自动释放所有keep的资源
     */
    public onDestroy() {
        this.releaseAssets();
    }

    /**
     * 释放资源，组件销毁时自动调用
     */
    public releaseAssets() {
        this.resCache.forEach(element => {
            element.decRef();
        });
        this.resCache.clear();
    }
}