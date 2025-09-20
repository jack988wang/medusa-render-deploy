// @ts-ignore
const crypto = require('crypto');
import { Order, OrderQuery } from '../models/CardSecret';
import { CardSecretService } from './CardSecretService';
import { DatabaseService } from './DatabaseService';

export class OrderService {
  private cardSecretService: CardSecretService;
  private databaseService: DatabaseService;
  private orders: Map<string, Order> = new Map();

  constructor() {
    this.cardSecretService = new CardSecretService();
    this.databaseService = new DatabaseService();
  }

  // 生成订单号
  private generateOrderNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `ORD${timestamp}${random}`.toUpperCase();
  }

  // 创建订单
  async createOrder(orderData: {
    contactInfo: string;
    productId: string;
    productTitle: string;
    quantity: number;
    unitPrice: number;
    currency: string;
  }): Promise<{
    success: boolean;
    order?: Order;
    error?: string;
  }> {
    try {
      // 1. 检查库存
      const stock = await this.cardSecretService.getProductStock(orderData.productId);
      if (stock < orderData.quantity) {
        return {
          success: false,
          error: '库存不足，请选择其他商品'
        };
      }

      // 2. 创建订单
      const order: Order = {
        id: crypto.randomUUID(),
        order_number: this.generateOrderNumber(),
        contact_info: orderData.contactInfo,
        product_id: orderData.productId,
        product_title: orderData.productTitle,
        quantity: orderData.quantity,
        unit_price: orderData.unitPrice,
        total_amount: orderData.unitPrice * orderData.quantity,
        currency: orderData.currency,
        payment_status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000) // 30分钟后过期
      };

      // 保存到内存和数据库
      this.orders.set(order.id, order);
      await this.databaseService.saveOrder(order);
      
      return {
        success: true,
        order
      };
    } catch (error) {
      console.error('Failed to create order:', error);
      return {
        success: false,
        error: '创建订单失败，请重试'
      };
    }
  }

  // 处理支付成功后的逻辑
  async handlePaymentSuccess(orderId: string, paymentData: {
    transactionId: string;
    paymentMethod: string;
  }): Promise<{
    success: boolean;
    cardSecret?: any;
    order?: Order;
    error?: string;
  }> {
    try {
      // 1. 查找订单
      const order = this.orders.get(orderId);
      if (!order) {
        return {
          success: false,
          error: '订单不存在'
        };
      }

      // 2. 检查订单状态
      if (order.payment_status === 'paid') {
        return {
          success: false,
          error: '订单已支付，请勿重复支付'
        };
      }

      // 3. 更新订单状态
      order.payment_status = 'paid';
      order.payment_transaction_id = paymentData.transactionId;
      order.payment_method = paymentData.paymentMethod;
      order.updated_at = new Date();

      // 4. 自动分配卡密
      const cardSecretResult = await this.cardSecretService.assignCardSecretToOrder(
        order.id,
        order.product_id
      );

      if (!cardSecretResult.success) {
        return {
          success: false,
          error: cardSecretResult.error
        };
      }

      // 5. 更新订单卡密信息
      order.card_secret_delivered_at = new Date();

      // 更新内存和数据库中的订单
      this.orders.set(orderId, order);
      await this.databaseService.saveOrder(order);

      return {
        success: true,
        cardSecret: cardSecretResult.cardSecret,
        order
      };
    } catch (error) {
      console.error('Failed to handle payment success:', error);
      return {
        success: false,
        error: '处理支付失败，请联系客服'
      };
    }
  }

  // 查询订单（供用户查询历史订单）
  async queryOrder(query: OrderQuery): Promise<{
    success: boolean;
    orders?: Order[];
    error?: string;
  }> {
    try {
      // 从内存中查找匹配的订单（只需要邮箱地址）
      const matchingOrders = Array.from(this.orders.values()).filter(order => 
        order.contact_info === query.contact_info
      ).sort((a, b) => b.created_at.getTime() - a.created_at.getTime()); // 按时间倒序

      return {
        success: true,
        orders: matchingOrders
      };
    } catch (error) {
      console.error('Failed to query order:', error);
      return {
        success: false,
        error: '查询订单失败'
      };
    }
  }

  // 根据ID查找订单
  findOrderById(orderId: string): Order | null {
    return this.orders.get(orderId) || null;
  }

  // 获取订单统计数据（管理后台使用）
  async getOrderStats(): Promise<{
    todaySales: number;
    todayRevenue: number;
    yesterdaySales: number;
    yesterdayRevenue: number;
    monthSales: number;
    monthRevenue: number;
    totalVisitors: number;
  }> {
    // 模拟统计数据
    const allOrders = Array.from(this.orders.values());
    const paidOrders = allOrders.filter(order => order.payment_status === 'paid');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = paidOrders.filter(order => order.created_at >= today);
    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total_amount, 0);

    return {
      todaySales: todayOrders.length,
      todayRevenue: Math.floor(todayRevenue / 100), // 转换为元
      yesterdaySales: 15,
      yesterdayRevenue: 1250,
      monthSales: paidOrders.length + 45,
      monthRevenue: Math.floor((todayRevenue + 45000) / 100),
      totalVisitors: 1250
    };
  }
}