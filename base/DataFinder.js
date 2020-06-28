/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('evado/component/base/DataFinder');

module.exports = class DataFinder extends Base {

    find () {
        return this.view.find(...arguments);
    }
};