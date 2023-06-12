/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class ModelHeader extends Base {

    data = {};

    has (attr) {
        return Object.hasOwn(this.data, attr.name || attr);
    }

    get (attr) {
        attr = attr.name || attr;
        return Object.hasOwn(this.data, attr)
            ? this.data[attr]
            : this.model.get(attr);
    }

    resolveAttr (attr) {
        if (!attr.name) {
            attr = this.model.view.getAttr(attr);
        }
        if (!attr.header) {
             return this.model.get(attr);
        }
        this.data[attr.name] = attr.header.resolve(this.model);
        return this.data[attr.name];
    }

    resolve () {
        if (this.model.view.header) {
            this.title = this.model.view.header.resolve(this.model);
        }
        return this.toString();
    }

    toString () {
        if (this.title) {
            return String(this.title);
        }
        const id = this.model.getId();
        return id ? String(id) : '';
    }
};