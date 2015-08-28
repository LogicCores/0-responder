
const HTTP = require("http");
const EXPRESS = require("express");
const BODY_PARSER = require('body-parser');
const COMPRESSION = require('compression');
const MORGAN = require('morgan');
const SEND = require('send');
const PATH = require("path");


const CONFIG = {
    bind: "0.0.0.0",
    port: process.env.PORT
};


var server = HTTP.createServer(function (req, res) {

    function respondWithError (err) {
		console.error(err.stack);
		res.writeHead(500);
		res.end("Internal Server Error");
	}

	try {

        var app = EXPRESS();
        
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



        app.get(
            /^\/cores\/export\/for\/babel\/(.*)/,
            require("../../../../cores/export/for/babel").app({
                basePath: PATH.join(__dirname, "../../../../www/0")
            })
        );

        app.get(
            /^\/cores\/export\/for\/browserify\/(.*)/,
            require("../../../../cores/export/for/browserify").app({
                basePath: PATH.join(__dirname, "../../../../www/0")
            })
        );

        app.get(/^\/cores\/skin\/for\/semantic-ui\/(.*)/, function (req, res, next) {
        	return SEND(req, req.params[0], {
        		root: PATH.join(__dirname, "../../../../cores/skin/for/semantic-ui/node_modules/semantic-ui-css")
        	}).on("error", next).pipe(res);
        });


        app.get(/^(.*)/, function (req, res, next) {
        	return SEND(req, req.params[0], {
        		root: PATH.join(__dirname, "../../../../www/0")
        	}).on("error", next).pipe(res);
        });


		return app(req, res, respondWithError);

	} catch (err) {
	    
	    return respondWithError(err);
	}
});

server.listen(parseInt(CONFIG.port), CONFIG.bind);

console.log("Server listening at: http://" + CONFIG.bind + ":" + CONFIG.port);
