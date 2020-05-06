var _ = require('underscore');

exports = module.exports = function(){};

function Load(server, apiPath) {
    //枚举api接口的所有url
    var appRootPath = require('app-root-path');
    var fs = require('fs');
    var path = require('path');
    var rootPath = path.join(appRootPath.path, apiPath);

    var TraversePath = function(basePath)
    {
        var avaliableExtname = ['.js'];

        var files;
        try{
            files = fs.readdirSync(basePath);
        }
        catch(e){
            // log.error('Error: ', e);
            return;
        }

        if(!files){
            return;
        }

        _.each(files, function(basename){
            //
            var newSubPath = path.join(basePath, basename);
            var extName = path.extname(basename);

            //判断文件是否可用于加载
            var fsStat = fs.lstatSync(newSubPath);
            if(!fsStat.isDirectory() && !_.contains(avaliableExtname, extName)){
                return;
            }

            if(fsStat.isDirectory()){
                //path
                TraversePath(newSubPath);
            }
            else if(extName == '.js'){
                //file
                var relativePath = path.relative(rootPath, basePath);
                var file = path.join(basePath, basename);

                try {
                    var importFile = require(file);
                    if(importFile.enable == null && importFile.enable == undefined || importFile.enable){
                        var method = importFile.method || 'post';
                        var token = importFile.Token || importFile.token;
                        if(server[method]  && token){
                            var url = path.join(apiPath, relativePath, token);
                            server[method](url.replace(/\\/g,'/'), importFile);
                            log.debug(method, ' ==> ', url.replace(/\\/g,'/'));
                        }
                    }
                }
                catch(e){
                    log.error(file, 'load error', e);
                }
            }
        })
    };

    TraversePath(rootPath);
}

exports.Load = function (server, pathArray) {
    _.each(pathArray, function (apiPath) {
        Load(server, apiPath);
    });
};