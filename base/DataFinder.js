/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('evado/component/base/DataFinder');

module.exports = class DataFinder extends Base {

    createQuery () {
        return this.view.createQuery(...arguments);
    }
};