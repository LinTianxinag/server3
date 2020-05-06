/**
 * 采集通道ID映射表 functionID mapping
 */

var config = require('config');
var moment = require('moment');
var _ = require('underscore');

class ChannelDefine{
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
        MySQL.ChannelDefine.findAll({
            where: {
            }
        }).then(
            channelsDefine=>{
                var mapping = {};
                channelsDefine.map(channel=>{
                    mapping[channel.id] = MySQL.Plain(channel);
                });

                _this.mapping = mapping;

                log.info('channels define reload at: ', _this.lastupdate);
            },
            err=>{
                log.error('failed load channels:', err);
            }
        );
    }
    find (key)
    {
        return this.mapping[key];
    }
    title (key)
    {
        var obj = this.mapping[key];
        if(!obj){
            return null;
        }
        return obj.name;
    }
    search(key)
    {
        var matchChannels = [];
        _.map(this.mapping, function (channel) {
            if( channel.name.indexOf(key) != -1){
                matchChannels.push(channel.id);
            }
        });
        return matchChannels;
    };
}
var channelDefine = new ChannelDefine();


// var ChannelMapping = {
// };
//
// function InsertMapping(obj)
// {
//     var v = {};
//     _.map(obj, function (value, key) {
//         v[key] = value;
//     });
//
//     ChannelMapping[obj.id] = v;
// }
//
// InsertMapping({
//     id: '01', name: '冷水刻度', paystatus: 'BYSELF', isAccumulation: true, isShowException: true, unit: 'm3'
// });
// InsertMapping({
//     id: '02', name: '纯净水刻度', paystatus: 'BYSELF', isAccumulation: true, isShowException: true, unit: '升'
// });
// InsertMapping({
//     id: '03', name: '热水刻度', paystatus: 'BYSELF', isAccumulation: true, isShowException: true, unit: 'm3'
// });
// InsertMapping({
//     id: '04', name: '累积流量', paystatus: 'NONE', isAccumulation: true, isShowException: true, unit: 'm3'
// });
// InsertMapping({
//     id: '05', name: '供水温度', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: '℃'
// });
// InsertMapping({
//     id: '06', name: '回水温度', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: '℃'
// });
// InsertMapping({
//     id: '07', name: '总冷量', paystatus: 'BYSELF', isAccumulation: true, isShowException: true, unit: 'kWh'
// });
// InsertMapping({
//     id: '08', name: '总热量', paystatus: 'BYSELF', isAccumulation: true, isShowException: true, unit: 'kWh'
// });
// InsertMapping({
//     id: '09', name: '流速', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit:'m3'
// });
// InsertMapping({
//     id: '10', name: '状态', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '11', name: '正向有功', paystatus: 'BYSELF', isAccumulation: true, isShowException: true, unit: 'kWh'
// });
// InsertMapping({
//     id: '12', name: '反向有功', paystatus: 'NONE', isAccumulation: true, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '13', name: '正向无功', paystatus: 'NONE', isAccumulation: true, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '14', name: '反向无功', paystatus: 'NONE', isAccumulation: true, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '15', name: 'A相电压', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '16', name: 'B相电压', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '17', name: 'C相电压', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '18', name: 'A相电流', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '19', name: 'B相电流', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '20', name: 'C相电流', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '21', name: '瞬时有功功率', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '22', name: 'A相有功功率', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '23', name: 'B相有功功率', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '24', name: 'C相有功功率', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '25', name: '总功率因素', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '26', name: 'A相功率因素', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '27', name: 'B相功率因素', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '28', name: 'C相功率因素', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '29', name: '尖电能', paystatus: 'NONE', isAccumulation: true, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '30', name: '峰电能', paystatus: 'NONE', isAccumulation: true, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '31', name: '平电能', paystatus: 'NONE', isAccumulation: true, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '32', name: '谷电能', paystatus: 'NONE', isAccumulation: true, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '33', name: '能量系数', paystatus: 'BYSELF', isAccumulation: true, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '34', name: '低档能量系数', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '35', name: '中档能量系数', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '36', name: '高档能量系数', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '37', name: '设定温度', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: '℃'
// });
// InsertMapping({
//     id: '38', name: '档位', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '39', name: '模式', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '40', name: '室内温度', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: '℃'
// });
// InsertMapping({
//     id: '41', name: '二通阀开关', paystatus: 'NONE', isAccumulation: false, isShowException: true, unit: ''
// });
// InsertMapping({
//     id: '42', name: '分时通道1', paystatus: 'NONE', isAccumulation: true, isShowException: true, unit: 'kWh'
// });
// InsertMapping({
//     id: '43', name: '分时通道2', paystatus: 'NONE', isAccumulation: true, isShowException: true, unit: 'kWh'
// });
// InsertMapping({
//     id: '44', name: '分时通道3', paystatus: 'NONE', isAccumulation: true, isShowException: true, unit: 'kWh'
// });
// InsertMapping({
//     id: '45', name: '分时通道4', paystatus: 'NONE', isAccumulation: true, isShowException: true, unit: 'kWh'
// });


module.exports = exports = channelDefine;

/*
key='functionID'
* */
// exports.find = function(key)
// {
//     //
//     if(ChannelMapping[key]){
//         return ChannelMapping[key];
//     }
//
//     return null;
// };

exports.list = function()
{
    return ChannelMapping;
};

exports.search = key=>{
    var matchChannels = [];
    _.map(ChannelMapping, function (channel) {
        if( channel.name.indexOf(key) != -1){
            matchChannels.push(channel.id);
        }
    });
    return matchChannels;
};