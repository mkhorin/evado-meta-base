/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 *
 * ["$user"] - current user ID
 * ["$user.attrName"] - current user attribute
 * ["$user.methodName"] - current user method
 * ["$user.meta.base.className"] - find object by {user: currentUserId}
 */
'use strict';

const Base = require('./CalcToken');

module.exports = class CalcUser extends Base {

    prepareResolvingMethod () {
        const items = this.data.slice(1);
        if (!items.length) {
            return this.resolveUser;
        }
        const item = items[0];
        if (item === 'meta') {
            return this.prepareDataFinder(items);
        }
        const User = this.calc.view.meta.hub.User;
        if (typeof User.prototype[item] === 'function') {
            this._userMethod = item;
            return this.resolveUserMethod;
        }
        this._userAttr = item;
        return this.resolveUserAttr;
    }

    prepareDataFinder (items) {
        this._dataFinder = this.calc.view.meta.hub.createDataFinder(items.slice(1));
        if (this._dataFinder) {
            return this.resolveDataFinder;
        }
        this.log('error', `Invalid data finder: ${items.join('.')}`);
        return this.resolveStatic;
    }

    resolveUser (data) {
        return data.user.getId();
    }

    resolveUserAttr (data) {
        return data.user.get(this._userAttr);
    }

    resolveUserMethod (data) {
        return data.user[this._userMethod]();
    }

    resolveDataFinder (data) {
        return this._dataFinder.execute({
            condition: {
                user: data.user.getId()
            }
        });
    }
};