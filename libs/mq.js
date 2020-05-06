const redis = require('redis');
const _ = require('underscore');

function MessageQueue(name, host, port, passwd)
{
    this.__ = {
        name: name,
        client: null,
        queue: '',
        callback: []
    };
    var __ = this.__;

    __.name = name;
    __.client = redis.createClient({
        password: passwd,
        host: host,
        port: port
    });
    __.client.auth(passwd);
    __.callback = [];
}

MessageQueue.prototype.Listen = function (queue)
{
    var __ = this.__;
    __.client.subscribe(queue);
    __.client.on('subscribe', function (channel, count) {
        log.info('MessageQueue: ', __.name, 'Subscribe: ', channel, count);
        //console.log(__.name, 'Listen', channel, count);
    });
    __.client.on('message', function (channel, message) {
        try{
            message = JSON.parse(message);
        }
        catch(e){
            message = {};
        }
        log.info('MessageQueue: ', __.name, 'Message: ', channel, message);
        //console.log(__.name, 'Message', channel, message);
        if(_.isEmpty(message)){
            return;
        }

        var validCallback = [];
        _.each(__.callback, function (callback) {
            if(callback){
                validCallback.push(callback);
                if(callback.Match(message)) {
                    callback.Do(message);
                }
            }
        });
        __.callback = validCallback;
    });
    __.queue = queue;
};
MessageQueue.prototype.Bind = function (queue)
{
    var __ = this.__;
    log.info('MessageQueue: ', __.name, ' Bind On: ', queue);
    __.queue = queue;
};

MessageQueue.prototype.Register = function (func)
{
    var __ = this.__;
    var index = __.callback.length;
    __.callback.push(func);
    return index;
};
MessageQueue.prototype.UnRegister = function (index)
{
    var __ = this.__;
    if(index > __.callback.length ){
        return;
    }
    __.callback[index] = null;
};

MessageQueue.prototype.Publish = function (message)
{
    var __ = this.__;
    if(_.isObject(message)){
        message = JSON.stringify(message);
    }
    __.client.publish(__.queue, message);
};

exports = module.exports = function (name, host, port, passwd) {
    return (new MessageQueue(name, host, port, passwd));
};