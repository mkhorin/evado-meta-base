/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class Transit extends Base {

    getResultState () {
        return this.transition.getFinalStateName();
    }

    async execute () {
        // place transit code here
        return this.getResultState();
    }
};