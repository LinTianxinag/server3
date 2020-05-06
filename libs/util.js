/**
 * Created with JetBrains WebStorm.
 * User: christozhou
 * Date: 14-7-21
 * Time: 下午10:14
 * 采集通道ID映射表 functionID mapping
 */

var config = require('config');
var moment = require('moment');
var _ = require('underscore');
var bigdecimal = require('bigdecimal');
var UUID = require('node-uuid');
const crypto = require('crypto');

module.exports = exports = function(){
};

exports.GenerateSessionID = function () {
    var nowTime = moment().valueOf().toString();
    var session = UUID.v1().replace(/-/g, '');
    return session.substr(0, session.length - nowTime.length)+nowTime
};

function TaskManage()
{
    this.tasks = null;
}

TaskManage.prototype.Load = function(taskIds)
{
    var _this = this;
    if(_.isArray(taskIds)){
        _this.tasks = taskIds;
    }
    else{
        _this.tasks = [taskIds];
    }
};
TaskManage.prototype.IsExists = function(taskID){
    if(!this.tasks){
        return;
    }
    var exists = _.contains(this.tasks, taskID);
    return exists;
};
TaskManage.prototype.Done = function (taskID) {
    if(!this.tasks){
        return;
    }
    this.tasks = _.without(this.tasks, taskID);
};
TaskManage.prototype.Add = function (taskID) {
    if(!this.tasks){
        this.tasks = [];
    }
    this.tasks.push(taskID);
};
TaskManage.prototype.IsFinished = function () {
    return _.isEmpty(this.tasks);
};
exports.TaskManage = function(){
    return new TaskManage();
};

exports.KGCE = function(energycategory, energytype, consumption)
{
    if(!energycategory || !energytype || !consumption){
        return null;
    }

    var category = _.find(energycategory, function(ec){
        return ec._id == energytype;
    });
    if(!category){
        return null;
    }

    return {
        kgce:(category.standcol||0) * consumption,
        name: category.title
    };
};
exports.IsAccumulationAble = function(sensor)
{
    var sid;
    if(_.isObject(sensor)){
        sid = sensor.sid;
    }
    else{
        sid = sensor;
    }

    var sensorGUID = GUID.DeviceID(sid);
    var channelObj = ChannelMapping.find(sensorGUID.funcid);
    if(!channelObj){
        return false;
    }
    return channelObj.measure;
};
exports.IsShowException = function(sensor)
{
    var sid;
    if(_.isObject(sensor)){
        sid = sensor.sid;
    }
    else{
        sid = sensor;
    }

    var sensorGUID = GUID.ParseSensorID(sid);
    var channelObj = ChannelMapping.find(sensorGUID.funcid);
    if(!channelObj){
        return false;
    }
    return channelObj.isShowException;
};
exports.SocityUnserilize = function (socity) {
    if(!socity){
        return null;
    }
    //if(socity.indexOf('|') == -1){
    //    return null;
    //}

    var socityBase64Array = socity.split('|');
    var socityPlainArray = [];

    if(socityBase64Array.length > 1){
        socityPlainArray.push(socityBase64Array[0]);
        socityBase64Array = _.rest(socityBase64Array);
    }

    _.each(socityBase64Array, function (soc) {
        var utf8encoded = (new Buffer(soc, 'base64')).toString('utf8');
        socityPlainArray.push(utf8encoded);
    });
    return socityPlainArray;
};

//资源=>字符串
exports.ResourceSerialize = function(resource)
{
    var serilizeObj = {};
    _.map(resource, function (value, key) {
        //
        if(key == "empty"){
            return;
        }
        var valueArray = [];
        _.map(value, function (v, k) {
            if(!v){
                return;
            }
            if(_.isObject(v)){
                _.each(v, function (vd) {
                    if(vd) {
                        valueArray.push(k + "." + vd);
                    }
                });
            }
            else {
                if(v == "*"){
                    valueArray.push(k+"."+v);
                }
                else {
                    valueArray.push(v);
                }
            }
        });
        if(valueArray.length) {
            serilizeObj[key] = valueArray;
        }
    });

    if(_.isEmpty(serilizeObj)){
        serilizeObj = {
            empty: true
        };
    }
    return serilizeObj;
};
//字符串=>资源
exports.ResourceUnSerialize = function(resource)
{
    if(_.isString(resource)){
        try{
            resource = JSON.parse(resource);
        }
        catch(e){
            return {};
        }
    }
    if(_.isEmpty(resource)){
        return {};
    }

    var unSerilizeObj = {
        empty: resource.empty || false
    };
    _.map(resource, function (value, key) {
        if(key=='empty'){
            return;
        }
        unSerilizeObj[key] = {};
        var node = unSerilizeObj[key];
        _.each(value, function (v) {
            var pair = v.split('.');
            if(pair.length == 2){
                var first = pair[0];
                var second = pair[1];
                if(!node[first]){
                    node[first] = {};
                }
                node[first][second] = second;
            }
            else{
                node[v] = v;
            }
        });
    });
    return unSerilizeObj;
};

//对查询请求的资源进行过滤 resourceBase AND resourceSet
exports.QueryResourceFilter = function (resourceBase, resourceSet)
{
    var resBase = exports.ResourceUnSerialize(resourceBase);
    var resSet = {};

    _.map(resourceSet, function (value, key) {
        resSet[key] = [];
        _.each(value, function (v) {
            if(!v){
                return;
            }
            if(IsExists(resBase, v)){
                resSet[key].push(v);
            }
        });
    });

    if(!resSet['building']){
        resSet['building'] = [];
        _.map(resBase['building'], function (buildingObj, project) {
            var isProjectExists = _.contains(resSet['project'], function (prj) {
                return prj == project;
            });
            if(isProjectExists){
                _.each(buildingObj, function (prj) {
                    if(prj == '*'){
                        return;
                    }
                    resSet['building'].push(prj);
                })
            }
        });
    }

    if(!resSet['sensor']){
        resSet['sensor'] = [];
        _.map(resBase['sensor'], function (sensorObj, project) {
            var isProjectExists = _.contains(resSet['project'], project);
            if(isProjectExists){
                _.each(sensorObj, function (sensor) {
                    if(sensor == '*'){
                        return;
                    }
                    resSet['sensor'].push(sensor);
                })
            }
        });
    }

    if(!resSet.project || !resSet.project.length){
        resSet.empty = true;
    }

    return resSet;
};

function IsExists(resourceBase, value)
{
    var isExists = false;
    _.each(resourceBase, function (res) {
        _.map(res, function (subV, sub) {
            if(subV == '*'){
                isExists = true;
            }
            else if(_.isObject(subV)){
                _.map(subV, function (v, k) {
                    if(v == value){
                        isExists = true;
                    }
                })
            }
            else{
                if(subV == value){
                    isExists = true;
                }
            }
        })
    });
    return isExists;
}

//过滤出用户可用的网关类型
exports.AvailableGateway = function(selectGateway, userInfo)
{
    if(!userInfo || !userInfo.character){
        return [];
    }

    var selGateway;
    if(_.isArray(selectGateway)){
        selGateway = selectGateway;
    }
    else{
        selGateway = selectGateway.split(',');
    }

    var characterGateway = [];
    if(userInfo.message && userInfo.message.length){
        characterGateway = userInfo.message.split(',');
    }
    else if( userInfo.character && userInfo.character.message){
        characterGateway = userInfo.character.message.split(',');
    }

    selGateway = _.intersection(selGateway, characterGateway);
    return selGateway;
};

/*
* 反向计算倍率
* */
exports.DescendCOMI = function (comi, value)
{
    if(!comi || !value){
        return value;
    }

    // var newCOMI = comi.replace('d', value);
    // var v = eval(newCOMI);
    //
    // return Util.Round(v);

    comi = comi.replace('d*', '');
    // comi = parseInt(comi);
    var dV = bigdecimal.BigDecimal(value.toString());
    var dCom = bigdecimal.BigDecimal(comi.toString());
    return dV.divide(dCom, 4, bigdecimal.RoundingMode.DOWN()).doubleValue();
};

exports.DecideEquipmentStatus = function (sensor) {
    var status = Typedef.EquipmentStatus.OK;
    do{
        if(!sensor.lastupdate){
            status = Typedef.EquipmentStatus.CommunicateException;
            break;
        }
        if (moment().unix() - moment(sensor.lastupdate).unix() >= (sensor.freq + sensor.freq / 3)) {
            status = Typedef.EquipmentStatus.CommunicateException;
            break;
        }

        sensor.realdata = Number(sensor.realdata.toFixed(2));
        sensor.lasttotal = Number(sensor.lasttotal.toFixed(2));
        if (sensor.realdata - sensor.lasttotal != 0) {
            status = Typedef.EquipmentStatus.DataException;
            break;
        }
        status = Typedef.EquipmentStatus.OK;
    }while(0);
    return status;
};

/*
 * 使用银行家舍弃(Banker's round)
 * 四舍六入五考虑，五后非零就进一，五后为零看奇偶，五前为偶应舍去，五前为奇要进一
 * */
// exports.Round = function(num, decimalPlaces){
//     var d = decimalPlaces || 2;
//     var m = Math.pow(10, d);
//     var n = +(d ? num * m : num).toFixed(8); // Avoid rounding errors
//     var i = Math.floor(n), f = n - i;
//     var e = 1e-8; // Allow for rounding errors in f
//     var r = (f > 0.5 - e && f < 0.5 + e) ?
//         ((i % 2 == 0) ? i : i + 1) : Math.round(n);
//     return d ? r / m : r;
// };

exports.RoundN = function(number, decimalPlaces)
{
    if(!number){
        return number;
    }
    var d = decimalPlaces || 2;

    try {
        var dNumber = new bigdecimal.BigDecimal(number.toString());
        var p = new bigdecimal.BigDecimal(Math.pow(10, d).toString());
        var roundNumber = new bigdecimal.BigDecimal(Math.round(dNumber.multiply(p).doubleValue()));
        return roundNumber.divide(p, d, bigdecimal.RoundingMode.HALF_UP()).doubleValue();
    }
    catch(e){
        log.error(e, number, d);
    }
};

exports.Round = function(number, decimalPlaces)
{
    if(!number){
        return number;
    }
    var bigdecimal = require('bigdecimal');
    var d = 4;
    if(decimalPlaces != undefined){
        d = decimalPlaces;
    }

    var dNumber = new bigdecimal.BigDecimal(number.toString());
    var p = new bigdecimal.BigDecimal( Math.pow(10, d).toString() );
    var lsNumber = new bigdecimal.BigDecimal(dNumber.multiply(p).doubleValue());
    return lsNumber.divide(p, d, bigdecimal.RoundingMode.DOWN()).doubleValue();
};

exports.md5 = function(plain) {
  return crypto.createHash('md5').update(plain).digest('hex');
};

exports.sha1 = function(plain) {
  return crypto.createHash('sha1').update(plain).digest('hex').toUpperCase();
};
