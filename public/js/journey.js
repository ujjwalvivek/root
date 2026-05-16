if (window.location.protocol !== "https:" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    try {
        delete Navigator.prototype.gpu;
        Object.defineProperty(Navigator.prototype, 'gpu', {
            get: function () { return undefined; },
            configurable: true
        });
    } catch (e) { }
    if (typeof window.GPUCanvasContext === 'undefined') {
        window.GPUCanvasContext = function () { };
    }
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (type === 'webgpu') {
            return Object.create(window.GPUCanvasContext.prototype);
        }
        return originalGetContext.apply(this, [type, ...args]);
    };
    if (navigator.gpu) {
        navigator.gpu.requestAdapter = function () { return Promise.resolve(null); };
    }
}
