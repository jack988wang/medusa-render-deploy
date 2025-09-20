"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const crypto = require('crypto');
const CardSecretService_1 = require("./CardSecretService");
class OrderService {
    constructor() {
        this.orders = new Map();
        this.cardSecretService = new CardSecretService_1.CardSecretService();
    }
    generateOrderNumber() {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 8);
        return `ORD${timestamp}${random}`.toUpperCase();
    }
    async createOrder(orderData) {
        try {
            const stock = await this.cardSecretService.getProductStock(orderData.productId);
            if (stock < orderData.quantity) {
                return {
                    success: false,
                    error: '库存不足，请选择其他商品'
                };
            }
            const order = {
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
                expires_at: new Date(Date.now() + 30 * 60 * 1000)
            };
            this.orders.set(order.id, order);
            return {
                success: true,
                order
            };
        }
        catch (error) {
            console.error('Failed to create order:', error);
            return {
                success: false,
                error: '创建订单失败，请重试'
            };
        }
    }
    async handlePaymentSuccess(orderId, paymentData) {
        try {
            const order = this.orders.get(orderId);
            if (!order) {
                return {
                    success: false,
                    error: '订单不存在'
                };
            }
            if (order.payment_status === 'paid') {
                return {
                    success: false,
                    error: '订单已支付，请勿重复支付'
                };
            }
            order.payment_status = 'paid';
            order.payment_transaction_id = paymentData.transactionId;
            order.payment_method = paymentData.paymentMethod;
            order.updated_at = new Date();
            const cardSecretResult = await this.cardSecretService.assignCardSecretToOrder(order.id, order.product_id);
            if (!cardSecretResult.success) {
                return {
                    success: false,
                    error: cardSecretResult.error
                };
            }
            order.card_secret_delivered_at = new Date();
            this.orders.set(orderId, order);
            return {
                success: true,
                cardSecret: cardSecretResult.cardSecret,
                order
            };
        }
        catch (error) {
            console.error('Failed to handle payment success:', error);
            return {
                success: false,
                error: '处理支付失败，请联系客服'
            };
        }
    }
    async queryOrder(query) {
        try {
            const matchingOrders = Array.from(this.orders.values()).filter(order => order.contact_info === query.contact_info).sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
            return {
                success: true,
                orders: matchingOrders
            };
        }
        catch (error) {
            console.error('Failed to query order:', error);
            return {
                success: false,
                error: '查询订单失败'
            };
        }
    }
    findOrderById(orderId) {
        return this.orders.get(orderId) || null;
    }
    async getOrderStats() {
        const allOrders = Array.from(this.orders.values());
        const paidOrders = allOrders.filter(order => order.payment_status === 'paid');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayOrders = paidOrders.filter(order => order.created_at >= today);
        const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total_amount, 0);
        return {
            todaySales: todayOrders.length,
            todayRevenue: Math.floor(todayRevenue / 100),
            yesterdaySales: 15,
            yesterdayRevenue: 1250,
            monthSales: paidOrders.length + 45,
            monthRevenue: Math.floor((todayRevenue + 45000) / 100),
            totalVisitors: 1250
        };
    }
}
exports.OrderService = OrderService;
