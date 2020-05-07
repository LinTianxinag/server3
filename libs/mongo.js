const mongoose = require('mongoose');
const config = require('config');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

mongoose.Promise = require('bluebird');

const instance = () => {
console.log('begin to connect');
  mongoose.connect(config.db.url, { useNewUrlParser: true })
}

/**
 * 连接成功
 */
mongoose.connection.on('connected', function () {
    console.log('Mongoose connection success to ' );
});
/**
 * 连接异常
 */
mongoose.connection.on('error',function (err) {
    console.log('Mongoose connection error: ' + err);
});

/**
 * 连接断开
 */
mongoose.connection.on('disconnected', function () {
    console.log('Mongoose connection disconnected');
});

exports.instance = instance;

//项目
exports.projectSchema = new Schema({
  title:{
    type: String,
    require: true
  },
  // billingAccount:{
  //     type: ObjectId,
  //     ref: 'billingAccount'
  // },
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
  smstag: String,
  attrib: String, //项目属性
  address: String,    //项目地址
  avatar: String, //项目图片
  payment: {  //是否使用支付
    type: Boolean,
    defaultValue: false
  },
  prepayment: { //是否预付费
    type: Boolean,
    defaultValue: false
  },
  epayment: { //是否电子支付
    type: Boolean,
    defaultValue: false
  },
  thirdpartbill: {    //第三方账单 CLOSE/PRE/BILL
    type: String,
    defaultValue: false
  },
  app: Schema.Types.Mixed, //app渠道启用列表
  sector: String,         //项目行业
  source: String,          //项目来源
  withdraw: Schema.Types.Mixed,   //提现属性,
  alipay_life: Schema.Types.Mixed,
  alipay_tenement: Schema.Types.Mixed,
  type: {
    type: String,
    defaultValue: 'BASIC'
  }
});

//传感器
exports.sensorSchema = new Schema({
  //传感器ID
  sid: {
    type: String,
    require: true,
    index: true
  },
  key: {
    type: String,
    require: true,
    index: true
  },
  //传感器标识
  tag: {
    type: String,
    require: true
  },
  //传感器名
  title: {
    type: String,
    require: true
  },
  //传感器描述
  description: {
    type: String,
    default: ''
  },
  //设备类型
  devicetype: {
    type: String
  },
  //项目ID
  project: {
    type: ObjectId,
    require: true,
    ref: "project"
  },
  //建筑ID
  building: {
    type: String,
    require: true
  },
  //社会属性列表
  socity: {
    type: Schema.Types.Mixed,
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
  mask: {
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
  realfreq: {
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
  realdata: {
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
  comport: {
    type: String
  },
  timedelete: {
    type: Number
  },
  timecreate: {
    type: Number
  },
  code: {
    type: String,
    default: ''
  },
  subentry: {
    type: String,
    default: ''
  }
});

exports.sensorAttributeSchema = new Schema({
  _id: String,
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
  primary: {
    type: Boolean,
    defaultValue: false,
  },
  lastupdate: {
    type: Number,
    require: true,
    default: Date.now
  }
});

exports.testSchema = new Schema({
    // _id: ObjectId,
    name: String,   //采集器标识(Application Unique ID)
});

exports.dataPoint = new Schema({
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

//传感器
exports.dataClientSchema = new Schema({
    //传感器ID
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
    branchId: {
        type: String,
        require: true,
        default:''
    },
    gatewayId: {
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

//-------------------------
exports.Sensor = mongoose.model('sensor', exports.sensorSchema);
exports.SensorAttribute = mongoose.model('sensorattribute', exports.sensorAttributeSchema);
exports.Project = mongoose.model('project', exports.projectSchema);
exports.Test = mongoose.model('test', exports.testSchema);
exports.DataBuffer = mongoose.model('dataBuffer', exports.dataPoint);
exports.DataClient = mongoose.model('dataClient', exports.dataClientSchema);