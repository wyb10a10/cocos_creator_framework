import { Vec3 } from "cc"

export interface IActorInput {
    onMove(move:Vec3):void;
    onRotation(x:number, y:number):void;
    onDir(x:number, y:number):void;
    onFire():void;
    onReload():void;
    onPick():void;
    onDrop():void;
    onEquip(index:number):void;
}