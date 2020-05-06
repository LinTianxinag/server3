var Q = require('q');
var _ = require('underscore');
var moment = require('moment');

module.exports = exports = function(){
};

function ProcessProject(projectid) {
    return new Promise((resolve, reject)=>{
        MongoDB.Project.findOne({
            _id: projectid
        }).exec(
            function (err, projectInfo) {
                if(err){
                    return reject(err);
                }

                //如果不存在项目, 则不同步表信息
                if(!projectInfo){
                    return reject({
                        code: ErrorCode.Code.PROJECTNOTEXISTS,
                        message: ErrorCode.Message.PROJECTNOTEXISTS,
                        result: projectid
                    });
                }

                resolve(projectInfo.toObject());
            }
        );
    });
}

function ProcessBuilding(archivesInfo) {
    return new Promise((resolve, reject)=>{
        MySQL.Building
            .findOne({
                where: {
                    id: archivesInfo.buildingID
                }
            })
            .then(
                buildingInfo=>{
                    if(!buildingInfo){
                        log.error(archivesInfo.buildingID, archivesInfo.gatewayID, archivesInfo.buildingName);
                        return reject();
                    }

                    resolve(MySQL.Plain(buildingInfo));
                },
                err=>{
                    log.error(err, archivesInfo.buildingID);
                    reject(err);
                }
            );
    });
}

function ProcessCollector(projectInfo, collectorid, archivesInfo, deviceInfo) {
    return new Promise((resolve, reject)=>{
        let projectid = projectInfo._id.toString();
        MySQL.Collector.findOne({
            where:{
                tag: collectorid,
                projectid: projectid
            }
        }).then(
            collectorInfo=>{
                if(!collectorInfo){

                    let newCollector = {
                        hid: deviceInfo.factory,
                        factory: 'NetDAU',
                        tag: archivesInfo.buildingID+archivesInfo.gatewayID,
                        title: archivesInfo.buildingName,
                        projectid: projectid,
                        debug: projectInfo.status === Typedef.ProjectStatus.ONLINE ? false : true,
                        lastupdate: moment().unix(),
                        timecreate: moment().unix(),
                        ext:{
                            hardware: deviceInfo.hardware,
                            mac: deviceInfo.mac,
                            software: deviceInfo.software,
                            ip: deviceInfo.ip,
                        }
                    };
                    MySQL.Collector.create(newCollector).then(
                        ()=>{
                            resolve(newCollector);
                        },
                        err=>{
                            log.error(err.code, err.err, projectid, collectorid);
                            return reject({
                                code: ErrorCode.Code.DATABASEEXEC,
                                message: ErrorCode.Message.DATABASEEXEC,
                            })
                        }
                    );
                }
                else {
                    resolve(collectorInfo);
                }
            },
            err=>{
                log.error(err, projectid, collectorid);
                reject();
            }
        );
    });
}

function ProcessSensor(projectInfo, buildingInfo, collectorInfo, archivesInfo) {
    var projectID = projectInfo._id.toString();
    let subentryTypeMapping = {};

    //组合出所有的通道
    var EnumEquipmentChannel = function (equipments) {
        var equipmentChannels = {};
        var equipmentInstances = {};
        equipments.map(equipment=>{
            //找出对应的协议
            var mtype = parseInt(equipment.mtype);
            var protocol = archivesInfo.protocols[mtype];
            if(!protocol || !protocol.protocol){
                log.error('autoInit EquipmentChannel Generate Failed Unknow Protocol', archivesInfo.protocols[mtype], equipment);
                return;
            }

            //建立设备信息
            let subentryObj = subentryTypeMapping[equipment.code];
            var equipmentID = GUID.DeviceID(null, archivesInfo.buildingID, archivesInfo.gatewayID, equipment.addrid, equipment.meterid);
            var equipmentIns = {
                id: equipmentID.SensorCPTID(),
                equipmentid: equipmentID.SensorID(),
                comport: equipment.comport,
                subentry: subentryObj && subentryObj.id || ''
            };
            //处理标题编码
            if(equipment.memo.indexOf('@') != -1){
                var memoSplit = equipment.memo.split('@');
                equipmentIns.title = memoSplit[0];
                equipmentIns.tag = memoSplit[1];
            }
            else{
                equipmentIns.title = equipment.memo;
                equipmentIns.tag = '';
            }

            //生成可以判断仪表类型的信息
            let deviceTypeInfo = {
                protocol: protocol,
                item: null
            };

            let deviceType = null;
            if(protocol.deviceTypeCode){
                deviceType = DeviceType.Instance.find(protocol.deviceTypeCode);
            }

            try {
                if (equipment.sampleId === '51') {
                    //采集所有mflag="1"的通道
                    _.each(protocol.details, function (channel) {
                        if (channel.mflag !== "1") {
                            return;
                        }
                        let deviceID = GUID.DeviceID(
                            null,
                            archivesInfo.buildingID,
                            archivesInfo.gatewayID,
                            equipment.addrid,
                            equipment.meterid,
                            '000',
                            channel.fnId
                        );

                        let keyOfEquipmentId;
                        let code;
                        if (deviceType) {
                            //mType variable exits
                            code = channel.id;
                        }
                        else {
                            //only type variable
                            //生成code
                            const handlerBars = require('handlebars');
                            const template = handlerBars.compile(protocol.protocol.code);
                            code = template(channel);

                            deviceTypeInfo.item = channel;
                            const deviceTypeFunc = eval("(" + protocol.protocol.devicetype + ")");
                            deviceType = DeviceType.Instance.match(deviceTypeFunc(deviceTypeInfo));
                        }

                        keyOfEquipmentId = deviceID.buildingid + deviceID.gatewayid + deviceID.meterid + deviceID.funcid;
                        deviceID.devicetype = deviceType.code;

                        let obj = {
                            sid: deviceID.ChannelID(),
                            key: deviceID.Key(),
                            code: code,
                            comport: equipment.comport,
                            exists: false,
                            devicetype: deviceType,
                            building: buildingInfo.id,
                            project: projectInfo._id.toString(),
                            title: equipmentIns.title,
                            tag: equipmentIns.tag,
                            comi: 'd*1',
                            freq: archivesInfo.freq,
                            subentry: equipmentIns.subentry
                        };
                        equipmentChannels[keyOfEquipmentId] = obj;
                        // log.debug('enum channel => ', archivesInfo.buildingID + archivesInfo.gatewayID, obj.devicetype.key, obj.sid, obj.code, obj.comport, obj.title, obj.tag, obj.subentry);
                    });
                }
                else {
                    //只采集sampleId指定的通道
                    const matchChannel = _.find(protocol.details, function (channel) {
                        return channel.id === equipment.sampleId;
                    });

                    let code;
                    let deviceID = GUID.DeviceID(
                        null,
                        archivesInfo.buildingID,
                        archivesInfo.gatewayID,
                        equipment.addrid,
                        equipment.meterid,
                        '000',
                        matchChannel.fnId
                    );


                    deviceTypeInfo.item = matchChannel;
                    if (!deviceType) {
                        //生成code
                        const handlerBars = require('handlebars');
                        const template = handlerBars.compile(protocol.protocol.code);
                        code = template(matchChannel);

                        const deviceTypeFunc = eval("(" + protocol.protocol.devicetype + ")");
                        deviceType = DeviceType.Instance.match(deviceTypeFunc(deviceTypeInfo));
                    }
                    else {
                        code = matchChannel.id;
                    }

                    deviceID.devicetype = deviceType.code;
                    const keyOfEquipmentId = deviceID.buildingid + deviceID.gatewayid + deviceID.meterid + deviceID.funcid;

                    let obj = {
                        sid: deviceID.ChannelID(),
                        key: deviceID.Key(),
                        code: code,
                        comport: equipment.comport,
                        exists: false,
                        devicetype: deviceType,
                        building: buildingInfo.id,
                        project: projectInfo._id.toString(),
                        title: equipmentIns.title,
                        tag: equipmentIns.tag,
                        comi: 'd*1',
                        freq: archivesInfo.freq,
                        subentry: equipmentIns.subentry
                    };
                    equipmentChannels[keyOfEquipmentId] = obj;
                    // log.debug('enum channel => ', archivesInfo.buildingID + archivesInfo.gatewayID, obj.devicetype.key, obj.sid, obj.code, obj.comport, obj.title, obj.tag, obj.subentry);
                }
            }
            catch(e){
                log.error(e, equipment);
            }

            let obj = {
                title: equipmentIns.title,
                tag: equipmentIns.tag,
                addrid: equipment.addrid,
                id: equipmentIns.id,
                devicetype: deviceType,
                project: projectInfo._id.toString(),
                auid: AUID,
                protocol: protocol,
                subentry: equipmentIns.subentry,
                freq: archivesInfo.freq
            };
            equipmentInstances[equipmentIns.id] = obj;
            // log.debug('enum device => ', archivesInfo.buildingID+archivesInfo.gatewayID, obj.devicetype.key, obj.id, obj.title, obj.tag, obj.addrid, obj.subentry);
        });

        return {channels:equipmentChannels, equipment: equipmentInstances};
    };

    var defer = Q.defer();

    //枚举出用到的protocol type/ext
    var typeExt = [];
    _.each(archivesInfo.protocols, function (protocol) {
        if(protocol.mType){
            typeExt.push('mtype=' + protocol.mType);
        }
        else {
            typeExt.push('type=' + protocol.type + " AND ext='" + protocol.ext + "'");
        }
    });

    //查询出用到的dataprocotol
    var sqlTypeExt = typeExt.toString().replace(/,/g, ' OR ');
    var sql = "select * from dataprotocol where `key`='NETDAU' and ("+sqlTypeExt+")";
    //查询分项类型
    Q.all([
        MySQL.Exec(sql),
        MySQL.SubentryType.findAll({
            where:{
            }
        })
    ]).then(
        result=>{
            let dataProtocols = result[0];
            result[1].map(v=>{
                subentryTypeMapping[v.code] = v;
            });

            //将protocol绑定到相应项
            _.each(dataProtocols, function (protocol) {
                // log.info(protocol);
                archivesInfo.BindProtocol(protocol);
            });

            // DoEnumEquipmentChannel(archivesInfo.meters);
            //枚举出现有的通道
            var equipmentObj =  EnumEquipmentChannel(archivesInfo.meters);
            var equipmentChannels = equipmentObj.channels;
            var equipmentInstances = equipmentObj.equipment;
            //查出这个采集器下所有的表
            Q.all([
                MongoDB.Sensor
                    .find({
                        sid: new RegExp('^'+archivesInfo.buildingID+archivesInfo.gatewayID)
                    })
                    .select('_id sid comport')
                    .exec(),
                MongoDB.SensorAttribute
                    .find({
                        _id: new RegExp('^'+archivesInfo.buildingID+archivesInfo.gatewayID)
                    })
                    .exec()
            ]).then(
                function (result) {
                    var nowSensorChannels = {};
                    var nowSensors = {};

                    result[0].map(channel=>{
                        var deviceID = GUID.DeviceID(channel.sid);
                        var keyOfEquipmentID = deviceID.buildingid + deviceID.gatewayid  + deviceID.meterid + deviceID.funcid;
                        channel.addrid = deviceID.addrid;
                        nowSensorChannels[keyOfEquipmentID] = channel;
                    });
                    result[1].map(sensorAttrib=>{
                        nowSensors[sensorAttrib._id] = sensorAttrib;
                    });

                    //进行对比
                    //找出需要删除的通道
                    var removeChannels = [];
                    var updateChannels = [];

                    //扫描addrid不变但meterid变更的情况
                    // _.map(equipmentChannels, (channel, key)=>{
                    //     let inCollectorDeviceID = GUID.DeviceID(channel.sid);
                    //     let inPltEquip = _.find(nowSensorChannels, nowChannel=>{
                    //         let nowChannelDeviceID = GUID.DeviceID(nowChannel.sid);
                    //         return nowChannelDeviceID.addrid == inCollectorDeviceID.addrid
                    //             && nowChannelDeviceID.meterid != inCollectorDeviceID.meterid;
                    //     });
                    //     if(!inPltEquip){
                    //         return;
                    //     }
                    //     updateChannels.push({
                    //         id: inPltEquip._id.toString(),
                    //         sid: inCollectorDeviceID.sid,
                    //         devicetype: channel.devicetype.id
                    //     });
                    // });

                    _.map(nowSensorChannels, function (channel, key) {
                        var equipmentChannel = equipmentChannels[key];
                        if(!equipmentChannel){
                            //delete
                            removeChannels.push(channel._id);
                            nowSensorChannels[key] = null;
                        }
                        else{
                            var equipmentChannelDeviceID = GUID.DeviceID(equipmentChannel.sid);
                            if(equipmentChannelDeviceID.addrid != channel.addrid
                                || equipmentChannelDeviceID.devicetype != equipmentChannel.devicetype.id
                                || equipmentChannel.comport != channel.comport
                                || equipmentChannel.code != channel.code
                                || equipmentChannel.title != channel.title
                                || equipmentChannel.tag != channel.tag
                            ){
                                updateChannels.push({
                                    id: channel._id.toString(),
                                    sid: equipmentChannel.sid,
                                    key: equipmentChannelDeviceID.Key(),
                                    devicetype: equipmentChannel.devicetype.key,
                                    code: equipmentChannel.code,
                                    title: equipmentChannel.title,
                                    subentry: equipmentChannel.subentry,
                                    tag: equipmentChannel.tag,
                                    comport: equipmentChannel.comport,
                                    freq: equipmentChannel.freq
                                });
                            }
                        }
                    });


                    //找出需要删除的表
                    var removeSensors = [];
                    var updateSensors = [];

                    _.map(nowSensors, function (equipmentIns, key) {
                        //
                        var newEquipment = equipmentInstances[key];
                        if(!newEquipment || newEquipment.id != equipmentIns.id){
                            removeSensors.push(key);
                            nowSensors[key] = null;
                        }
                        else if(
                            newEquipment.addrid != equipmentIns.addrid
                            || newEquipment.devicetype.id != equipmentIns.devicetype
                            || newEquipment.protocol.protocol.id != equipmentIns.dataprotocol
                        ){
                            updateSensors.push({
                                id: equipmentIns.id,
                                addrid: newEquipment.addrid,
                                devicetype: newEquipment.devicetype.key,
                                dataprotocol: newEquipment.protocol.protocol.id,
                                title: newEquipment.title,
                                subentry: newEquipment.subentry,
                                tag: newEquipment.tag,
                                freq: newEquipment.freq
                            });
                        }
                    });
                    log.info('remove: ', removeChannels, removeSensors);
                    Q.all([
                        MongoDB.Sensor.remove({'_id': {$in: removeChannels}, project: projectID}).exec(),
                        MongoDB.SensorAttribute.remove({_id: {$in: removeSensors}, project: projectID}).exec()
                    ]).then(
                        function (result) {
                            //更新channel/sensor
                            updateChannels.map(channel=>{
                                let channelObj = {
                                    sid: channel.sid,
                                    key: channel.key
                                };
                                if(projectInfo.status === Typedef.ProjectStatus.DEBUG
                                    && collectorInfo.debug){
                                    channelObj.title = channel.title;
                                    channelObj.tag = channel.tag;
                                    channelObj.devicetype = channel.devicetype;
                                    channelObj.code = channel.code;
                                    channelObj.subentry = channel.subentry;
                                    channelObj.comport = channel.comport;
                                    channelObj.freq = channel.freq;
                                }
                                MongoDB.Sensor.update(
                                    {_id: channel.id},
                                    {
                                        $set: channelObj
                                    },{}, function (err) {
                                        if(err){
                                            log.error(err, channel);
                                        }
                                        else{
                                            // log.info('update channel: ', channel, channelObj);
                                        }
                                    }
                                );
                            });
                            updateSensors.map(sensor=>{
                                let deviceObj = {
                                    addrid: sensor.addrid,
                                };
                                if(projectInfo.status === Typedef.ProjectStatus.DEBUG
                                    && collectorInfo.debug ){
                                    deviceObj.title = sensor.title;
                                    deviceObj.tag = sensor.tag;
                                    deviceObj.dataprotocol = sensor.dataprotocol;
                                    deviceObj.devicetype = sensor.devicetype;
                                    deviceObj.subentry = sensor.subentry;
                                    deviceObj.freq = sensor.freq;
                                }
                                MongoDB.SensorAttribute.update(
                                    {_id: sensor.id},
                                    {
                                        $set: deviceObj
                                    },{}, function (err) {
                                        if(err){
                                            log.error(err, sensor);
                                        }
                                        else{
                                            // log.info('update sensor: ', sensor, deviceObj);
                                        }
                                    }
                                );
                            });

                            //找出需要添加的通道
                            _.map(equipmentChannels, function (channel, key) {
                                if(!nowSensorChannels[key]){
                                    //insert
                                    var newChannel = new MongoDB.Sensor;
                                    newChannel.sid = channel.sid;
                                    newChannel.key = channel.key;
                                    newChannel.tag = channel.tag;
                                    newChannel.title = channel.title;
                                    newChannel.project = channel.project;
                                    newChannel.building = channel.building;
                                    newChannel.freq = channel.freq;
                                    newChannel.comi = 'd*1';
                                    newChannel.comport = channel.comport;
                                    newChannel.code = channel.code;
                                    newChannel.devicetype = channel.devicetype.key;
                                    newChannel.subentry = channel.subentry;
                                    newChannel.save(function (err) {
                                        if (err) {
                                            log.error(err, newChannel.toObject());
                                        }
                                    });

                                    log.info('create :', newChannel.sid, newChannel.title, newChannel.code, newChannel.devicetype);
                                }
                            });
                            //找出需要添加的表
                            _.map(equipmentInstances, function (equipmentIns, key) {
                                if(!nowSensors[key]){
                                    MongoDB.SensorAttribute.update(
                                        {
                                            _id: key
                                        },{
                                            $set:{
                                                _id: key,
                                                title: equipmentIns.title,
                                                tag: equipmentIns.tag,
                                                project: equipmentIns.project,
                                                addrid: equipmentIns.addrid,
                                                freq: equipmentIns.freq,
                                                comi: 'd*1',
                                                auid: AUID,
                                                dataprotocol: equipmentIns.protocol.protocol.id,
                                                devicetype: equipmentIns.devicetype.key,
                                                subentry: equipmentIns.subentry
                                            }
                                        },{upsert: true}, function (err) {
                                            if(err){
                                                log.error(err, equipmentIns);
                                            }
                                            else{
                                                log.info('sensorAttribute: ', equipmentIns._id, equipmentIns.title, equipmentIns.dataprotocol, equipmentIns.devicetype);
                                            }
                                        }
                                    );
                                }
                            });
                        }, function (err) {
                            defer.reject(err);
                        }
                    );

                    defer.resolve({});
                }, function (err) {
                    defer.reject(err);
                }
            );

            MongoDB.Sensor
                .find({
                    sid: new RegExp('^'+archivesInfo.buildingID+archivesInfo.gatewayID)
                })
                .select('_id sid comport')
                .exec(function (err, result) {
                    if(err){
                        return defer.reject(err);
                    }

                });
        },
        err=>{
            log.error(err, projectInfo, buildingInfo, archivesInfo);
            defer.reject(err);
        }
    );

    return defer.promise;
}

exports.Init = function (archivesInfo, deviceInfo) {
    var defer = Q.defer();

    const ID = archivesInfo.buildingID+archivesInfo.gatewayID;

    ProcessBuilding(archivesInfo).then(
        function (buildingInfo) {
            //
            // log.info('DEVICEINFO', ID, buildingInfo);

            ProcessProject(buildingInfo.projectid)
                .then(
                    function (projectInfo) {
                        // log.info('DEVICEINFO', ID, projectInfo);

                        var projectID = projectInfo._id.toString();
                        var isProjectOnline = (projectInfo.status == 'ONLINE');
                        ProcessCollector(projectInfo, archivesInfo.buildingID + archivesInfo.gatewayID, archivesInfo, deviceInfo).then(
                            function (collectorInfo) {
                                //online状态不进行更新
                                // log.info('DEVICEINFO', ID, collectorInfo);

                                if(isProjectOnline && !collectorInfo.debug){
                                    return defer.resolve();
                                }
                                ProcessSensor(projectInfo, buildingInfo, collectorInfo, archivesInfo).then(
                                    function (result) {
                                        defer.resolve(result);
                                    }
                                    , function (err) {
                                        defer.reject(err);
                                    });
                            }, function (err) {
                                defer.reject(err);
                            }
                        );

                    }, function (err) {
                        defer.reject(err);
                    }
                );
        }, function (err) {
            defer.reject(err);
        }
    );

    return defer.promise;
};

