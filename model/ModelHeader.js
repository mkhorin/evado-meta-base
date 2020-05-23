/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class ModelHeader extends Base {

    data = {};

    get (attr) {
        attr = attr.name || attr;
        return Object.prototype.hasOwnProperty.call(this.data, attr)
            ? this.data[attr]
            : this.model.get(attr);
    }

    resolve () {
        if (this.model.view.header) {
            this.model.view.header.resolve(this.model);
        }
        return this.toString();
    }

    toString () {
        if (this.value) {
            return String(this.value);
        }
        const id = this.model.getId();
        return id ? String(id) : '';
    }
};