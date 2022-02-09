const express = require('express');
var router = express.Router();
const mongoose = require('mongoose');
const User = mongoose.model('User');
const multer  = require('multer')
const upload = multer({ dest: '../uploads/' })
const path = require("path");
const fs = require("fs");
const redis = require('redis');
const client = redis.createClient(6379);
const { isAuthenticated } = require('./UserController');



router.get('/profile/:id', isAuthenticated, cache, (req, res) => {
  getUserInfos(req, res);
})

router.post('/profile/:id', isAuthenticated, upload.single('picture'), (req, res) => {
  console.log(req.body)
  if(req.body.profile){
    UpdateUserInfos(req, res);
  } else if (req.body.picture){
    UpdateUserProfilePic(req, res);
  }
})


function getUserInfos(req, res){
  User.findOne({_id:req.params.id}, (err, doc) => {
    if(!err){
      console.log("From DB");
      client.setex(req.params.id, 3600, JSON.stringify(doc));
      res.render('profiles/profile', {
        message: '', 
        alert:'', 
        title:`${doc.firstName} ${doc.lastName}`, 
        user:doc,
        currentUser: req.session.user,
      });
    } else {
      console.log("Error");
    }
  });
}

function UpdateUserInfos(req ,res){
  console.log(req.session.user);
  User.findOneAndUpdate({_id: req.session.user}, req.body, {new:true}, (err, doc) =>{
    if(!err){
      client.setex(doc._id.toString(), 3600, JSON.stringify(doc));
      res.render('profiles/profile', {
        message: 'User Infos Updated With Success', 
        alert:'alert-success', 
        title:`${doc.firstName} ${doc.lastName}`, 
        user:doc,
        currentUser: doc._id.toString()});
    } else {
      console.log("Error")
    }
  })
  
}

async function UpdateUserProfilePic(req, res) {
  if(req.file){
    console.log(req.file.originalname)
    var originalName = req.file.originalname;
    const tempPath = req.file.path;
    var targetPath = path.join(__dirname, "../uploads/profiles/"+ originalName);
    if (path.extname(originalName).toLowerCase(originalName) === ".png" || path.extname(originalName).toLowerCase() === ".jpg" ||  path.extname(originalName).toLowerCase() === ".jpeg"  ){
      fs.rename(tempPath, targetPath, err => {
        if(err){
          data = getCached(req.session.user.toString())
          res.render('profiles/profile', {
            message: 'Something Went Wrong', 
            alert:'alert-danger', 
            title:`${doc.firstName} ${doc.lastName}`, 
            user:doc,
            currentUser: data});   
        }
      })
    } else {
      fs.unlink(tempPath, err => {
        if (err) {
          data =  getCached(req.session.user.toString())
          res.render('profiles/profile', {
            message: 'Something Went Wrong', 
            alert:'alert-danger', 
            title:`${doc.firstName} ${doc.lastName}`, 
            user:doc,
            currentUser: data});                    
        } else {
          data =  getCached(req.session.user.toString())
          res.render('profiles/profile', {
            message: 'Invalid Image format', 
            alert:'alert-danger', 
            title:`${doc.firstName} ${doc.lastName}`, 
            user:doc,
            currentUser: data});     
        }
      })
    }
    console.log(originalName)
  User.findOneAndUpdate({_id: req.session.user}, {profilePic: `http://localhost:5000/profiles/${originalName}`}, {new:true}, (err, doc) =>{
      if(!err){
        client.setex(doc._id.toString(), 3600, JSON.stringify(doc));
        res.render('profiles/profile', {
          message: 'Profile Picture Updated With Success', 
          alert:'alert-success', 
          title:`${doc.firstName} ${doc.lastName}`, 
          user:doc,
          currentUser: doc._id.toString()});
      } else {
        console.log("Error")
      }
    })
  } else {
    res.redirect(`/profile/${req.session.user}`)
  }
  

}

function cache(req, res, next) {
  const { id } = req.params;

  client.get(id, (err, data) => {
    if (err) throw err;

    if (data !== null) {
      data = JSON.parse(data);
      console.log("From Redis")
      res.render('profiles/profile', {
        message: '',
         alert:'', 
         title:`${data.firstName} ${data.lastName}`,
          user:data, 
          currentUser: req.session.user});
    } else {
      next();
    }
  });
}

function getCached(id){
  client.get(id, (err, data) => {
    if(err) throw err;

    if(data !== null) {
      data.JSON.parse(data.data);
      return data
    }
  })
}




module.exports = router;