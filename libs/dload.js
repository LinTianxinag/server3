var needless = require('needless');
var path = require('path');
var appRootPath = require('app-root-path');


exports = module.exports = function(modulePath){
	modulePath = path.join(appRootPath.path, modulePath);
	modulePath = path.resolve(modulePath);
	//log.debug(modulePath);
	needless(modulePath);
	return require(modulePath);
};
