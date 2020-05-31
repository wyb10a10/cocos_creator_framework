import ResLoader, { resLoader, CompletedCallback, LoadResArgs, ProcessCallback } from "./ResLoader";
/**
 * 资源引用类
 * 1. 提供加载功能，并记录加载过的资源
 * 2. 在node释放时自动清理加载过的资源
 * 3. 支持手动添加记录
 * 
 * 2019-12-13 by 宝爷
 */
const { ccclass, property } = cc._decorator;

/** 自动释放配置 */
export interface autoResInfo {
    url: string;
    use: string;
    type?: typeof cc.Asset;
};

@ccclass
export default class ResKeeper extends cc.Component {

    private autoRes: autoResInfo[] = [];

    /**
     * 加载资源，通过此接口加载的资源会在界面被销毁时自动释放
     * 如果同时有其他地方引用的资源，会解除当前界面对该资源的占用
     * @param url           资源url
     * @param type          资源类型，默认为null
     * @param onProgess     加载进度回调
     * @param onCompleted   加载完成回调
     */
    public loadRes(url: string);
    public loadRes(url: string, onCompleted: CompletedCallback);
    public loadRes(url: string, onProgess: ProcessCallback, onCompleted: CompletedCallback);
    public loadRes(url: string, type: typeof cc.Asset);
    public loadRes(url: string, type: typeof cc.Asset, onCompleted: CompletedCallback);
    public loadRes(url: string, type: typeof cc.Asset, onProgess: ProcessCallback, onCompleted: CompletedCallback);
    public loadRes() {
        let resArgs: LoadResArgs = ResLoader.makeLoadResArgs.apply(this, arguments);
        resArgs.use = resLoader.nextUseKey();
        let callback = resArgs.onCompleted;
        resArgs.onCompleted = (error: Error, res) => {
            if (!error) {
                this.autoRes.push({ url : resArgs.url, use : resArgs.use, type: resArgs.type});
            }
            callback && callback(error, res);
        }
        resLoader.loadRes(resArgs);
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
            resLoader.releaseRes(element.url, element.type, element.use);
        }
        this.autoRes.length = 0;
    }

    /**
     * 加入一个自动释放的资源
     * @param resConf 资源url和类型 [ useKey ]
     */
    public autoReleaseRes(resConf: autoResInfo) {
        if(resLoader.addUse(resConf.url, resConf.use)) {
            this.autoRes.push(resConf);
        }
    }
}
