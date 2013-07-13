exports.create_queue = function (req, res) {
    res.send("OK \n user:" + req.params.user + "\n")
};

exports.getQueueList = function (req, res) {
    res.send("\nQueue list... \n")
};