const { ccclass, property } = cc._decorator;

/**
 * 网络同步组件
 * 1. 将该组件挂载到需要网络同步的节点上
 * 2. 使用 @replicated 标记需要同步的组件，以及组件下需要同步的变量
 * 3. 挂载了同步组件的子节点才会被同步
 * 4. 同步相关装饰器
 *      4.1 属性同步装饰器（同步条件判定）
 *      4.2 对象同步装饰器（同步条件判定）
 *      4.3 RPC装饰器（serverRpc，clientRpc）
 * 5. Node和Component成员变量同步
 * 6. 静态变量同步
 * 7. 
 * 
 * 2020-6-28 by 宝爷
 */


// 需要同步的标记
class PropertyDirty {
    names: Set<string> = new Set<string>(); // 记录有变化的属性
    versions: Map<string, number> = new Map<string, number>(); // 记录每个资源的版本号
    lastVersion: number = 0;
    lastDiff?: Object;
    networkId?: number;
    name?: string;
    parent?: PropertyDirty;
}

/**
 * 静态工具类，用于辅助同步
 */
export class ReplicatedUtil {
    public static MAX_SYNC_COMPONENT:number = 99;

    /**
     * 将src的name属性拷贝至dst的name数组，分3种情况
     * 1. 如果是Node或Component，支持replicated的记录其网络id，否则记录0
     * 2. 如果是添加了replicated的装饰类，则递归调用checkDiff，并返回差异
     * 3. 其它情况则全量复制
     */
    public static copyProperty(src: Object, dst: Object, name: string, version: number) {
        let object = src[name];
        if (object) {
            let syncDirty: PropertyDirty = object['_syncDirty'];
            if (object instanceof cc.Component || object instanceof cc.Node) {
                if (!syncDirty) {
                    console.error(`object ${object} is not a replicated object`);
                    return;
                }
                // Node或Component类型对象
                dst[name] = syncDirty.networkId;
                return;
            } else if (syncDirty) {
                let diffObject = this.diff(object, version);
                if (diffObject) {
                    dst[name] = diffObject;
                }
                return;
            }
        }
        dst[name] = object;
        return;
    }

    /**
     * 传入一个对象以及起始版本号，返回从起始版本到最新版本的差异
     * @param object 
     * @param version 
     */
    public static diff(object: any, version: number): any {
        let syncDirty: PropertyDirty = object['_syncDirty'];
        if (!syncDirty) {
            console.error(`object ${object} is not a replicated object`);
            return null;
        }

        if (syncDirty.names.size > 0) {
            // 有新变化，更新版本，返回差异
            let ver = 0;
            if (syncDirty.parent) {
                ver = syncDirty.parent.lastVersion;
                syncDirty.lastVersion = ver;
            } else {
                ver = ++syncDirty.lastVersion;
            }
            syncDirty.lastDiff = Object.create(null);
            // 更新字段的版本号
            syncDirty.names.forEach((value) => {
                syncDirty.versions.set(value, ver);
                this.copyProperty(object, syncDirty.lastDiff, value, version);
            });
            syncDirty.names.clear();
        }

        let lastVersion = syncDirty.lastVersion;
        // 已是最新版本，不需要增量更新
        if (version >= lastVersion) {
            return null;
        } else if ((version + 1) == lastVersion) {
            // 增量1个版本，返回最后的变化
            return syncDirty.lastDiff;
        } else {
            // 获取从指定版本到最新版本的增量变化
            let diffObject = Object.create(null);
            syncDirty.versions.forEach((value, key) => {
                if (value > version) {
                    this.copyProperty(object, diffObject, key, version);
                }
            });
            return diffObject;
        }
    }

    public static apply(src: Object, dst: Object) {
        for(let key in src) {
            let value = src[key];
            // 如果是Node或Component，通过networkId找到对应的对象
            if (value instanceof cc.Component || value instanceof cc.Node) {
                // 如果Node或Component为null，又该如何校验？对端又应该如何解析？
                // dst[key] = null;
            } else if (value instanceof Object) {
                let dstObject = dst[key];
                if (!dstObject) {
                    dstObject = Object.create(null);
                    dst[key] = dstObject;
                }
                this.apply(value, dstObject);
            } else {
                dst[key] = value;
            }
        }
    }
}

function replicatedClass<T extends { new(...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
        _syncDirty = new PropertyDirty();

        onLoad() {
            if (this instanceof cc.Component) {
                let com : cc.Component = this;
                let synCom : SyncComponent = com.node.getComponent(SyncComponent);
                if (!synCom) {
                    synCom = com.node.addComponent(SyncComponent);
                }
                let superOnLoad = super['onLoad'];
                if (superOnLoad instanceof Function) {
                    superOnLoad();
                }
                synCom.addSyncComponent(this);
            }
        }
    }
}

function replicatedProperty(target: Object, propertyName: string) {
    Object.defineProperty(target, propertyName, {
        get() { return this[`_@${propertyName}`]; },
        set(v) {
            this[`_@${propertyName}`] = v;
            let dirtyFlags: PropertyDirty = this._syncDirty;
            // 如果赋值的对象是个属性复制类（且非cc.Component和cc.Node），且其_syncDirty的
            if (v instanceof Object) {
                let vDirty: PropertyDirty = v["_syncDirty"];
                if (vDirty && vDirty.parent != dirtyFlags) {
                    vDirty.parent = dirtyFlags;
                }
            }
            // 在修改时添加到标记列表中
            if (!dirtyFlags.names.has(propertyName)) {
                dirtyFlags.names.add(propertyName);
                if (dirtyFlags.parent) {
                    dirtyFlags.parent.names.add(dirtyFlags.name);
                }
            }
        }
    });
}

export function replicated(...args) {
    switch (args.length) {
        case 2: // 属性装饰器
            return replicatedProperty.apply(this, args);
        case 1: // 类装饰器
            return replicatedClass.apply(this, args);
        default:
            throw new Error('invalid decorator!');
    }
}

/*@replicated()
class TestReplicate {
    @replicated()
    public hp: number;
    @replicated()
    public attack: number;
    @replicated()
    public name: string;

    constructor() {
    }
}*/

/**
 * 网络同步组件
 * 1. 启动时收集node上支持同步的组件，然后分配组件id，管理起来
 * 2. 调用replicate时，根据传入的version，遍历需要同步的组件，返回在version之后的属性更新结构
 * 3. 开启checkComponents后，动态检查组件的添加删除
 * 4. 开启checkChildren后，动态检查子节点的更新
 * 
 * 暂不考虑默认组件的同步，如Sprite、Mesh和动画组件等
 */
@ccclass
export class SyncComponent extends cc.Component {
    // 表示该节点的唯一id
    public networkId: number = 0;
    // 是否检查子节点的变化，暂未支持
    private checkChildren: boolean = false;
    // 是否动态检查组件的添加和删除，暂未支持
    private checkComponents: boolean = false;
    // 自增组件id
    private syncComId: number = 0;
    // 静态组件id
    private staticComId: number = 0;
    // 需要同步的组件列表
    private syncComMap: Map<number, cc.Component> = new Map<number, cc.Component>();

    /**
     * 添加一个需要进行网络同步的组件，一个节点最多只能同时添加99个组件
     * @param com 
     */
    public addSyncComponent(com : cc.Component) {
        if (this.syncComMap.size >= ReplicatedUtil.MAX_SYNC_COMPONENT) {
            console.error(`add too manay sync components!`);
        }
        let syncDirty: PropertyDirty = com['_syncDirty'];
        if (syncDirty) {
            let times = ReplicatedUtil.MAX_SYNC_COMPONENT - this.staticComId;
            // 循环找到一个未被使用的id，不能占用静态id
            do {
                if (++this.syncComId > ReplicatedUtil.MAX_SYNC_COMPONENT) {
                    this.syncComId = this.staticComId + 1;
                }
                if (!this.syncComMap.has(this.syncComId)) {
                    this.syncComMap.set(this.syncComId, com);
                    syncDirty.networkId = this.networkId + this.syncComId;
                    break;
                }
            } while(--times);
            // 无法分配id，添加同步组件失败
            if (times == 0) {
                console.error(`can't find sync component id`);
            }
        } else {
            console.error(`add ${com} is not a sync component!`);
        }
    }

    // 组件所在节点进行初始化时（节点添加到节点树时）执行
    onLoad() {
        // onLoad之后添加的为动态添加的组件
        this.staticComId = this.syncComId;
    }

    start() {

    }

    update() {

    }
}
