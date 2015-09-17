
exports.forLib = function (LIB) {
    var ccjson = this;

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

            var Entity = function (instanceConfig) {
                var self = this;

                self.AspectInstance = function (aspectConfig) {

                    var config = {};
                    LIB._.merge(config, defaultConfig);
                    LIB._.merge(config, instanceConfig);
                    LIB._.merge(config, aspectConfig);
                    config = ccjson.attachDetachedFunctions(config);

                    // TODO: Relocate to external parser.
                    function loadComponentScriptFromFile (path, componentId) {
                        return LIB.Promise.promisify(function (callback) {
                            return LIB.fs.readFile(path, "utf8", function (err, data) {
                                if (err) return callback(null);

                                if (!loadComponentScriptFromFile._cache) {
                                    loadComponentScriptFromFile._cache = {};
                                }
                                var existing = loadComponentScriptFromFile._cache[path] || null;
                                if (
                                    existing &&
                                    existing.data === data &&
                                    existing.componentId === componentId
                                ) {
                                    return callback(null, existing.func);
                                }
                                console.log("Loading source from path:", path);

                                // TODO: Use proper HTML parser.
                                var lines = data.split("\n");
                                var m = null;
                                var scriptInfo = null;
                                var scriptBuffer = null;
                                for (var i=0 ; i<lines.length ; i++) {
                                    if (scriptBuffer) {
                                        if (/<\/script>/.test(lines[i])) {
                                            if (
                                                scriptInfo.location === "server" &&
                                                scriptInfo.id === componentId
                                            ) {
                                                loadComponentScriptFromFile._cache[path] = {
                                                    data: data,
                                                    componentId: componentId,
                                                    func: new Function(
                                                        "context",
                                                        scriptBuffer.join("\n")
                                                    )
                                                };
                                                return callback(null, loadComponentScriptFromFile._cache[path].func);
                                            }
                                            scriptInfo = null;
                                            scriptBuffer = null;
                                            continue;
                                        }
                                        scriptBuffer.push(lines[i]);
                                        continue;
                                    }
                                    // TODO: Be much more forgiving.
                                    m = lines[i].match(/<script component:id="([^"]+)" component:location="([^"]+)">/);
                                    if (m) {
                                        scriptInfo = {
                                            id: m[1],
                                            location: m[2]
                                        };
                                        scriptBuffer = [];
                                        continue;
                                    }
                                }
                                return callback(null, null);
                            });
                        })();
                    }

                    return LIB.Promise.resolve({
                        app: function () {
                            return LIB.Promise.resolve(
                                ccjson.makeDetachedFunction(
                                    function (req, res, next) {

                                        var pagePath = req.params[0];
                                        var firewidgetId = req.params[1];
                                        var pointer = req.params[2];

                                        return req.context.page.contextForUri(pagePath).then(function (pageContext) {
                                            if (!pageContext) {
                                                throw new Error("Could not load page context for uri '" + pagePath + "'");
                                            }

                                            var pagePath = pageContext.page.data.realpath;

                                            function wireComponent () {
                                                return loadComponentScriptFromFile(
                                                    pagePath,
                                                    firewidgetId
                                                ).then(function (script) {
                                                    if (!script) {
                                                        throw new Error("No server-side 'script' found for component '" + firewidgetId + "' on page '" + pagePath + "'");
                                                    }
                                                    return new LIB.Promise(function (resolve, reject) {
                                                        try {
                                                            script({
                                                                wireComponent: function (wiring) {
                                    
                                                                    var dataProducer = null;
                                    
                                                                    if (typeof wiring.produceData === "function") {
                                                                        // TODO: Make which adapter to use configurable when refactoring to use ccjson
                                                                        dataProducer = new (req.context["data.mapper"]).Producer();

                                                                        dataProducer.setDataProducer(wiring.produceData);
                                                                    }
                                    
                                                                    return resolve({
                                                                        dataProducer: dataProducer
                                                                    });
                                                                }
                                                            });
                                                        } catch (err) {
                                                            console.error("Error wiring component using script:", err.stack);
                                                            return reject(err);
                                                        }
                                                    });
                                                });
                                            }

                                            return wireComponent().then(function (wiring) {

                                                return wiring.dataProducer.app({
                                                    context: req.context,
                                                    pointer: pointer
                                                })(req, res, function (err) {
                                                    throw err;
                                                });
                                            });
                                        }).catch(function (err) {
                                            console.error(err.stack);
                                            res.writeHead(500);
                                            res.end("Internal Server Error");
                                            return;
                                        });
                                    }
                                )
                            );
                        }
                    });
                }

            }
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
