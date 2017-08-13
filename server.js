//IMPORTS
var express = require('express');
var mongo = require('mongodb').MongoClient;
var session = require('express-session');
var passport = require('passport'),
    FacebookStrategy = require('passport-facebook').Strategy;
var bodyParser = require('body-parser');
var ejs = require('ejs');
var port = 80;
var mongourl = process.env.mongourl;


var app = express();
app.set('view engine', 'ejs');

app.use(express.static('./views'));
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));
app.use(session({
    secret: "Shh, its a secret!"
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
    done(null, user);
});
passport.deserializeUser(function (user, done) {
    done(null, user);
});

passport.use(new FacebookStrategy({
        clientID: process.env.clientID,
        clientSecret: process.env.clientSecret,
        callbackURL: '/auth/callback',
        profileFields: ['id', 'displayName', 'photos', 'emails']
    },
    function (accessToken, refreshToken, profile, done) {
        var pid = profile.id;

        //Users database
        mongo.connect(mongourl, function (err, db) {
            if (err) {
                console.log("Can't connect");
            }
            var col = db.collection('data');
            col.find({
                id: pid
            }, {
                _id: 0
            }).toArray(function (err, ress) {
                if (ress.length == 0) {
                    console.log("No User");
                    var user = {
                        id: profile.id,
                        name: profile.displayName,
                        profile: profile,
                        //email: profile.emails[0],
                        //ADD FIELDS HERE
                        pins: [],
                        loves: []
                    };
                    col.insert(user);
                    console.log("inserted This");
                    console.log(user);

                    done(null, user);
                    db.close();
                } else {
                    console.log("Exists");
                    console.log(ress[0]);
                    done(null, ress[0]);
                    db.close();
                }
            });
        });
    }
));


app.listen(process.env.PORT || port, function () {
    console.log('Server started on ' + port);
});



//ROUTES
app.get('/login', passport.authenticate('facebook'));
app.get('/auth/callback', passport.authenticate('facebook', {
    scope: 'email',
    successRedirect: '/',
    failureRedirect: '/login'
}));
app.get('/', function (req, res) {
    if (!req.user) {
        res.render('home.ejs', {
            user: {
                name: '###'
            }
        });
    } else {
        res.render('home.ejs', {
            user: req.user
        });
    }

});
app.get('/profile', function (req, res) {
    console.log('\nPROFILE ROUTE');
    if (req.user) {
        res.render('profile.ejs', {
            user: req.user
        });
    } else {
        console.log('Logged in as GUEST');
        res.redirect('/');
    }
});
app.get('/myPins', function (req, res) {
    if (!req.user) {
        res.redirect('/');
        console.log('logged in as GUEST');
    } else {

        mongo.connect(mongourl, function (err, db) {
            if (err) {
                console.log(err);
                res.json({
                    code: 600
                });
            } else {
                var col = db.collection('data');
                col.find({
                    id: req.user.id
                }, {
                    _id: 0
                }).toArray(function (err, ress) {
                    if (err) {
                        console.log(err);
                        res.json({
                            code: 600
                        });
                        db.close();
                    } else {
                        res.json({
                            code: 100,
                            pins: ress[0].pins
                        });
                        db.close();
                    }
                });
            }
        });

    }
});
app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

app.get('/all', function (req, res) {
    console.log('ALL ROUTE');

    var count;

    mongo.connect(mongourl, function (err, db) {
        if (err) {
            console.log(err);
        } else {
            var col = db.collection('data');
            var ret = [];
            col.find({}).toArray(function (err, ress) {
                if (err) {
                    console.log(err);
                    db.close();
                } else {
                    ress.forEach(function (item) {
                        item.pins.forEach(function (item) {
                            ret.push(item);
                        });
                    });
                    console.log(`ALL PINS\n${ret}`);
                    res.json({
                        all: ret
                    });
                    db.close();
                }
            });
        }
    });
});

app.get('/add', function (req, res) {
    console.log('ADD ROUTE');
    var url = req.query.url;
    var description = req.query.description;
    if (description == '') {
        description = '-no description-';
    }
    console.log(description);

    if (req.user) {
        mongo.connect(mongourl, function (err, db) {
            if (err) {
                console.log(err);
                res.json({
                    code: 600,
                    status: 'Error connecting to db'
                });
            } else {
                var col = db.collection('data');
                col.find({
                    id: req.user.id
                }, {
                    _id: 0
                }).toArray(function (err, ress) {
                    if (err) {
                        console.log(err);
                        db.close();
                    } else {
                        var id = Date.now();
                        ress[0].pins.push({
                            url: url,
                            description: description,
                            love: 0,
                            id: id,
                            ownerId: req.user.id
                        });
                        col.update({
                            id: req.user.id
                        }, ress[0]);

                        res.json({
                            code: 100,
                            status: 'Database updated',
                            id: id,
                            ownerId: req.user.id,
                            description: description,

                        });
                        db.close();
                    }
                });
            }
        });
    } else {
        res.json({
            code: 500,
            status: 'Logged in as Guest'
        });
    }



});
app.get('/love', function (req, res) {
    var id = req.query.id;
    console.log('\nLOVE ROUTE');
    console.log(id);
    //console.log(req.user);

    mongo.connect(mongourl, function (err, db) {
        if (err) {
            console.log(err);
            res.json({
                code: 600
            });
        } else {
            var col = db.collection('data');
            if (!req.user) {
                console.log('Logged in as GUEST');
                res.json({
                    code: 500
                });
                db.close();
            } else {
                var liked = false;
                col.find({
                    id: req.user.id
                }, {
                    _id: 0
                }).toArray(function (err, ress) {
                    if (err) {
                        console.log(err);
                        db.close();
                    } else {
                        console.log(ress[0]);
                        ress[0].loves.forEach(function (item) {
                            if (item == id) {
                                liked = true;
                            }
                        });
                        if (liked) {
                            console.log('Already liked...');
                            res.json({
                                code: 1003
                            });
                            db.close();
                        } else {
                            ress[0].loves.push(id);
                            col.update({
                                id: req.user.id
                            }, ress[0]);

                            col.find({}, {
                                _id: 0
                            }).toArray(function (err, ress) {

                                var found = false;
                                var index;
                                for (var j = 0; j < ress.length; j++) {
                                    for (var i = 0; i < ress[j].pins.length; i++) {
                                        if (ress[j].pins[i].id == id) {
                                            ress[j].pins[i].love++;
                                            found = true;
                                            index = j;
                                        }

                                    }
                                }
                                if (found) {
                                    col.update({
                                        id: ress[index].id
                                    }, ress[index]);

                                    res.json({
                                        code: 1001
                                    });
                                    db.close();
                                } else {
                                    console.log('IMAGE NOT FOUND');
                                    res.json({
                                        code: 1002
                                    });
                                    db.close();
                                }
                            });
                        }
                    }
                });
            }
        }
    });



});
app.get('/delete', function (req, res) {
    console.log('\nDELETE ROUTE');
    var id = req.query.id;
    if (!req.user) {
        res.json({
            code: 500
        });
    } else {
        mongo.connect(mongourl, function (err, db) {
            if (err) {
                console.log(err);
                res.json({
                    code: 600
                });
            } else {
                var col = db.collection('data');
                col.find({
                    id: req.user.id
                }, {
                    _id: 0
                }).toArray(function (err, ress) {
                    if (err) {
                        console.log(err);
                        res.json({
                            code: 600
                        });
                        db.close();
                    } else {
                        var ret = [];
                        ress[0].pins.forEach(function (item) {
                            if (item.id != id) {
                                ret.push(item);
                            } else {
                                console.log('REMOVING ' + id);
                            }
                        });
                        ress[0].pins = ret;
                        col.update({
                            id: req.user.id
                        }, ress[0]);
                        db.close();
                        res.json({
                            code: 100,
                            pins: ret
                        });
                        db.close();
                    }
                });
            }

        });
    }
});
app.get('/peep', function (req, res) {
    console.log('\nPEEP ROUTE');
    var id = req.query.id;
    console.log(`peeping into ${id}`);
    if (req.user) {
        res.render('peep.ejs', {
            user: req.user,
            id: id
        });
    } else {
        res.render('peep.ejs', {
            user: {
                name: '###'
            },
            id: id
        });
    }
});
app.get('/loadPeep', function (req, res) {
    var id = req.query.id;
    mongo.connect(mongourl, function (err, db) {
        if (err) {
            console.log(err);
            res.json({
                code: 600
            });
        } else {
            var col = db.collection('data');
            col.find({
                id: id
            }).toArray(function (err, ress) {
                if (err) {
                    console.log(err);
                    res.json({
                        code: 600
                    });
                    db.close();
                } else {
                    res.json({
                        code: 100,
                        peeps: ress[0].pins,
                        name: ress[0].name,
                        profile_pic: `http://graph.facebook.com/${id}/picture?type=normal`
                    });
                    db.close();
                }
            });
        }
    });
});
