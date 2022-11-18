/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 *
 * [".$self"] - alias for current attribute name
 * [".$self.nestedAttrName"]
 */
'use strict';

const Base = require('./Header');

module.exports = class AttrHeader extends Base {

    init () {
        this.name = this.owner.name;
        super.init();
    }

    prepareData (data) {
        data = this.replaceSelfAttr(data);
        return super.prepareData(data);
    }

    replaceSelfAttr (text) {
        return typeof text === 'string'
            ? text.replace('$self', this.name)
            : text;
    }
};