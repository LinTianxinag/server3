var xml = require('xmldoc');
var moment = require('moment');
var config = require('config');
var Q = require('q');
var _ = require('underscore');
// var util = Include('/libs/util');
var util = require('../../../../../libs/util');

function FixLength(value, fixToLength, padding)
{
  //
    var strValue = value.toString();
    var fixLength = fixToLength - strValue.length;
    if (fixLength <= 0) {
        return strValue;
    }

    for (var i = 0; i < fixLength; i++) {
        //
        strValue = padding + strValue;
    }
    return strValue;
}
//传感器通道ID
function CombinationChannelID(buildingID, gatewayID, addr, meterID, functionID)
{
  //fix meterID's length to 3
  //fix functionID's length to 4
  return buildingID + gatewayID + addr + FixLength(meterID, 3, '0') + FixLength(functionID, 2, '0');
}
//传感器ID
function GenerateSensorID(buildingID, gatewayID, meterID)
{
    return buildingID + gatewayID + FixLength(meterID, 3, '0');
}

exports.Saving = function(msg)
{
    var sensorSet = {};

    var xmlDoc = new xml.XmlDocument(msg);
    var root = {};
    var commonNode = xmlDoc.childNamed('common');
    root['building'] = commonNode.childNamed('building_id').val;
    root['gateway'] = commonNode.childNamed('gateway_id').val;

    root['data'] = [];
    var dataNode = xmlDoc.childNamed('data');
    root['time'] = dataNode.childNamed('time').val;

    var time = moment(root['time'], 'YYYYMMDDHHmmss');
    dataNode.eachChild(
        function(child, index, array)
        {
            if(child.name != 'meter'){
                return;
            }

            var meterID = child.attr.id;
            var addr = child.attr.addr;
            var tp = child.attr.tp;
            var comport = child.attr.com;

            child.eachChild(function(funcNode, funcIndex, funcArray){

                var channelID = CombinationChannelID(root.building, root.gateway, addr, meterID, funcNode.attr.id);
                var shortSID = GenerateSensorID(root.building, root.gateway, meterID);
                sensorSet[shortSID] = {
                    _id: shortSID,
                    auid: AUID,
                    addrid: addr,
                    lastupdate:moment().toDate()
                };
                var meter = {
                    meterid: meterID,
                    addr: addr,
                    tp: tp,
                    funcid: funcNode.attr.id,
                    coding: funcNode.attr.coding,
                    error: funcNode.attr.error,
                    total: parseFloat(funcNode.val)
                };
                root['data'].push(meter);
                //数据库入库之前先写日志
                log.info('ORIGIN:MCDTSP ', 'NetDAU'+","+ channelID + "," + meter.total + "," + time.unix() + "," + funcNode.attr.error+ "," + comport);

                //数据返回为192为正确数据
                if( funcNode.attr.error == '192'){
                    if(config.mode == 'RELEASE') {
                        if(config.dbswitch.mongodb) {
                            var bufferDatapoint = new MongoDB.DataBuffer();
                            bufferDatapoint.sensor = channelID;
                            bufferDatapoint.comport = comport;
                            bufferDatapoint.timestamp = time.format('YYYY/MM/DD HH:mm:ss');
                            bufferDatapoint.total = meter.total;
                            bufferDatapoint.value = 0.0;
                            bufferDatapoint.save(function (err) {
                                if(err) {
                                    log.error(err);
                                }
                            });
                        }

                        if(config.dbswitch.mysql) {
                            var dataBufferObj = {
                                id: util.GenerateUUID('DATA'),
                                sensor: channelID,
                                total: meter.total,
                                value: 0.0,
                                timepoint: time.unix()
                            };
                            MySQL.DataBuffer.create(dataBufferObj);
                        }
                    }
                }
            });

            //更新传感器信息到sensorAttribute
            if(config.mode === 'RELEASE') {
                var cptIDs = [];
                _.each(sensorSet, function (sensor) {
                    cptIDs.push(sensor._id);
                });

                if(config.dbswitch.mysql) {
                    MySQL.SensorAttribute.update({
                        lastupdate: moment().unix(),
                        auid: AUID
                    }, {
                        where: {
                            id: {$in: cptIDs}
                        }
                    }).then(
                        function (result) {
                            //
                        }, function (err) {
                            log.error('MySQL::SensorAttribute Update ERROR: ', err, cptIDs);
                        }
                    );
                }

                if(config.dbswitch.mongodb) {
                    MongoDB.SensorAttribute.update(
                        {
                            _id: {$in: cptIDs}
                        },
                        {$set: {lastupdate: moment().unix(), auid: AUID}},
                        {multi: true},
                        function (err) {
                            if(err) {
                                log.error('MongoDB::SensorAttribute Update ERROR: ', err, cptIDs);
                            }
                        }
                    )
                }
            }
        });
};

// 用来直接存入数据到数据库里
exports.SavingClient = function(docs,building_id,gateway_id)
{
    var sensorSet = {};

    // var xmlDoc = new xml.XmlDocument(msg);
    // var root = {};
    // var commonNode = xmlDoc.childNamed('common');
    // root['building'] = commonNode.childNamed('building_id').val;
    // root['gateway'] = commonNode.childNamed('gateway_id').val;
    //
    // root['data'] = [];
    // var dataNode = xmlDoc.childNamed('data');
    // root['time'] = dataNode.childNamed('time').val;

    var time = moment(docs.time, 'YYYYMMDDHHmmss');

    docs.meters.forEach(function (v,i) {
        if(v.name != 'meter'){
            return;
        }

        var meterID = v.id;
        var addr = v.addr;
        var tp = v.tp;
        var comport = v.com;


        // 遍历里面存在的函数内容
        (v.funcs).forEach(function(funcNode,index){

            var channelID = CombinationChannelID(building_id, gateway_id, addr, meterID, funcNode.id);
            var shortSID = GenerateSensorID(building_id, gateway_id, meterID);
            sensorSet[shortSID] = {
                _id: shortSID,
                auid: AUID,
                addrid: addr,
                lastupdate:moment().toDate()
            };
            var meter = {
                meterid: meterID,
                addr: addr,
                tp: tp,
                funcid: funcNode.id,
                coding: funcNode.coding,
                error: funcNode.error,
                total: parseFloat(funcNode.val)
            };
            // root['data'].push(meter);
            //数据库入库之前先写日志
            log.info('ORIGIN:MCDTSP ', 'NetDAU'+","+ channelID + "," + meter.total + "," + time.unix() + "," + funcNode.error+ "," + comport);

            //数据返回为192为正确数据
            if( funcNode.error == '192'){
                if(config.mode == 'RELEASE') {
                    if(config.dbswitch == 'mongodb') {
                        var bufferDatapoint = new MongoDB.DataBuffer();
                        bufferDatapoint.sensor = channelID;
                        bufferDatapoint.comport = comport;
                        bufferDatapoint.timestamp = time.format('YYYY/MM/DD HH:mm:ss');
                        bufferDatapoint.total = meter.total;
                        bufferDatapoint.value = 0.0;
                        bufferDatapoint.save(function (err) {
                            if(err) {
                                log.error(err);
                            }
                        });
                    }

                    if(config.dbswitch == 'mysql') {
                        var dataBufferObj = {
                            id: util.GenerateUUID('DATA'),
                            sensor: channelID,
                            total: meter.total,
                            value: 0.0,
                            timepoint: time.unix()
                        };
                        MySQL.DataBuffer.create(dataBufferObj);
                    }
                }
            }
        });

        //更新传感器信息到sensorAttribute
        if(config.mode === 'RELEASE') {
            var cptIDs = [];
            _.each(sensorSet, function (sensor) {
                cptIDs.push(sensor._id);
            });

            if(config.dbswitch == 'mysql') {
                MySQL.SensorAttribute.update({
                    lastupdate: moment().unix(),
                    auid: AUID
                }, {
                    where: {
                        id: {$in: cptIDs}
                    }
                }).then(
                    function (result) {
                        //
                    }, function (err) {
                        log.error('MySQL::SensorAttribute Update ERROR: ', err, cptIDs);
                    }
                );
            }

            if(config.dbswitch == 'mongodb') {
                MongoDB.SensorAttribute.update(
                    {
                        _id: {$in: cptIDs}
                    },
                    {$set: {lastupdate: moment().unix(), auid: AUID}},
                    {multi: true},
                    function (err) {
                        if(err) {
                            log.error('MongoDB::SensorAttribute Update ERROR: ', err, cptIDs);
                        }
                    }
                )
            }
        }
    })




};


exports.NotifyCollectorLiving = function()
{
    //
};

//var msg = '<root>  <common>' +
//    '    <building_id>310101A064</building_id>' +
//    '    <gateway_id>01</gateway_id>' +
//    '    <type>continuous</type>' +
//    '  </common>' +
//    '  <data operation="continuous">' +
//    '    <sequence>477</sequence>' +
//    '    <parser>yes</parser> ' +
//    '   <time>20140602091520</time>' +
//    '    <total>1277</total>' +
//    '    <current>462</current>' +
//    '    <meter id="1" addr="000000000001" tp="06" name="1??????0.4KV????">' +
//    '      <function id="1" coding="01E00" error="192">675.170000</function>' +
//    '      <function id="2" coding="01E01" error="192">100.100</function>' +
//    '    </meter>' +
//    '    <meter id="2" addr="000000000002" tp="06" name="??÷?">' +
//    '      <function id="1" coding="01C20" error="192">27.730000</function>' +
//    '      <function id="2" coding="01C21" error="192">20.20</function>' +
//    '    </meter>' +
//    '    <meter id="3" addr="000000000003" tp="06" name="????">' +
//    '      <function id="1" coding="01C10" error="192">129.990000</function>' +
//    '    </meter>' +
//    '    <meter id="4" addr="000000000004" tp="06" name="?????">' +
//    '      <function id="1" coding="01A00" error="192">0.000000</function>' +
//    '    </meter>    <meter id="5" addr="000000000005" tp="06" name="?????????????">      <function id="1" coding="01A20" error="192">0.000000</function>    </meter>    <meter id="6" addr="000000000006" tp="06" name="12-18??????">      <function id="1" coding="01A00" error="192">592.760000</function>    </meter>    <meter id="7" addr="000000000007" tp="06" name="4-11????">      <function id="1" coding="01B2E" error="192">293.090000</function>    </meter>    <meter id="8" addr="000000000008" tp="06" name="????????????">      <function id="1" coding="01D10" error="192">0.000000</function>    </meter>    <meter id="9" addr="000000000009" tp="06" name="1-3????">      <function id="1" coding="01B2E" error="192">327.540000</function>    </meter>    <meter id="10" addr="000000000010" tp="06" name="1-3??????????">      <function id="1" coding="01A20" error="192">0.000000</function>    </meter>    <meter id="11" addr="000000000011" tp="06" name="4-18??????????">      <function id="1" coding="01A20" error="192">85.690000</function>    </meter>    <meter id="12" addr="000000000012" tp="06" name="?????????">      <function id="1" coding="01A00" error="192">229.240000</function>    </meter>    <meter id="13" addr="000000000013" tp="06" name="??????">      <function id="1" coding="01D10" error="192">0.000000</function>    </meter>    <meter id="14" addr="000000000014" tp="06" name="2??????0.4KV????">      <function id="1" coding="01E00" error="192">818.050000</function>    </meter>    <meter id="15" addr="000000000015" tp="06" name="??÷?">      <function id="1" coding="01C20" error="192">0.380000</function>    </meter>    <meter id="16" addr="000000000016" tp="06" name="????">      <function id="1" coding="01C10" error="192">30.700000</function>    </meter>    <meter id="17" addr="000000000017" tp="06" name="?????????????">      <function id="1" coding="01A20" error="192">195.470000</function>    </meter>    <meter id="18" addr="000000000018" tp="06" name="4-11??????">      <function id="1" coding="01A00" error="192">271.030000</function>    </meter>    <meter id="19" addr="000000000019" tp="06" name="12-18????">      <function id="1" coding="01B2E" error="192">289.570000</function>    </meter>    <meter id="20" addr="000000000020" tp="06" name="???????">      <function id="1" coding="01D30" error="192">0.000000</function>    </meter>    <meter id="21" addr="000000000021" tp="06" name="1-3??????">      <function id="1" coding="01A00" error="192">622.370000</function>    </meter>    <meter id="22" addr="000000000022" tp="06" name="1-3?????????">      <function id="1" coding="01A20" error="192">133.640000</function>    </meter>    <meter id="23" addr="000000000023" tp="06" name="4-18??????????">      <function id="1" coding="01A20" error="192">0.000000</function>    </meter>    <meter id="24" addr="000000000024" tp="06" name="??????????">      <function id="1" coding="01A00" error="192">515.560000</function>    </meter>    <meter id="25" addr="000000000025" tp="06" name="????">      <function id="1" coding="01A00" error="192">189.500000</function>    </meter>    <meter id="26" addr="000000000026" tp="06" name="??????">' +
//    '      <function id="1" coding="01D10" error="192">1.190000</function>    </meter>    <meter id="27" addr="000000000027" tp="06" name="????????????">      <function id="1" coding="01D10" error="192">72.340000</function>    </meter>    <meter id="28" addr="000000000028" tp="06" name="?????">      <function id="1" coding="01A00" error="192">39.320000</function>    </meter>' +
//    '  </data></root>';
//exports.Saving(msg);
