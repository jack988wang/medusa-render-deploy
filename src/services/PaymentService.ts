// @ts-ignore
const crypto = require('crypto');
import axios from 'axios';

export interface PaymentConfig {
  baseUrl: string;
  secretKey: string;
  notifyUrl: string;
  returnUrl: string;
}

export interface CreateOrderRequest {
  payId: string;
  type: number; // 1=微信, 2=支付宝
  price: number;
  param?: string;
  isHtml?: number;
  returnUrl?: string;
  notifyUrl?: string;
}

export interface CreateOrderResponse {
  code: number;
  msg: string;
  data: {
    payId: string;
    orderId: string;
    payType: number;
    price: number;
    reallyPrice: number;
    payUrl: string;
    isAuto: number;
    state: number;
    timeOut: number;
    date: number;
  } | null;
}

export interface PaymentCallback {
  payId: string;
  param: string;
  type: number;
  price: number;
  reallyPrice: number;
  sign: string;
}

export class PaymentService {
  private config: PaymentConfig;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.config = {
      baseUrl: 'https://2282045.pay.lanjingzf.com',
      secretKey: process.env.PAYMENT_SECRET_KEY || '08b19b019aa86ce42b30ce1c38110bb2',
      notifyUrl: process.env.PAYMENT_NOTIFY_URL || 'http://localhost:9000/api/payment/notify',
      returnUrl: process.env.PAYMENT_RETURN_URL || 'http://localhost:9000/api/payment/return'
    };
  }

  // 生成MD5签名
  private generateMD5(input: string): string {
    return crypto.createHash('md5').update(input).digest('hex');
  }

  // 创建订单签名
  private createOrderSign(payId: string, param: string, type: number, price: number): string {
    const signString = `${payId}${param}${type}${price}${this.config.secretKey}`;
    return this.generateMD5(signString);
  }

  // 验证回调签名
  private verifyCallbackSign(payId: string, param: string, type: number, price: number, reallyPrice: number, sign: string): boolean {
    const signString = `${payId}${param}${type}${price}${reallyPrice}${this.config.secretKey}`;
    const calculatedSign = this.generateMD5(signString);
    return calculatedSign === sign;
  }

  // 关闭订单签名
  private closeOrderSign(orderId: string): string {
    const signString = `${orderId}${this.config.secretKey}`;
    return this.generateMD5(signString);
  }

  // 创建支付订单
  async createPaymentOrder(orderData: {
    orderId: string;
    productId: string;
    paymentType: 'wechat' | 'alipay';
    amount: number; // 单位：分
    contactInfo: string;
  }): Promise<{
    success: boolean;
    payUrl?: string;
    cloudOrderId?: string;
    error?: string;
  }> {
    try {
      const payId = orderData.orderId;
      const type = orderData.paymentType === 'wechat' ? 1 : 2;
      const price = orderData.amount / 100; // 转换为元
      const param = JSON.stringify({
        productId: orderData.productId,
        contactInfo: orderData.contactInfo,
        orderId: orderData.orderId
      });

      // 开发模式：返回模拟支付URL
      if (this.isDevelopment) {
        console.log('Development mode: Creating mock payment order:', {
          payId,
          type: orderData.paymentType,
          price,
          productId: orderData.productId,
          contactInfo: orderData.contactInfo
        });

        // 模拟支付页面URL，实际会跳转到我们的支付模拟页面
        const mockPayUrl = `http://localhost:3000/payment/mock?payId=${payId}&type=${type}&price=${price}&param=${encodeURIComponent(param)}`;
        
        return {
          success: true,
          payUrl: mockPayUrl,
          cloudOrderId: `MOCK_${payId}_${Date.now()}`
        };
      }

      // 生产模式：调用真实的第三方API
      const sign = this.createOrderSign(payId, param, type, price);

      const requestData = new URLSearchParams({
        payId,
        type: type.toString(),
        price: price.toString(),
        sign,
        param,
        isHtml: '1', // 自动跳转到支付页面
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

      const response = await axios.post<CreateOrderResponse>(
        `${this.config.baseUrl}/createOrder`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000
        }
      );

      if (response.data.code === 1 && response.data.data) {
        return {
          success: true,
          payUrl: response.data.data.payUrl,
          cloudOrderId: response.data.data.orderId
        };
      } else {
        return {
          success: false,
          error: response.data.msg || '创建支付订单失败'
        };
      }
    } catch (error) {
      console.error('Payment order creation failed:', error);
      return {
        success: false,
        error: '网络错误，请重试'
      };
    }
  }

  // 验证支付回调
  verifyPaymentCallback(callback: PaymentCallback): {
    success: boolean;
    orderData?: {
      orderId: string;
      productId: string;
      contactInfo: string;
    };
    error?: string;
  } {
    try {
      // 开发模式：跳过签名验证
      if (this.isDevelopment && callback.sign === 'mock_signature') {
        console.log('Development mode: Skipping signature verification for mock payment');
      } else {
        // 生产模式：验证签名
        const isValidSign = this.verifyCallbackSign(
          callback.payId,
          callback.param,
          callback.type,
          callback.price,
          callback.reallyPrice,
          callback.sign
        );

        if (!isValidSign) {
          return {
            success: false,
            error: 'Invalid signature'
          };
        }
      }

      // 解析参数
      let orderData;
      try {
        orderData = JSON.parse(callback.param);
      } catch (e) {
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
    } catch (error) {
      console.error('Callback verification failed:', error);
      return {
        success: false,
        error: 'Verification failed'
      };
    }
  }

  // 关闭订单
  async closeOrder(cloudOrderId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const sign = this.closeOrderSign(cloudOrderId);

      const requestData = new URLSearchParams({
        orderId: cloudOrderId,
        sign
      });

      const response = await axios.post(
        `${this.config.baseUrl}/closeOrder`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 5000
        }
      );

      return {
        success: response.data.code === 1
      };
    } catch (error) {
      console.error('Close order failed:', error);
      return {
        success: false,
        error: 'Failed to close order'
      };
    }
  }

  // 查询订单状态
  async checkOrderStatus(cloudOrderId: string): Promise<{
    success: boolean;
    isPaid?: boolean;
    callbackUrl?: string;
    error?: string;
  }> {
    try {
      const response = await axios.get(
        `${this.config.baseUrl}/checkOrder?orderId=${cloudOrderId}`,
        { timeout: 5000 }
      );

      if (response.data.code === 1) {
        return {
          success: true,
          isPaid: true,
          callbackUrl: response.data.data
        };
      } else {
        return {
          success: true,
          isPaid: false
        };
      }
    } catch (error) {
      console.error('Check order status failed:', error);
      return {
        success: false,
        error: 'Failed to check order status'
      };
    }
  }
}
