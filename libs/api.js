var http = require('http');
var urlParse = require('url');
var https = require('https');
var crypto = require('crypto');
var _ = require('underscore');
var requestCode = require('./requestCode');

var config = require("config");
var Q = require('q');

var APPID = config.appid;
var APPSECRET = config.appsecret;
var API_URL = config.apiurl;
var APIHOST = config.apihost;
var APIPORT = config.apiport;
var HEADER = {
    "Content-type": "application/json"
    , "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    , "Connection": "keep-alive"
    , "Accept-Encoding": "identity"
    , "User-Agent": "wx"
};

function HttpRequest(host, port, header, method, url, data, func)
{
    //
    header['Content-Length'] = data.length;
    var options = {
        host: host
        , port: port
        , path: url
        , method: method
        , headers: header
    };

//    console.log(data);
//    console.log(options);

    var req = http.request(options, function(res){
        var data='';
        res.on('data', function(chunk){
            data += chunk;
        });
        res.on('end', function(){
            if(func != undefined){
                func(data);
            }
        });
    });
    req.on('error', function(e){
        log.error(method+" "+host+":"+port+url+':Err - '+e);
    });
    req.write(data);
    req.end();
}

exports.HttpGETDataProcess = function(url, postValue, func)
{
    var requestURL = config.DataProcess.url + url;
    HttpRequest(config.DataProcess.host, config.DataProcess.port, {}, 'GET', requestURL, '', function(data){
        func && func(data);
    });
};
exports.HttpPOSTDataProcess = function(url, postValue, func) {
    var requestURL = config.DataProcess.url + url;
    var header = {
        'Content-Type': 'application/json'
    };
    HttpRequest(config.DataProcess.host, config.DataProcess.port, header, 'POST', requestURL, JSON.stringify(postValue), function (data) {
        func && func(data);
    });
};

exports.Elephantry = function(url, data)
{
    var deferred = Q.defer();

    var options = {
        host: config.elephantry.host
        , port: config.elephantry.port
        , path: '/api'+url
        , method: 'POST'
        , headers: {
            "Content-type": "application/json; charset=utf-8",
            "Connection": "keep-alive"
        }
    };
    var encodeData = JSON.stringify(data);
    options.headers['Content-Length'] = Buffer.byteLength(encodeData, 'utf8');

    // console.log(parameters);
    // console.log(options);

    var req = http.request(options, function(res){
        var data='';
        res.on('data', function(chunk){
            data += chunk;
        });
        res.on('end', function(){
            try {
                var obj = JSON.parse(data);
                deferred.resolve(obj);
            }
            catch(err){
                log.error('Parse Json Error: ', err, data);
                deferred.reject(err);
            }
        });
        res.on('error', err=>{
            log.error(err, options, data);
        });
    });
    req.on('error', function(e){
        log.error(options.host+":"+options.port+url+':Err - '+e);
        deferred.reject(e);
    });
    req.write(encodeData);
    req.end();

    return deferred.promise;
};

exports.AppServices = function ()
{
    var restify = require('restify');

    var client = restify.createJsonClient({
        url: `http://${config.appservices.host}:${config.appservices.port}`
    });
    return client;
};