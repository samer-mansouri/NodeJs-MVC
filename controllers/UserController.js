const express = require('express');
var router = express.Router();
const mongoose = require('mongoose');
const User = mongoose.model('User');
const Joi = require('joi');
const bcrypt = require('bcrypt');



router.get('/register', isNotAuthenticated, (req, res) => {
  res.render('register-login/register', {message: "", alert: "", user: "", title:"Register", currentUser: ''})
})

router.post('/register', (req, res) => {
  CreateUser(req, res)
})

router.get('/login', isNotAuthenticated, (req, res) => {
  res.render('register-login/login', {message:"", alert: "", user: "", title:"Login", currentUser: ''});
})

router.post('/login', (req, res) => {
  checkUser(req, res);
})

router.get('/forgotpass', isNotAuthenticated, (req, res) =>{
  res.render('register-login/forgot-password', {message:"", alert: "", user: "", title:"Forgot Password", currentUser: ''});
})

router.post('/forgotpass', isNotAuthenticated, (req, res) =>{
  forgotPassword(req, res);
})

router.get('/forgotpassword/:passwordResetToken', isNotAuthenticated, (req, res) => {

  User.findOne({passwordResetToken: req.params.passwordResetToken}, (err, doc) => {

    if(!err) {
      if(doc != null) {
        res.render('register-login/change-password', {inv :1, message:"", alert: "", user: {token: doc.passwordResetToken}, title:"Reset Password", currentUser: ''});

      } else {
        
        res.render('register-login/change-password', {inv:'' ,message:"Invalid password Reset Token", alert: "alert-danger", user:'', title:"Reset Password", currentUser: ''});

      }

    } else {
      console.log("Error ", err);
    }

  })

})

router.post('/forgotpassword/:passwordResetToken', isNotAuthenticated, (req, res) => {
  const user1 = {
    password1: req.body.password1,
    password2: req.body.password2
  }

  if(user1.password1 === user1.password2){
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(user1.password1, salt);
    User.findOneAndUpdate({passwordResetToken: req.params.passwordResetToken}, {$unset:{passwordResetToken:1}, password:hash}, {new:true}, (err, doc) => {

      if(!err){

        res.render('register-login/change-password', {inv :'', message:"Password updated with success! <br> You can now login with your new password", alert: "alert-success", user: {password1:'', password2:'', token: ''}, title:"Reset Password", currentUser: ''});


      } else {
        console.log("Error ", err);
      }

    })
  } else {
    res.render('register-login/change-password', {inv :1, message:"Passwords didn't match", alert: "alert-danger", user: {...user1, token: req.params.passwordResetToken}, title:"Reset Password", currentUser: ''});
  }
})

/*
router.get('/home', isAuthenticated, (req, res) => {
  res.render('pages/home', {title:"Home"});
})*/

router.get('/logout',(req, res) => {
  logout(req, res);
})

router.get('/resetpassword', isAuthenticated, (req, res) => {
  res.render('profiles/password', {message:"", alert: "", user: "", title:"Reset Password", currentUser: req.session.user});
})

router.post('/resetpassword', isAuthenticated, (req, res) => {
  passwordUpdate(req, res);
})

router.get('/userverify/:token', isNotAuthenticated, (req, res) => {
  User.findOneAndUpdate({token:req.params.token}, {$unset:{token:1}, isVerified:true}, {new:true}, (err, doc) => {
    if(!err){
      if(doc != null){
        res.render('register-login/verify', {title:'Account Verification', 
      message:`Mail adress <b>${doc.email}</b> verified with success!`,
       alert:"alert-success"});
      } else {
        res.render('register-login/verify', {title:'Account Verification', message:"Invalid Verification Key", alert:"alert-danger"});
      }
      
    } else {
      console.log("ERR ", err);
    }
  })
})

//Functions

async function CreateUser(req, res){
  const user1 = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    password: req.body.password
  }
  const { error } = validateUser(user1);
  if(error){
    console.log(error);
    console.log(error.message)
    res.render('register-login/register', {message: error.message, alert:'alert-danger', user:user1, title:"Register", currentUser: ''});
  } else {
    let user = await User.findOne({ email:  req.body.email });
    if (user){
      res.render('register-login/register', {message: 'User with this email already exists ! ', alert:'alert-warning', user: req.body, title:"Register", currentUser: ''});
    } else {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(req.body.password, salt);
      let usr = new User();
      usr.firstName = req.body.firstName;
      usr.lastName = req.body.lastName;
      usr.email = req.body.email;
      usr.password = hash;
      usr.dateOfBirth = req.body.dateOfBirth;
      usr.profilePic = 'http://localhost:5000/profiles/default.png';
      usr.biography = 'No Biography.';
      usr.token = generate_token(64);
      usr.save((err, doc) => {
        if(!err){
          const verificationLink = `http://localhost:5000/userverify/${doc.token}`;
          const msg =`
          <p>Hello, <b>${doc.firstName} ${doc.lastName}</b> <br> Si vous voulez de continuer à utiliser notre web app <b>veuillez vérifiez votre email</b></p>
          <a href="${verificationLink}">Click here to verify your account!</a>
          `
          sendMail(doc.email, msg);
          res.render('register-login/register', {message: 'User created with success ! <br> Activation mail sent, please check ur email ! ', alert:'alert-success', user:'', title:"Register", currentUser: ''});
        } else {
          console.log(err);
        }
      });
    }
  }

}


async function checkUser(req , res){
  let user = await User.findOne({ email: req.body.email});
  if(user){
    const match = await bcrypt.compare(req.body.password, user.password);
    if (match){
      if(user.isVerified){
        req.session.userFullName = user.firstName + " " + user.lastName;
        req.session.user = user._id;
        session = req.session;
        sendMail();
        res.redirect('/home/1');
      } else {
        res.render('register-login/login', {message:"Please check your mail to verify your account", alert: "alert-warning", user: "", title:"Login", currentUser: ''});
      }
    } else {
      res.render('register-login/login', {message:"Wrong password", alert: "alert-danger", user: "", title:"Login", currentUser: ''});
    }
  } else {
    res.render('register-login/login', {message:"Invalid user", alert: "alert-warning", user: "", title:"Login", currentUser: ''});
  }
}

async function logout(req,res) {
  if(req.session){
    await req.session.destroy();
    await res.clearCookie('seessionCookie');
    res.redirect('/login');
  }
}

async function passwordUpdate(req, res){

  user = {
    password1: req.body.password1,
    password2: req.body.password2,
    password: req.body.cPassword
  }

  if(req.body.password1 != req.body.password2){
    res.render('profiles/password', {message:"Passwords didn't match", alert: "alert-warning", user: user, title:"Reset Password", currentUser: req.session.user});
  } else {

    if(req.body.password1.length < 8){
      res.render('profiles/password', {message:"Password must be over than 8 chars", alert: "alert-warning", user: user, title:"Reset Password", currentUser: req.session.user});
    } else {

      let user1 = await User.findOne({_id: req.session.user});
      if(user1){

        const match = await bcrypt.compare(req.body.password1, user1.password);
        if(match){

          const salt = bcrypt.genSaltSync(10);
          const hash = bcrypt.hashSync(req.body.password1, salt);
          User.findOneAndUpdate({_id: req.session.user}, {password:hash},{new:true}, (err, doc)=>{
            if(!err){
              res.render('profiles/password', {message:"Password updated with success", alert: "alert-success", user: '', title:"Reset Password", currentUser: req.session.user});
            } else {
              console.log("Error")
            }
          })

          
        } else {
          res.render('profiles/password', {message:"Wrong current password", alert: "alert-danger", user: user, title:"Reset Password", currentUser: req.session.user});
        }

      } else {
        console.log("User n'existe pas");
      }
    }

  }
}
  
function validateUser(user) {
  const schema = Joi.object({
      firstName: Joi.string().min(5).max(50).required().messages({
        "any.required": "First Name is required",
        "string.empty": "First Name is not allowed to be empty",
        "string.min" : "First Name length must be at least 5 characters long",
        "string.max": "First Name length must be less than or equal to 50 characters long"
      }),
      lastName: Joi.string().min(5).max(50).required().messages({
        "any.required": "Last Name is required",
        "string.empty": "Last Name is not allowed to be empty",
        "string.min" : "Last Name length must be at least 5 characters long",
        "string.max": "Last Name length must be less than or equal to 50 characters long"
      }),
      email: Joi.string().email({ tlds: { allow: false } }).min(5).max(255).required().messages({
        "any.required": "Email is required",
        "string.empty": "Email is not allowed to be empty",
        "string.min" : "Email length must be at least 5 characters long",
        "string.max": "Email length must be less than or equal to 255 characters long",
        "string.email": "Email must be a valid email"
      }),
      password: Joi.string().min(8).max(255).required().messages({
        "any.required": "Password is required",
        "string.empty": "Password is not allowed to be empty",
        "string.min" : "Password length must be at least 5 characters long",
        "string.max": "Password length must be less than or equal to 255 characters long",
      })
  });
  return schema.validate(user);
}


function isAuthenticated(req, res, next){
  if(req.session.user){
    next();
  } else {
    res.redirect('/login');
  }
}



function isNotAuthenticated(req, res, next){
  if(!req.session.user){
    next();
  } else {
    res.redirect('/home/1');
  }
}

function generate_token(length){
  var a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");
  var b = [];  
  for (var i=0; i<length; i++) {
      var j = (Math.random() * (a.length-1)).toFixed(0);
      b[i] = a[j];
  }
  return b.join("");
}

function forgotPassword(req, res){
  User.findOne({email: req.body.email}, (err, doc) => {
    if(!err){

      if(doc != null){

        if(doc.isVerified) {
          if(doc.passwordResetToken){

            res.render('register-login/forgot-password', {message:"Password reset mail already sent ! <br> Please Check ur inbox !", alert: "alert-warning", user: {email: req.body.email}, title:"Forgot Password", currentUser: ''});
  
  
          } else {
            
            User.findByIdAndUpdate({_id:doc._id}, { $set: { passwordResetToken: generate_token(64) } }, {new:true}, (err, doc) =>{
  
              if(!err){
                
                console.log(doc)
                let resetLink = `http://localhost:5000/forgotpassword/${doc.passwordResetToken}`;
                const msg =`
                <p>Hello, <b>${doc.firstName} ${doc.lastName}</b> <br> This is the link to reset your password  <b>Reset your password</b></p>
                <a href="${resetLink}">Click here to reset your Password!</a>
                `
                sendMail(doc.email, msg)
                res.render('register-login/forgot-password', {message:"Password reset mail sent with sucess! <br> Please Check ur inbox !", alert: "alert-success", user: {email: req.body.email}, title:"Forgot Password", currentUser: ''});
  
              } else {
  
                console.log("Error ", err);
  
              }
  
            })
          
          }
  
        } else {

          res.render('register-login/forgot-password', {message:"U must verify ur email adress before ! <br> Please Check ur inbox !", alert: "alert-warning", user: {email: req.body.email}, title:"Forgot Password", currentUser: ''});

        }

      } else {

        res.render('register-login/forgot-password', {message:"Cannot found user with this email adress", alert: "alert-warning", user: {email: req.body.email}, title:"Forgot Password", currentUser: ''});

      }

    } else {
      console.log("Error ", err)
    }
  })
}



function sendMail(receiver, msg){
  var nodemailer = require('nodemailer');

  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'email',
      pass: 'password'
    }
  });

  var mailOptions = {
    from: 'email',
    to: receiver,
    subject: 'WEB APP Account verification',
    text: 'Please verify your Account !',
    html: msg
  };

  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}
module.exports = { 
  router,
  isAuthenticated  

};

