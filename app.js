/**
 * Module dependencies.
 */

var crypto = require('crypto')
    , md5sum = crypto.createHash('md5')
    , express = require('express')
    , routes = require('./routes');

var app = module.exports = express.createServer();

// Configuration

app.configure(function () {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function () {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function () {
    app.use(express.errorHandler());
});

// Routes
app.get('/', routes.index);

// ADMIN ROUTES

app.post('/admin/create_queue/:queueName', function (req, res) {
    var header = req.headers['authorization'] || '',
        token = header.split(/\s+/).pop() || '',
        auth = new Buffer(token, 'base64').toString(),
        parts = auth.split(/:/),
        username = parts[0],
        password = parts[1];

    console.log("Authentication: username : '" + username + "', password : '" + password + "'");

    User.findOne({"name": username}, function (err, user) {
        if (user && (user.password == password)) {
            console.log("Authorized!");
            (new Queue({
                name: req.params.queueName,
                startDate: new Date(0),
                userId: user.id,
                ticketsGiven: 0,
                currentTicketNumber: 1,
                isActive: false
            })).save(function (err, queue) {
                    if (err) {
                        console.log(err);
                        res.send(err, 500);
                    } else {
                        console.log('Queue added: {"name": ' + queue.name + ', "user":' + user.name + '} ');
                        res.send(queue);
                    }
                })
        } else {
            res.send(401);
        }
    });
});

app.put('/admin/activate_queue/:queueName', function (req, res) {
    var header = req.headers['authorization'] || '',
        token = header.split(/\s+/).pop() || '',
        auth = new Buffer(token, 'base64').toString(),
        parts = auth.split(/:/),
        username = parts[0],
        password = parts[1];

    console.log("Authentication: username : '" + username + "', password : '" + password + "'");

    User.findOne({"name": username}, function (err, user) {
        if (user && (user.password == password)) {
            console.log("Authorized!");
            Queue.update({name: req.params.queueName}, {$set: {isActive: true, startDate: new Date()}}, function(err, num, raw) {
                if (err) {
                    console.log(err);
                    res.send(err, 500);
                } else {
                    if (raw.n > 0) {
                        console.log("Queue " + req.params.queueName + " activated");
                    }
                    res.send(raw, 200);
                }
            });
        } else {
            res.send(401);
        }
    });
});

app.put('/admin/deactivate_queue/:queueName', function (req, res) {
    var header = req.headers['authorization'] || '',
        token = header.split(/\s+/).pop() || '',
        auth = new Buffer(token, 'base64').toString(),
        parts = auth.split(/:/),
        username = parts[0],
        password = parts[1];

    console.log("Authentication: username : '" + username + "', password : '" + password + "'");

    User.findOne({"name": username}, function (err, user) {
        if (user && (user.password == password)) {
            console.log("Authorized!");
            Queue.update({name: req.params.queueName}, {$set: {isActive: false, startDate:new Date(0), ticketsGiven: 0, currentTicketNumber: 1}}, function(err, num, raw) {
                if (err) {
                    console.log(err);
                    res.send(err, 500);
                } else {
                    if (raw.n > 0) {
                        Queue.findOne({name: req.params.queueName}, function (err, queue) {
                            if (err) {
                                console.log(err);
                                res.send(err, 500);
                            } else {
                                Ticket.remove({queueId: queue.id}, function(err, ticketsRemoved) {
                                    console.log("Queue " + queue.name + " deactivated. " + ticketsRemoved + " tickets removed." );
                                    res.send(200);
                                });
                            }
                        })
                    } else {
                        res.send("Undefined queue" + req.params.queueName, 404);
                    }
                }
            });
        } else {
            res.send(401);
        }
    });
});

app.get('/admin/process_queue/:queueName', function (req, res) {
    var header = req.headers['authorization'] || '',
        token = header.split(/\s+/).pop() || '',
        auth = new Buffer(token, 'base64').toString(),
        parts = auth.split(/:/),
        username = parts[0],
        password = parts[1];

    console.log("Authentication: username : '" + username + "', password : '" + password + "'");

    User.findOne({"name": username}, function (err, user) {
        if (user && (user.password == password)) {
            console.log("Authorized!");
            Queue.findOne({name: req.params.queueName}, function (err, queue) {
                if (err) {
                    console.log(err);
                    res.send(err, 500);
                } else {
                    if (queue) {
                        if (queue.currentTicketNumber > queue.ticketsGiven) {
                            res.send("No tickets to process", 200);
                        } else {
                            Ticket.findOne({number: queue.currentTicketNumber}, function(err, ticket) {
                                if (err) {
                                    console.log(err);
                                    res.send(err, 500);
                                } else {
                                    if (ticket) {
                                        ticket.isProcessed = true;
                                        ticket.save(function(err, ticket) {
                                            queue.currentTicketNumber++;
                                            queue.save(function(err, queue) {
                                                if (err) {
                                                    console.log(err);
                                                    res.send(err, 500);
                                                } else {
                                                    res.send(ticket, 200);
                                                }
                                            });
                                        });
                                    } else {
                                        res.send("Ticket not found", 404);
                                    }
                                }
                            });
                        }
                    } else {
                        res.send("Queue not found", 500);
                    }
                }
            })
        } else {
            res.send(401);
        }
    });
});

app.get('/admin/:userName/queues', function (req, res) {
    User.findOne({name: req.params['userName']}, function (err, doc) {
        if (err) {
            res.send(err, 500);
            return;
        }
        console.log("User id " + doc.id);
        Queue.find({userId: doc.id}, function (err, queues) {
            res.send(queues);
        })

    });

});

app.post('/admin/:number/ticket', function (req, res) {
    Ticket.update({number: req.params['number']}, {isActive: false}, function (err, affected, raw) {
        if (err) {
            res.send("Error: " + err);
            return;
        }
        res.send(raw);
    });
});


// USER ROUTES

app.get('/user/:userName/:queueName/info', function (req, res) {

    User.findOne({"name": req.params.userName}, function (err, user) {
        if (user) {
            Queue.findOne({"name":req.params.queueName}, function (err, queue) {
                if (queue) {
                    res.send(queue, 200);
                } else {
                    res.send("Undefined queue " + req.params.queueName, 404);
                }
            });
        } else {
            res.send("Undefined user " + req.params.userName, 404);
        }
    });
});

app.get('/user/:userName/:queueName/get_ticket', function (req, res) {
    User.findOne({"name": req.params.userName}, function (err, user) {
        if (user) {
            Queue.findOne({name: req.params.queueName}, function(err, queue) {
                if (err) {
                    console.log(err);
                    res.send(err, 500);
                } else {
                    if (queue) {
                        if (queue.isActive) {
                            (new Ticket({
                                queueId: queue.id,
                                number: queue.ticketsGiven + 1,
                                hash: Math.random(),
                                isProcessed: false
                            })).save(function (err, ticket) {
                                    if (err) {
                                        console.log(err);
                                        res.send(err, 500);
                                    } else {
                                        queue.ticketsGiven++;
                                        queue.save(function(err, queue) {
                                            if (err) {
                                                console.log(err);
                                                res.send(err, 500);
                                            } else {
                                                res.send(ticket, 200);
                                            }
                                        });
                                    }
                                })
                        } else {
                            res.send("Inactive queue " + req.params.queueName, 403);
                        }
                    } else {
                        res.send("Undefined queue " + req.params.queueName, 404);
                    }
                }
            });
        } else {
            res.send("Undefined user " + req.params.userName, 404);
        }
    });
});

app.get('/admin/users', function (req, res) {
    User.find({}, function (err, users) {
        if (err) {
            res.send(err, 500);
            return;
        }
        res.send(users);
    })

});















//Connect to mongo DB
var Mongoose = require("mongoose"),
    queueDB;

/* DATABASE SCHEMAS */
var userSchema = Mongoose.Schema({
        name: String,
        password: String
    }),
    queueSchema = Mongoose.Schema({
        name: String,
        startDate: String,
        userId: String,
        ticketsGiven: Number,
        currentTicketNumber: Number,
        isActive: Boolean
    }),
    ticketSchema = Mongoose.Schema({
        queueId: String,
        number: String,
        hash: String,
        isProcessed: Boolean
    })
/* END DATABASE SCHEMAS */

/* DATABASE MODELS */
User = Mongoose.model('User', userSchema),
    Queue = Mongoose.model('Queue', queueSchema),
    Ticket = Mongoose.model('Ticket', ticketSchema);

/* END DATABASE MODELS */

Mongoose.connect('mongodb://localhost/queue');
queueDB = Mongoose.connection;

//Error handling if conncetion fails
queueDB.on('error', console.error.bind(console, 'connection error:'));
//Check if successful connection is made
queueDB.once('open', function callback() {
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

app.listen(3000, function () {
    console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
