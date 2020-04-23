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
            case '$class': return ClassHandler;
            case '$enum': return EnumHandler;
            case '$map': return MapHandler;
            case '$method': return MethodHandler;
            case '$moment': return MomentHandler;
            case '$state': return StateHandler;
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
            const name = names[i] === '$key' ? refClass.getKey() : names[i];
            const attr = refClass.getAttr(name);
            if (!attr) {
                attrs.push(name);
                break;
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
            return this.formatValue(model, this._firstAttr);
        }
        let target = model;
        for (const attr of this._attrs) {
            if (attr.relation) {
                target = Array.isArray(target)
                    ? this.getRelatedByModels(target, attr)
                    : this.formatValue(target.related, attr);
                if (!target) {
                    return Array.isArray(model)
                        ? this.getValueByModels(model)
                        : this.formatValue(model, attr);
                }
                model = target;
            } else {
                target = Array.isArray(target)
                    ? this.getValueByModels(target, attr)
                    : this.formatValue(target, attr);
            }
        }
        if (!this._lastAttr.relation) {
            return target;
        }
        return Array.isArray(target)
            ? target.map(model => model.header.resolve())
            : target.header.resolve();
    }

    getValueByModels (models, attr) {
        const result = [];
        for (const model of models) {
            const value = model.get(attr);
            if (Array.isArray(value)) {
                result.push(...value);
            } else if (value !== undefined && value !== null && value !== '') {
                result.push(value);
            }
        }
        return result;
    }

    getRelatedByModels (models, attr) {
        const result = [];
        for (const model of models) {
            const value = model.related.get(attr);
            if (Array.isArray(value)) {
                result.push(...value);
            } else if (value) {
                result.push(value);
            }
        }
        return result;
    }

    formatValue (model, attr) {
        const value = model.get(attr);
        return value === null || value === undefined ? '' : value;
    }

    log (type, message, data) {
        this.header.log(type, this.wrapClassMessage(message), data);
    }
};

const BaseHandler = require('./BaseHandler');
const ClassHandler = require('./ClassHandler');
const EnumHandler = require('./EnumHandler');
const MapHandler = require('./MapHandler');
const MethodHandler = require('./MethodHandler');
const MomentHandler = require('./MomentHandler');
const StateHandler = require('./StateHandler');