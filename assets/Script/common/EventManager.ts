/*
*   事件管理器，事件的监听、触发、移除
*   
*   2018-9-20 by 宝爷
*/
export type EventManagerCallFunc = (eventName: string, eventData: any) => void;

import { log, warn } from "cc";

interface CallBackTarget {
    callBack: EventManagerCallFunc,
    target: any,
}

export class EventManager {
    private static instance: EventManager | null = null;
    public static getInstance(): EventManager {
        if (!this.instance) {
            this.instance = new EventManager();
        }
        return this.instance;
    }

    public static destroy(): void {
        if (this.instance) {
            this.instance = null;
        }
    }

    private constructor() {
    }

    private _eventListeners: { [key: string]: CallBackTarget[] } = {};

    private getEventListenersIndex(eventName: string, callBack: EventManagerCallFunc, target?: any): number {
        let index = -1;
        for (let i = 0; i < this._eventListeners[eventName].length; i++) {
            let iterator = this._eventListeners[eventName][i];
            if (iterator.callBack == callBack && (!target || iterator.target == target)) {
                index = i;
                break;
            }
        }
        return index;
    }

    addEventListener(eventName: string, callBack: EventManagerCallFunc, target?: any): boolean {
        if (!eventName) {
            warn("eventName is empty" + eventName);
            return false;
        }

        if (null == callBack) {
            log('addEventListener callBack is nil');
            return false;
        }
        let callTarget: CallBackTarget = { callBack: callBack, target: target };
        if (null == this._eventListeners[eventName]) {
            this._eventListeners[eventName] = [callTarget];

        } else {
            let index = this.getEventListenersIndex(eventName, callBack, target);
            if (-1 == index) {
                this._eventListeners[eventName].push(callTarget);
            }
        }

        return true;
    }

    setEventListener(eventName: string, callBack: EventManagerCallFunc, target?: any): boolean {
        if (!eventName) {
            warn("eventName is empty" + eventName);
            return false;
        }

        if (null == callBack) {
            log('setEventListener callBack is nil');
            return false;
        }
        let callTarget: CallBackTarget = { callBack: callBack, target: target };
        this._eventListeners[eventName] = [callTarget];
        return true;
    }

    removeEventListener(eventName: string, callBack: EventManagerCallFunc, target?: any) {
        if (null != this._eventListeners[eventName]) {
            let index = this.getEventListenersIndex(eventName, callBack, target);
            if (-1 != index) {
                this._eventListeners[eventName].splice(index, 1);
            }
        }
    }

    raiseEvent(eventName: string, eventData?: any) {
        console.log(`==================== raiseEvent ${eventName} begin | ${JSON.stringify(eventData)}`);
        if (null != this._eventListeners[eventName]) {
            // 将所有回调提取出来，再调用，避免调用回调的时候操作了事件的删除
            let callbackList: CallBackTarget[] = [];
            for (const iterator of this._eventListeners[eventName]) {
                callbackList.push({ callBack: iterator.callBack, target: iterator.target });
            }
            for (const iterator of callbackList) {
                iterator.callBack.call(iterator.target, eventName, eventData);
            }
        }
        console.log(`==================== raiseEvent ${eventName} end`);
    }
}

export let EventMgr = EventManager.getInstance();