import ResLoader, { CompletedCallback, ProcessCallback } from "./ResLoader";
/**
 * 资源引用类
 * 1. 提供加载功能，并记录加载过的资源
 * 2. 在node释放时自动清理加载过的资源
 * 3. 支持手动添加记录
 * 
 * 2019-12-13 by 宝爷
 */
const { ccclass } = cc._decorator;

@ccclass
export class ResKeeper extends cc.Component {

    private cache = new Set<cc.Asset>();

    /**
     * 开始加载资源
     * @param bundle        assetbundle的路径
     * @param url           资源url或url数组
     * @param type          资源类型，默认为null
     * @param onProgess     加载进度回调
     * @param onCompleted   加载完成回调
     */
    public load(url: string, onCompleted: CompletedCallback);
    public load(url: string, onProgess: ProcessCallback, onCompleted: CompletedCallback);
    public load(url: string, type: typeof cc.Asset, onCompleted: CompletedCallback);
    public load(url: string, type: typeof cc.Asset, onProgess: ProcessCallback, onCompleted: CompletedCallback);
    public load(url: string[], onCompleted: CompletedCallback);
    public load(url: string[], onProgess: ProcessCallback, onCompleted: CompletedCallback);
    public load(url: string[], type: typeof cc.Asset, onCompleted: CompletedCallback);
    public load(url: string[], type: typeof cc.Asset, onProgess: ProcessCallback, onCompleted: CompletedCallback);
    public load(bundle: string, url: string, onCompleted: CompletedCallback);
    public load(bundle: string, url: string, onProgess: ProcessCallback, onCompleted: CompletedCallback);
    public load(bundle: string, url: string, type: typeof cc.Asset, onCompleted: CompletedCallback);
    public load(bundle: string, url: string, type: typeof cc.Asset, onProgess: ProcessCallback, onCompleted: CompletedCallback);
    public load(bundle: string, url: string[], onCompleted: CompletedCallback);
    public load(bundle: string, url: string[], onProgess: ProcessCallback, onCompleted: CompletedCallback);
    public load(bundle: string, url: string[], type: typeof cc.Asset, onCompleted: CompletedCallback);
    public load(bundle: string, url: string[], type: typeof cc.Asset, onProgess: ProcessCallback, onCompleted: CompletedCallback);
    public load() {
        // 最后一个参数是加载完成回调
        if (arguments.length < 2 || typeof arguments[arguments.length - 1] != "function") {
            console.error(`load faile, completed callback not found`);
            return;
        }
        // 包装完成回调，添加自动缓存功能
        let finishCallback = arguments[arguments.length - 1];
        arguments[arguments.length - 1] = (error, resource) => {
            if (!error) {
                if (resource instanceof Array) {
                    resource.forEach(element => {
                        this.cacheAsset(element);
                    });
                } else {
                    this.cacheAsset(resource);
                }
            }
            finishCallback();
        }
        // 调用加载接口
        ResLoader.load.apply(ResLoader, arguments);
    }

    /**
     * 缓存资源
     * @param asset 
     */
    public cacheAsset(asset: cc.Asset) {
        if (!this.cache.has(asset)) {
            asset.addRef();
            this.cache.add(asset);
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
        this.cache.forEach(element => {
            element.decRef();
        });
        this.cache.clear();
    }
}