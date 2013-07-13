exports.createQueue = function (req, res) {
    res.send("OK \n user:" + req.params.queueName + "\n was created \n");
};

exports.getQueueList = function (req, res) {
    var Mongoose = require("mongoose");
    res.send("\nQueue list... \n")
};