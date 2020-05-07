/**
 * Created by Joey on 14-4-1.
 */
var mongo = require('mongoose');
var config = require('config');
var moment = require('moment');
var _ = require('underscore');
var Schema = mongo.Schema;
var ObjectId = Schema.ObjectId;

mongo.Promise = Promise;

var mongodb;
var isConnected = false;
exports = module.exports = function(callback) {
    mongodb = mongo.connection;
    var Reconnect = function(){
        //, {server:{auto_reconnect:true}}
        setTimeout(function(){
            setTimeout(function(){
                isConnected = false;
                mongo.connect(config.db.url);
            }, 1000);
        }, 0);
    }

    mongodb.on('error', function(error){
        log.error('Error in connect to Mongo: ', error);
        mongo.disconnect();
        Reconnect();
    });
    mongodb.on('connected', function(){
        console.log('MongoDB connected');
        isConnected = true;
        callback && callback();
    });
    mongodb.on('reconnected', function () {
        console.log('MongoDB reconnected!');
    });
    mongodb.on('disconnected', function() {
        console.log('MongoDB disconnected');
        isConnected = false;
        Reconnect();
    });
    Reconnect();
}

exports.IsConnected = function(){
    return isConnected;
};

exports.MiddleWare = function(schema)
{
    var mongoMiddleware = schema;
    this.where = function(queryFactor){
        mongoMiddleware = mongoMiddleware.where(queryFactor);
        return mongoMiddleware;
    };
    this.or = function (queryFactor) {
        mongoMiddleware = mongoMiddleware.or(queryFactor);
        return mongoMiddleware;
    };
    this.in = function(queryFactor){
        mongoMiddleware = mongoMiddleware.in(queryFactor);
        return mongoMiddleware;
    };
    this.find = function(queryFactor){
        mongoMiddleware = mongoMiddleware.find(queryFactor);
        return mongoMiddleware;
    };
    this.findOne = function(queryFactor){
        mongoMiddleware = mongoMiddleware.findOne(queryFactor);
        return mongoMiddleware;
    };
    this.populate = function(queryFactor){
        mongoMiddleware = mongoMiddleware.populate(queryFactor);
        return mongoMiddleware;
    };
    this.exec = function(callback){
        mongoMiddleware = mongoMiddleware.exec(callback);
        return mongoMiddleware;
    };
    this.gt = function(callback){
        mongoMiddleware = mongoMiddleware.gt(callback);
        return mongoMiddleware;
    };
    this.gte = function(callback){
        mongoMiddleware = mongoMiddleware.gte(callback);
        return mongoMiddleware;
    };
    this.lt = function(callback){
        mongoMiddleware = mongoMiddleware.lt(callback);
        return mongoMiddleware;
    };
    this.lte = function(callback){
        mongoMiddleware = mongoMiddleware.lte(callback);
        return mongoMiddleware;
    };
    this.equals = function(callback){
        mongoMiddleware = mongoMiddleware.equals(callback);
        return mongoMiddleware;
    };
    this.sort = function(callback){
        mongoMiddleware = mongoMiddleware.sort(callback);
        return mongoMiddleware;
    };
    this.exists = function(callback){
        mongoMiddleware = mongoMiddleware.exists(callback);
        return mongoMiddleware;
    };
};
//能耗分类
var energyCategorySchema = new Schema({
    _id: String,
    title: String,
    unit: String,
    standcol: Number,
    description: String
});
//项目
exports.projectSchema = new Schema({
    title:{
        type: String,
        require: true
    },
    billingAccount:{
        type: ObjectId,
        ref: 'billingAccount'
    },
    enterprise: String, //公司名
    description: String,
    level: Number,
    energy: Schema.Types.Mixed,
    onduty: String,
    offduty: String,
    billingtime: Number,
    billingservice: {
        type: Boolean,
        default: true
    },
    timecreate: Number,
    status: {
        type: String,
        default: 'ONLINE'
    }, // debug,online,pending
    timestatus: {
        type: Number,
        default: 0
    }
});
//建筑
exports.buildingSchema = new Schema({
    _id: {
        type: String,
        require: true
    },
    title: String,
    description: String,
    acreage: {
        type: Number,
        require: true
    },
    avgConsumption: Number,
    totalConsumption: Number,
    geolocation: Schema.Types.Mixed,
    project:{
        type: ObjectId,
        require: true,
        ref: "project"
    }
});
//路径请求
var urlPathSchema = new Schema({
    _id: String,
    enable: {
        type: Boolean,
        default: true
    },
    needlogin:{
        type: Boolean,
        default: true
    },
    authtype: {
        type: String,
        require: true,
        default: 'NONE' //NONE/BYACCOUNT/BYAPPID
    },
    desc:{
        type: String
    }
});
var resourceSchema = new Schema({
    key: {
        type: String,
        require: true
    },
    value: String,
    begin: {
        type: Date,
        require: true,
        default: Date.now
    },
    end: {
        type: Date,
        require: true,
        default: Date.now
    },
    belongto: {
        type: String,
        require: true,
        ref: 'account'
    },
    type: String,
    desc: String
});

//传感器
exports.sensorSchema = new Schema({
    //传感器ID
    sid:{
        type: String,
        require: true,
        index: true
    },
    key:{
        type: String,
        require: true,
        index: true
    },
    //传感器标识
    tag:{
        type: String,
        require: true
    },
    //传感器名
    title: {
        type:String,
        require: true
    },
    //传感器描述
    description: {
        type:String,
        default: ''
    },
    //设备类型
    devicetype: {
        type: String
    },
    //项目ID
    project:{
        type: ObjectId,
        require: true,
        ref: "project"
    },
    //建筑ID
    building: {
        type:String,
        require: true
    },
    //社会属性列表
    socity:{
        type:Schema.Types.Mixed,
        ref: 'customer'
    },
    /*
     计费形式
     NONE: 不计费,
     BYSELF: 计费但不公摊
     BYCOUNT: 按用户数公摊
     BYAREA: 按面积公摊
     BYCONSUMPTION: 按能耗公摊
     * */
    paystatus: {
        type: String,
        require: true,
        default: 'NONE'
    },
    //是否屏蔽传感器
    mask:{
        type: Boolean,
        require: true,
        default: false
    },
    //传感器更新频率
    freq: {
        type: Number,
        default: 1800
    },
    //实际更新频率
    realfreq:{
        type: Number,
        default: 0
    },
    //最近一次刻度
    lasttotal: {
        type: Number,
        require: true,
        default: 0
    },
    //最近一次差值
    lastvalue: {
        type: Number,
        require: true,
        default: 0
    },
    //最近更新时间
    lastupdate: {
        type: Date
    },
    //最近传感器实时读数
    realdata:{
        type: Number,
        require: true,
        default: 0
    },
    //传感器能耗分类
    energy: {
        type: String,
        require: true
    },
    //传感器能耗子分类
    energyPath: {
        type: String,
        require: true
    },
    //互感器系数
    comi: {
        type: String,
        require: true,
        default: 'd*1'
    },
    comport:{
        type: String
    },
    timedelete:{
        type: Number
    },
    timecreate:{
        type: Number
    },
    code:{
        type: String,
        default: ''
    },
    coding:{
        type: String,
        default: ''
    },
    subentry: {
        type: String,
        default: ''
    }
});

var dataPoint = new Schema({
    sensor: {
        type: String,
        require: true,
        ref: 'sensor'
    },
    comport:{
        type: String
    },
    timestamp: {
        type: Date,
        require: true,
        default: Date.now
    },
    value: {
        type: Schema.Types.Mixed,
        require: true
    },
    total: {
        type: Schema.Types.Mixed,
        require: true
    },
    coding: {
        type: String
    }
});

//传感器命令缓存
var sensorCommandQueue = new Schema({
    /*
     命令状态标识：
     REQ: 向传感器请求
     REP: 传感器回应
     * */
    status: {
        type:String,
        require: true
    },
    meterid: String,
    buildingid: String,
    gatewayid: String,
    addrid: String,
    command: Schema.Types.Mixed,
    collectorAUID: String,   //采集器标识
    apiAUID: String,    //接口标识
    code: Number,  //命令返回错误码
    retry: {    //命令重试次数
        type: Number,
        default: 10
    },
    delay:{
        type: Number,
        default: 200
    },
    reqdata:{
        type: String
    },
    respdata: {
        type: String,
        default: ''
    }, //命令返回值
    timecreate: {
        type: Number,
        require: true
    },
    //命令被处理的时间
    timeprocess: {
        type: Number,
        require: true,
        default: 0
    },
    //命令返回的时间
    timedone: {
        type: Number,
        require: true,
        default: 0
    }
});

/*
 传感器控制信息
 _id: buildingID+gatewayID+meterID(可以唯一表示一台采集器)
 driver: 采集器对应的驱动目录
 project: 项目名称
 * */
exports.sensorAttributeSchema = new Schema({
    _id: String,
    deviceId:String,
    project: ObjectId,
    auid: String,   //采集器标识(Application Unique ID)
    addrid: String,     //传感器地址标识
    devicetype: String,   //设备类型
    tag: String,
    title: String,
    comport: Number,
    freq: Number,
    comi: String,
    status: {
        type: Schema.Types.Mixed,
        require: true,
        default: {}
    },
    driver: String,
    dataprotocol: String,
    subentry: String,
    ext: Schema.Types.Mixed,    //传感器扩展属性
    billingservice: Number,
    lastupdate: Number
});
exports.dataClientSchema = new Schema({
    //当天这个文件的line值，防止重复
    dayLine: {
        type: String,
        require: true,
        index: true,
        default:''
    },
    buildingId: {
        type: String,
        require: true,
        default:''
    },

    newBuildingId: {
        type: String,
        require: true,
        default:''
    },

    gatewayId: {
        type: String,
        require: true,
        default:''
    },
    branchId: {
        type: String,
        require: true,
        default:''
    },
    //传感器标识
    branchName: {
        type: String,
        require: true,
        default:''
    },
    update: {
        type: Date
    },
    lastupdate: {
        type: Date
    },

    itemCode: {
        type: String,
        default:''
    },
    itemName: {
        type: String,
        default:''
    },
    value:{
        type: String,
        default:''
    } ,
    serverTime:{
        type: Date,
        require: true,
        default: Date.now
    }
    // timestamps:{
    //     createdAt: true,
    //     updatedAt: true,
    // },
});
//将读取上来的电表进行编码，超出99要改gateway，自身的meterid也要对应
exports.meterSchema = new Schema({
    //当天这个文件的line值，防止重复
    buildingId: {
        type: String,
        require: true,
        default:''
    },
    gatewayId: {
        type: String,
        require: true,
        default:''
    },
    //gateway 下面的电表id，从1~99 ，多了就要更换gateway
    gatewayIndex: {
        type: String,
        require: true,
        default:''
    },
    //归档的时候的id长度有要求
    meterArchiveId: {
        type: String,
        require: true,
        default:''
    },
    //采集器中meter的id 001 之类的
    meterManagerId: {
        type: String,
        require: true,
        default:''
    },
    meterReportId: {
        type: String,
        require: true,
        default:''
    },
    branchId: {
        type: String,
        require: true,
        default:''
    },
    //传感器标识
    branchName: {
        type: String,
        require: true,
        default:''
    },
    update: {
        type: Date,
        default: Date.now
    },

    itemCode: {
        type: String,
        default:''
    },
    itemName: {
        type: String,
        default:''
    },
    // timestamps:{
    //     createdAt: true,
    //     updatedAt: true,
    // },
});



exports.ObjectId = ObjectId;

exports.Resource = mongo.model('resource', resourceSchema);
exports.UrlPath = mongo.model('urlpath', urlPathSchema);
exports.DataBuffer = mongo.model('dataBuffer', dataPoint);
exports.Sensor = mongo.model('sensor', exports.sensorSchema);
// exports.SensorCommandQueue = mongo.model('commandQueue', sensorCommandQueue);
exports.SensorAttribute = mongo.model('sensorattribute', exports.sensorAttributeSchema);
exports.Project = mongo.model('project', exports.projectSchema);
exports.Building = mongo.model('building', exports.buildingSchema);
exports.DataClient = mongo.model('dataClient', exports.dataClientSchema);
exports.Meter = mongo.model('meter', exports.meterSchema);
exports.NewObjectId = function()
{
  return new mongo.Types.ObjectId;
};

exports.DailyData = function()
{
    var collectionName = 'dailyData' + moment().format('YYYYMMDD');
    return mongo.model(collectionName, dataPoint);
}