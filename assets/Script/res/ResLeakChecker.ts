/**
 * 资源泄露检查类，可以用于跟踪资源的引用情况
 * 
 * 2021-1-31 by 宝爷
 */

import { Asset } from "cc";
import { ResUtil } from "./ResUtil";

export type FilterCallback = (asset: Asset) => boolean;

declare module "cc" {
    interface Asset {
        traceMap?: Map<string, number>;
        resetTrace?: () => void;
    }
}

export class ResLeakChecker {
    public resFilter: FilterCallback | null = null;    // 资源过滤回调
    private _checking: boolean = false;
    private traceAssets: Set<Asset> = new Set<Asset>();

    /**
     * 检查该资源是否符合过滤条件
     * @param url 
     */
    public checkFilter(asset: Asset): boolean {
        if (!this._checking) {
            return false;
        }
        if (this.resFilter) {
            return this.resFilter(asset);
        }
        return true;
    }

    /**
     * 对资源进行引用的跟踪
     * @param asset 
     */
    public traceAsset(asset: Asset) {
        if (!asset || !this.checkFilter(asset)) {
            return;
        }
        if (!this.traceAssets.has(asset)) {
            asset.addRef();
            this.traceAssets.add(asset);
            this.extendAsset(asset);
        }
    }

    /**
     * 扩展asset，使其支持引用计数追踪
     * @param asset 
     */
    public extendAsset(asset: Asset) {
        let addRefFunc = asset.addRef;
        let decRefFunc = asset.decRef;
        let traceMap = new Map<string, number>();
        asset.traceMap = traceMap;
        asset.addRef = function (...args: any): Asset {
            let stack = ResUtil.getCallStack(1);
            let cnt = traceMap.has(stack) ? traceMap.get(stack)! + 1 : 1;
            traceMap.set(stack, cnt);
            return addRefFunc.apply(asset, args);
        }
        asset.decRef = function (...args: any): Asset {
            let stack = ResUtil.getCallStack(1);
            let cnt = traceMap.has(stack) ? traceMap.get(stack)! + 1 : 1;
            traceMap.set(stack, cnt);
            return decRefFunc.apply(asset, args);
        }
        asset.resetTrace = () => {
            asset.addRef = addRefFunc;
            asset.decRef = decRefFunc;
            delete asset.traceMap;
        }
    }

    /**
     * 还原asset，使其恢复默认的引用计数功能
     * @param asset 
     */
    public resetAsset(asset: Asset) {
        if (asset.resetTrace) {
            asset.resetTrace();
        }
    }

    public untraceAsset(asset: Asset) {
        if (this.traceAssets.has(asset)) {
            this.resetAsset(asset);
            asset.decRef();
            this.traceAssets.delete(asset);
        }
    }

    public startCheck() { this._checking = true; }
    public stopCheck() { this._checking = false; }
    public getTraceAssets(): Set<Asset> { return this.traceAssets; }

    public reset() {
        this.traceAssets.forEach(element => {
            this.resetAsset(element);
            element.decRef();
        });
        this.traceAssets.clear();
    }

    public dump() {
        this.traceAssets.forEach(element => {
            let traceMap: Map<string, number> | undefined = element.traceMap;
            if (traceMap) {
                traceMap.forEach((key, value) => {
                    console.log(`${key} : ${value} `);                    
                });
            }
        })
    }
}
