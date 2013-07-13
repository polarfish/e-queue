
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , manage_queues = require('./routes/manage_queues')
  , use_queues = require('./routes/use_queues');

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

var mongoose= require("mongoose"),
    queueDB;
//Connect to mongo DB
mongoose.connect('mongodb://localhost/queue');
queueDB = mongoose.connection;

//Error handling if conncetion fails
queueDB.on('error', console.error.bind(console, 'connection error:'));
//Check if successful connection is made
queueDB.once('open', function callback () {
    console.log("MY DB Connected with Mongoose");
    var userSchema = mongoose.Schema({
            name: String,
            password: String
        }),
        User = mongoose.model('User', userSchema),
        initUsers = [
            {
                name: 'donetsk_post',
                password: 'donetsk_post'
            }
        ];

        console.log('Initializing DB:')

        User.remove({}, function (err) {
            console.log('Database has been dropped...');
        });

        for (var i in initUsers) {
            (new User(initUsers[i])).save(function (error, doc) {
                if (error) {
                    console.log(error);
                }
                console.log('Add test user ' + doc.name + ' with password ' + doc.password);
            });
        }
});

app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
