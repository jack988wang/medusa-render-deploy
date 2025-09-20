"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const crypto = require('crypto');
const axios_1 = __importDefault(require("axios"));
class PaymentService {
    constructor() {
        this.isDevelopment = process.env.NODE_ENV !== 'production';
        this.config = {
            baseUrl: 'https://2282045.pay.lanjingzf.com',
            secretKey: process.env.PAYMENT_SECRET_KEY || '08b19b019aa86ce42b30ce1c38110bb2',
            notifyUrl: process.env.PAYMENT_NOTIFY_URL || 'http://localhost:9000/api/payment/notify',
            returnUrl: process.env.PAYMENT_RETURN_URL || 'http://localhost:9000/api/payment/return'
        };
    }
    generateMD5(input) {
        return crypto.createHash('md5').update(input).digest('hex');
    }
    createOrderSign(payId, param, type, price) {
        const signString = `${payId}${param}${type}${price}${this.config.secretKey}`;
        return this.generateMD5(signString);
    }
    verifyCallbackSign(payId, param, type, price, reallyPrice, sign) {
        const signString = `${payId}${param}${type}${price}${reallyPrice}${this.config.secretKey}`;
        const calculatedSign = this.generateMD5(signString);
        return calculatedSign === sign;
    }
    closeOrderSign(orderId) {
        const signString = `${orderId}${this.config.secretKey}`;
        return this.generateMD5(signString);
    }
    async createPaymentOrder(orderData) {
        try {
            const payId = orderData.orderId;
            const type = orderData.paymentType === 'wechat' ? 1 : 2;
            const price = orderData.amount / 100;
            const param = JSON.stringify({
                productId: orderData.productId,
                contactInfo: orderData.contactInfo,
                orderId: orderData.orderId
            });
            if (this.isDevelopment) {
                console.log('Development mode: Creating mock payment order:', {
                    payId,
                    type: orderData.paymentType,
                    price,
                    productId: orderData.productId,
                    contactInfo: orderData.contactInfo
                });
                const mockPayUrl = `http://localhost:3000/payment/mock?payId=${payId}&type=${type}&price=${price}&param=${encodeURIComponent(param)}`;
                return {
                    success: true,
                    payUrl: mockPayUrl,
                    cloudOrderId: `MOCK_${payId}_${Date.now()}`
                };
            }
            const sign = this.createOrderSign(payId, param, type, price);
            const requestData = new URLSearchParams({
                payId,
                type: type.toString(),
                price: price.toString(),
                sign,
                param,
                isHtml: '1',
                returnUrl: this.config.returnUrl,
                notifyUrl: this.config.notifyUrl
            });
            console.log('Creating payment order:', {
                payId,
                type,
                price,
                sign,
                param: param.substring(0, 50) + '...'
            });
            const response = await axios_1.default.post(`${this.config.baseUrl}/createOrder`, requestData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                timeout: 10000
            });
            if (response.data.code === 1 && response.data.data) {
                return {
                    success: true,
                    payUrl: response.data.data.payUrl,
                    cloudOrderId: response.data.data.orderId
                };
            }
            else {
                return {
                    success: false,
                    error: response.data.msg || '创建支付订单失败'
                };
            }
        }
        catch (error) {
            console.error('Payment order creation failed:', error);
            return {
                success: false,
                error: '网络错误，请重试'
            };
        }
    }
    verifyPaymentCallback(callback) {
        try {
            if (this.isDevelopment && callback.sign === 'mock_signature') {
                console.log('Development mode: Skipping signature verification for mock payment');
            }
            else {
                const isValidSign = this.verifyCallbackSign(callback.payId, callback.param, callback.type, callback.price, callback.reallyPrice, callback.sign);
                if (!isValidSign) {
                    return {
                        success: false,
                        error: 'Invalid signature'
                    };
                }
            }
            let orderData;
            try {
                orderData = JSON.parse(callback.param);
            }
            catch (e) {
                return {
                    success: false,
                    error: 'Invalid param format'
                };
            }
            return {
                success: true,
                orderData: {
                    orderId: callback.payId,
                    productId: orderData.productId,
                    contactInfo: orderData.contactInfo
                }
            };
        }
        catch (error) {
            console.error('Callback verification failed:', error);
            return {
                success: false,
                error: 'Verification failed'
            };
        }
    }
    async closeOrder(cloudOrderId) {
        try {
            const sign = this.closeOrderSign(cloudOrderId);
            const requestData = new URLSearchParams({
                orderId: cloudOrderId,
                sign
            });
            const response = await axios_1.default.post(`${this.config.baseUrl}/closeOrder`, requestData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                timeout: 5000
            });
            return {
                success: response.data.code === 1
            };
        }
        catch (error) {
            console.error('Close order failed:', error);
            return {
                success: false,
                error: 'Failed to close order'
            };
        }
    }
    async checkOrderStatus(cloudOrderId) {
        try {
            const response = await axios_1.default.get(`${this.config.baseUrl}/checkOrder?orderId=${cloudOrderId}`, { timeout: 5000 });
            if (response.data.code === 1) {
                return {
                    success: true,
                    isPaid: true,
                    callbackUrl: response.data.data
                };
            }
            else {
                return {
                    success: true,
                    isPaid: false
                };
            }
        }
        catch (error) {
            console.error('Check order status failed:', error);
            return {
                success: false,
                error: 'Failed to check order status'
            };
        }
    }
}
exports.PaymentService = PaymentService;
