/*
* 全局常量定义
* */
var config = require('config');
var moment = require('moment');
var _ = require('underscore');

module.exports = exports = function(){};

exports.Status = {
    DEBUG: 'DEBUG',
    ONLINE: 'ONLINE',
};

exports.Const = {
    DefaultCOMI: 'd*1',
    DefaultFreq: 1800
};

exports.EquipmentStatus = {
    OK: 0,
    DataException: 1,
    CommunicateException: 2
};

exports.FinanceEntity = {
    PRJ: 'PRJ',
    PLT: 'PLT',
    USR: 'USR'
};

exports.Channel = {
    alipay: {
        type: 'alipay',
        origin: '支付宝'
    },
    wx: {
        type: 'wx',
        origin: '微信'
    },
    wx_pub: {
        type: 'wx_pub',
        origin: '微信公众号'
    }
};

exports.App = {
    'KJ': 'KJ',     //快缴
    'ZFT': 'ZFT',   //租付通
    'EWP': 'EWP'    //EnergyManage Wx pub
};

exports.ApartmentStatus = {
    IDLE: 0,    //空置
    USE: 1,     //占用
};

exports.ProjectSectors = {
  SPORT: '体育建筑',
  CBD: '综合建筑',
  HOSPITAL: '医疗卫生建筑',
  HOTEL: '宾馆饭店建筑',
  MARKET: '商场建筑',
  OFFICE: '办公建筑',
  TEACH: '文化教育建筑',
  OTHER: '其它建筑',
};

exports.ProjectSource = {
    'SELF': '自有',
    'AGENT': '代理商',
    'FACTORY': '厂家',
    'INTEG': '集成商',
    'RUNOP': '运营方',
    'NMKT': '网络销售',
};

exports.ProjectType = {
    'BASIC': '计量基础版',
    'ANALYSIS': '能源计量分析版本'
};

exports.ProjectModules = {
    'dashboard': '首页',
    'devices': '设备管理',
    'map': '能耗地图',
    'grid_monitor': '电网监控',
    'water_monitor': '水网监控',
    'statistics': '统计报表',
    'statisticsRegion': '区域统计报表',
    'presentation': '首页投屏',
    'analysis': '综合分析',
    'analysis_energy': '能耗分析',
    'analysis_subentry': '分项用能',
    'analysis_daynight': '日夜间',
    'analysis_building': '建筑分析',
    'analysis_department': '部门分析',
    'information': '信息概览',
    'building': '建筑管理',
    'account': '账号管理',
    'collector': '管理器',
    'billingservice': '计费策略',
    'byitem': '分项用能',
    'node': '建筑结构',
    'bybuilding': '建筑属性',
    'byapart': '部门属性',
}

exports.ApartmentStatus = {
    IDLE: 0,    //空置
    USE: 1,     //占用
};

exports.ThirdPartBill = {
    'CLOSE':'CLOSE',
    'PRE': 'PRE',
    'BILL': 'BILL'
};

exports.Analysis = {
    ByItem: 'BYITEM',
    ByCategory: 'BYCATEGORY',
    ByAnalysis: 'BYANALYSIS',
    ByApart: 'BYAPART',
    ByBuilding: 'BYBUILDING'
};

exports.TimeType = {
    DAY: 'DAY',
    WEEK: 'WEEK',
    MONTH: 'MONTH',
    YEAR: 'YEAR'
};

exports.ProjectStatus = {
    DEBUG: 'DEBUG',
    ONLINE: 'ONLINE',
};