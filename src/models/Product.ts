export interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  price: number;
  currency: string;
  stock: number;
  sold_count: number;
  quality_guarantee: string; // 质保说明
  status: 'draft' | 'active' | 'inactive' | 'sold_out'; // 新增草稿状态
  requires_card_secret: boolean; // 是否需要关联卡密
  images: string[]; // 商品图片
  sort_weight: number; // 排序权重
  attributes: string[]; // 商品属性标签
  created_at: Date;
  updated_at: Date;
}

export interface CardSecretUpload {
  id: string;
  product_id: string;
  card_secret: string; // 加密存储的"账号|密码"
  remark?: string; // 备注信息
  status: 'available' | 'used'; // 可用/已使用
  upload_time: Date;
  used_time?: Date;
  used_order_id?: string;
}

export interface CardSecretTemplate {
  type: 'single_product' | 'multi_product';
  headers: string[];
  example_data: any[][];
  instructions: string[];
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  parent_id?: string;
  sort_order: number;
  subcategories?: ProductCategory[];
}

// 参考案例的分类结构
export const DEFAULT_CATEGORIES: ProductCategory[] = [
  {
    id: 'google_email',
    name: '谷歌邮箱',
    slug: 'google-email',
    sort_order: 1,
    subcategories: [
      { id: 'google_old', name: '老号', slug: 'google-old', parent_id: 'google_email', sort_order: 1 },
      { id: 'google_new', name: '新号', slug: 'google-new', parent_id: 'google_email', sort_order: 2 },
      { id: 'google_2fa', name: '2FA号', slug: 'google-2fa', parent_id: 'google_email', sort_order: 3 },
      { id: 'google_enterprise', name: '企业版', slug: 'google-enterprise', parent_id: 'google_email', sort_order: 4 }
    ]
  },
  {
    id: 'microsoft_email',
    name: '微软邮箱',
    slug: 'microsoft-email',
    sort_order: 2,
    subcategories: [
      { id: 'hotmail', name: 'Hotmail', slug: 'hotmail', parent_id: 'microsoft_email', sort_order: 1 },
      { id: 'outlook', name: 'Outlook', slug: 'outlook', parent_id: 'microsoft_email', sort_order: 2 },
      { id: 'microsoft_international', name: '各国后缀', slug: 'microsoft-international', parent_id: 'microsoft_email', sort_order: 3 }
    ]
  },
  {
    id: 'other_email',
    name: '其他邮箱',
    slug: 'other-email',
    sort_order: 3,
    subcategories: [
      { id: 'yahoo', name: '雅虎邮箱', slug: 'yahoo', parent_id: 'other_email', sort_order: 1 },
      { id: 'russia_email', name: '俄罗斯邮箱', slug: 'russia-email', parent_id: 'other_email', sort_order: 2 },
      { id: 'china_email', name: '网易/新浪邮箱', slug: 'china-email', parent_id: 'other_email', sort_order: 3 }
    ]
  }
];
