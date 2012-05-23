/**
 * Created with JetBrains WebStorm.
 * User: swarm
 * Date: 22.05.12
 * Time: 16:05
 * To change this template use File | Settings | File Templates.
 */
var restify = require("restify");


var client = restify.createJsonClient({
    // url: 'http://ec2-54-247-155-88.eu-west-1.compute.amazonaws.com:4711'
    url: 'http://localhost:4711'
});

exports.create = function (userObject, check) {
    client.post('/swarmdefinitions', userObject, function(err, req, res, obj) {
        check(res.statusId, err);
    });
};

exports.getAll = function (check) {
    client.get('/swarmdefinitions', function(err, req, res, obj) {
        check(res.statusId, err);
    });
}