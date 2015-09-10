
const HTTP = require("http");
const EXPRESS = require("express");
const BODY_PARSER = require('body-parser');
const COMPRESSION = require('compression');
const MORGAN = require('morgan');
const PATH = require("path");
const FS = require("fs");


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
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Cookie");
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


    // Attach declared routes
    var routes = CONFIG.routes.system();
    var routesApp = new EXPRESS();
    routes.routes.forEach(function (route) {
        console.log("ROUTE", route.match.replace(/\//g, "\\/"));
        routesApp.get(new RegExp(route.match.replace(/\//g, "\\/")), route.app);
    });
    app.get(new RegExp(routes.match.replace(/\//g, "\\/")), function (req, res, next) {
        req.url = req.params[0];
        return routesApp(req, res, function (err) {
    		if (err) return next(err);
            var err = new Error("Unknown route '" + req.url + "'");
            err.code = 403;
            return next(err);
    	});
    });


    var server = HTTP.createServer(function (req, res) {
    
        function respondWithError (err) {
    		console.error(err.stack);
    		res.writeHead(500);
    		res.end("Internal Server Error");
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
