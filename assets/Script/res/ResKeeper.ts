import { resLoader, CompletedCallback } from "./ResLoader";
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
    use?: string;
    type: typeof cc.Asset;
};

@ccclass
export default class ResKeeper extends cc.Component {

    private autoRes: autoResInfo[] = [];
    /**
     * 加载资源，通过此接口加载的资源会在界面被销毁时自动释放
     * 如果同时有其他地方引用的资源，会解除当前界面对该资源的占用
     * @param url 要加载的url
     * @param type 类型，如cc.Prefab,cc.SpriteFrame,cc.Texture2D
     * @param onCompleted 
     */
    public loadRes(url: string, type: typeof cc.Asset, onCompleted: CompletedCallback) {
        let use = resLoader.nextUseKey();
        resLoader.loadRes(url, type, (error: Error, res) => {
            if (!error) {
                this.autoRes.push({ url, use, type });
            }
            onCompleted && onCompleted(error, res);
        }, use);
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
        this.autoRes.push(resConf);
    }
}

export class ResUtil {
    /**
     * 从目标节点或其父节点递归查找一个资源挂载组件
     * @param attachNode 目标节点
     * @param autoCreate 当目标节点找不到ResKeeper时是否自动创建一个
     */
    static getResKeeper(attachNode: cc.Node, autoCreate?: boolean) : ResKeeper {
        if (attachNode) {
            let ret = attachNode.getComponent(ResKeeper);
            if (!ret) {
                if (autoCreate) {
                    return attachNode.addComponent(ResKeeper);
                } else {
                    return ResUtil.getResKeeper(attachNode.parent, autoCreate);
                }
            }
            return ret;
        }
        return null;
    }
}
