/*
* 对请求加入校验机制
* */

var _ = require('underscore');
var crypto = require('crypto');
var moment = require('moment');
var Q = require('q');
var crypto = require('crypto');

function TokenHash(plain)
{
    return crypto.createHash('sha1').update(plain).digest('hex').toUpperCase();
}

function Authentication()
{}

Authentication.prototype.CreateToken = function(userid, passwd)
{
    return TokenHash(userid+passwd+userid);
};

module.exports = exports = new Authentication();