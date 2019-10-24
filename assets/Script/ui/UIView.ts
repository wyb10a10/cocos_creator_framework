import { resLoader, CompletedCallback } from "../res/ResLoader"

/**
 * UIView界面基础类
 * 
 * 1. 快速关闭与屏蔽点击的选项配置
 * 2. 界面缓存设置（开启后界面关闭不会被释放，以便下次快速打开）
 * 3. 界面显示类型配置
 * 
 * 4. 加载资源接口（随界面释放自动释放）
 * 5. 由UIManager释放
 * 
 * 5. 界面初始化回调（只调用一次）
 * 6. 界面打开回调（每次打开回调）
 * 7. 界面打开动画播放结束回调（动画播放完回调）
 * 8. 界面关闭回调
 * 9. 界面置顶回调
 * 
 * 2018-8-28 by 宝爷
 */

const { ccclass, property } = cc._decorator;

/** 界面展示类型 */
export enum UIShowTypes {
    UIFullScreen,       // 全屏显示，全屏界面使用该选项可获得更高性能
    UIAddition,         // 叠加显示，性能较差
    UISingle,           // 单界面显示，只显示当前界面和背景界面，性能较好
};

/** 自动释放配置 */
interface autoResInfo {
    url: string;
    use?: string;
    type: typeof cc.Asset;
};

@ccclass
export class UIView extends cc.Component {

    /** 快速关闭 */
    @property
    quickClose: boolean = false;
    /** 屏蔽点击选项 在UIConf设置屏蔽点击*/
    // @property
    // preventTouch: boolean = true;
    /** 缓存选项 */
    @property
    cache: boolean = false;
    /** 界面显示类型 */
    @property({ type: cc.Enum(UIShowTypes) })
    showType: UIShowTypes = UIShowTypes.UISingle;

    /** 界面id */
    public UIid: number = 0;
    /** 该界面资源占用key */
    private useKey: string = null;
    /** 该界面关闭时自动释放的资源 */
    private autoRes: autoResInfo[] = [];
    /**  静态变量，用于区分相同界面的不同实例 */
    private static uiIndex: number = 0;

    /**
     * 当界面被创建时回调，生命周期内只调用
     * @param args 可变参数
     */
    public init(...args): void {

    }

    /**
     * 当界面被打开时回调，每次调用Open时回调
     * @param fromUI 从哪个UI打开的
     * @param args 可变参数
     */
    public onOpen(fromUI: number, ...args): void {

    }

    /**
     * 每次界面Open动画播放完毕时回调
     */
    public onOpenAniOver(): void {
    }

    /**
     * 当界面被关闭时回调，每次调用Close时回调
     */
    public onClose(): any {

    }

    /**
     * 当界面被置顶时回调，Open时并不会回调该函数
     * @param preID 前一个ui
     * @param args 可变参数
     */
    public onTop(preID: number, ...args): void {

    }

    /**
     * 获取该界面的资源占用key
     */
    public getUseKey(): string {
        if (!this.useKey) {
            this.useKey = resLoader.makeUseKey("UI_", this.UIid.toString(), `${++UIView.uiIndex}`);
        }
        return this.useKey;
    }

    /**
     * 加载资源，通过此接口加载的资源会在界面被销毁时自动释放
     * 如果同时有其他地方引用的资源，会解除当前界面对该资源的占用
     * @param url 要加载的url
     * @param type 类型，如cc.Prefab,cc.SpriteFrame,cc.Texture2D
     * @param onCompleted 
     */
    public loadRes(url: string, type: typeof cc.Asset, onCompleted: CompletedCallback) {
        let useStr = this.getUseKey();
        resLoader.loadRes(url, type, (error: Error, res) => {
            if (!error) {
                this.autoRes.push({ url: url, type: type });
            }
            onCompleted && onCompleted(error, res);
        }, useStr);
    }

    /**
     * 释放资源，界面销毁时在UIManager中调用
     */
    public releaseAutoRes() {
        for (let index = 0; index < this.autoRes.length; index++) {
            const element = this.autoRes[index];
            resLoader.releaseRes(element.url,
                element.type, element.use || this.getUseKey());
        }
    }

    /**
     * 往一个界面加入一个自动释放的资源
     * @param resConf 资源url和类型
     */
    public autoReleaseRes(resConf: autoResInfo) {
        this.autoRes.push(resConf);
    }
}
