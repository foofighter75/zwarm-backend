var express = require('express'),
    app = module.exports = express.createServer(),
    default_server_port = 4712,
    server_port;

/**
 * @type {Express}
 * global app instance
 */
GLOBAL.app = app;

// configure geosink
app.configure(function () {
    app.use(express.logger({format: 'dev'}));
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function() {
    app.use(express.errorHandler({dumpExceptions: true, showStack: true}));
});

app.configure('production', function () {
    app.use(express.errorHandler());
});

server_port = default_server_port;

// include routes
require('./routes/root.js');
require('./routes/geopositions.js');

// start server
app.listen(server_port);
console.log("Started zwarmer geosink on port %d in %s mode", app.address().port, app.settings.env);