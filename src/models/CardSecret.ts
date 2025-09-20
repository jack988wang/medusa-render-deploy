export interface CardSecret {
  id: string;
  product_id: string;
  account: string;  // 账号
  password: string; // 密码（加密存储）
  additional_info?: string; // 额外信息（如邮箱密保问题等）
  quality_guarantee: string; // 质保说明
  status: 'available' | 'sold' | 'reserved';
  sold_at?: Date;
  order_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Order {
  id: string;
  order_number: string; // 订单号
  contact_info: string; // 用户联系方式（邮箱或手机）
  product_id: string;
  product_title: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  currency: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'cancelled';
  payment_method?: string;
  payment_transaction_id?: string;
  card_secret_id?: string; // 关联的卡密ID
  card_secret_delivered_at?: Date; // 卡密发放时间
  created_at: Date;
  updated_at: Date;
  expires_at: Date; // 订单过期时间（未支付自动取消）
}

export interface OrderQuery {
  contact_info: string;
  order_number: string;
}
