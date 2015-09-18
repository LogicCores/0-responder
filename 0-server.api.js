
exports.forLib = function (LIB) {
    
    var exports = {};
    
    // TODO: Load adapters as needed on demand
    
    exports.adapters = {
        express: require("./for/express/0-server.api").forLib(LIB)
    };

    return exports;
}