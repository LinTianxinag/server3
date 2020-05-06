var appRootPath = require('app-root-path');
require(appRootPath.path + '/libs/log')("EMAPI");
require('include-node');
var dLoad = require('./../libs/dload');
var config = require('config');
{
    global.ChannelMapping = dLoad('/libs/channelMap');
    global.DeviceType = dLoad('/libs/devicetype');
    global.GUID = dLoad('/libs/guid');
    global.MySQL = dLoad('/libs/mysql');
    global.MongoDB = dLoad('/libs/mongodb');
    global.Util = dLoad('/libs/util');
    global.APIUtil = dLoad('/api/apiUtil');
    global.ErrorCode = dLoad('/libs/errorCode');
    global.Authentication = dLoad('/libs/auth');
    global.InteractionType = dLoad('/libs/interactiveType');
    global._ = require('underscore');
    global.assert = require('power-assert');
    global.NewObj = (obj)=>{
        return JSON.parse( JSON.stringify(obj) );
    }
}

MongoDB(config.db.url).then(
    result=>{
        MySQL.Load();
        return MongoDB.Account.findOne({
            _id:'zhouyi'
        }).exec((err, userinfo)=>{
            global.REQ = {
                userinfo: userinfo
            };


            require('./project.test')(REQ);
        });
    },
    err=>{
        assert(false);
    }
);