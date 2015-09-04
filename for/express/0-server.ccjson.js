
exports.forLib = function (LIB) {

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

            const SERVER = require("./0-server.api");

            var Entity = function (instanceConfig) {
                var self = this;
                
                var config = {};
                LIB._.merge(config, defaultConfig)
                LIB._.merge(config, instanceConfig)

                SERVER.main(config);
            }
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
