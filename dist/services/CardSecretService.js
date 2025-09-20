"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardSecretService = void 0;
const crypto = require('crypto');
class CardSecretService {
    constructor() {
        this.cardSecrets = new Map();
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!!';
        this.initializeMockData();
    }
    initializeMockData() {
        const mockSecrets = [
            { productId: 'google-email', account: 'testuser1@gmail.com', password: 'TestPass123!', guarantee: '质保首登，非人为问题7天包换' },
            { productId: 'google-email', account: 'testuser2@gmail.com', password: 'TestPass456!', guarantee: '质保首登，非人为问题7天包换' },
            { productId: 'google-email', account: 'testuser3@gmail.com', password: 'TestPass789!', guarantee: '质保首登，非人为问题7天包换' },
            { productId: 'microsoft-365', account: 'office1@outlook.com', password: 'Office123!', guarantee: '质保30天，包含完整Office套件' },
            { productId: 'microsoft-365', account: 'office2@outlook.com', password: 'Office456!', guarantee: '质保30天，包含完整Office套件' },
            { productId: 'chatgpt-plus', account: 'ai1@example.com', password: 'ChatGPT123!', guarantee: '质保首登，支持GPT-4无限制使用' },
            { productId: 'chatgpt-plus', account: 'ai2@example.com', password: 'ChatGPT456!', guarantee: '质保首登，支持GPT-4无限制使用' }
        ];
        mockSecrets.forEach((secret, index) => {
            const cardSecret = {
                id: `card_${index + 1}`,
                product_id: secret.productId,
                account: secret.account,
                password: this.encryptCardSecret(secret.password),
                additional_info: '请妥善保管账号信息，建议立即修改密码',
                quality_guarantee: secret.guarantee,
                status: 'available',
                created_at: new Date(),
                updated_at: new Date()
            };
            this.cardSecrets.set(cardSecret.id, cardSecret);
        });
    }
    encryptCardSecret(password) {
        const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
        let encrypted = cipher.update(password, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }
    decryptCardSecret(encryptedPassword) {
        try {
            const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
            let decrypted = decipher.update(encryptedPassword, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            console.error('Failed to decrypt card secret:', error);
            return '解密失败';
        }
    }
    async importCardSecrets(productId, cardSecrets) {
        const importedSecrets = [];
        for (const cardData of cardSecrets) {
            const cardSecret = {
                id: crypto.randomUUID(),
                product_id: productId,
                account: cardData.account,
                password: this.encryptCardSecret(cardData.password),
                additional_info: cardData.additionalInfo,
                quality_guarantee: cardData.qualityGuarantee,
                status: 'available',
                created_at: new Date(),
                updated_at: new Date()
            };
            this.cardSecrets.set(cardSecret.id, cardSecret);
            importedSecrets.push(cardSecret);
        }
        return importedSecrets;
    }
    async assignCardSecretToOrder(orderId, productId) {
        try {
            const availableSecret = await this.findAvailableCardSecret(productId);
            if (!availableSecret) {
                return {
                    success: false,
                    error: '该商品暂无库存，请联系客服'
                };
            }
            const { DatabaseService } = require('./DatabaseService');
            const databaseService = new DatabaseService();
            availableSecret.status = 'sold';
            availableSecret.sold_at = new Date();
            availableSecret.order_id = orderId;
            availableSecret.updated_at = new Date();
            await databaseService.saveCardSecret(availableSecret);
            return {
                success: true,
                cardSecret: {
                    account: availableSecret.account,
                    password: this.decryptCardSecret(availableSecret.password),
                    additionalInfo: availableSecret.additional_info,
                    qualityGuarantee: availableSecret.quality_guarantee
                }
            };
        }
        catch (error) {
            console.error('Failed to assign card secret:', error);
            return {
                success: false,
                error: '系统异常，请联系客服'
            };
        }
    }
    async findAvailableCardSecret(productId) {
        const { DatabaseService } = require('./DatabaseService');
        const databaseService = new DatabaseService();
        const availableSecrets = await databaseService.getCardSecretsByProduct(productId, 'available');
        return availableSecrets.length > 0 ? availableSecrets[0] : null;
    }
    async getProductStock(productId) {
        const { DatabaseService } = require('./DatabaseService');
        const databaseService = new DatabaseService();
        const cardSecrets = await databaseService.getCardSecretsByProduct(productId, 'available');
        return cardSecrets.length;
    }
    async getProductSoldCount(productId) {
        const { DatabaseService } = require('./DatabaseService');
        const databaseService = new DatabaseService();
        const cardSecrets = await databaseService.getCardSecretsByProduct(productId, 'sold');
        return cardSecrets.length;
    }
    async getOrderCardSecret(orderId, productId) {
        try {
            console.log(`Looking for card secret: orderId=${orderId}, productId=${productId}`);
            const availableSecret = await this.findAvailableCardSecret(productId);
            if (availableSecret) {
                return {
                    success: true,
                    cardSecret: {
                        account: availableSecret.account,
                        password: this.decryptCardSecret(availableSecret.password),
                        additionalInfo: availableSecret.additional_info,
                        qualityGuarantee: availableSecret.quality_guarantee
                    }
                };
            }
            return {
                success: false,
                error: '该商品暂无库存'
            };
        }
        catch (error) {
            console.error('Failed to get order card secret:', error);
            return {
                success: false,
                error: '获取卡密信息失败'
            };
        }
    }
    async getCardSecretsByProduct(productId, status) {
        const secrets = [];
        for (const secret of this.cardSecrets.values()) {
            if (secret.product_id === productId) {
                if (!status || secret.status === status) {
                    secrets.push(secret);
                }
            }
        }
        return secrets.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    }
    async batchUploadCardSecrets(productId, cardSecrets) {
        const uploadedSecrets = [];
        for (const cardData of cardSecrets) {
            const cardSecret = {
                id: crypto.randomUUID(),
                product_id: productId,
                account: cardData.account,
                password: this.encryptCardSecret(cardData.password),
                additional_info: cardData.additionalInfo || '请妥善保管账号信息',
                quality_guarantee: '质保首登，非人为问题7天包换',
                status: 'available',
                created_at: new Date(),
                updated_at: new Date()
            };
            this.cardSecrets.set(cardSecret.id, cardSecret);
            uploadedSecrets.push(cardSecret);
        }
        return {
            count: uploadedSecrets.length,
            secrets: uploadedSecrets
        };
    }
    async getTemplate(productId) {
        return {
            headers: ['账号', '密码', '备注'],
            example: [
                'testuser1@gmail.com,password123,质保首登',
                'testuser2@gmail.com,password456,质保首登'
            ]
        };
    }
}
exports.CardSecretService = CardSecretService;
