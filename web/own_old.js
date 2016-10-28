var csrf        = require('csurf');
var express     = require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var session     = require('express-session');
var Promise     = require('bluebird');
var scrypt      = require('scrypt-for-humans');
var KnexSessionStore    =   require('connect-session-knex')(session);

var knex        = require('knex');

knex = knex({
  client: 'mysql',
  connection: {
        host : 'localhost',
        user: 'oneworld',
        password: 'but2brainz',
        database: 'oneworld'
  }
});

var store = new KnexSessionStore({
    knex: knex,
    tablename: 'sessions'
});
app.use(session({
    secret: 'n0t4junkc4r!',
    store: store
}));

var csrfProtection = csrf();



var apiRoutes   = express.Router();



var config = require('./config'); 



var port = 7777;
app.set("superSecret", config.secret);

app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());

app.use(morgan('dev'));
app.use(express.static('static'));

app.use(csrfProtection);
app.use(function(req,res,next){
	res.cookie('XSRF-TOKEN', req.csrfToken());
	return next();
});

//routes
app.get('/', function(req,res){
    res.sendFile('index.html');
})




apiRoutes.post('/authenticate',function (req,res){
   

    knex.select().from("User").where(function(){
        this.whereRaw("Email = ?", [req.body.email]);
    }).then(function(user){
        if (user.length == 0){
            res.send(403, {success:false,message:"User not found."});
        } else {
            Promise.try(function(){
                return scrypt.verifyHash(req.body.password,user[0].Password);
            }).then(function(){
             
                var loggedInUser = userify(user);
                req.session.user = loggedInUser;
                res.json(loggedInUser);

            }).catch(scrypt.PasswordError, function(err){
                req.session.user = false;
                res.json({sucess:false,message:'Invalid login attempt.'});
            });
        }
    });

});


apiRoutes.post('/signUp', function(req,res){

    knex.select().from("User").where({Email:req.body.email}).then(function(userExists){

       if (userExists.length==1){
           res.json({sucess:false,message:"Sorry, it appears someone has already registered with using this E-mail address...."});
       } else {
           Promise.try(function() {
               
               return scrypt.hash(req.body.password);
           }).then(function(hash){
		var usertype = 0;
		if (req.body.usertype == "Provider"){
			usertype = 1;
		}
		console.log(usertype);
               knex('User').insert({'Password':hash, 'Email':req.body.email, 'FirstName':req.body.firstname, 'LastName':req.body.lastname, 'CompanyName':req.body.companyname == undefined ? null : req.body.companyname, 'isProvider':usertype}).then(function(user){
                   res.json({success:true, message:'SignUp was successful.'});
               });
           });

           
       }


    });

});


apiRoutes.post('/isLoggedIn', function(req,res){

    if (typeof req.session.user.isLoggedIn !== 'undefined' && req.session.user.isLoggedIn === true){
        res.json(req.session.user);
    } else {
        res.json(403,{isLoggedIn:false});   
    }
});



apiRoutes.post('/logout', function(req,res){
    req.session.user = {};
    res.json({});
});



apiRoutes.get('/', function(req,res){
    res.json({ message: 'Welcome !'});
});




app.use('/api',apiRoutes);

app.listen(port);




userify = function (user){
    var SignedInUser = {};
    SignedInUser.type = user[0].isProvider == 1 ? 'Provider' : 'Seeker';
    SignedInUser.email = user[0].Email;
    SignedInUser.firstname = user[0].FirstName;
    SignedInUser.lastname = user[0].LastName;
    SignedInUser.companyname = user[0].companyName;
    SignedInUser.id = user[0].UserID;
    SignedInUser.success = true;
    SignedInUser.isLoggedIn = true;
    return SignedInUser;     
}

