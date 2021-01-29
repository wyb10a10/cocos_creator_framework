declare namespace cc {
    interface Asset {
        refDepends : boolean;
        refCount : number;
        addRef();
        decRef(autoRelease: boolean = false);
    }
}