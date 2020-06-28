/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./CalcToken');

module.exports = class CalcUser extends Base {

    prepareResolvingMethod () {
        const items = this.data.slice(1);
        if (!items.length) {
            return this.resolveUser;
        }
        if (items[0] !== 'meta') {
            this.log('error', 'Invalid user data');
            return this.resolveStatic;
        }
        this._dataFinder = this.calc.view.meta.hub.createDataFinder(items.slice(1));
        if (!this._dataFinder) {
            this.log('error', 'Invalid data finder');
            return this.resolveStatic;
        }
        return this.resolveUserData;
    }

    resolveUser (data) {
        return data.user.getId();
    }

    resolveUserData (data) {
        return this._dataFinder.execute({
            condition: {user: data.user.getId()}
        });
    }
};