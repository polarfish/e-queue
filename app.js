
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

// Routes
app.get('/', routes.index);
app.post('/admin/create_queue/:queueName', function (req, res) {
    res.send(req.params.queueName);
});
app.get('/admin/:userId/queues', function (req, res) {
    res.send('/admin/:userId/queues');
});

//Connect to mongo DB
var mongoose = require("mongoose"),
    queueDB;

mongoose.connect('mongodb://localhost/queue');
queueDB = mongoose.connection;

//Error handling if conncetion fails
queueDB.on('error', console.error.bind(console, 'connection error:'));
//Check if successful connection is made
queueDB.once('open', function callback () {
    console.log("Connection success.");


    /* DATABASE SCHEMAS */
    var userSchema = mongoose.Schema({
            name: String,
            password: String
        }),
        queueSchema = mongoose.Schema({
            name: String,
            startDate: String,
            userId: String
        }),
    /* END DATABASE SCHEMAS */

    /* DATABASE MODELS */
        User = mongoose.model('User', userSchema),
        Queue = mongoose.model('Queue', queueSchema);
    /* END DATABASE MODELS */
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
                userId: '123123'
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
