/**
 * 网络同步基础工具
 * 1. 属性复制相关
 *  基础属性复制
 *  数组复制
 *  对象复制
 */

/**
 * 一个属性的变化信息
 * version : 该属性的最新版本号
 * data : 该属性的最新数据
 * 
 * 当属性为 :
 * 基础类型 - data为最新的值
 * 结构对象类型 - data为ReplicateObject
 * 数组类型 - data为整个数组对象（每次变化都会全量更新数组）
 * 节点类型 - data为节点的网络唯一ID
 * 组件类型 - data为组件的网络唯一ID
 */
interface ReplicateProperty {
    version: number;
    data: any;
}

/**
 * 负责一个组件中所有被标记为replicate的属性的复制和赋值
 * 收集所有增量的变化，并标记版本号
 */
class ReplicateObject {
    /** 最后一个有数据变化的版本号 */
    private lastVersion: number = 0;
    /** 历史所有差异，属性名 : 变化参数 */
    private historyMap: Map<string, ReplicateProperty> = new Map<string, ReplicateProperty>();
    /** 上次同步到现在的所有变化 */
    private changeMap: Map<string, any> = new Map<string, any>();

    public genProperty(outObject: Object, key: string, data: any) {
        if (data instanceof ReplicateObject) {
        }
    }

    /**
     * 生成从fromVersion到toVersion的增量差异包，如果新的变化产生，则最新的变化会标记为toVersion
     * @param fromVersion 
     * @param toVersion 
     */
    public genDiff(fromVersion: number, toVersion: number): any {
        if (toVersion <= fromVersion) {
            return false;
        }

        // 没有差异
        if (fromVersion > this.lastVersion && this.changeMap.size == 0) {
            return false;
        }

        let outObject = {};
        if (this.changeMap.size > 0) {
            this.lastVersion = toVersion;
            // 生成新版本
            for (let [key, changeData] of this.changeMap) {
                this.historyMap.set(key, { version: toVersion, data: changeData });
                this.genProperty(outObject, key, changeData);
            }
            // 清空changeMap（因为ret外面要用到，所以这里直接清理）
            // 实际上不正确，因为没有处理数组和结构体等情况
            this.changeMap.clear();
        }

        for (let [key, property] of this.historyMap) {
            if (property.version > fromVersion) {
                this.genProperty(outObject, key, property.data);
            }
        }

        return outObject;
    }

    /**
     * 应用差异数据，更新到最新状态
     * @param diff 
     */
    public applyDiff(diff: any) {

    }
}
