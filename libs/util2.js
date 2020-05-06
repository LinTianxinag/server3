var uuid = require('uuid');
var crypto = require('crypto');

module.exports = exports = function(){
};

exports.MD5 = function(plain)
{
    return crypto.createHash('md5').update(plain).digest('hex').toUpperCase();
};
exports.md5 = function(plain)
{
    return exports.MD5(plain).toLowerCase();
};

exports.sha1 = function(plain)
{
    return crypto.createHash('sha1').update(plain).digest('hex').toUpperCase();
};

/*
 * 生成UUID
 * */
exports.GenerateUUID = function(key)
{
    var strUUID = uuid.v4(key).toString();
    strUUID = strUUID.replace(/-/g, '').toUpperCase();
    return strUUID;
};

exports.DecodeGB2312 = function (val) {
    var iconv = require('iconv-lite');
    return iconv.decode(new Buffer(val, 'binary'), 'GB2312');
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