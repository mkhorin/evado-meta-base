/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 *
 * Examples of calculated expressions
 * See CalcToken for operations
 *
 * ["$+", ".attrName", 22, ...]
 * ["$*", ".attrName", ["$-", 33, ".attrName"]]
 * ["$class", "._class"] - resolve class title
 * ["$join", "separator", ".towns", ...]
 * ["$map", "toUpperCase", ".towns", ...]
 * ["$method", "toLowerCase", "value", ...arguments] - Execute value method
 * ["$model", "attrName"]
 * ["$moment", "$now", "format", "MM-DD"]
 * ["$duration", "value", "seconds", "humanize"]
 * ["$now"] - Current datetime
 * ["$raw", "$user"] - Output as is
 * ["$round", ".attrName", precision]
 * ["$class", "className"] - Class title
 * ["$state", "stateName"] - State title
 * ["$master", "attrName"]
 * ["$user"] - Current user ID
 * ["$user.attrName"] - Current user attribute
 * ["$user.methodName"] - Current user method
 * ["$user.meta.base.className"] - Find className object by {user: currentUserId}
 * ["$placeholder", "placeholder", "value"] - Set placeholder if value is empty
 * ["$replace", "source", "target", "value"] - If value is source then replace with target
 * ["$related", ...] - See CalcRelated
 * ["$query", ...] - See CalcQuery
 * ["$count", "viewName.className", [condition]]
 * ["$custom", {"Class": "component/meta/calc/CustomCalcToken"}]
 *
 * Shortcut expressions
 *
 * "$class.className"
 * "$now"
 * "$moment.$now.format.MM-DD"
 * "$user"
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class Calc extends Base {

    static prepareSpawn (data, view) {
        if (data) {
            const module = view.meta.module;
            return ClassHelper.resolveSpawn(data, module, {module}, {Class: this});
        }
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
        if (typeof data !== 'string') {
            return data;
        }
        const first = data.charAt(0);
        if (first === '$') {
            return data.split('.');
        }
        if (first === '.' && data.length > 1) {
            data = data.split('.');
            data[0] = '$attr';
        }
        return data;
    }

    getTokenClass (data) {
        if (Array.isArray(data)) {
            switch (data[0]) {
                case '$attr': return CalcAttr;
                case '$condition': return CalcCondition;
                case '$count': return CalcCount;
                case '$custom': return this.getCustomTokenClass(data[1]);
                case '$dependency': return CalcDependency;
                case '$descendants': return CalcDescendants;
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
const CalcAttr = require('./CalcAttr');
const CalcToken = require('./CalcToken');
const CalcDependency = require('./CalcDependency');
const CalcDescendants = require('./CalcDescendants');
const CalcCondition = require('./CalcCondition');
const CalcQuery = require('./CalcQuery');
const CalcRelated = require('./CalcRelated');
const CalcCount = require('./CalcCount');
const CalcUser = require('./CalcUser');