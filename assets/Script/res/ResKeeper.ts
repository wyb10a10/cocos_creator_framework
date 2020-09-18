import ResLoader, { resLoader, CompletedCallback, ProcessCallback } from "./ResLoader";
import { LoadResArgs, ResUtil } from "./ResUtil";
/**
 * 资源引用类
 * 1. 提供加载功能，并记录加载过的资源
 * 2. 在node释放时自动清理加载过的资源
 * 3. 支持手动添加记录
 * 
 * 2019-12-13 by 宝爷
 */
const { ccclass, property } = cc._decorator;

@ccclass
export default class ResKeeper extends cc.Component {
    private autoRes: cc.Asset[] = [];

    /**
     * 加载资源，通过此接口加载的资源会在界面被销毁时自动释放
     * 如果同时有其他地方引用的资源，会解除当前界面对该资源的占用
     * @param url           资源url
     * @param type          资源类型，默认为null
     * @param onProgess     加载进度回调
     * @param onCompleted   加载完成回调
     */
    loadRes<T extends cc.Asset>(paths: string|string[], type: typeof cc.Asset, onProgress: ProcessCallback, onComplete: CompletedCallback): void
    loadRes<T extends cc.Asset>(paths: string|string[], onProgress: ProcessCallback, onComplete: CompletedCallback): void
    loadRes<T extends cc.Asset>(paths: string|string[], type: typeof cc.Asset, onComplete: CompletedCallback): void
    loadRes<T extends cc.Asset>(paths: string|string[], onComplete: CompletedCallback): void
    loadRes<T extends cc.Asset>(paths: string|string[], type: typeof cc.Asset): void
    loadRes<T extends cc.Asset>(paths: string|string[]): void
    public loadRes() {
        let resArgs: LoadResArgs = ResUtil.parseLoadResArgs.apply(this, arguments);
        let callback = resArgs.onCompleted;
        resArgs.onCompleted = (error: Error, res: cc.Asset) => {
            if (!error) {
                res.addRef();
                this.autoRes.push(res);
            }
            callback && callback(error, res);
        }
        resLoader.loadRes(resArgs.urls, resArgs.type, resArgs.onProgess, resArgs.onCompleted);
    }

    /**
     * 组件销毁时自动释放所有keep的资源
     */
    public onDestroy() {
        this.releaseAutoRes();
    }

    /**
     * 释放资源，组件销毁时自动调用
     */
    public releaseAutoRes() {
        for (let index = 0; index < this.autoRes.length; index++) {
            const element = this.autoRes[index];
            element.decRef();
        }
        this.autoRes.length = 0;
    }

    /**
     * 加入一个自动释放的资源
     * @param asset 资源url和类型 [ useKey ]
     */
    public autoReleaseRes(asset: cc.Asset) {
        asset.addRef();
        this.autoRes.push(asset);
    }
}
