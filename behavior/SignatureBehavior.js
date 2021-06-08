/**
 * @copyright Copyright (c) 2021 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Behavior');

module.exports = class SignatureBehavior extends Base {

    static prepareConfig (data, view) {
        if (!view.signedAttrs.length) {
            return null;
        }
        const sign = view.meta.getClass(data.signature);
        if (!sign) {
            return this.log(view, 'error', 'Signature class not found');
        }
        data.params = this.resolveParams(data.params);
        const creation = this.resolveCreationView(sign, data);
        if (!creation) {
            return this.log(view, 'error', 'Signature creation view not found');
        }
        data.signatureClass = sign;
        data.signatureCreationView = creation;
        return data;
    }

    static resolveParams (data) {
        return {
            hashAttr: '_signedHash', // object attribute to store data hash
            hashingAlgorithm: 'md5',
            certAttr: 'cert', // public key certificate
            dataAttr: 'data', // signed data
            targetAttr: 'target', // link to signed object
            deleteOnUpdate: true, // delete signatures when updating an object
            maxDepth: 1, // maximum depth of related objects
            ...data
        };
    }

    static resolveCreationView (cls, data) {
        return data.params.creationView
            ? cls.getView(data.params.creationView)
            : cls.getView('create') || cls;
    }

    async afterInsert () {
        const data = await this.hashData();
        return this.updateHash(data);
    }

    async afterUpdate () {
        const data = await this.hashData();
        if (data === this.get(this.params.hashAttr)) {
            return;
        }
        await this.updateHash(data);
        if (this.params.deleteOnUpdate) {
            await this.deleteSignatures();
        }
    }

    updateHash (data) {
        this.set(this.params.hashAttr, data);
        return this.owner.directUpdate();
    }

    async deleteSignatures () {
        const condition = {
            [this.params.targetAttr]: this.owner.getId()
        };
        const query = this.signatureClass.createQuery(this.getSpawnConfig()).and(condition);
        const models = await query.all();
        await this.owner.constructor.delete(models);
    }

    async canSign (security) {
        return await this.canCreateSignature(security)
            && await this.countUserSignatures(security.user) === 0;
    }

    canCreateSignature (security) {
        return security.resolve({
            targetType: Rbac.TARGET_VIEW,
            target: this.signatureCreationView,
            actions: [Rbac.CREATE]
        }, {
            skipAccessException: true
        });
    }

    countUserSignatures (user) {
        return this.signatureClass.createQuery().byCreator(user.getId()).count();
    }

    getHash () {
        return this.get(this.params.hashAttr);
    }

    async hashData () {
        const collector = new SignatureDataCollector({
            maxDepth: this.params.maxDepth
        });
        const data = await collector.getModelData(this.owner);
        const hash = crypto.createHash(this.params.hashingAlgorithm);
        return hash.update(JSON.stringify(data)).digest('hex');
    }

    async createSignature (data) {
        const model = this.signatureCreationView.createModel(this.getSpawnConfig());
        await model.setDefaultValues();
        model.set(this.params.targetAttr, this.owner.getId());
        model.set(this.params.dataAttr, data.data);
        model.set(this.params.certAttr, data.cert);
        return model;
    }
};

const Rbac = require('evado/component/security/rbac/Rbac');
const SignatureDataCollector = require('../misc/SignatureDataCollector');
const crypto = require('crypto');