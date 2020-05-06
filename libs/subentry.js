/**
 * 分项类型
 */

var moment = require('moment');
var _ = require('underscore');

class SubentryCache{
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
        MySQL.SubentryType.findAll({
            where: {
            }
        }).then(
            subentries=>{
                var mapping = {};
                subentries.map(entry=>{
                    mapping[entry.id] = MySQL.Plain(entry);
                });

                _this.mapping = mapping;

                log.info('subentry reload at: ', _this.lastupdate);
            },
            err=>{
                log.error('failed load subentry:', err);
            }
        );
    }
    match (key)
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
    kgce (key, val)
    {
        var obj = this.mapping[key];
        if(!obj){
            return null;
        }
        return {
            name: obj.name,
            kgce: obj.standcol * val
        };
    }
    isElectricity(key)
    {
        var obj = this.mapping[key];
        if(!obj){
            return false;
        }
        return obj.code.substr(0,2) == '01';
    }
    isWater(key)
    {
        var obj = this.mapping[key];
        if(!obj){
            return false;
        }
        return obj.code.substr(0,2) == '02';
    }
}
var subentryCache = new SubentryCache();

module.exports = exports = subentryCache;