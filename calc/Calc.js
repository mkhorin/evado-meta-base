/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

// ["$+", ".attrName", 22, ...]
// ["$*", ".attrName", ["$-", 33, ".attrName"]]
// ["$class", "._class"] // resolve class title
// ["$join", "separator", ".towns", ... ]
// ["$map", "toUpperCase", ".towns", ...]
// ["$method", "toLowerCase", "value", ...arguments] // execute value method
// ["$model", "attrName"]
// ["$moment", "$now", "format", "MM-DD"]
// ["$duration", "value", "seconds", "humanize"]
// ["$now"] // current datetime
// ["$raw", "$user"] // output as is
// ["$round", ".attrName", precision]
// ["$class", "className"] // class title
// ["$state", "stateName"] // state title
// ["$master", "attrName"]
// ["$user"] // current user ID
// ["$user.attrName"] // current user attribute
// ["$user.methodName"] // current user method
// ["$user.meta.base.className"] // find object by {user: currentUserId}
// ["$placeholder", "empty", "value"] // empty instead of null/undefined/'' value
// ["$replace", "source", "target", "value"] // if value is source then replace with target
// ["$related", ...] // see CalcRelated
// ["$query", ...] // see CalcQuery
// ["$count", "viewName.className", [condition]]
// ["$custom", {"Class": "component/meta/calc/CustomCalcToken"}]

// SHORT STRING EXPRESSION

// "$class.className"
// "$now"
// "$moment.$now.format.MM-DD"
// "$user"

// see CalcToken for operations

const Base = require('areto/base/Base');

module.exports = class Calc extends Base {

    static prepareConfiguration (data, view) {
        if (!data) {
            return null;
        }
        const module = view.meta.module;
        return ClassHelper.resolveSpawn(data, module, {module}, {Class: this});
    }

    constructor (config) {
        super(config);
        this.init();
    }

    init () {
        this.language = this.view.meta.getLanguage();
        this.token = this.createToken(this.data);
        this.resolve = this.resolveToken;
    }

    getClass (id) {
        return this.view.meta.getClass(id);
    }

    getView (id) {
        return this.view.meta.getView(id);
    }

    createToken (data, config) {
        data = this.normalizeData(data);
        return ClassHelper.spawn(this.getTokenClass(data), {
            ...config,
            calc: this,
            view: this.view,
            data
        });
    }

    normalizeData (data) {
        return typeof data === 'string' && data.indexOf('$') === 0 ? data.split('.') : data;
    }

    getTokenClass (data) {
        if (Array.isArray(data)) {
            switch (data[0]) {
                case '$condition': return CalcCondition;
                case '$count': return CalcCount;
                case '$custom': return this.getCustomTokenClass(data[1]);
                case '$dependency': return CalcDependency;
                case '$related': return CalcRelated;
                case '$query': return CalcQuery;
                case '$user': return CalcUser;
            }
        }
        return CalcToken;
    }

    getCustomTokenClass (data) {
        try {
            return ClassHelper.resolveSpawn(data, this.view.meta.module);
        } catch (err) {
            this.log('error', 'Invalid custom configuration', err);
        }
    }

    resolveToken () {
        return this.token.resolve(...arguments);
    }

    log () {
        CommonHelper.log(this.view, this.constructor.name, ...arguments);
    }
};

const ClassHelper = require('areto/helper/ClassHelper');
const CommonHelper = require('areto/helper/CommonHelper');
const CalcToken = require('./CalcToken');
const CalcDependency = require('./CalcDependency');
const CalcCondition = require('./CalcCondition');
const CalcQuery = require('./CalcQuery');
const CalcRelated = require('./CalcRelated');
const CalcCount = require('./CalcCount');
const CalcUser = require('./CalcUser');