/*
*   任务队列管理器
*   1. 传入任务，进入队列顺序执行
*   2. 支持优先级（从小到大排序，priority越小优先级越高）
*   3. 支持队列Tag，允许多个互不影响的队列执行
*   4. 支持清理任务队列
*   5. 一个任务只能完成一次，避免代码的原因多次调用完成，导致后续任务提前执行
*
*   6. 调试模式下记录了每个Task添加时的堆栈，方便调试（可以快速查看哪个任务没有结束）
*   
*   2018-5-7 by 宝爷
*/

// 任务结束回调
export type TaskFinishCallback = () => void;
// 任务执行回调
export type TaskCallback = (TaskFinishCallback : TaskFinishCallback) => void;

class TaskInfo {
    public task: TaskCallback;
    public priority: number;
    public constructor(task: TaskCallback, priority: number) {
        this.task = task;
        this.priority = priority;
    }
}

export class TaskQueue {
    private _curTask: TaskInfo | null = null;
    private _taskQueue: TaskInfo[] = Array<TaskInfo>();

    // 添加一个任务，如果当前没有任务在执行，该任务会立即执行，否则进入队列等待
    public pushTask(task: TaskCallback, priority: number = 0): void {
        let taskInfo = new TaskInfo(task, priority);
        if (this._taskQueue.length > 0) {
            for (var i: number = this._taskQueue.length - 1; i >= 0; --i) {
                if (this._taskQueue[i].priority <= priority) {
                    this._taskQueue.splice(i + 1, 0, taskInfo);
                    return;
                }
            }
        }
        // 插到头部
        this._taskQueue.splice(0, 0, taskInfo);
        if (this._curTask == null) {
            this.executeNextTask();
        }
    }

    public clearTask(): void {
        this._curTask = null;
        this._taskQueue.length = 0;
    }

    private executeNextTask(): void {
        let taskInfo = this._taskQueue.shift() || null;
        this._curTask = taskInfo;
        if (taskInfo) {
            taskInfo.task(() => {
                if (taskInfo === this._curTask) {
                    this.executeNextTask();
                } else {
                    console.warn("your task finish twice!");
                }
            });
        }
    }
}

export class TaskManager {
    private static _instance: TaskManager | null= null;
    private _taskQueues: { [key: number]: TaskQueue } = {}

    public static getInstance(): TaskManager {
        if (!this._instance) {
            this._instance = new TaskManager();
        }
        return this._instance;
    }

    public static destory(): void {
        this._instance = null;
    }

    private constructor() {

    }

    public pushTask(task: TaskCallback, priority: number = 0): void {
        return this.getTaskQueue().pushTask(task, priority);
    }

    public pushTaskByTag(task: TaskCallback, tag: number, priority: number = 0): void {
        return this.getTaskQueue(tag).pushTask(task, priority);
    }

    public clearTaskQueue(tag: number = 0): void {
        let taskQueue = this._taskQueues[tag];
        if (taskQueue) {
            taskQueue.clearTask();
        }
    }

    public clearAllTaskQueue(): void {
        for (let queue in this._taskQueues) {
            this._taskQueues[queue].clearTask();
        }
        this._taskQueues = {}
    }

    private getTaskQueue(tag: number = 0): TaskQueue {
        let taskQueue = this._taskQueues[tag];
        if (taskQueue == null) {
            taskQueue = new TaskQueue();
            this._taskQueues[tag] = taskQueue;
        }
        return taskQueue;
    }
}

/* 测试用例：
* 1. 测试多个任务的执行顺序 + 优先级
* 2. 测试在执行任务的过程中动态添加新任务

export function testQueue() {
    let creatTask = (idx, pri): TaskCallback => {
        return (finish) => {
            console.log(`execute task ${idx} priority ${pri}`);
            finish();
        };
    };
    let tag = 0;
    let begin = (finish) => {
        for (var i = 0; i < 100; ++i) {
            let priority = 0;
            if (i % 10 == 0) {
                priority = -1;
            } else if (i == 88) {
                priority = 1;
            } else if (i == 22) {
                let task = creatTask(1.1, priority);
                TaskManager.getInstance().pushTaskByTag(task, tag, priority);
                task = creatTask(1.2, priority);
                TaskManager.getInstance().pushTaskByTag(task, tag, priority);
                task = creatTask(1.3, priority);
                TaskManager.getInstance().pushTaskByTag(task, tag, priority);
            } else if (i == 51 && tag == 2) {
                // 清理之后，添加的任务会立即执行...
                TaskManager.getInstance().clearTaskQueue(tag);
            }
            let task = creatTask(i, priority);
            Object.defineProperty(task, "idx", { value: i });
            TaskManager.getInstance().pushTaskByTag(task, tag, priority);
        }
        console.log("add task finish, start test");
        finish();
        // 测试重复调用结束
        finish();
        // tag为2时的finish两次都会报警告，因为begin已经被清理了
    }
    TaskManager.getInstance().pushTaskByTag(begin, tag);
    tag = 2;
    TaskManager.getInstance().pushTaskByTag(begin, tag);

}*/
