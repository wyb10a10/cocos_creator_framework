declare namespace cc {
    interface Asset {
        refCount : number;
        addRef();
        decRef();
    }
}