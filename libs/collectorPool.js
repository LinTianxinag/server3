var _ = require('underscore');

function CollectionPool()
{
    this.Pool = {};      //pool key ==> socket
    this.CollectionID2IPPort = {};    // ipaddress:port ==> pool key
}
CollectionPool.prototype.Enum = function ()
{
    var ary = [];
    var PoolObj = this.Pool;
    _.map(this.CollectionID2IPPort, function (poolKey, ipaddress) {
        if(PoolObj[poolKey]){
            ary.push({
                key: poolKey,
                ipaddress: ipaddress,
                device: PoolObj[poolKey]
            });
        }
    });
    return ary;
};
CollectionPool.prototype.Set = function(ip, port, value)
{
    var key = ip+port;
    this.Pool[key] = value;
};
CollectionPool.prototype.Bind = function(ip, port, key)
{
    var ipPortKey = ip+port;
    if(this.Pool[ipPortKey]){
        this.CollectionID2IPPort[key] = ipPortKey;
    }
};
CollectionPool.prototype.Get = function(key, port)
{
    if(port){
        var k = key+port;
        return this.Pool[k];
    }
    else{
        var ipPortKey = this.CollectionID2IPPort[key];
        if(!this.Pool[ipPortKey]){
            return null;
        }
        return this.Pool[ipPortKey];
    }
};
CollectionPool.prototype.Clear = function(ip, port)
{
    var k = ip+port;
    this.Pool[k] = null;
    this.Pool = _.omit(this.Pool, k);
    var removeArray = [];
    _.map(this.CollectionID2IPPort, function (value, key) {
        if(value == k){
            removeArray.push(key);
        }
    });
    this.CollectionID2IPPort = _.omit(this.CollectionID2IPPort, removeArray);
};
CollectionPool.prototype.IsEmpty = function () {
    return _.isEmpty(this.Pool);
};

exports = module.exports = new CollectionPool();

//var CP = new CollectionPool();
//CP.Set("A","100", {a:1});
//CP.Set("B","200", {b:2});
//CP.Bind("A", "100", "BA1");
//CP.Bind("A", "100", "BA2");
//CP.Bind("B", "200", "BB1");
//console.log(CP.Get("BA1"),CP.Get("BA2"), CP.Get("A", "100"));
//console.log(CP.Get("BB1"), CP.Get("B", "200"));
//CP.Clear("A", "100");
//console.log(CP.Get("BA1"),CP.Get("BA2"), CP.Get("A", "100"));
