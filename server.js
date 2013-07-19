#!/bin/env node
//  OpenShift sample Node application
var express = require('express'),
    fs = require('fs'),
    mongoose = require('mongoose'),
    db;

/**
 *  Define the sample application.
 */
var EQueue = function () {

    //  Scope.
    var self = this;


    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function () {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
        self.port = process.env.OPENSHIFT_NODEJS_PORT || 8080;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        }

        self.mongoUser = process.env.OPENSHIFT_MONGODB_DB_USERNAME;
        self.mongoPass = process.env.OPENSHIFT_MONGODB_DB_PASSWORD;
        self.mongoHost = process.env.OPENSHIFT_MONGODB_DB_HOST || "127.0.0.1";
        self.mongoPort = process.env.OPENSHIFT_MONGODB_DB_PORT || 27017;
        self.mongoDatabaseName = process.env.OPENSHIFT_APP_NAME || "queue";
    };


    /**
     *  Populate the cache.
     */
    self.populateCache = function () {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' };
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./index.html');
    };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function (key) {
        return self.zcache[key];
    };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function (sig) {
        if (typeof sig === "string") {
            console.log('%s: Received %s - terminating sample app ...',
                Date(Date.now()), sig);
            process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()));
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function () {
        //  Process on exit and signals.
        process.on('exit', function () {
            self.terminator();
        });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
            'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function (element, index, array) {
                process.on(element, function () {
                    self.terminator(element);
                });
            });
    };


    /*  ================================================================  */
    /*  EQueue server functions (main app logic here).                    */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function (app) {

        app.get('/health', function (req, res) {
            res.send('1');
        });

        app.get('/asciimo', function (req, res) {
            var link = "http://i.imgur.com/kmbjB.png";
            res.send("<html><body><img src='" + link + "'></body></html>");
        });

        app.get('/', function (req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('index.html'));
        });
    };


    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function () {

        var app = express();
        self.createRoutes(app);

        app.configure(function () {
            app.set('views', __dirname + '/views');
            app.set('view engine', 'jade');
            app.use(express.bodyParser());
            app.use(express.methodOverride());
            app.use(app.router);
            app.use(express.static(__dirname + '/public'));
        });

        self.app = app;

    };

    self.initializeDatabase = function () {

        /* DATABASE SCHEMAS */
        var userSchema = mongoose.Schema({
                name: String,
                password: String
            }),
            queueSchema = mongoose.Schema({
                name: String,
                startDate: String,
                userId: String,
                ticketsGiven: Number,
                currentTicketNumber: Number,
                isActive: Boolean
            }),
            ticketSchema = mongoose.Schema({
                queueId: String,
                number: String,
                hash: String,
                isProcessed: Boolean
            });
        /* END DATABASE SCHEMAS */

        /* DATABASE MODELS */
        User = mongoose.model('User', userSchema),
            Queue = mongoose.model('Queue', queueSchema),
            Ticket = mongoose.model('Ticket', ticketSchema);
        /* END DATABASE MODELS */

        var mongoAuth;
        if (self.mongoUser &&  self.mongoPass) {
            mongoAuth = self.mongoUser + ':' + self.mongoPass + '@';
        } else {
            mongoAuth = "";
        }

        mongoose.connect('mongodb://' + mongoAuth + self.mongoHost + ':' + self.mongoPort + '/' + self.mongoDatabaseName);
        self.db = mongoose.connection;

        //Error handling if conncetion fails
        self.db.on('error', console.error.bind(console, 'connection error:'));

        //Check if successful connection is made
        self.db.once('open', function callback() {
            console.log("Connection success.");
            console.log('Initializing DB:')
            Queue.remove({}, function (err) {});
            User.remove({}, function (err) {
                if (err) {
                    console.log(err);
                    return;
                }
                console.log('Database has been dropped...');
                (new User({
                    name: 'donetsk_post',
                    password: 'donetsk_post'
                })).save(function (error, doc) {
                        if (error) {
                            console.log(error);
                        }
                        console.log('Add test user ' + doc.name + ' with password ' + doc.password);
                    });
            });
        });

    }


    /**
     *  Initializes the sample application.
     */
    self.initialize = function () {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
        // Connect to DB. Create base structure
        self.initializeDatabase();

        self.app.configure('development', function () {
            self.app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
        });

        self.app.configure('production', function () {
            self.app.use(express.errorHandler());
        });
    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function () {
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, self.ipaddress, function () {
            console.log('%s: Node server started on %s:%d ...', Date(Date.now()), self.ipaddress, self.port);
        });
    };

};
/*  Sample Application.  */


/**
 *  main():  Main code.
 */
var eQueue = new EQueue();
eQueue.initialize();
eQueue.start();

