var express = require('express');
var router = express.Router();
var get = require('./get');
var Dish = require('../lib/dish');
var auth = require('../lib/middleware/auth');

/****************************<yemao>******************************/
var multipart = require('connect-multiparty');
var uploadDir = require('path').join(__dirname, '../images');
var path = require('path');
var fs = require('fs');
var join = path.join;
var crypto = require('crypto');
var gm = require('gm');
/****************************</yemao>******************************/


/* route /dish/get to get */
router.use('/get', get);

router.use(auth('kitchen'));

/* set ids to currently available */
router.post('/set', function(req, res, next){
	Dish.addToCurrent(req.body.ids, function(err){
		returnStatus(res, err)
	})
});

/* remove ids from currently available */
router.post('/unset', function(req, res, next){
	Dish.removeFromCurrent(req.body.ids, function(err){
		returnStatus(res, err)
	})
});

router.use(auth('admin'));
/*add new dishes from DB*/
router.post('/add', function(req, res, next){
	var dish = new Dish(req.body.dish);
	dish.save(function(err){
		returnStatus(res, err);
	});
});

/******************<yemao>******************************/
/*add newdish by admin*/
router.post('/addcof', multipart({uploadDir: uploadDir}), addcof(uploadDir));

function addcof(dir){
	return function(req,res,next){
	var dish = new Dish(req.body.dish);

	if(req.files.dish.image.name){
			var img = req.files.dish.image;
			
			var name = new Date().getTime().toString();
			var md5 = crypto.createHash('md5');
			md5.update(name);
			name = md5.digest('hex');
			name = name.substring(0,8);
			var path = join(dir, name + ".jpg");
			var thumb_path = join(dir, name + ".thumb.jpg");
			fs.rename(img.path, path, function(err){
				if(err){
					fs.unlinkSync(img.path);
					return next(err);
				}
				
				gm(path).thumb(100, 100, thumb_path, 100, function(err){
					if(err){
						console.log(err);
						fs.unlinkSync(path);
						return next(err);
					}
				});
				
				dish.image = name;
				dish.save(function(err){
					//returnStatus(res, err);
					if(err){
						console.log("add coffee error");
					}
					res.redirect('/admin');
					});
			});	
		}
	else{
		fs.unlinkSync(req.files.dish.image.path);
		dish.save(function(err){
			//returnStatus(res, err);
			if(err){
				console.log("add coffee error");
			}
			res.redirect('/admin');	
			});
		}
	};
	
}


/******************</yemao>******************************/


router.get('/remove/:id', function(req, res, next){
	Dish.remove(req.params.id, function(err){
		returnStatus(res, err);
	})
});

router.get('/find/:name', function(req, res, next){
	Dish.find(req.params.name, function(err, dish){
		returnStatus(res, err, {target: id});
	});
});

module.exports = router;

var returnStatus = function(res, err, ex){
	if(err){
		res.send({status: 'fail', error: err});
	}else{
		var status = {status: 'success'};
		if(ex){
			status = extend(true, status, ex);
		}
		res.send(status);
	}
}

var extend = function(override, des){
	var src = Array.prototype.slice.call(arguments, 2);
	
	src.forEach(function(arg){
		for(key in arg){
			if(override || !(key in des)){
				des[key] = arg[key];
			}
		}
	});

	return des;
}
