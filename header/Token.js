/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class Token extends Base {

    static create (data, header) {
        return new this({data, header});
    }

    constructor (config) {
        super(config);
        this.init()
    }

    init () {
        let data = this.data;
        if (Array.isArray(data)) {
            const handler = this.getHandlerClass(data[0]);
            if (handler) {
                data = data.slice(1);
            }
            this._handler = this.createHandler(handler || BaseHandler, data);
        } else {
            const handler = this.getHandlerClass(data);
            if (handler) {
                this._handler = this.createHandler(handler, [data]);
            } else {
                this.parseData();
            }
        }
    }

    getHandlerClass (name) {
        switch (name) {
            case '$enum': return EnumHandler;
            case '$map': return MapHandler;
            case '$method': return MethodHandler;
            case '$moment': return MomentHandler;
        }
    }

    createHandler (Class, data, config) {
        return new Class({owner: this, data, ...config});
    }

    parseData () {
        this.data = this.header.prepareData(this.data);
        this.resolve = this.resolveStaticValue;
        this._attrs = this.parseAttrs(this.data, this.header.owner.class);
        if (this._attrs) {
            this._firstAttr = this._attrs[0];
            this._lastAttr = this._attrs[this._attrs.length - 1];
            this.resolve = this.resolveAttrValue;
        }
    }

    parseAttrs (text, refClass) {
        if (typeof text !== 'string' || text.charAt(0) !== '.') {
            return false;
        }
        const attrs = [];
        const names = text.split('.');
        for (let i = 1; i < names.length; ++i) {
            const name = names[i];
            const attr = refClass.getAttr(name);
            if (!attr) {
                this.log('error', `Attribute not found: ${name}`);
                return false;
            }
            refClass = attr.relation && attr.relation.refClass;
            if (!refClass && i + 1 < names.length) {
                this.log('error', `Attribute has no reference class: ${attr.id}`);
                return false;
            }
            attrs.push(attr);
        }
        return attrs;
    }

    getLastAttr () {
        return this._lastAttr;
    }

    resolve (model) {
        return this._handler.resolve(model);
    }

    resolveStaticValue () {
        return this.data;
    }

    resolveAttrValue (model) {
        if (!this._firstAttr.relation) {
            return model.get(this._firstAttr);
        }
        let data = model;
        for (const attr of this._attrs) {
            if (attr.relation) {
                data = Array.isArray(data)
                    ? this.getRelatedByModels(data, attr)
                    : data.related.get(attr);
                if (!data) {
                    return Array.isArray(model)
                        ? this.getValueByModels(model)
                        : model.get(attr);
                }
                model = data;
            } else {
                data = Array.isArray(data)
                    ? this.getValueByModels(data, attr)
                    : data.get(attr);
            }
        }
        if (!this._lastAttr.relation) {
            return data;
        }
        return Array.isArray(data)
            ? data.map(model => model.header.resolve())
            : data.header.resolve();
    }

    getValueByModels (models, attr) {
        const result = [];
        for (const model of models) {
            const data = model.get(attr);
            if (Array.isArray(data)) {
                result.push(...data);
            } else if (data !== undefined && data !== null && data !== '') {
                result.push(data);
            }
        }
        return result;
    }

    getRelatedByModels (models, attr) {
        const result = [];
        for (const model of models) {
            const data = model.related.get(attr);
            if (Array.isArray(data)) {
                result.push(...data);
            } else if (data) {
                result.push(data);
            }
        }
        return result;
    }

    log (type, message, data) {
        this.header.log(type, this.wrapClassMessage(message), data);
    }
};

const BaseHandler = require('./BaseHandler');
const EnumHandler = require('./EnumHandler');
const MapHandler = require('./MapHandler');
const MethodHandler = require('./MethodHandler');
const MomentHandler = require('./MomentHandler');