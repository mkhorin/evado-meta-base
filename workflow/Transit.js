/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class Transit extends Base {

    run () {
        // place code here
    }

    getResultState () {
        return this.transition.getFinalStateName();
    }

    async execute () {
        await this.run();
        return this.getResultState();
    }
};