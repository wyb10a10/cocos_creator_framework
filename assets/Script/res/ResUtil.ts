import { instantiate, Node, Asset, Prefab } from "cc";
import { ResKeeper } from "./ResKeeper";
import { CompleteCallback, ProgressCallback } from "./ResLoader";
/**
 * 资源使用相关工具类
 * 2020-1-18 by 宝爷
 */

export class ResUtil {
    /**
     * 开始加载资源
     * @param bundle        assetbundle的路径
     * @param url           资源url或url数组
     * @param type          资源类型，默认为null
     * @param onProgess     加载进度回调
     * @param onCompleted   加载完成回调
     */
    public static load<T extends Asset>(attachNode: Node, url: string | string[], onCompleted: CompleteCallback<T> | null): void;
    public static load<T extends Asset>(attachNode: Node, url: string | string[], onProgess: ProgressCallback | null, onCompleted: CompleteCallback<T> | null): void;
    public static load<T extends Asset>(attachNode: Node, url: string | string[], type: typeof Asset, onCompleted: CompleteCallback<T> | null): void;
    public static load<T extends Asset>(attachNode: Node, url: string | string[], type: typeof Asset, onProgess: ProgressCallback | null, onCompleted: CompleteCallback<T> | null): void;
    public static load<T extends Asset>(attachNode: Node, bundle: string, url: string | string[], onCompleted: CompleteCallback<T> | null): void;
    public static load<T extends Asset>(attachNode: Node, bundle: string, url: string | string[], onProgess: ProgressCallback | null, onCompleted: CompleteCallback<T> | null): void;
    public static load<T extends Asset>(attachNode: Node, bundle: string, url: string | string[], type: typeof Asset, onCompleted: CompleteCallback<T> | null): void;
    public static load<T extends Asset>(attachNode: Node, bundle: string, url: string | string[], type: typeof Asset, onProgess: ProgressCallback | null, onCompleted: CompleteCallback<T> | null): void;
    public static load<T extends Asset>(attachNode: Node, ...args: any): void {
        let keeper = ResUtil.getResKeeper(attachNode);
        keeper!.load.apply(keeper, args);
    }

    /**
     * 从目标节点或其父节点递归查找一个资源挂载组件
     * @param attachNode 目标节点
     * @param autoCreate 当目标节点找不到ResKeeper时是否自动创建一个
     */
    public static getResKeeper(attachNode: Node, autoCreate?: boolean): ResKeeper | null {
        if (attachNode) {
            let ret = attachNode.getComponent(ResKeeper);
            if (!ret) {
                if (autoCreate) {
                    return attachNode.addComponent(ResKeeper);
                } else {
                    return ResUtil.getResKeeper(attachNode.parent!, autoCreate);
                }
            }
            return ret;
        }
        // 返回一个默认的ResKeeper
        return null;
    }

    /**
    * 赋值srcAsset，并使其跟随targetNode自动释放，用法如下
    * mySprite.spriteFrame = AssignWith(otherSpriteFrame, mySpriteNode);
    * @param srcAsset 用于赋值的资源，如cc.SpriteFrame、cc.Texture等等
    * @param targetNode 
    * @param autoCreate 
    */
    public static assignWith(srcAsset: Asset, targetNode: Node, autoCreate?: boolean): any {
        let keeper = ResUtil.getResKeeper(targetNode, autoCreate);
        if (keeper && srcAsset instanceof Asset) {
            keeper.cacheAsset(srcAsset);
            return srcAsset;
        } else {
            console.error(`assignWith ${srcAsset} to ${targetNode} faile`);
            return null;
        }
    }

    /**
     * 实例化一个prefab，并带自动释放功能
     * @param prefab 要实例化的预制
     */
    public static instantiate(prefab: Prefab): Node {
        let node = instantiate(prefab);
        let keeper = ResUtil.getResKeeper(node, true);
        if (keeper) {
            keeper.cacheAsset(prefab);
        }
        return node;
    }

    /**
     * 从字符串中查找第N个字符
     * @param str 目标字符串
     * @param cha 要查找的字符
     * @param num 第N个
     */
    static findCharPos(str: string, cha: string, num: number): number {
        let x = str.indexOf(cha);
        let ret = x;
        for (var i = 0; i < num; i++) {
            x = str.indexOf(cha, x + 1);
            if (x != -1) {
                ret = x;
            } else {
                return ret;
            }
        }
        return ret;
    }

    /**
     * 获取当前调用堆栈
     * @param popCount 要弹出的堆栈数量
     */
    static getCallStack(popCount: number): string {
        // 严格模式无法访问 arguments.callee.caller 获取堆栈，只能先用Error的stack
        let ret = (new Error()).stack;
        let pos = ResUtil.findCharPos(ret!, '\n', popCount);
        if (pos > 0) {
            ret = ret!.slice(pos);
        }
        return ret!;
    }
}
