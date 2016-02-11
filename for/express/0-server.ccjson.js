
exports.forLib = function (LIB) {
    var ccjson = this;

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

            const SERVER = require("./0-server.api").forLib(LIB);

            var Entity = function (instanceConfig) {
                var self = this;

                var config = {};
                LIB._.merge(config, defaultConfig);
                LIB._.merge(config, instanceConfig);
                config = ccjson.attachDetachedFunctions(config);


                var server = null;

                self.spin = function () {
                    return LIB.Promise.try(function () {
                        var server = SERVER.main(config);
                        return server;
                    });
                }
/*                
                self.AspectInstance = function (aspectConfig) {

                    var config = {};
                    LIB._.merge(config, defaultConfig);
                    LIB._.merge(config, instanceConfig);
                    LIB._.merge(config, aspectConfig);
                    config = ccjson.attachDetachedFunctions(config);

                    return LIB.Promise.resolve({
                        server: function () {

                            return LIB.Promise.resolve(
                                ccjson.makeDetachedFunction(
                                    function () {
                                        return server;
                                    }
                                )
                            );
                        }
                    });
                }
*/
            }
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
