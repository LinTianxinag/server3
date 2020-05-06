var _ = require('underscore');

/*
 * 常量类型定义
 * */

global.MaterialType = {
    MIX: 'MIX', //图文混合
    PIC: 'PIC', //图片
    VOICE: 'VOICE', //语音
    VIDEO: 'VIDEO', //视频
};

/*
 * 交互类型
 * 当前类型范围 0~65535
 * 分为8个段
 * 当前只用到4个段,分别是 事件,通知,报警,实时
 *
 * 枚举值段    类型   前缀
 *
 * 1~1024:    保留
 * 1025~2048: 实时   RLT
 * 2049~3072: 保留
 * 3073~4096: 报警   ALT
 * 4097~5120: 保留
 * 5121~6144: 通知   NTF
 * 6145~7168: 保留
 * 7169~8192: 事件   EVT
 * */
var InteractiveType = {
    EVT_SUGGEST: 1080, //建议   文本内容
    EVT_MAINTAINANCE: 1081,    /*
     报修
     uid: 报修账户ID,
     title: 标题,
     content: 报修内容,
     locate: 位置
     */

    NTF_CONTROLAUTH: 5100,

    NTF_TEXTNOTIFY: 5200,    //文字通知  文本内容
    NTF_MATRIALNOTIFY: 5201,    //素材通知   素材ID

    NTF_BALANCEINSUFFICIENT: 5300,  /*
     余额不足
     id: 用户ID
     */
    NTF_ACCOUNTARREARS: 5301,       /*
     账户欠费
     id: 用户ID,
     project: 项目ID
     */
    NTF_PROJECTARREARS: 5302,   /*
     */
    NTF_ARREARSSTOPSERVICES: 5303,  /*
     欠费停止服务
     id: 用户ID
     */
    NTF_ARREARSRESUMESERVICES: 5304,    /*
     欠费恢复服务
     id: 用户ID
     */
    NTF_ACCOUNTCREATE: 5305,    /*
     账户开通
     id: 用户ID
     */
    NTF_WITHDRAWAPPLY: 5306,     /*
     提现支出
     id: 财务用户ID,
     project: 项目ID
     */
    NTF_RECHARGING: 5307,     /*
     充值成功
     id: 商户ID,
     project: 项目ID,
     flowid: 流水ID
     */
    NTF_APPUPGRADE: 5308,   /*
     APP升级
     info: 升级信息
     */
    NTF_PLTUPGRADE: 5309,       /*
     平台升级维护
     info: 升级维护信息
     */
    NTF_REMINDRECHARGE: 5310,   /*
     催缴费用
     id: 商户ID,
     project: 项目ID
     */

    /*
     * 日/月消耗账单
     * account: 账户ID,
     * project: 项目ID,
     * balance: {
     *   from: 账户初期余额,
     *   to: 账户末期余额,
     * },
     * consumption: {  //消耗项
     *   category:[
     *       {
     *           amount: 消耗金额,
     *           type: 消耗分类,
     *           name: 消耗分类名称
     *       }
     *   ]
     * }
     * */
    NTF_USERDAILYREPORT: 5600,     //用户日账单
    NTF_USERMONTHLYREPORT: 5601,   //用户月账单

    /*
     * 综合日/月报表
     * project: 项目ID,
     * data: dailyfundsummary/monthlyfundsummary 接口返回值
     * file: 附件文件名
     * */
    NTF_PROJECTDAILYREPORT: 5602,       //物业日报表
    NTF_PROJECTMONTHLYREPORT: 5603,     //物业月报表


    /*
     设备异常
     project: 项目ID,
     devices: [
     {
     deviceid: 设备ID,
     type: 异常类型
     }
     ]
     */
    ALT_DEVICEEXCEPTION: 3400,

};

module.exports = exports = InteractiveType;

exports.FindKey = function (value) {
    var item = _.find(InteractiveType, function (v) {
        return v == value;
    });

    return item;
};
