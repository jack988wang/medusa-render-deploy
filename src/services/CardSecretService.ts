// @ts-ignore
const crypto = require('crypto');
import { CardSecret } from '../models/CardSecret';

export class CardSecretService {
  private encryptionKey: string;
  private cardSecrets: Map<string, CardSecret> = new Map();

  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!!';
    this.initializeMockData();
  }

  // 初始化模拟数据
  private initializeMockData() {
    const mockSecrets = [
      // Google 邮箱账号
      { productId: 'google-email', account: 'testuser1@gmail.com', password: 'TestPass123!', guarantee: '质保首登，非人为问题7天包换' },
      { productId: 'google-email', account: 'testuser2@gmail.com', password: 'TestPass456!', guarantee: '质保首登，非人为问题7天包换' },
      { productId: 'google-email', account: 'testuser3@gmail.com', password: 'TestPass789!', guarantee: '质保首登，非人为问题7天包换' },
      
      // Microsoft 365
      { productId: 'microsoft-365', account: 'office1@outlook.com', password: 'Office123!', guarantee: '质保30天，包含完整Office套件' },
      { productId: 'microsoft-365', account: 'office2@outlook.com', password: 'Office456!', guarantee: '质保30天，包含完整Office套件' },
      
      // ChatGPT Plus
      { productId: 'chatgpt-plus', account: 'ai1@example.com', password: 'ChatGPT123!', guarantee: '质保首登，支持GPT-4无限制使用' },
      { productId: 'chatgpt-plus', account: 'ai2@example.com', password: 'ChatGPT456!', guarantee: '质保首登，支持GPT-4无限制使用' }
    ];

    mockSecrets.forEach((secret, index) => {
      const cardSecret: CardSecret = {
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

  // 加密卡密密码
  public encryptCardSecret(password: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  // 解密卡密密码
  private decryptCardSecret(encryptedPassword: string): string {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encryptedPassword, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt card secret:', error);
      return '解密失败';
    }
  }

  // 批量导入卡密
  async importCardSecrets(productId: string, cardSecrets: Array<{
    account: string;
    password: string;
    additionalInfo?: string;
    qualityGuarantee: string;
  }>): Promise<CardSecret[]> {
    const importedSecrets: CardSecret[] = [];

    for (const cardData of cardSecrets) {
      const cardSecret: CardSecret = {
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

  // 自动分配卡密（订单支付成功后调用）
  async assignCardSecretToOrder(orderId: string, productId: string): Promise<{
    success: boolean;
    cardSecret?: {
      account: string;
      password: string;
      additionalInfo?: string;
      qualityGuarantee: string;
    };
    error?: string;
  }> {
    try {
      // 1. 查找可用的卡密
      const availableSecret = await this.findAvailableCardSecret(productId);
      
      if (!availableSecret) {
        return {
          success: false,
          error: '该商品暂无库存，请联系客服'
        };
      }

      // 2. 标记卡密为已售出并保存到数据库
      const { DatabaseService } = require('./DatabaseService');
      const databaseService = new DatabaseService();
      
      availableSecret.status = 'sold';
      availableSecret.sold_at = new Date();
      availableSecret.order_id = orderId;
      availableSecret.updated_at = new Date();
      
      // 保存到数据库
      await databaseService.saveCardSecret(availableSecret);
      
      // 3. 解密并返回卡密信息
      return {
        success: true,
        cardSecret: {
          account: availableSecret.account,
          password: this.decryptCardSecret(availableSecret.password),
          additionalInfo: availableSecret.additional_info,
          qualityGuarantee: availableSecret.quality_guarantee
        }
      };
    } catch (error) {
      console.error('Failed to assign card secret:', error);
      return {
        success: false,
        error: '系统异常，请联系客服'
      };
    }
  }

  // 查找可用卡密
  private async findAvailableCardSecret(productId: string): Promise<CardSecret | null> {
    const { DatabaseService } = require('./DatabaseService');
    const databaseService = new DatabaseService();
    const availableSecrets = await databaseService.getCardSecretsByProduct(productId, 'available');
    return availableSecrets.length > 0 ? availableSecrets[0] : null;
  }

  // 获取产品库存数量
  async getProductStock(productId: string): Promise<number> {
    // 从数据库服务获取实时数据
    const { DatabaseService } = require('./DatabaseService');
    const databaseService = new DatabaseService();
    const cardSecrets = await databaseService.getCardSecretsByProduct(productId, 'available');
    return cardSecrets.length;
  }

  // 获取产品销量
  async getProductSoldCount(productId: string): Promise<number> {
    // 从数据库服务获取实时数据
    const { DatabaseService } = require('./DatabaseService');
    const databaseService = new DatabaseService();
    const cardSecrets = await databaseService.getCardSecretsByProduct(productId, 'sold');
    return cardSecrets.length;
  }

  // 获取订单的卡密信息（用于订单查询页面显示）
  async getOrderCardSecret(orderId: string, productId: string): Promise<{
    success: boolean;
    cardSecret?: {
      account: string;
      password: string;
      additionalInfo?: string;
      qualityGuarantee: string;
    };
    error?: string;
  }> {
    try {
      console.log(`Looking for card secret: orderId=${orderId}, productId=${productId}`);
      
      // 直接分配一个可用的卡密（简化逻辑）
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
    } catch (error) {
      console.error('Failed to get order card secret:', error);
      return {
        success: false,
        error: '获取卡密信息失败'
      };
    }
  }

  // 获取产品的卡密列表（管理后台用）
  async getCardSecretsByProduct(productId: string, status?: string): Promise<CardSecret[]> {
    const secrets: CardSecret[] = [];
    
    for (const secret of this.cardSecrets.values()) {
      if (secret.product_id === productId) {
        if (!status || secret.status === status) {
          secrets.push(secret);
        }
      }
    }
    
    return secrets.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  // 批量上传卡密
  async batchUploadCardSecrets(productId: string, cardSecrets: Array<{
    account: string;
    password: string;
    additionalInfo?: string;
  }>): Promise<{ count: number; secrets: CardSecret[] }> {
    const uploadedSecrets: CardSecret[] = [];

    for (const cardData of cardSecrets) {
      const cardSecret: CardSecret = {
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

  // 获取模板
  async getTemplate(productId: string): Promise<{
    headers: string[];
    example: string[];
  }> {
    return {
      headers: ['账号', '密码', '备注'],
      example: [
        'testuser1@gmail.com,password123,质保首登',
        'testuser2@gmail.com,password456,质保首登'
      ]
    };
  }
}