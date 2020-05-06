let Q = require('q');
let _  = require('underscore');
let Sequelize = require('sequelize');
let moment = require('moment');
let UUID = require('node-uuid');
let config = require('config');

let connection;
let pool;
let sequelizeInstance;

exports = module.exports = function(host, port, user, passwd, database, isReadOnly){
};

exports.Load = function () {

    return new Promise((resolve, reject)=>{
        sequelizeInstance = new Sequelize(null, null, null, {
            dialect: 'mysql',
            replication:{
                read: JSON.parse(config.rds.read),
                write: JSON.parse(config.rds.write)
            },
            logging: false,
            timezone: "+08:00",
            retry:{
                max: 0
            },
            pool:{
                maxConnections: 60,
                minConnections: 10,
                maxIdleTime: 30000
            }
        });
        sequelizeInstance.authenticate().then(
            function (err) {
                console.log('RDS Connection Successful...');
                resolve();

                exports.Sequelize = sequelizeInstance;

                SequelizeDefine();
            }
        ).catch(function (err) {
            console.error(err);
            reject(err);
        });
    });
};

exports.Exec = function(sql)
{
    //
    if(!sql || !sql.length){
        return null;
    }

    //判断QueryTypes
    var queryTypes;
    {
        var blankIndex = sql.indexOf(" ");
        var types = sql.substr(0, blankIndex);
        switch(types){
            case "SELECT":
            case "select":
                queryTypes = Sequelize.QueryTypes.SELECT;
                break;
            case "UPDATE":
            case "update":
                queryTypes = Sequelize.QueryTypes.UPDATE;
                break;
            case "DELETE":
            case "delete":
                queryTypes = Sequelize.QueryTypes.DELETE;
                break;
            case "INSERT":
            case "insert":
                queryTypes = Sequelize.QueryTypes.INSERT;
                break;
            default:
                return null;
                break;
        }
    }

    var deferred = Q.defer();

    sequelizeInstance.query(sql, { type: queryTypes}).then(
        function (result) {
            deferred.resolve(result);
        }, function (err) {
            deferred.reject(err);
        }
    );

    return deferred.promise;
};

var FundDetails;
function SequelizeDefine()
{
    exports.DataBuffer = sequelizeInstance.define('databuffer', {
        id: {
            type: Sequelize.CHAR(32),
            primaryKey: true
        },
        sensor: Sequelize.STRING(32),
        value: Sequelize.DECIMAL(18,2),
        total: Sequelize.DECIMAL(18,2),
        timepoint: Sequelize.BIGINT
    }, {
        timestamps: false,
        freezeTableName: true
    });
    //用户表
    exports.Account = sequelizeInstance.define('account', {
        user: {
            type: Sequelize.CHAR(128),
            primaryKey: true
        },
        passwd: Sequelize.STRING(255),
        title: Sequelize.STRING(32),
        lastlogin: Sequelize.BIGINT,
        initpath: Sequelize.STRING(255),
        character: Sequelize.STRING(128),
        resource: Sequelize.TEXT,
        expire: Sequelize.BIGINT,
        token: Sequelize.STRING(255),
        fundaccount: Sequelize.STRING(128),
        type: Sequelize.ENUM('USER', 'APPID'),
        description: Sequelize.STRING(255)
    },{
        timestamps: false,
        freezeTableName: true,
        tableName: 'account'
    });
    //URL 请求表
    exports.TABLE_URLPATH = "urlpath";
    exports.UrlPath = sequelizeInstance.define('urlpath', {
        id: {
            type: Sequelize.STRING(255),
            primaryKey: true
        },
        enable: Sequelize.BOOLEAN,
        needlogin: Sequelize.BOOLEAN,
        authtype: Sequelize.CHAR(255),
        description: Sequelize.STRING(255)
    },{
        timestamps: false,
        freezeTableName: true,
        tableName: 'urlpath'
    });
    //Character角色
    exports.Character = sequelizeInstance.define('character', {
        id: {
            type: Sequelize.CHAR(64),
            primaryKey: true
        },
        title: Sequelize.STRING(32),
        rule: Sequelize.TEXT,
        level: Sequelize.INTEGER
    },{
        timestamps: false,
        freezeTableName: true
    });
    //FundAccount资金账户
    exports.FundAccount = sequelizeInstance.define('fundaccount', {
        id:{
            type: Sequelize.STRING(128),
            primaryKey: true
        },
        title: Sequelize.STRING(128),
        cash: Sequelize.BIGINT,
        consume: Sequelize.BIGINT,
        expire: Sequelize.BIGINT,
        alerthreshold: Sequelize.BIGINT
    },{
        timestamps: false,
        freezeTableName: true
    });
    //Project项目
    exports.Project = sequelizeInstance.define('project', {
        id:{
            type: Sequelize.CHAR(64),
            primaryKey: true
        },
        title: Sequelize.STRING(32),
        level: Sequelize.INTEGER,
        energy: Sequelize.TEXT,
        onduty: Sequelize.CHAR(8),
        offduty: Sequelize.CHAR(8),
        description: Sequelize.STRING(255)
    },{
        timestamps: false,
        freezeTableName: true
    });
    //BaseEnergycategory基本能耗分类
    exports.BaseEnergyCategory = sequelizeInstance.define('baseenergycategory', {
        id:{
            type: Sequelize.CHAR(32),
            primaryKey: true
        },
        title: Sequelize.STRING(32),
        unit: Sequelize.CHAR(16),
        standcol: Sequelize.DECIMAL(8,4),
        description: Sequelize.STRING(255)
    },{
        timestamps: false,
        freezeTableName: true
    });
    //AppidSecret
    //exports.AppIDSecret = sequelizeInstance.define('appidsecret', {
    //    id: {
    //        type: Sequelize.CHAR(128),
    //        primaryKey: true
    //    },
    //    secret: Sequelize.STRING(255),
    //    lastlogin: Sequelize.BIGINT,
    //    character: Sequelize.STRING(128),
    //    resource: Sequelize.TEXT,
    //    expire: Sequelize.BIGINT,
    //    description: Sequelize.STRING(255)
    //},{
    //    timestamps: false,
    //    freezeTableName: true
    //});
    //Building建筑
    exports.Building = sequelizeInstance.define('buildings', {
        bid:{
            type: Sequelize.BIGINT.UNSIGNED,
            autoIncrement: true,
            primaryKey: true
        },
        id: {
            type: Sequelize.STRING(64)
        },
        title: Sequelize.STRING(32),
        acreage: Sequelize.INTEGER,
        avgConsumption: Sequelize.DECIMAL(18,2),
        totalConsumption: Sequelize.DECIMAL(18,2),
        projectid: Sequelize.STRING(64),
        location: Sequelize.TEXT,
        description: Sequelize.STRING(255)
    },{
        timestamps: false,
        freezeTableName: true
    });
    //Customer社会属性
    exports.Customer = sequelizeInstance.define('customer', {
        id: {
            type: Sequelize.STRING(64),
            primaryKey: true
        },
        project: Sequelize.STRING(64),
        socities: Sequelize.TEXT
    },{
        timestamps: false,
        freezeTableName: true
    });
    //Collectores采集器
    exports.Collector = sequelizeInstance.define('collector', {
        id:{
            type: Sequelize.BIGINT.UNSIGNED,
            primaryKey: true,
            allowNull: false,
            autoIncrement: true,
        },
        hid:{
            type: Sequelize.STRING(32),
            allowNull: false,
            defaultValue: ''
        },
        factory:{
            type: Sequelize.STRING(16),
            allowNull: false,
            defaultValue: ''
        },
        tag:{
            type: Sequelize.STRING(32),
            allowNull: false,
            defaultValue: ''
        },
        title: {
            type:Sequelize.STRING(32),
            allowNull: false,
            defaultValue: ''
        },
        projectid: {
            type: Sequelize.STRING(64),
            allowNull: false,
            defaultValue: ''
        },
        timecreate:{
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            defaultValue: 0
        },
        location:{
            type: Sequelize.GEOMETRY,
            allowNull: true
        },
        ext: {
            type: Sequelize.TEXT,
            get: function(){
                let ext;
                try{
                    ext = JSON.parse(this.getDataValue('ext'));
                }
                catch(e){
                    ext = {};
                }
                return ext;
            },
            set : function (value) {
                this.setDataValue('ext', JSON.stringify(value));
            }
        },
        debug:{
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        lastupdate:{
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            defaultValue: 0
        },
        description: {
            type: Sequelize.STRING(255),
            allowNull: false,
            defaultValue: ''
        }
    },{
        timestamps: false,
        freezeTableName: true
    });
    //Sensor传感器
    exports.Sensor = sequelizeInstance.define('sensor', {
        id: {
            type: Sequelize.STRING(128),
            primaryKey: true
        },
        channelid: Sequelize.STRING(64),
        title: Sequelize.STRING(32),
        tag: Sequelize.STRING(32),
        description: Sequelize.STRING(255),
        project: Sequelize.STRING(64),
        building: Sequelize.STRING(64),
        socity: Sequelize.TEXT,
        paystatus: Sequelize.CHAR(16),
        mask: Sequelize.BOOLEAN,
        freq: Sequelize.INTEGER,
        lasttotal: Sequelize.DECIMAL(18,2),
        lastvalue: Sequelize.DECIMAL(18,2),
        lastupdate: Sequelize.BIGINT,
        realdata: Sequelize.DECIMAL(18,2),
        energy: Sequelize.STRING(128),
        energypath: Sequelize.STRING(255)
    },{
        timestamps: false,
        freezeTableName: true
    });
    //BillingService计费服务
    exports.BillingService = sequelizeInstance.define('billingservice', {
        id: {
            type: Sequelize.STRING(64),
            primaryKey: true
        },
        title: Sequelize.STRING(32),
        project: Sequelize.STRING(64),
        energycategory: Sequelize.TEXT,
        rules: Sequelize.TEXT,
        description: Sequelize.STRING(255)
    },{
        timestamps: false,
        freezeTableName: true
    });
    //Department 商户表
    exports.Department = sequelizeInstance.define('department', {
        id: {
            type: Sequelize.STRING(64),
            primaryKey: true
        },
        title: Sequelize.STRING(32),
        character: Sequelize.STRING(32),
        area: Sequelize.INTEGER,
        onduty: Sequelize.CHAR(8),
        offduty: Sequelize.CHAR(8),
        account: Sequelize.STRING(128),
        project: Sequelize.STRING(64),
        resource: Sequelize.TEXT,
        description: Sequelize.STRING(255)
    },{
        timestamps: false,
        freezeTableName: true
    });
    //EventTemplate 事件模板
    exports.EventTemplate = sequelizeInstance.define('eventtemplate', {
        id: {
            type: Sequelize.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        name: Sequelize.STRING(64),
        key: Sequelize.STRING(64),
        type: Sequelize.ENUM('TIMER','EVENT'),
        gateway: Sequelize.STRING(128),
        desc: Sequelize.TEXT
    },{
        timestamps: false,
        freezeTableName: true
    });
    //EventSchedule 事件计划
    exports.EventSchedule = sequelizeInstance.define('eventschedule', {
        project: {
            type: Sequelize.STRING(64),
            primaryKey: true
        },
        templateid: {
            type: Sequelize.BIGINT.UNSIGNED,
            primaryKey: true
        },
        gateway: Sequelize.STRING(128)
    },{
        timestamps: false,
        freezeTableName: true
    });
    //SensorCommandQueue 传感器命令队列
    exports.DeviceCommandQueue = sequelizeInstance.define('devicecommandqueue', {
        cmdid: {
            type: Sequelize.STRING(64),
            primaryKey: true
        },
        session: Sequelize.STRING(64),
        operator: Sequelize.STRING(128),
        buildingid: Sequelize.CHAR(4),
        gatewayid: Sequelize.CHAR(2),
        addrid: Sequelize.CHAR(14),
        meterid: Sequelize.CHAR(3),
        word: Sequelize.STRING(32),
        auid: Sequelize.STRING(128),
        request: Sequelize.TEXT,
        response: Sequelize.TEXT,
        code: Sequelize.INTEGER,
        timecreate: Sequelize.BIGINT,
        timeprocess: Sequelize.BIGINT,
        timedone: Sequelize.BIGINT
    },{
        timestamps: false,
        freezeTableName: true
    });
    //SensorAttribute 传感器属性
    exports.SensorAttribute = sequelizeInstance.define('sensorattribute', {
        id: {
            type: Sequelize.STRING(64),
            primaryKey: true
        },
        addrid: Sequelize.STRING(32),
        devicetype: Sequelize.STRING(32),   //设备类型
        tag: Sequelize.STRING(64),
        title: Sequelize.STRING(64),
        driver: Sequelize.STRING(255),
        ext: {
            type: Sequelize.TEXT,
            defaultValue: '',
            get: function(){
                var ext;
                try{
                    ext = JSON.parse(this.getDataValue('ext'));
                }
                catch(e){
                    ext = {};
                }

                return ext;
            },
            set : function (value) {
                this.setDataValue('ext', JSON.stringify(value));
            }
        },
        project: Sequelize.STRING(64),
        auid: {
            type: Sequelize.STRING(128),
            defaultValue: ''
        },
        status: {
            type: Sequelize.TEXT,
            defaultValue: '',
            get: function(){
                var status;
                try{
                    status = JSON.parse(this.getDataValue('status'));
                }
                catch(e){
                    status = {};
                }

                return status;
            },
            set : function (value) {
                this.setDataValue('status', JSON.stringify(value));
            }
        },
        lastupdate: {
            type: Sequelize.BIGINT,
            defaultValue: 0
        }
    },{
        timestamps: false,
        freezeTableName: true
    });
    //wxplatform 微信公众号表
    exports.WXPlatform = sequelizeInstance.define('wxplatform', {
        platformid: {
            type: Sequelize.STRING(32),
            primaryKey: true
        },
        name: Sequelize.STRING(64),
        map: Sequelize.STRING(32),
        appid: Sequelize.STRING(64),
        appsecret: Sequelize.STRING(128)
    },{
        timestamps: false,
        freezeTableName: true
    });
    //wxopeniduser 微信公众号ID=>用户
    exports.WXOpenIDUser = sequelizeInstance.define('wxopeniduser', {
        openid: {
            type: Sequelize.STRING(64),
            primaryKey: true
        },
        platformid: Sequelize.STRING(64),
        user: Sequelize.STRING(128)
    },{
        timestamps: false,
        freezeTableName: true
    });
    //EventService 事件服务
    exports.EventService = sequelizeInstance.define('eventservice', {
        id: {
            type: Sequelize.STRING(64),
            primaryKey: true
        },
        title: Sequelize.STRING(128),
        events: Sequelize.TEXT,
        project: Sequelize.STRING(64),
        description: Sequelize.STRING(255),
        rules: Sequelize.TEXT
    },{
        timestamps: false,
        freezeTableName: true
    });
    //AuthCode 验证码
    exports.AuthCode = sequelizeInstance.define('authcode', {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true
        },
        uid:{
            type: Sequelize.STRING(128),
            primaryKey: true
        },
        authtype: Sequelize.ENUM('SMS'),
        timecreate: Sequelize.BIGINT
    },{
        timestamps: false,
        freezeTableName: true
    });
    //FundDetails 资金流水详单
    exports.FundDetails = sequelizeInstance.define('funddetails', {
        id:{    //流水号
            type: Sequelize.CHAR(46),
            primaryKey: true
        },
        category:{  //交易分类
            type: Sequelize.STRING(32)
        },
        orderno: {  //
            type: Sequelize.STRING(64)
        },
        from: Sequelize.STRING(128),      //来源
        to: Sequelize.STRING(128),
        project: Sequelize.STRING(64),
        chargeid: Sequelize.STRING(64),
        transaction: Sequelize.STRING(128), //设备编号/支付网关流水号
        channelaccount: Sequelize.BIGINT.UNSIGNED,      //渠道账户
        amount: Sequelize.DECIMAL(18, 2),   //操作金额
        balance: Sequelize.DECIMAL(18, 2),  //操作后的账户余额
        proposer: Sequelize.STRING(128),    //申请人
        checker: Sequelize.STRING(128),    //审核人
        operator: Sequelize.STRING(128),    //操作人
        subject: Sequelize.STRING(32),      //标题
        body: Sequelize.STRING(128),
        description: Sequelize.STRING(255),
        metadata: Sequelize.TEXT,
        timecreate: {
            type: Sequelize.BIGINT,
            defaultValue: 0
        },
        timecheck:{
            type: Sequelize.BIGINT,
            defaultValue: 0
        },
        timepaid: {
            type: Sequelize.BIGINT,
            defaultValue: 0
        },
        timereversal:{
            type: Sequelize.BIGINT,
            defaultValue: 0
        },
        status: Sequelize.ENUM('CHECKING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CHECKFAILED')
    },{
        timestamps: false,
        freezeTableName: true
    });
    //Enterprise FundAccount 企业资金账户
    exports.ENTFundAccount = sequelizeInstance.define('entfundaccount', {
        id:{
            type: Sequelize.STRING(64),
            primaryKey: true
        },
        cash: Sequelize.DECIMAL(18, 2), //可提现金额
        frozen: Sequelize.DECIMAL(18, 2)    //冻结金额
    },{
        timestamps: false,
        freezeTableName: true
    });
    //ChannelAccount 渠道账户(银行卡/电子账户)
    exports.ChannelAccount = sequelizeInstance.define('channelaccount', {
        id: {
            type: Sequelize.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        belongto: Sequelize.STRING(64),
        flow: Sequelize.ENUM('EARNING', 'EXPENSE'),   //渠道流向('EARNING'/收入 'EXPENSE'/支出)
        name: Sequelize.STRING(64), //渠道账户名称(古鸽信息有限公司)
        idcard: Sequelize.STRING(20),   //身份证号
        account: Sequelize.STRING(64),  //渠道账户名(银行卡号/支付宝账户)
        type: Sequelize.STRING(32), //渠道类型(支付宝手机/支付宝网页/银联)
        origin: {   //渠道归属(招商银行/支付宝)
            type: Sequelize.STRING(32),
            defaultValue: ''
        },
        subbranch: {    //渠道分支(支行)
            type: Sequelize.STRING(32),
            defaultValue: ''

        },
        locate: {   //渠道地理信息
            type: Sequelize.TEXT,
            defaultValue: '',
            get: function(){
                var locate;
                try{
                    locate = JSON.parse(this.getDataValue('locate'));
                }
                catch(e){
                    locate = {};
                }

                return locate;
            },
            set : function (value) {
                this.setDataValue('locate', JSON.stringify(value));
            }
        },
        reservedmobile: {   //预留手机
            type: Sequelize.STRING(16),
            defaultValue: ''
        },
        linkman: {  //联系人姓名
            type: Sequelize.STRING(16),
            defaultValue: ''
        },
        mobile: {   //联系人手机
            type: Sequelize.STRING(16),
            defaultValue: ''
        },
        proposer: Sequelize.STRING(128),    //申请人账户
        operator: Sequelize.STRING(128),    //审核人账户
        timecreate: Sequelize.BIGINT,   //渠道在我平台创建(申请)时间
        timeenable: Sequelize.BIGINT,   //渠道在我方验证通过时间
        timeexpire: Sequelize.BIGINT,   //渠道账户过期时间
        rate: Sequelize.BIGINT.UNSIGNED,//渠道费率公式
        share: Sequelize.TEXT,          //费率分摊方案{PLT:percent, PRJ:percent, USR:percent}
        amount: Sequelize.DECIMAL(18, 2),   //渠道金额
        status: {
            type: Sequelize.ENUM('FAILED', 'SUCCESS', 'CHECKING'),
            defaultValue: 'CHECKING'
        },     //状态(FAILED/未通过 SUCCESS/通过 CHECKING/审核中)
        reason: Sequelize.TEXT,
        lock: Sequelize.BOOLEAN   //锁定渠道(锁定后无法编辑)
    },{
        timestamps: false,
        freezeTableName: true
    });
    //公式管理
    exports.Formula = sequelizeInstance.define('formula', {
        id: {
            type: Sequelize.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        title: Sequelize.STRING(64), //公式名称
        formula: Sequelize.TEXT,    //计算公式
        desc: Sequelize.TEXT   //公式描述
    },{
        timestamps: false,
        freezeTableName: true
    });
    //银行及费率
    exports.BankInfo = sequelizeInstance.define('bankinfo', {
        id: {
            type: Sequelize.STRING(8),
            primaryKey: true
        },
        title: Sequelize.STRING(64), //银行名称
        earning: Sequelize.BIGINT.UNSIGNED, //充值费率
        expense: Sequelize.BIGINT.UNSIGNED, //支出费率
    }, {
        timestamps: false,
        freezeTableName: true
    });
    //Socities 社会属性
    exports.Socities = sequelizeInstance.define('socities', {
        id: {
            type: Sequelize.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        key: {  //节点键值
            type: Sequelize.STRING(255),
            defaultValue: ''
        },
        parent: {   //父节点ID
            type: Sequelize.BIGINT.UNSIGNED,
            defaultValue: 0
        },
        path: { //节点ID全路径
            type: Sequelize.STRING(255),
            defaultValue: ''
        },
        project: {
            type: Sequelize.STRING(64),
            primaryKey: true
        },
        title: {
            type: Sequelize.STRING(255),
            defaultValue: ''
        },
        type: {
            type: Sequelize.ENUM('NODE','DEV'),
            defaultValue: 'NODE'
        },
        category: {
            type: Sequelize.ENUM('TOPOLOGY'),
            defaultValue: 'TOPOLOGY'
        }
    },{
        timestamps: false,
        freezeTableName: true
    });
    //套餐计划
    exports.PackagePlan = sequelizeInstance.define('packageplan', {
        id: {
            type: Sequelize.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        title: Sequelize.STRING(64), //套餐名称
        project: Sequelize.STRING(64),  //项目ID
        price: {    //套餐购买价格
            type:Sequelize.DECIMAL(18,2),
            defaultValue: 0.0
        },
        rent: { //套餐租金(指定周期内的计费规则)
            type: Sequelize.TEXT,
            get: function(){
                var rent;
                try{
                    rent = JSON.parse(this.getDataValue('rent'));
                }
                catch(e){
                    rent = {};
                }

                return rent;
            },
            set : function (value) {
                this.setDataValue('rent', JSON.stringify(value));
            }
        },
        value: {    //套餐价值(购买后产生的价值)
            type: Sequelize.DECIMAL(18,2),
            defaultValue: 0.0
        },
        //计费周期配置
        month: {
            type: Sequelize.INTEGER,
            defaultValue: 0
        },  //月
        day: Sequelize.INTEGER,  //日
        week: Sequelize.INTEGER,  //周
        hour: Sequelize.INTEGER,  //小时
        minute: Sequelize.INTEGER,  //分钟
        /*
         * 套餐类型
         * PROPERTYFEE: 物业费
         * PARKINGFEE: 停车费
         * */
        type: Sequelize.ENUM('PROPERTYFEE', 'PARKINGFEE'),
    }, {
        timestamps: false,
        freezeTableName: true
    });
    //用户套餐
    exports.UserPackage = sequelizeInstance.define('userpackage', {
        uid: {
            type: Sequelize.STRING(128),
            primaryKey: true
        },
        packageplan: {
            type: Sequelize.BIGINT.UNSIGNED,
            primaryKey: true
        },
        value: {
            type: Sequelize.BIGINT,
            defaultValue: 0
        },
        from: {
            type: Sequelize.BIGINT,
            defaultValue: 0
        },
        to: {
            type: Sequelize.BIGINT,
            defaultValue: 0
        }
    }, {
        timestamps: false,
        freezeTableName: true
    });
    //数据协议
    exports.DataProtocol = sequelizeInstance.define('dataprotocol', {
        id: {
            type: Sequelize.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        key: {
            type: Sequelize.STRING(32)
        },
        type:{
            type: Sequelize.INTEGER
        },
        mType:{
            type: Sequelize.INTEGER
        },
        ext:{
            type: Sequelize.STRING(8)
        },
        code:{
            type: Sequelize.STRING(128),
            defaultValue: ''
        },
        name:{
            type: Sequelize.STRING(64),
            defaultValue: ''
        },
        devicetype:{
            type: Sequelize.TEXT
        }
    }, {
        timestamps: false,
        freezeTableName: true,
        indexes:[
            {
                name: 'key',
                method: 'BTREE',
                fields: ['key']
            },
            {
                name: 'type',
                method: 'BTREE',
                fields: ['type']
            }
        ]
    });
    //数据协议通道
    exports.DataProtocolChannel= sequelizeInstance.define('dataprotocolchannel', {
        dpid: {//数据协议ID
            type: Sequelize.INTEGER.UNSIGNED,
            primaryKey: true
        },
        code: {   //
            type: Sequelize.STRING(128),
            primaryKey: true
        },
        emchannel:{ //平台定义的通道ID
            type: Sequelize.CHAR(3)
        }
    }, {
        timestamps: false,
        freezeTableName: true
    });
    //平台设备类型
    exports.DeviceType= sequelizeInstance.define('devicetype', {
        id:{
            type: Sequelize.BIGINT.UNSIGNED,
            autoIncrement: true,
            primaryKey: true
        },
        name: {
            type: Sequelize.STRING(16),
            defaultValue: ''
        },
        key: {
            type: Sequelize.STRING(32),
            defaultValue: ''
        },
        code:{
            type: Sequelize.STRING(8),
            defaultValue: ''
        },
        channelids:{
            type: Sequelize.TEXT,
            get: function(){
                var channelids;
                try{
                    channelids = JSON.parse(this.getDataValue('channelids'));
                }
                catch(e){
                    channelids = {};
                }

                return channelids;
            },
            set : function (value) {
                this.setDataValue('channelids', JSON.stringify(value));
            }
        },
        measure:{
            type: Sequelize.TEXT,
            get: function(){
                var measure;
                try{
                    measure = JSON.parse(this.getDataValue('measure'));
                }
                catch(e){
                    measure = {};
                }

                return measure;
            },
            set : function (value) {
                this.setDataValue('measure', JSON.stringify(value));
            }
        }
    }, {
        timestamps: false,
        freezeTableName: true
    });
    //设备分项类型
    exports.SubentryType= sequelizeInstance.define('subentrytype', {
        id:{
            type: Sequelize.STRING(32),
            primaryKey: true
        },
        name: {
            type: Sequelize.STRING(16),
            defaultValue: ''
        },
        code: {
            type: Sequelize.STRING(16),
            defaultValue: ''
        },
        standcol:{
            type: Sequelize.DECIMAL(8,4),
            defaultValue: 1.0
        }
    }, {
        timestamps: false,
        freezeTableName: true
    });
    //
    exports.ChannelDefine= sequelizeInstance.define('channeldefine', {
        id:{
            type: Sequelize.STRING(3),
            primaryKey: true
        },
        name: {
            type: Sequelize.STRING(16),
            defaultValue: ''
        },
        measure:{
            type: Sequelize.BOOLEAN,
            defaultValue: false
        },
        persist:{
            type: Sequelize.BOOLEAN,
            defaultValue: false
        },
        unit:{
            type: Sequelize.STRING(8),
            defaultValue: ''
        }
    }, {
        timestamps: false,
        freezeTableName: true
    });
    //SensorCommandQueue 传感器命令队列
    exports.SensorCommandQueue = sequelizeInstance.define('sensorcommandqueue', {
        id: {
            type: Sequelize.BIGINT.UNSIGNED,
            autoIncrement: true,
            primaryKey: true
        },
        uid: {
            type: Sequelize.STRING(16),
            allowNull: false
        },
        status: {
            type: Sequelize.STRING(8),
            allowNull: false
        },
        meterid: {
            type: Sequelize.STRING(4),
            allowNull: false
        },
        buildingid: {
            type: Sequelize.STRING(10),
            allowNull: false
        },
        gatewayid: {
            type: Sequelize.STRING(2),
            allowNull: false
        },
        addrid: {
            type: Sequelize.STRING(14),
            allowNull: false
        },
        command: {
            type: Sequelize.TEXT,
            get: function(){
                const command = this.getDataValue('command');

                let parseJSON = {};
                try {
                    parseJSON = JSON.parse(command);
                }
                catch (e) {
                    parseJSON = command;
                }

                return parseJSON;
            },
            set : function (value) {

                if(typeof(value) === 'string'){
                    this.setDataValue('command', value);
                }
                else {
                    this.setDataValue('command', JSON.stringify(value));
                }
            }
        },
        retry: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        auid: {
            type: Sequelize.STRING(128),
            allowNull: false
        },
        code: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        reqdata: {
            type: Sequelize.TEXT,
            get: function(){
                const reqdata = this.getDataValue('reqdata');
                if(typeof(reqdata) === 'string'){
                    return reqdata;
                }
                else {
                    let parseJSON = {};
                    try {
                        parseJSON = JSON.parse(reqdata);
                    }
                    catch (e) {
                        parseJSON = {};
                    }

                    return parseJSON;
                }
            },
            set : function (value) {

                if(typeof(value) === 'string'){
                    this.setDataValue('reqdata', value);
                }
                else {
                    this.setDataValue('reqdata', JSON.stringify(value));
                }
            }
        },
        respdata: {
            type: Sequelize.TEXT,
            get: function(){
                const respdata = this.getDataValue('respdata');
                if(typeof(respdata) === 'string'){
                    return respdata;
                }
                else {
                    let parseJSON = {};
                    try {
                        parseJSON = JSON.parse(respdata);
                    }
                    catch (e) {
                        parseJSON = {};
                    }

                    return parseJSON;
                }
            },
            set : function (value) {
                if(typeof(value) === 'string'){
                    this.setDataValue('respdata', value);
                }
                else {
                    this.setDataValue('respdata', JSON.stringify(value));
                }
            }
        },
        timecreate: {
            type: Sequelize.BIGINT,
            allowNull: false
        },
        timeprocess: {
            type: Sequelize.BIGINT,
            allowNull: false,
            defaultValue: 0
        },
        timedone: {
            type: Sequelize.BIGINT,
            allowNull: false,
            defaultValue: 0
        }
    },{
        timestamps: false,
        freezeTableName: true
    });
    //
    exports.CollectorMonitor= sequelizeInstance.define('collectormonitor', {
        id:{
            type: Sequelize.STRING(20),
            primaryKey: true,
            allowNull: false
        },
        hardware:{
            type: Sequelize.STRING(32),
            defaultValue:'',
            allowNull: false
        },
        software:{
            type: Sequelize.STRING(32),
            defaultValue:'',
            allowNull: false
        },
        ip:{
            type: Sequelize.STRING(30),
            defaultValue: '',
            allowNull: false
        },
        port:{
            type: Sequelize.INTEGER,
            defaultValue: 0,
            allowNull: false
        },
        timecreate:{
            type: Sequelize.BIGINT.UNSIGNED,
            defaultValue: 0,
            allowNull: false
        },
        lastupdate:{
            type: Sequelize.BIGINT.UNSIGNED,
            defaultValue: 0,
            allowNull: false
        },
        enable:{
            type: Sequelize.BOOLEAN,
            defaultValue: 0,
            allowNull: false
        },
        ext:{
            type: Sequelize.TEXT,
            get: function(){
                let ext;
                try{
                    ext = JSON.parse(this.getDataValue('ext'));
                }
                catch(e){
                    ext = {};
                }

                return ext;
            },
            set : function (value) {
                this.setDataValue('ext', JSON.stringify(value));
            }
        }
    }, {
        timestamps: false,
        freezeTableName: true
    });
    exports.VendorAccounts = sequelizeInstance.define('vendorAccounts', {
        id:{
            type: Sequelize.BIGINT.UNSIGNED,
            autoIncrement:true,
            primaryKey: true
        },
        projectId:{
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
        },
        vendorProject:{
            type: Sequelize.STRING(255),
            allowNull: false,
        },
        loginURL:{
            type: Sequelize.STRING(255),
            allowNull: false,
        },
        username:{
            type: Sequelize.STRING(32),
            allowNull: false,
        },
        password:{
            type: Sequelize.STRING(255),
            allowNull: false,
        },
        memo:{
            type: Sequelize.TEXT   //备注
        },
    },{
        timestamps: true,
        freezeTableName: true
    });
    //添加对天气数据的存储。直接存储。
    exports.weather2 = sequelizeInstance.define('weather2', {
        id:{
            type: Sequelize.BIGINT.UNSIGNED,
            autoIncrement:true,
            primaryKey: true
        },
        projectId:{
            type: Sequelize.STRING(255),
            allowNull: false,
        },
        uerkey:{
            type: Sequelize.STRING(255)
        },
        temp:{
            type: Sequelize.FLOAT(5,2)
        },
        humi:{
            type: Sequelize.FLOAT(5,2)
        },
        dew:{
            type: Sequelize.FLOAT(5,2)
        },
        atmos:{
            type: Sequelize.FLOAT(5,2)
        },
        radia:{
            type: Sequelize.FLOAT(5,2)
        },
        windspeed:{
            type: Sequelize.FLOAT(5,2)
        },
        winddir:{
            type: Sequelize.FLOAT(5,2)
        },
        date:{
            type: Sequelize.BIGINT.UNSIGNED
        },
        addtime:{
            type: Sequelize.DATE
        }
    },{
        timestamps: false,
        freezeTableName: true,
        tableName: 'weather2'
    });
    //添加对天气数据的存储。直接存储。
    exports.airdata = sequelizeInstance.define('airdata', {
        id:{
            type: Sequelize.BIGINT.UNSIGNED,
            autoIncrement:true,
            primaryKey: true
        },
        projectId:{
            type: Sequelize.STRING(255),
            allowNull: false,
        },
        building:{
            type: Sequelize.STRING(40),
            allowNull: false,
        },
        sn:{
            type: Sequelize.STRING(255),
        },
        mill:{
            type: Sequelize.STRING(40),
        },
        temp:{
            type: Sequelize.FLOAT(5,2)
        },
        humi:{
            type: Sequelize.FLOAT(5,2)
        },
        co2:{
            type: Sequelize.FLOAT(5,2)
        },
        tvoc:{
            type: Sequelize.FLOAT(5,2)
        },
        tvoc2:{
            type: Sequelize.FLOAT(3,3)
        },
        hcho:{
            type: Sequelize.FLOAT(5,2)
        },
        hcho2:{
            type: Sequelize.FLOAT(3,3)
        },
        pm2d5:{
            type: Sequelize.FLOAT(5,2)
        },
        pm10:{
            type: Sequelize.FLOAT(5,2)
        },

        addtime:{
            type: Sequelize.DATE
        }
    },{
        timestamps: false,
        freezeTableName: true,
        tableName: 'airdata'
    });


}

//支付日志
function PaymentLog()
{}
exports.PaymentLog = new PaymentLog();


exports.GenerateFundID = function(uid)
{
    var now = moment();
    var timePrefix = now.format('YYYYMMDDHHmmss');   //14位时间
    var suffix = UUID.v4(uid+timePrefix).replace(/-/g, '');

    return timePrefix + suffix;
};

//充值日志
function FundDetailsLog()
{}
//FundDetailsLog.prototype.Create = function(category, from, to, proposer, operator, project, channelAccount, details)
FundDetailsLog.prototype.Create = function(details)
{
    var deferred = Q.defer();

    if(_.isEmpty(details)){
        return null;
    }

    if(!details.category || !details.category.length){
        console.error('FundDetailsLog::Create category is invalid: ', details);
        return null;
    }

    if(details.metadata && _.isObject(details.metadata)){
        details.metadata = JSON.stringify(details.metadata);
    }
    var timeQuantum = moment();

    var from = details.from || '';
    var to = details.to || '';

    var id = MySQL.GenerateFundID(from+to);
    var createLog = {
        id: id,
        category: details.category,
        orderno: details.order_no || '',
        from: details.from || '',
        to: details.to || '',
        project: details.project,
        chargeid: details.id || '',
        transaction: details.transaction || '',
        channelaccount: details.channelaccount || '',
        amount: details.amount,
        balance: details.balance,
        proposer: details.proposer,
        checker: details.checker || '',
        operator: details.operator || '',
        subject: details.subject || '',
        body: details.body,
        metadata: details.metadata || '',
        description: details.description || '',
        timecreate: details.timecreate || timeQuantum.unix(),
        timepaid: details.timepaid || 0,
        status: details.status || Finance.FlowStatus.Checking
    };
    console.log('FundDetails create: ', createLog);
    exports.FundDetails.create(createLog).then(
        function (result) {
            deferred.resolve(result);
        }, function (err) {
            console.error('FundDetailsLog Error: ', err, createLog);
            deferred.reject(err);
        }
    );

    return deferred.promise;
};
FundDetailsLog.prototype.Paid = function(chargeObj)
{
    var deferred = Q.defer();

    var paidObj = {
        timepaid: chargeObj.time_paid,
        transaction: chargeObj.transaction_no,
        status: chargeObj.status || Finance.FlowStatus.Success
    };
    if(chargeObj.balance != null || chargeObj.balance != undefined){
        paidObj.balance = chargeObj.balance;
    }
    if(chargeObj.operator){
        paidObj.operator = chargeObj.operator;
    }

    var where = {
        orderno: chargeObj.order_no,
        to: chargeObj.to
    };

    console.debug('FundDetailLog::Paid: ', paidObj, where);
    exports.FundDetails.update(paidObj, {
        where:where
    }).then(
        function (result) {
            deferred.resolve();
        }, function (err) {
            deferred.reject(err);
        }
    );

    return deferred.promise;
};
FundDetailsLog.prototype.Reversal = function(order_no, timereversal)
{
    var deferred = Q.defer();

    var reversalObj = {
        timereversal: timereversal
    };
    exports.FundDetails.update(reversalObj, {
        where:{
            orderno: order_no
        }
    }).then(
        function (result) {
            deferred.resolve();
        }, function (err) {
            deferred.reject(err);
        }
    );

    return deferred.promise;
};
exports.FundDetailsLog = new FundDetailsLog();

//获取数据表名称
exports.DataCollectionName = function (time)
{
    return "daily" + time.format("YYYYMM");
};
//获取计费日志表名称
exports.PaymentTableName = function (time)
{
    return "paymentlog"+ time.format("YYYYMM");
};

//获取24小时数据用于计费
exports.SQLOfHourData = function ()
{
    var sqlArray = [];
    for(var i=0;i<24;i++){
        //var dataMatch = i < 9 ? '0'+i : i;
        //var sql = "SUM(CASE DATE_FORMAT(FROM_UNIXTIME(timepoint), '%H') WHEN '"+dataMatch+"' THEN `value` END) AS hour"+i;
        var sql = "SUM(`hour."+i+"`) AS hour"+i;
        sqlArray.push(sql);
    }
    return sqlArray.toString();
};
//获取总能耗
exports.SQLOfTotalData = function()
{
    var sqlArray = [];
    for(var i=0;i<24;i++){
        var sql = "SUM(`hour."+i+"`)";
        sqlArray.push(sql);
    }
    return sqlArray.toString().replace(/,/g, '+')
};

//获取可计费传感器判断条件
exports.AccumulationSensor = function ()
{
    var rulesSet = [];
    var channelList = ChannelMapping.list();
    _.each(channelList, function (channel) {
        if(channel.isAccumulation){
            rulesSet.push(channel.id);
        }
    });
    return rulesSet;
};

/*
 * 数组转换成 SQL 语句 IN 适用的
 * */
exports.GenerateSQLInArray = function(array)
{
    var idsArray = [];
    _.each(array, function (id) {
        idsArray.push("'"+id+"'");
    });
    return idsArray.toString();
};

/*
 * 组成SQL语句
 * */
exports.GenerateSQL = function(sql, queryArray)
{
    var sqlSentence = sql;
    if(queryArray.length){

        sqlSentence += " WHERE ";
        _.each(queryArray, function (query, index) {
            if(index){
                sqlSentence += " AND ";
            }
            sqlSentence += query;
        });
    }

    return sqlSentence;
};

/*
* 获取纯数据
* */
exports.Plain = function (data)
{
    return data.get({plain: true})
};

exports.PERMINUTE = 'PERMINUTE';
exports.PERDAY = 'PERDAY';
exports.PERWEEK = 'PERWEEK';
exports.PERMONTH = 'PERMONTH';
exports.PERYEAR = 'PERYEAR';
