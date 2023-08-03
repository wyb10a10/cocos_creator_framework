import { Mask } from 'cc';
import { _decorator, Component, Node, ScrollView, Label, Button, instantiate, UITransform, Size, Vec3, Sprite } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('DynamicPropertyPanel')
export class DynamicPropertyPanel extends Component {
    @property({ type: Node })
    public targetNode: Node | null = null;

    @property({ type: ScrollView })
    public scrollView: ScrollView | null = null;

    @property({ type: Label })
    public propertyLabelPrefab: Label | null = null;

    @property({ type: Button })
    public toggleButton: Button | null = null;

    @property
    public refreshInterval: number = 0.5;

    private _refreshProperties: boolean = false;
    private _properties: Map<string, any> = new Map();
    private _elapsedTime: number = 0;

    public start(): void {
        this._initUI();

        if (this.toggleButton) {
            this.toggleButton.node.on(Button.EventType.CLICK, this._togglePropertyPanel, this);
        }
        if (this.targetNode) {
            this._setupProperties();
        }
    }

    private _initUI(): void {
        // 创建 ScrollView
        if (!this.scrollView) {
            const scrollViewNode = new Node();
            scrollViewNode.parent = this.node;
            scrollViewNode.addComponent(UITransform).setContentSize(new Size(200, 300));
            scrollViewNode.setPosition(new Vec3(0, 0, 0));
            this.scrollView = scrollViewNode.addComponent(ScrollView);
            const view = new Node();
            view.addComponent(UITransform).setContentSize(new Size(200, 300));
            scrollViewNode.addChild(view);
            view.addComponent(Mask);
            const content = new Node();
            content.addComponent(UITransform).setContentSize(new Size(200, 0));
            this.scrollView.content = content;
            view.addChild(content);
        }

        // 创建 Label
        if (!this.propertyLabelPrefab) {
            const labelNode = new Node();
            const label = labelNode.addComponent(Label);
            labelNode.addComponent(UITransform).setContentSize(new Size(200, 20));
            this.propertyLabelPrefab = label;
        }

        // 创建 Toggle Button
        if (!this.toggleButton) {
            const buttonNode = new Node();
            buttonNode.parent = this.node;
            buttonNode.addComponent(UITransform).setContentSize(new Size(100, 50));
            buttonNode.setPosition(new Vec3(0, 200, 0));
            this.toggleButton = buttonNode.addComponent(Button);
            const buttonLabel = buttonNode.addComponent(Label);
            buttonLabel.string = 'Toggle';
        }

        console.log('init ui');
    }

    private _togglePropertyPanel(): void {
        if (this.scrollView) {
            this.scrollView.node.active = !this.scrollView.node.active;
            this._refreshProperties = this.scrollView.node.active;
        }
    }

    private _setupProperties(): void {
        if (!this.targetNode) {
            return;
        }

        this._properties.set('name', this.targetNode.name);
        this._properties.set('position', this.targetNode.position);
        this._properties.set('rotation', this.targetNode.eulerAngles);
    }

    private _updateProperties(): void {
        if (!this.scrollView || !this.propertyLabelPrefab) {
            return;
        }

        // 清空当前属性
        this.scrollView.content?.removeAllChildren();

        // 更新属性值
        this._properties.forEach((value, key) => {
            if (!this.propertyLabelPrefab) {
                return;
            }
            const propertyLabel = instantiate(this.propertyLabelPrefab);
            if (!propertyLabel) {
                return;
            }
            propertyLabel.string = `${key}: ${this._formatValue(value)}`;
            if (!this.scrollView?.content) {
                return;
            }
            this.scrollView.content.addChild(propertyLabel.node);
        });
    }

    private _formatValue(value: any): string {
        if (Array.isArray(value)) {
            return `Array [${value.map(item => this._formatValue(item)).join(', ')}]`;
        } else if (value instanceof Set) {
            return `Set {${Array.from(value).map(item => this._formatValue(item)).join(', ')}}`;
        } else if (value instanceof Map) {
            return `Map {${Array.from(value.entries()).map(([key, val]) => `${this._formatValue(key)} => ${this._formatValue(val)}`).join(', ')}}`;
        } else {
            return JSON.stringify(value);
        }
    }

    public update(deltaTime: number): void {
        if (!this._refreshProperties) { return; }

        this._elapsedTime += deltaTime;
        if (this._elapsedTime >= this.refreshInterval) {
            this._updateProperties();
            this._elapsedTime = 0;
        }
    }
}