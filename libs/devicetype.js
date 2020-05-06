/**
 * 仪表类型ID 映射
 */

var config = require('config');
var moment = require('moment');
var _ = require('underscore');

var DeviceType = {
};

class DeviceTypeCache{
    constructor ()
    {
        this.mapping = {};
        this.lastupdate = 0;
        this.threshold = 300;
    }
    reload ()
    {
        var _this = this;
        var now = moment().unix();
        if(now - _this.lastupdate < _this.threshold){
            return;
        }

        _this.lastupdate = now;
        MySQL.DeviceType.findAll({
            where: {
            }
        }).then(
            deviceTypes=>{
                var mapping = {};
                deviceTypes.map(type=>{
                    type.channelids;type.mesure;
                    mapping[type.key] = MySQL.Plain(type);
                });

                _this.mapping = mapping;

                log.info('devicetype reload at: ', _this.lastupdate);
            },
            err=>{
                log.error('failed load devicetype:', err);
            }
        );
    }
    match (key)
    {
        return this.mapping[key];
    }
    find (key)
    {
        var deviceType = _.find(this.mapping, function (deviceType) {
            //
            if(deviceType.id == key || deviceType.name == key || deviceType.code == key){
                return deviceType
            }
        });
        return deviceType;
    }
    enumMeasure ()
    {
        var measureIDs = [];
        _.each(this.mapping, type=>{
            measureIDs = _.union(measureIDs, type.measure);
        });
        measureIDs = _.uniq(measureIDs);
        return measureIDs;
    }
}
var deviceTypeCache = new DeviceTypeCache();

/*
    {
        id: 仪表ID,
        code: 仪表代号,
        name: 仪表名称
    }
* */
function InsertMapping(obj)
{
    var v = {};
    _.map(obj, function (value, key) {
        v[key] = value;
    });

    DeviceType[obj.id] = v;
}

InsertMapping({
    id: 'UNKNOW', code: '000', name: '未知', billingCategory: 'PAYELECTRICITY',
    channels: []
});
InsertMapping({
    id: 'ELECTRICITYMETER', code: '001', name: '电表', billingCategory: 'PAYELECTRICITY',
    channels: ['11', '12', '32', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31']
});
InsertMapping({
    id: 'COLDWATERMETER', code: '002', name: '冷水表', billingCategory: 'PAYCOLDWATER',
    channels: ['01']
});
InsertMapping({
    id: 'HOTWATERMETER', code: '003', name: '热水表', billingCategory: 'PAYHOTWATER',
    channels: ['03']
});
InsertMapping({
    id: 'ENERGYMETER', code: '004', name: '能量表', billingCategory: 'PAYACENERGY',
    channels: ['04','05','06','07','08','09', '10']
});
InsertMapping({
    id: 'TEMPERATURECONTROL', code: '005', name: '温控器', billingCategory: 'PAYACPANEL',
    channels: ['33','34','35','36','37','38','39','40','41']
});
InsertMapping({
    id: 'TIMERMETER', code: '006', name: '时间采集器', billingCategory: 'PAYTIMER',
    channels: ['07','08','38','41']
});
InsertMapping({
    id: 'PRESSUREMETER', code: '007', name: '压力表', billingCategory: 'PAYPRESSURE',
    channels: ['10']
});
InsertMapping({
    id: 'ULTRACOLDWATERMETER', code: '008', name: '超声波水表', billingCategory: 'PAYULTRACOLD',
    channels: ['04','05','09']
});

module.exports = exports = DeviceType;
exports.Instance = deviceTypeCache;
/*
key='functionID'
* */
exports.find = function(key)
{
    //
    var deviceType = _.find(DeviceType, function (deviceType) {
        //
        if(deviceType.id == key || deviceType.name == key || deviceType.code == key){
            return deviceType
        }
    });

    return deviceType;
};

exports.ByFuncID = function(funcid)
{
    //
    var deviceType = _.find(DeviceType, function (devicetype) {
        return _.contains(devicetype.channels, funcid);
    });
    return deviceType;
};

exports.list = function()
{
    return DeviceType;
};


exports.Run = ()=>{
    deviceTypeCache.reload();
};