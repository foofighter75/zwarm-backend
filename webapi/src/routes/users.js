var n = require('nimble'),
    locationUpdateCount = 0,
    dummySwarmThreshold = 42,
    activateDummySwarms = true;

// radius for nearby users in meters
var default_radius = 500,
    minimum_radius = 1;

/**
 * Create new user
 */
exports.create = function (req, res) {

    var user = req.body,
        requiredFields = ['id', 'nickname', 'platform'],
        isValid = true;

    // check if JSON
    if (!req.is('json')) {
        res.send('Requests must be in JSON format!', 400);
        return;
    }

    // check required fields
    n.each(requiredFields, function (f) {
        isValid = isValid && user[f] !== undefined;
    });
    if (!isValid) {
        res.send("One of the required fields is not set: " + requiredFields.join(", "), 400);
        return;
    }

    // check for semantic correctness
    if (user.id == "") {
        res.send("id must not be empty!", 400);
        return;
    }
    if (user.nickname == "") {
        res.send("nickname must not be empty!", 400);
        return;
    }
    if (!(user.platform === "ios" || user.platform === "android")) {
        res.send("platform must be one of ios or android!", 400);
        return;
    }

    // store user in database
    user.doctype = 'user';
    db.save(user.id, user, function (err) {

        if (err) {
            console.log("Create user: could not store user: %s\n-> %s", JSON.stringify(err), JSON.stringify(user));
            res.send("Could not store user!", 500);
            return;
        }

        // signal creation
        delete user._rev;
        delete user.doctype;
        res.json(user, 201);
        console.log("Create user: User created: %s (%s)", user.id, user.nickname);
    });
};


function uuid()
{
    var chars = '0123456789abcdef'.split('');

    var uuid = [], rnd = Math.random, r;
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
    uuid[14] = '4'; // version 4

    for (var i = 0; i < 36; i++)
    {
        if (!uuid[i])
        {
            r = 0 | rnd()*16;

            uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r & 0xf];
        }
    }

    return uuid.join('');
}

/**
 * Update current location of user
 */
exports.updateLocation = function (req, res) {

    var userDoc = req.body,
        loc = userDoc.location,
        user = { id: req.params.id },
        dummySwarm =
            {
                "doctype" : "swarm",
                "id": uuid(), // {String}
                "swarmDefinitionId": "0001", // {String}
                "invitationCount": 20, // {Number}
                "commentCount": 4, // {Number}
                "center" :
                {
                        latitude:50.302765, longitude:9.748626
                },
                "invitationTime" : new Date().valueOf(),
                "city" : "Bad Brückenau", // {String}
                "participants": []
            };

    // check if request body is JSON
    if (!req.is('json')) {
        res.send("Data not in JSON format!", 400);
        return;
    }

    // check if location is correct
    var timestamp = parseInt(loc.timestamp);
    if (loc.timestamp === undefined || isNaN(timestamp) || timestamp < 0) {
        res.send("No or invalid timestamp", 400);
        return;
    }
    var latitude = parseFloat(loc.latitude);
    if(loc.latitude === undefined || isNaN(latitude) || !(-90 <= latitude && latitude <= 90)) {
        res.send("No or invalid latitude value", 400);
        return;
    }
    var longitude = parseFloat(loc.longitude);
    if(loc.longitude === undefined || isNaN(longitude) || !(-180 <= longitude && longitude <= 180)) {
        res.send("No or invalid longitude value", 400);
        return;
    }

    // send location update to algo node
    user.location = loc;
    GLOBAL.algo_socket.emit('location', user);

    // save location
    loc.doctype = 'location';
    loc.user_id = user.id;
    db.save(loc, function (err, result) {
        if (err) {
            console.log("Update location: Could not save new location for user %s: %s", user.id, JSON.stringify(err));
        } else {
            console.log("Update location: Saved new location for user %s: %s", user.id, result.id);
        }
    });

    // update user
    db.merge(user.id, user, function (err) {
        if (err) {
            console.log("Update location: could not update user %s: %s", user.id, JSON.stringify(err));
        } else {
            console.log("Update location: user %s updated", user.id);
        }
    });

    // create dummy swarm
    if (activateDummySwarms && (locationUpdateCount % dummySwarmThreshold === 0)) {
        console.log("Creating dummy swarm");
        db.view('swarms/dummy', { descending: true, limit: 5}, function (err, rows) {
            if (!err) {
                rows.forEach(function (u) {
                    dummySwarm.participants.push({ id:u.id });
                });

                db.save(dummySwarm.id, dummySwarm, function (err, result) {
                    if (err) {
                        console.log("Update location: Could not save new dummy swarm for user %s: %s", user.id, JSON.stringify(err));
                    } else {
                        console.log("Update location: Created new dummy swarm for user %s: %s", user.id, result.id);
                    }
                });
            }
        });
    }

    // send 200 anyway
    res.send("Location saved", 200);
    locationUpdateCount += 1;
};

/**
 * get all nearby users in the area defined by the current location
 * of the user and a radius, provided with the query parameter radius
 * @param req
 * @param res
 */
var dummyNearbyUsers = function (req, res) {
    var radius = parseFloat(req.query['radius']);

    // check radius parameter
//    if (isNaN(radius) || radius < minimum_radius) {
//        radius = default_radius;
//    }
//    console.log("Querying nearby users for user %s in the radius of %d m", req.params.id, radius);
//
//    res.send(200);

    var user_id = req.params.id;


    var dummyReturnValue = (function(count) {
        var dummyUsers = [];

        function myRandom() {
            var sign = (Math.random() > 0.5) ? 1.0 : -1.0;
            return sign * Math.random();
        }

        for( i = 0; i < count; i++) {
            var latitude = 50.303 + myRandom() * 0.005;
            var longitude = 9.747 + myRandom() * 0.005;
            var nickname = 'Zwarmer ' + i;

            dummyUsers.push({
                location : {
                    latitude : latitude,
                    longitude : longitude
                },
                nickname : nickname
            });
        }

        return dummyUsers;
    })(20);

    res.json(dummyReturnValue, 200);
};


var getNearbyUsers = function() {
    var view_name, view_opts;
    view_name = "users/nearby";
    view_opts = {
        group_level: 2,
        descending: true,
        endkey: [now],
        startkey: [0,{}]
    };

    db.view(view_name, view_opts, function (err, result) {

        if (err) {
            console.log("Get all swarm definitions. ERROR(couchdb): %s", JSON.stringify(err));
            res.send("Error while searching swarm definitions", 500);
            return;
        }

        // build result
        resultValue = {
            totalSwarmCount: count,
            swarmDefinitions: []
        };
        result.forEach(function (r) {
            resultValue.swarmDefinitions.push({
                id: r.id,
                title: r.title,
                swarmCount: r.count === undefined ? 0 : r.count
            });
        });

        // send ok
        res.json(resultValue);
        res.send(200);
        console.log("Found %d swarm definition[s]", resultValue.swarmDefinitions.length);
    });
};


exports.getNearbyUsers = dummyNearbyUsers;

