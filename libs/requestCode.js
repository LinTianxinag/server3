/*
* 对请求加入校验机制
* */

var _ = require('underscore');
var crypto = require('crypto');
var moment = require('moment');
var Q = require('q');

function RequestCode()
{}

/*
* user: 用户ID,
* token: 登录后服务器返回的token
* data: 请求的参数对象
* @Return
*   返回加入签名以后的对象
* */

function Hash(v)
{
    var hash = crypto.createHash('sha1');
    return hash.update(v.toString()).digest('hex');
}

function ExtPlainText(data, vCode)
{
    var keyArray = [];
    _.map(data, function(v, k){
        keyArray.push(k);
    });

    keyArray.sort();

    var plainText = '';
    var kvArray = [];
    _.each(keyArray, function (key) {
        var v = data[key];
        if (_.isObject(data[key])) {
            try {
                v = JSON.stringify(v);
            }
            catch (e) {
                v = "";
            }
        }
        kvArray.push(key + '=' + encodeURIComponent(v));
    });
    plainText = kvArray.toString();
    plainText = plainText.replace(/,/g, '');
    plainText = vCode + plainText + vCode;

    return plainText;
}
function AppPlainText(data, vCode)
{
    var keyArray = [];
    _.map(data, function(v, k){
        keyArray.push(k);
    });

    keyArray.sort();

    var plainText = '';
    var kvArray = [];
    _.each(keyArray, function (key) {
        kvArray.push(key + '=' + encodeURI(data[key]));
    });
    plainText = kvArray.toString();
    plainText = plainText.replace(/,/g, '');
    plainText = vCode + plainText + vCode;

    return plainText;
}
function PlainText(data, vCode, oldFormat)
{
    var keyArray = [];
    _.map(data, function(v, k){
        keyArray.push(k);
    });

    keyArray.sort();

    var plainText = '';
    var kvArray = [];
    _.each(keyArray, function (key) {
        var v = data[key];
        if(oldFormat) {
            kvArray.push(key + '=' + v);
        }
        else{
            if (_.isObject(data[key])) {
                try {
                    v = JSON.stringify(v);
                }
                catch (e) {
                    v = "";
                }
            }
            kvArray.push(key + '=' + encodeURIComponent(v));
        }
    });
    plainText = kvArray.toString();
    plainText = plainText.replace(/,/g, '');
    plainText = vCode + plainText + vCode;

    return plainText;
}

RequestCode.prototype.Encrypt = function(user, token, data)
{
    if(_.isEmpty(data)){
        return null;
    }

    var v = moment();
    var vCode = Hash(v.unix());

    data['v'] = v.unix();
    data['t'] = token;

    var plainText = PlainText(data, vCode);
    //console.log(plainText);

    var sign = Hash(plainText);
    //console.log(sign);

    data['sign'] = sign;
    data['p'] = user;
    data = _.omit(data, 't');

    return data;
};

function Encrypt(type, id, token, data)
{
    if(_.isEmpty(data)){
        return null;
    }

    var v = moment();
    var vCode = Hash(v.unix());

    data['v'] = v.unix();
    data['t'] = token;

    var plainText = PlainText(data, vCode);
    //console.log(plainText);

    var sign = Hash(plainText);
    //console.log(sign);

    data['sign'] = sign;
    data['p'] = id;
    //if(type == 'USER') {
    //    data['pu'] = id;
    //}
    //else{
    //    data['pa'] = id;
    //}
    data = _.omit(data, 't');

    return data;
};

RequestCode.prototype.EncryptAppIDSecret = function(appid, appsecret, data)
{
    return Encrypt('APPID', appid, appsecret, data);
};
RequestCode.prototype.EncryptUser = function (user, token, data)
{
    return Encrypt('USER', user, token, data);
};

RequestCode.prototype.Decrypt = function(data)
{
    if(_.isEmpty(data)){
        return null;
    }

    var deferred = Q.defer();

    var user = data.p;
    var sign = data.sign;
    var v = data.v;
    if(!user || !sign || !v){
        return null;
    }

    var vCode = Hash(v);

    var encryptData = _.omit(data, ['p', 'sign', 't']);

    //get user's token
    var DecryptData = function(userInfo, encryptData)
    {
        var plainToken = userInfo.user + userInfo.passwd + userInfo.user;
        var token = APIUtil.MD5(plainToken);
        encryptData['t'] = token;

        //验证
        var plainText = PlainText(encryptData, vCode);
        var oldPlainText = PlainText(encryptData, vCode, true);
        var appPlainText = AppPlainText(encryptData, vCode);

        encryptData['p'] = userInfo.user;
        encryptData = _.omit(encryptData, 'v');
        var extPlainText = ExtPlainText(encryptData, vCode);
        // log.debug(plainText);

        var newSign = Hash(plainText);
        var oldSign = Hash(oldPlainText);
        var appSign = Hash(appPlainText);
        var extSign = Hash(extPlainText);
        //log.debug(newSign, sign.toString());

        if(sign == newSign || sign == oldSign || sign == appSign || sign === extSign){
            var plainData = _.omit(encryptData, ['p','sign','t','v']);
            plainData['userinfo'] = userInfo;
            //log.debug('Decrypt Success: ', plainData);
            deferred.resolve(plainData);
        }
        else{
            deferred.reject({
                code: ErrorCode.Code.SIGNATUREFAILED,
                message: ErrorCode.Message.SIGNATUREFAILED
            });
        }
    };

    var query = `select ac.*, ca.id as characterid, ca.level, ca.title as charactertitle, ca.rule 
                from account as ac
                inner join \`character\` as ca on ac.character=ca.id
                where (ac.uid='${user}' or ac.user='${user}') and ac.timedelete=0`;
    MySQL.Exec(query).then(
        result=>{
            if(!result || !result.length){
                return deferred.reject({
                    code: ErrorCode.Code.USERNOTEXISTS,
                    message: ErrorCode.Message.USERNOTEXISTS
                });
            }

            var userInfo = result[0];
            userInfo._id = userInfo.uid;
            userInfo.character = {
                _id: userInfo.characterid,
                level: userInfo.level,
                title: userInfo.charactertitle,
                rule: userInfo.rule
            };
            try{
                userInfo.character.rule = JSON.parse(userInfo.character.rule);
            }
            catch(e){
                userInfo.character.rule = {};
            }

            try{
                userInfo.resource = JSON.parse(userInfo.resource);
            }
            catch(e){
                userInfo.character.resource = {};
            }

            userInfo = _.omit(userInfo, ['charactertitle', 'rule']);

            DecryptData(userInfo, encryptData);
        },
        err=>{
            log.error(err, user);
            return deferred.reject({
                code: ErrorCode.Code.DATABASEEXEC,
                message: ErrorCode.Message.DATABASEEXEC
            });
        }
    );

    // MongoDB.Account
    //     .findOne({
    //         _id: user,
    //         timedelete: {$exists: false}
    //     })
    //     .populate('character')
    //     .exec(
    //     function (err, userInfo) {
    //         if(err || !userInfo){
    //             return deferred.reject({
    //                 code: ErrorCode.Code.DATABASEEXEC,
    //                 message: ErrorCode.Message.DATABASEEXEC
    //             });
    //         }
    //         else{
    //             DecryptData(userInfo, encryptData);
    //         }
    //     }, function (err) {
    //         log.error(err);
    //     }
    // );
    //if(type == 'APPID'){
    //    //
    //    var appidsecret = Include('/api/appidsecret/info');
    //    appidsecret.Do({userinfo: userInfo, body: {appid: user}}, function (code, message, appIDSecretInfo) {
    //        if(code || !appIDSecretInfo || appIDSecretInfo.length == 0){
    //            deferred.reject({
    //                code: ErrorCode.Code.USERNOTEXISTS,
    //                message: ErrorCode.Message.USERNOTEXISTS
    //            });
    //        }
    //        else{
    //            DecryptData(deferred, appIDSecretInfo, encryptData);
    //        }
    //    })
    //}
    //else if(type == 'USER'){
    //    //
    //    var accountInfo = Include('/api/account/info');
    //    accountInfo.Do({userinfo: userInfo, body:{id: user}}, function (code, message, userInfo) {
    //        console.log(code,message,userInfo);
    //        if(code || !userInfo || userInfo.length == 0){
    //            deferred.reject({
    //                code: ErrorCode.Code.USERNOTEXISTS,
    //                message: ErrorCode.Message.USERNOTEXISTS
    //            });
    //        }
    //        else{
    //            DecryptData(deferred, userInfo, encryptData);
    //        }
    //    });
    //}

    return deferred.promise;
};

module.exports = exports = new RequestCode();