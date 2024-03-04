require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
var session = require('express-session');
var MongoDBStore = require('connect-mongodb-session')(session);
var nodemailer = require('nodemailer');
var cors = require('cors');
var {Credential, Post, Company,Admin} =  require("./schemas/dbschemas");
require("dotenv").config();
mongoose.connect("mongodb+srv://prudvi:prudvi10@cluster0.izzyx.mongodb.net/mainproDB?retryWrites=true&w=majority", {useNewUrlParser:true, useUnifiedTopology:true, useFindAndModify: false});

const app = express();

var store = new MongoDBStore({
    uri:"mongodb+srv://prudvi:prudvi10@cluster0.izzyx.mongodb.net/mainproDB?retryWrites=true&w=majority",
    collection: 'mySessions',
    connectionOptions: {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
  });

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));
app.use(cors({
    origin: ["https://main--stoic-kalam-bfc287.netlify.app","https://mentor-gvpce.herokuapp.com","http://localhost:3000"],
    methods: ['GET','POST','OPTIONS','HEAD'],
    credentials: true,
    exposedHeaders: ['set-cookie']
}));

app.set('trust proxy',true);
app.use(session({
    secret: "This secret key ",
    resave: false,
    unset:'destroy',
    saveUninitialized: true,
    store: store,
    cookie: {
        httpOnly:true,
        secure:true,
        maxAge: 15 * 24 * 60 * 60 * 1000,
        sameSite:'none'
      }
  }));

const authmiddleware = (req, res, next) => {
    if(req.session.isAuth){
        next();
    }
    else{
        res.redirect("/");
    }
}


app.get("/", function(req,res){
  // req.session.isAuthfrrstpswd = true;
  if(req.session.isAuth){
      // return res.redirect("/home");
      return res.send({isloggedin:true,name:req.session.username,user_id:req.session.userid, isadmin : req.session.isadmin});
  }
  // res.render("login");
  res.send({isloggedin:false});
});

app.post("/", function(req, res){
  // console.log(req);
  Credential.findOne({email : req.body.user_mail.toLowerCase()},  function(err,result){
      console.log(result);
      if(!result){
          res.send({isvaliduser: false});
      }
      else{
          bcrypt.compare(req.body.user_password, result.password, function(err, re){
          // console.log(res);
          if(re){
              req.session.isAuth = true;
              req.session.userid = result._id;
              req.session.username= result.name;
              // Admin.findOne({email:req.body.user_mail}).then((doc) => {
              //     if(doc){
              //         req.session.isadmin = true;
              //         res.send(JSON.stringify({isvaliduser:true, name:result.name, user_id:result._id, isadmin: req.session.isadmin}));
              //     }
              //     else{
              //         req.session.isadmin = false;
              //         res.send(JSON.stringify({isvaliduser:true, name:result.name, user_id:result._id, isadmin: req.session.isadmin}));
              //     }
              // })
              req.session.isadmin = result.isadmin;
              console.log(result.name);
              res.send(JSON.stringify({isvaliduser:true, name:result.name, user_id:result._id, isadmin: result.isadmin}));
              // console.log(req.session);
              // res.redirect("/home");
          }
          else{
              // res.send("<h1>Invalid Credentials</h1>")
              res.send({isvaliduser: false});
          }
      });
  }
      // console.log("done");
  });

});

app.get("/register", function(req,res){
  res.render("register");
});

app.post("/register", function(req,res){
  // console.log(req.body);
  Credential.findOne({email : req.body.user_mail.toLowerCase()})
  .then((result)=>{
      // console.log(result);
      if(result){
          // console.log(result);
          // res.send("<h1>email already registered </h1>");
          res.send({isdone:false,});
      }
      else{
          var hashed_password = bcrypt.hashSync(req.body.user_password, 8);
          console.log(hashed_password);
          Admin.findOne({email:req.body.user_mail.toLowerCase()}).then((doc) => {
              console.log(doc)
              if(doc){
                  const credential = new Credential({name: req.body.user_name, email: req.body.user_mail.toLowerCase(), password: hashed_password, reset: false,isadmin: true });
                  credential.save();
              }
              else{
                  const credential = new Credential({name: req.body.user_name, email: req.body.user_mail.toLowerCase(), password: hashed_password, reset: false, isadmin: false });
                  credential.save();
              }
          })
          
          // res.redirect("/");
          res.send({isdone:true,})
      }
  })
});

app.get("/home", authmiddleware, function(req,res){
    // res.redirect("/")
    res.render("home");
});

app.post("/logout", function(req,res){
  console.log("logout");
    req.session.destroy((err) => {
        res.redirect("/");
    })
});

app.get("/resetlinkroute", function(req, res){
    if(req.session.isAuthfrrstpswd){
        req.session.count = 0
        req.session.isAuthfrrstpswd = false;
        res.render("resetlink");
    }
    else{
        // res.send("<h1>You can only come here by clicking forgot password in login page🤣</h1>");
        res.redirect("/");
    }
});

app.post("/resetlinkroute", function(req, res){
    console.log(req.body);
    Credential.findOne({email : req.body.user_mail.toLowerCase()},  function(err,result){
        if(!result){
            // res.send("<h1>You're not registered</h1>");
            res.send({isvalidmail: false})
        }
        else{
            // res.send("<h1>Check your mail</h1>");
            res.send({isvalidmail: true});
            var transporter = nodemailer.createTransport({
                service: 'gmail',
                // host: 'smtp.gmail.com',
                // port: 587,
                // secure: false,
                requireTLS: true,
                auth: {
                  user:"noreplyfrtesting@gmail.com",
                  pass:"noreply123"
                }
              });
            
              var mailOptions = {
                from: "noreplyfrtesting@gmail.com",
                to: req.body.user_mail.toLowerCase(),
                subject: 'No-reply',
                html: '<h1><a href= "https://mentor-gvpce.herokuapp.com/resetpswd">your link</a>Welcome</h1><p>That was easy!</p>'
              }

              Credential.findOneAndUpdate({email: req.body.user_mail.toLowerCase()},{ $set: {reset: true}},{new: true} , (err, doc) => {
                if(err){
                    console.log("something went wrong");
                }
                else{
                    console.log(doc);
                }
            });
       
            transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                  console.log(error);
                } else {
                  console.log('Email sent: ' + info.response);
                }
              });
        }
    });
});

app.get("/resetpswd", function(req,res){
    // if(!req.session.count){
    //     req.session.count = 0
    // }
    // req.session.count += 1;
    // if(req.session.count === 1){
    //     res.render("resetpassword");
    // }
    // else{
    //         res.send("<h1>Link expired</h1>");
    // }
    res.render("resetpassword");
});

app.post("/resetpswd", function(req, res){
    Credential.findOne({email : req.body.user_mail.toLowerCase()},  function(err,result){
        if(!result){
            res.send("<h1>Give correct mail</h1>");
        }
        else if(result.reset){
            if(req.body.new_pswd===req.body.re_new_pswd)
            {
            console.log(req.body);
            var hashed_password = bcrypt.hashSync(req.body.new_pswd, 8);
            Credential.findOneAndUpdate({email: req.body.user_mail.toLowerCase()},{ $set: {password: hashed_password, reset:false}},{new: true} , (err, doc) => {
                if(err){
                    console.log("something went wrong");
                }
                else{
                    console.log(doc);
                }
            });
            res.send("<h1>Password Updated</h1>");
        }
        else
        {
            res.send("<h1>Passwords doesn't match.Check your new password!!</h1>")
        }
        }
        else{
            res.send("<h1>You've already reset the password,, if forgot goto login page and click forgot password </h1>")
        }
    });

    
});

app.get("/testingreact", function(req,res){
    const ex_data_react = {
        one: "one",
        two: "two"
    }
    res.send(ex_data_react)
});
app.post("/posts", function(req,res){
    // const company = new Company({company_name : "Infosys", company_role : ["se", "ses", "sp"]});
    // company.save();
    console.log("posts requested");
    let order=req.body.order?req.body.order:"desc";
    let sortBy=req.body.sortBy?req.body.sortBy:"_id";
    let limit=req.body.limit?parseInt(req.body.limit):100;
    let skip=parseInt(req.body.skip);

    let findArgs={};
    for(let key in req.body.filters){
        if(req.body.filters[key].length>0)
        {
                findArgs[key]=req.body.filters[key];
                console.log(findArgs)
        }
    }
    Post.find(findArgs).populate("writer").sort([[sortBy,order]]).skip(skip).limit(limit).exec((err,result) => {
        if(err) return res.status(400).json({success:false,err})
        res.status(200).json({success:true,result,postSize:result.length});
    })
})
//app.post("/forloadmore",function(req,res){
//  let order=req.body.order?
//})
app.post("/testingreact", function(req,res){
    console.log(req.body);
    const post = new Post({userid:req.body.userid,c_name :req.body.c_name, c_role: req.body.c_role, branch: req.body.branch, desc: req.body.desc,u_name:req.body.u_name,title:req.body.title,time:Date()});
    post.save();
    res.send("done");
});
app.post("/displayingpost",function(req,res){
    console.log(req.body);
    Post.findOne({"_id":req.body.postId})
    .exec((err,post)=>{
        if(err) return res.status(400).send(err);
        res.status(200).json({success:true,post})
        console.log(post);
    })
})
app.post("/editpost",function(req,res){
    console.log(req.body);
    Post.findOne({"_id":req.body.postId})
    .exec((err,post)=>{
        if(err) return res.status(400).send(err);
        res.status(200).json({success:true,post})
        console.log(post);
    })
})


app.post("/updatepost", function(req,res){
    Post.findByIdAndUpdate(req.body.postid,{title:req.body.title,time:Date(), c_name : req.body.c_name, c_role: req.body.c_role, branch: req.body.branch, desc: req.body.desc},{new:true}, (err,doc) => {
        if(err){
            res.send({updated:false})
        }
        else{
            res.send({updated:true})
        }
    })
  })

app.post("/fetchuserposts",function(req,res){
let order="desc";
let sortBy="_id";
    Post.find({"userid":req.body.userid}).populate("writer").sort([[sortBy,order]]).exec((err,result) => {
        if(err) return res.status(400).json({success:false,err})
        res.status(200).json({success:true,result,postSize:result.length});
        console.log(result);
    })
})
app.get("/test", function(req,res){
    const company = new Company({company_name : "Infosys", company_role : ["se", "ses", "sp"]});
    company.save();
})

app.get("/companies", function(req,res) {
  Company.find({}).then((result) => {
      res.send(result);
  })
});

// route for adding mail into admindb
app.post("/addadminmail", function(req,res){
  console.log(req.body)
  Credential.findOneAndUpdate({email: req.body.mail.toLowerCase()},{ $set: {isadmin: true}},{new: true} , (err, doc) => {
      if(err){
          console.log("something went wrong");
      }
      else{
          console.log(doc);
      }
  });
  Admin.findOne({email: req.body.mail.toLowerCase()}).then((doc)=>{
      if(doc){
          res.send({isdone:false});
      }
      else{
          const admin = new Admin({email: req.body.mail.toLowerCase()})
          admin.save();
          res.send({isdone:true});
      }
  })
});

app.post("/addingcdata", function(req,res){
  // console.log(req.body);
  // console.log(req.body.c_roles.split(","))
  const lst = req.body.c_roles.toUpperCase().split(",")
  const company = new Company({company_name: req.body.c_name.toUpperCase(), company_roles:lst})
  company.save();
  res.send({isdone:true})
});

app.post("/updatingcdata", function(req,res){
  console.log(req.body);
  // console.log(req.body.c_roles.split(","));
  const lst = req.body.c_roles.toUpperCase().split(",")
  console.log(lst,req.body.data_id);
  Company.findByIdAndUpdate( req.body.data_id,{company_roles: lst} ,{new: true}, (err, doc) => {
      if(err){
          console.log("something went wrong");
      }
      else{
          console.log(doc);
      }
  });
  res.send({isdone:true})
});

app.post("/deletepost", function(req,res){
  console.log(req.body)
  Post.findByIdAndDelete(req.body.id, function(err,doc){
      if(err){
          console.log(err);
      }
      else{
          console.log(doc);
      }
  })
  res.send({isdone:true});
});

app.listen(process.env.PORT||5005, function(){
    console.log("server started successfully🤩");
})



