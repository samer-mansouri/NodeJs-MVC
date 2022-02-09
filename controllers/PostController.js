const express = require('express');
var router = express.Router();
const mongoose = require('mongoose');
const Post = mongoose.model('Post');
const multer  = require('multer')
const upload = multer({ dest: '../uploads/' })
const path = require("path");
const fs = require("fs");
const redis = require('redis');

const { isAuthenticated } = require('./UserController');
const client = redis.createClient(6379);


router.get('/home/:page', isAuthenticated, (req, res) => {
  
  client.get("docsNum", (err, data) => {
    if(err) throw err;

    if(data !== null){
          let pageNumber;
          if(data != 0){
             pageNumber = Math.ceil(data / 5);
          } else {
             pageNumber= 1
          }
          if(req.params.page > pageNumber){
            res.redirect('/home/1');
          } else {
            let skip = 5 * req.params.page - 5;
            let limit = 5;
            GetPosts(req, res, skip, limit, pageNumber, req.params.page);
          } 
    } else {
      Post.countDocuments((err, NumberOfPosts) => {

        if(!err){
          let pageNumber;
          if(NumberOfPosts != 0){
             pageNumber = Math.ceil(NumberOfPosts / 5);
          } else {
             pageNumber= 1
          }
          client.setex("docsNum", 3600, NumberOfPosts); 
          if(req.params.page > pageNumber){
            res.redirect('/home/1');
          } else {
            let skip = 5 * req.params.page - 5;
            let limit = 5;
            GetPosts(req, res, skip, limit, pageNumber, req.params.page);
          }
        } else {
          console.log(err);
        }
      })
    }
  })

  

});

router.get('/postcreate', isAuthenticated, (req, res) => {
  res.render('Posts/post-create', {message: '', alert:'', title:"Post Create", posts:'', currentUser: req.session.user, currentUser: req.session.user});
})

router.post('/postcreate', isAuthenticated, upload.single('picture'), (req, res) => {
  CreatePost(req, res);
})

router.get('/post/:id', isAuthenticated, cache, (req, res) => {
  GetSinglePost(req, res);
})

router.get('/post/update/:id', isAuthenticated, (req, res) => {

  client.get(req.params.id, (err, data) => {
    if (err) throw err;

    if (data !== null) {
      data = JSON.parse(data);
      if(req.session.user != data.user){
        res.redirect('/home/1');
      } else {
        res.render('Posts/update-post', {post: data, message:'', alert:'', currentUser: req.session.user, title:'Post Update'})
      }

    } else {
      
      Post.findById(req.params.id, (err, doc) =>{
        if(!err){
          if(req.session.user != doc.user){
            res.redirect('/home/1');
          } else {
            res.render('Posts/update-post', {post: doc, message:'', alert:'', currentUser: req.session.user, title:'Post Update'})
          }
        } else {
          console.log("Error")
        }
      })

    }
  });

})

router.post('/post/update/:id', isAuthenticated, (req, res) => {
  
  client.get(req.params.id, (err, data) => {
    if(err) throw err;

    if(data !== null){
      data = JSON.parse(data);
      if(req.session.user != data.user){
        console.log("Unauthorized !!");
      } else {

        Post.findOneAndUpdate({_id: req.params.id}, {content:req.body.content}, {new:true}, (err, doc) => {
          if(!err){
            client.setex(doc._id.toString(), 3600, JSON.stringify(doc));
            res.render('Posts/update-post', {post: doc, message:'Post Content Updated With Success', alert:'alert-success', currentUser: req.session.user, title:'Post Update'})
          } else {
            console.log("Error");
          }
        })
        
      }
    }
  })


});
 
router.get('/post/delete/:id', isAuthenticated, (req, res) => {
  DeletePost(req, res);
})


function CreatePost(req, res){
  
      if(req.file){
        var originalName = req.file.originalname;
        const tempPath = req.file.path;
        var targetPath = path.join(__dirname, "../uploads/posts/"+ originalName);
        if (path.extname(originalName).toLowerCase(originalName) === ".png" || path.extname(originalName).toLowerCase() === ".jpg" ||  path.extname(originalName).toLowerCase() === ".jpeg"  ){
          fs.rename(tempPath, targetPath, err => {
            if(err){
              res.render('Posts/post-create', {message: 'Somethning went wrong', alert:'alert-danger', title:"Post Create", posts:"", currentUser: req.session.user});   
            }
          })
        } else {
          fs.unlink(tempPath, err => {
            if (err) {
              res.render('Posts/post-create', {message: 'Somethning went wrong', alert:'alert-danger', title:"Post Create", posts:"", currentUser: req.session.user});                 
            } else {
              res.render('Posts/post-create', {message: 'Invalid image format', alert:'alert-danger', title:"Post Create", posts:"", currentUser: req.session.user});   
            }
          })
        }
      }

      client.get("docsNum", (err, data) => {
        if(err) throw err;
    
        if(data !== null){
          client.setex("docsNum", 3600, +data+1)
        } else {
          console.log(err);
        }
      })

      let post = new Post();
      post.content = req.body.content;
      post.picture = `http://localhost:5000/posts/${originalName}`;
      post.user = req.session.user;
      post.userFullName = req.session.userFullName;
      post.save((err, doc) => {
        if(!err){
          res.render('Posts/post-create', {message: 'Post created with success !', alert:'alert-success', title:"Post Create", posts:'', currentUser: req.session.user});
        } else {
          console.log(err);
          res.render('Posts/post-create', {message: 'Somethning went wrong', alert:'alert-danger', title:"Post Create", posts:"", currentUser: req.session.user});
        }
      });
    }
  

function GetPosts(req, res, skip, limit, pageNumber, currentPage){
    Post.find({}, null, {skip: skip, limit: limit, sort: {createdAt: -1}}, (err, docs) => {
      if(!err){
        let next = +currentPage + 1;
        let previous = currentPage - 1;
        res.render('Posts/home', {message: '', alert:'', title:"Home", posts:docs, currentUser: req.session.user, pages: pageNumber, currentPage: currentPage, next:next, previous:previous});
      } else {
        console.log("Error");
      }
    })
  }

function GetSinglePost(req, res){
  Post.findOne({_id:req.params.id}, (err, doc) => {
    if(!err){
      console.log("From DB");
      client.setex(req.params.id, 3600, JSON.stringify(doc));
      res.render('Posts/single-post', {message: '', alert:'', title:"Home", post:doc, currentUser: req.session.user});
    } else {
      res.render('Posts/single-post', {message: `This post doesn't exist`, alert:'alert-danger', title:"Home", post:doc, currentUser: req.session.user});
    }
  });
}

function DeletePost(req, res){
  Post.findOneAndRemove(req.params.id, (err, doc) => {
    if(!err){
      client.get("docsNum", (err, data) => {
        if(err) throw err;
    
        if(data !== null){
          client.setex("docsNum", 3600, data-1);
          client.del(req.params.id); 
        } else {
          
        }
      })
      res.redirect('/home/1');
    } else {
      console.log("Error")
    }
  })
}

function cache(req, res, next) {
  const { id } = req.params;

  client.get(id, (err, data) => {
    if (err) throw err;

    if (data !== null) {
      data = JSON.parse(data);
      console.log("From Redis")
      res.render('Posts/single-post', {message: '', alert:'', title:"Home", post:data, currentUser: req.session.user});
    } else {
      next();
    }
  });
}




module.exports = router;