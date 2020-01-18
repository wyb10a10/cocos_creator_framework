import ResKeeper from "./ResKeeper";
import { resLoader } from "./ResLoader";
/**
 * 资源使用相关工具类
 * 2020-1-18 by 宝爷
 */

export class ResUtil {
    /**
     * 从目标节点或其父节点递归查找一个资源挂载组件
     * @param attachNode 目标节点
     * @param autoCreate 当目标节点找不到ResKeeper时是否自动创建一个
     */
    static getResKeeper(attachNode: cc.Node, autoCreate?: boolean): ResKeeper {
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
        console.error(`can't get ResKeeper for ${attachNode}`);
        return null;
    }

    /**
     * 赋值srcAsset，并使其跟随targetNode自动释放，用法如下
     * mySprite.spriteFrame = AssignWith(otherSpriteFrame, mySpriteNode);
     * @param srcAsset 用于赋值的资源，如cc.SpriteFrame、cc.Texture等等
     * @param targetNode 
     * @param autoCreate 
     */
    static assignWith(srcAsset: cc.Asset, targetNode: cc.Node, autoCreate?: boolean): any {
        let keeper = ResUtil.getResKeeper(targetNode, autoCreate);
        if (keeper && srcAsset) {
            let url = resLoader.getUrlByAsset(srcAsset);
            if (url) {
                keeper.autoReleaseRes({ url, use: resLoader.nextUseKey() });
                return srcAsset;
            }
        }
        console.error(`AssignWith ${srcAsset} to ${targetNode} faile`);
        return null;
    }

    /**
     * 实例化一个prefab，并带自动释放功能
     * @param prefab 要实例化的预制
     */
    static instantiate(prefab: cc.Prefab): cc.Node {
        let node = cc.instantiate(prefab);
        let keeper = ResUtil.getResKeeper(node, true);
        if (keeper) {
            let url = resLoader.getUrlByAsset(prefab);
            if (url) {
                keeper.autoReleaseRes({ url, type: cc.Prefab, use: resLoader.nextUseKey() });
                return node;
            }
        }
        console.warn(`instantiate ${prefab}, autoRelease faile`);
        return node;
    }
}
