
const HTTP = require("http");
const EXPRESS = require("express");
const BODY_PARSER = require('body-parser');
const COMPRESSION = require('compression');
const MORGAN = require('morgan');
const PATH = require("path");
const FS = require("fs");
const STACK = require("stack");


const DEBUG = false;

exports.forLib = function (LIB) {

    var exports = {};

    exports.main = function (CONFIG) {
    
        var app = new EXPRESS();
    
        app.use(MORGAN("combined", {
            skip: function (req, res) {
                return res.statusCode < 400;
            }
        }));
        
        app.use(COMPRESSION());
    
        app.use(function (req, res, next) {
        	var origin = null;
            if (req.headers.origin) {
                origin = req.headers.origin;
            } else
            if (req.headers.host) {
                origin = [
                    (CONFIG.port === 443) ? "https" : "http",
                    "://",
                    req.headers.host
                ].join("");
            }
            res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS");
            res.setHeader("Access-Control-Allow-Credentials", "true");
            res.setHeader("Access-Control-Allow-Origin", origin);
            res.setHeader("Access-Control-Allow-Headers", "Content-Type, Cookie, X-Request-Type");
            if (req.method === "OPTIONS") {
                return res.end();
            }
            return next();
        });
        
        app.use(BODY_PARSER.urlencoded({
            extended: true
        }));
        app.use(BODY_PARSER.json({
        	type: [
        		'application/json',
        		'application/vnd.api+json'
        	]
        }));


        if (
            CONFIG.logger &&
            CONFIG.logger["404"]
        ) {
            // TODO: Ignore duplicate 404 errors for our process and throttle error logging
            //       by discarding some errors if there are many. If this happens there is likely
            //       something wrong with the system as we should only get occasional 404 errors.
            app.use(function (req, res, next) {
                var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || "";
                var method = req.method;
                var url = req.url;
                res.once("finish", function () {
                    if (res.statusCode !== 404) return;
                    CONFIG.logger["404"]({
                        "ip": ip,
                        "method": method,
                        "url": url
                    }).catch(function (err) {
                        console.log("Error logging 404 response!", err.stack);
                    });
                    return;
                });
                return next();
            });
        }


        // Attach declared routes
        function attachStack (stackRoutes) {
            Object.keys(stackRoutes).forEach(function (routeAlias) {
                var routes = stackRoutes[routeAlias]();
                var routesApp = new EXPRESS();
                routes.routes.forEach(function (route) {
                    if (route.app || route.apps) {
                        console.log("ROUTE", routes.match, route.match);
    
                        var expression = new RegExp(route.match.replace(/\//g, "\\/"));
    
                        var rootApp = route.app;
                        if (!rootApp) {
                            var appAliases = Object.keys(route.apps);
                            rootApp = function (req, res, next) {
                                STACK.errorHandler = function (req, res, err) {
                                    return next(err);
                                }
                                return STACK.apply(null, appAliases.map(function (appAlias) {
                                    return function (req, res, next) {
                                        return route.apps[appAlias](req, res, next);
                                    };
                                }))(req, res);
                            }
                        }
    
                        if (route.methods === "*") {
                            routesApp.all(expression, function (req, res, next) {
if (DEBUG) console.log("  run route1:", routes.match, route);
                                return rootApp(req, res, next);
                            });
                        } else {
                            route.methods.forEach(function (method) {
                                routesApp[method.toLowerCase()](expression, function (req, res, next) {
if (DEBUG) console.log("  run route2:", routes.match, route);
                                    return rootApp(req, res, next);
                                });
                            });
                        }
                    } else {
                        console.log(" skip route", routes.match, route.match, "(no 'app' declared)");
                    }
                });
                app.all(new RegExp(routes.match.replace(/\//g, "\\/")), function (req, res, next) {

                    req.subUri = req.url;
                    req.url = req.params[0];
                    req.subUri = req.subUri.substring(0, req.subUri.length - req.url.length).replace(/\/?\?.*$/, "");

console.log("REQUEST (" + req.subUri + "):", req.url);

                    return routesApp(req, res, function (err) {
                		if (err) return next(err);
                        var err = new Error("Unknown route '" + req.url + "'");
                        err.code = 403;
                        return next(err);
                	});
                });
            });
        }
        for (var i=1 ; i<=10; i++) {
            if (!CONFIG["routes" + i]) continue;
            attachStack(CONFIG["routes" + i]);
        }

    
        var server = HTTP.createServer(function (req, res) {
        
            function respondWithError (err) {
                if (!err) {
                    console.error("No route found on server for url '" + req.url + "'!");
            		res.writeHead(404);
            		res.end("Not Found");
            		return;
                }
        		console.error(err.stack);
        		res.writeHead(500);
        		res.end("Internal Server Error");
        		return;
        	}
        
        	try {
    
        		return app(req, res, respondWithError);
        
        	} catch (err) {
        	    
        	    return respondWithError(err);
        	}
        });
    
        server.listen(parseInt(CONFIG.port), CONFIG.bind);
    
        console.log("Server listening at: http://" + CONFIG.bind + ":" + CONFIG.port);
    
    }

    return exports;
}
