
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Authentication
var getUser = function (req) {
    var header = req.headers['authorization'] || '',        // get the header
        token = header.split(/\s+/).pop() || '',            // and the encoded auth token
        auth = new Buffer(token, 'base64').toString(),    // convert from base64
        parts = auth.split(/:/),                          // split on colon
        username = parts[0],
        password = parts[1];

    console.log("Authentication: username : '" + username + "', password : '" + password + "'");

    User.findOne({"name":username}, function(err, user) {

    });

    return undefined;
}

// Routes
app.get('/', routes.index);
app.post('/admin/create_queue/:queueName', function (req, res) {

    var user = getUser(req);


//    (new Queue({
//        name: req.params.queueName,
//        startDate: '',
//        userId: ''
//    })).save(function (err, doc) {
//            if (err) {
//                console.log(err);
//            }
//            console.log('Queue added: {"name": ' + req.params.queueName + ', "user":} ' + doc.name);
//        })

    res.send(JSON.stringify(user));
});

app.get('/admin/:userId/queues', function (req, res) {
    Queue.find({userId: req.params['userId']}, function (err, queues) {
        res.send(queues);
    })
});
app.get('/admin/:queueId/ticket', function (req, res) {
    Queue.findById(req.params['queueId'], function (err, doc) {
        (new Ticket({
            queueId: doc.id,
            number: doc.ticketsGiver + 1,
            hash: 'asdfasdfasdfa',
            isActive: true
        })).save(function (err, doc) {
            res.send(doc);
        })
    })
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



//Connect to mongo DB
var mongoose = require("mongoose"),
    queueDB;

/* DATABASE SCHEMAS */
var userSchema = mongoose.Schema({
        name: String,
        password: String
    }),
    queueSchema = mongoose.Schema({
        name: String,
        startDate: String,
        userId: String,
        ticketsGiver: Number,
        currentTicketNumber: Number,
        isActive: Boolean
    }),
    ticketSchema = mongoose.Schema({
        queueId: String,
        number: String,
        hash: String,
        isActive: Boolean
    })
/* END DATABASE SCHEMAS */

/* DATABASE MODELS */
    User = mongoose.model('User', userSchema),
    Queue = mongoose.model('Queue', queueSchema),
    Ticket = mongoose.model('Ticket', ticketSchema);

/* END DATABASE MODELS */

mongoose.connect('mongodb://localhost/queue');
queueDB = mongoose.connection;

//Error handling if conncetion fails
queueDB.on('error', console.error.bind(console, 'connection error:'));
//Check if successful connection is made
queueDB.once('open', function callback () {
    console.log("Connection success.");



        console.log('Initializing DB:')
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
            (new Queue({
                name: 'test',
                startDate: '10-10-10',
                userId: '123123',
                ticketsGiver: 1,
                isActive: true,
                currentTicketNumber: 1
            })).save(function (err, doc) {
                if (err) {
                    console.log(err);
                }
                console.log('Add test queue ' + doc.name);
            })
        });
});

app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
