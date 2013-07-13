exports.createQueue = function (req, res) {
    res.send("OK \n user:" + req.params.queue_name + "\n was created \n")
};

exports.getQueueList = function (req, res) {
    res.send("\nQueue list... \n")
};