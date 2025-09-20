import fs from 'fs'
import path from 'path'

export interface DatabaseRecord {
  id: string
  created_at: Date
  updated_at: Date
}

export interface Product extends DatabaseRecord {
  title: string
  description: string
  category: string
  subcategory: string
  price: number
  currency: string
  stock: number
  sold_count: number
  quality_guarantee: string
  attributes: string[]
  status: string
}

export interface CardSecret extends DatabaseRecord {
  product_id: string
  account: string
  password: string
  additional_info?: string
  quality_guarantee: string
  status: string
  sold_at?: Date
  order_id?: string
}

export interface Order extends DatabaseRecord {
  order_number: string
  product_id: string
  product_title: string
  quantity: number
  unit_price: number
  total_amount: number
  currency: string
  contact_info: string
  payment_method?: string
  payment_status: string
  payment_transaction_id?: string
  card_secret_delivered_at?: Date
  expires_at?: Date
  card_secret?: {
    account: string
    password: string
    additionalInfo?: string
    qualityGuarantee: string
  }
}

export class DatabaseService {
  private dataDir: string
  private productsFile: string
  private cardSecretsFile: string
  private ordersFile: string

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data')
    this.productsFile = path.join(this.dataDir, 'products.json')
    this.cardSecretsFile = path.join(this.dataDir, 'card-secrets.json')
    this.ordersFile = path.join(this.dataDir, 'orders.json')
    
    this.ensureDataDirectory()
    this.initializeData()
  }

  private ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true })
    }
  }

  private initializeData() {
    // 初始化产品数据
    if (!fs.existsSync(this.productsFile)) {
      const defaultProducts: Product[] = [
        {
          id: 'google-email',
          title: 'Google邮箱账号',
          description: '全新谷歌邮箱账号，支持Gmail、Drive、YouTube等全套服务',
          category: '邮箱账号',
          subcategory: 'Google',
          price: 1500,
          currency: 'CNY',
          stock: 3,
          sold_count: 0,
          quality_guarantee: '质保首登，非人为问题7天包换',
          attributes: ['Gmail', 'Google Drive', 'YouTube', '质保首登'],
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'microsoft-365',
          title: 'Microsoft 365 个人版',
          description: 'Microsoft 365个人版账号，包含Office套件、OneDrive 1TB等',
          category: '办公软件',
          subcategory: 'Microsoft',
          price: 2800,
          currency: 'CNY',
          stock: 2,
          sold_count: 0,
          quality_guarantee: '质保30天，包含完整Office套件',
          attributes: ['Office', 'OneDrive', 'Outlook', '1TB存储'],
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'chatgpt-plus',
          title: 'ChatGPT Plus 账号',
          description: 'ChatGPT Plus 高级账号，无限制使用GPT-4',
          category: 'AI工具',
          subcategory: 'OpenAI',
          price: 5800,
          currency: 'CNY',
          stock: 2,
          sold_count: 0,
          quality_guarantee: '质保首登，支持GPT-4无限制使用',
          attributes: ['GPT-4', '无限制', '高优先级'],
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]
      this.saveProducts(defaultProducts)
    }

    // 初始化卡密数据
    if (!fs.existsSync(this.cardSecretsFile)) {
      const defaultCardSecrets: CardSecret[] = [
        {
          id: 'card_1',
          product_id: 'google-email',
          account: 'testuser1@gmail.com',
          password: 'encrypted_password_1',
          additional_info: '请妥善保管账号信息，建议立即修改密码',
          quality_guarantee: '质保首登，非人为问题7天包换',
          status: 'available',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'card_2',
          product_id: 'google-email',
          account: 'testuser2@gmail.com',
          password: 'encrypted_password_2',
          additional_info: '请妥善保管账号信息，建议立即修改密码',
          quality_guarantee: '质保首登，非人为问题7天包换',
          status: 'available',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'card_3',
          product_id: 'google-email',
          account: 'testuser3@gmail.com',
          password: 'encrypted_password_3',
          additional_info: '请妥善保管账号信息，建议立即修改密码',
          quality_guarantee: '质保首登，非人为问题7天包换',
          status: 'available',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]
      this.saveCardSecrets(defaultCardSecrets)
    }

    // 初始化订单数据
    if (!fs.existsSync(this.ordersFile)) {
      this.saveOrders([])
    }
  }

  // 产品管理
  async getProducts(): Promise<Product[]> {
    try {
      const data = fs.readFileSync(this.productsFile, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Failed to read products:', error)
      return []
    }
  }

  async getProductById(id: string): Promise<Product | null> {
    const products = await this.getProducts()
    return products.find(p => p.id === id) || null
  }

  async saveProduct(product: Product): Promise<Product> {
    const products = await this.getProducts()
    const existingIndex = products.findIndex(p => p.id === product.id)
    
    if (existingIndex >= 0) {
      products[existingIndex] = { ...product, updated_at: new Date() }
    } else {
      products.push({ ...product, created_at: new Date(), updated_at: new Date() })
    }
    
    this.saveProducts(products)
    return product
  }

  async addProduct(productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const newProduct: Product = {
      ...productData,
      id: `product_${Date.now()}`,
      created_at: new Date(),
      updated_at: new Date()
    }
    
    return await this.saveProduct(newProduct)
  }

  async deleteProduct(productId: string): Promise<boolean> {
    try {
      const products = await this.getProducts()
      const filteredProducts = products.filter(p => p.id !== productId)
      
      if (filteredProducts.length === products.length) {
        return false // 产品不存在
      }
      
      this.saveProducts(filteredProducts)
      return true
    } catch (error) {
      console.error('Failed to delete product:', error)
      return false
    }
  }

  private saveProducts(products: Product[]) {
    fs.writeFileSync(this.productsFile, JSON.stringify(products, null, 2))
  }

  // 卡密管理
  async getCardSecrets(): Promise<CardSecret[]> {
    try {
      const data = fs.readFileSync(this.cardSecretsFile, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Failed to read card secrets:', error)
      return []
    }
  }

  async getCardSecretsByProduct(productId: string, status?: string): Promise<CardSecret[]> {
    const cardSecrets = await this.getCardSecrets()
    return cardSecrets.filter(cs => {
      if (cs.product_id !== productId) return false
      if (status && cs.status !== status) return false
      return true
    })
  }

  async saveCardSecret(cardSecret: CardSecret): Promise<CardSecret> {
    const cardSecrets = await this.getCardSecrets()
    const existingIndex = cardSecrets.findIndex(cs => cs.id === cardSecret.id)
    
    if (existingIndex >= 0) {
      cardSecrets[existingIndex] = { ...cardSecret, updated_at: new Date() }
    } else {
      cardSecrets.push({ ...cardSecret, created_at: new Date(), updated_at: new Date() })
    }
    
    this.saveCardSecrets(cardSecrets)
    return cardSecret
  }

  async addCardSecret(cardSecretData: Omit<CardSecret, 'id' | 'created_at' | 'updated_at'>): Promise<CardSecret> {
    const newCardSecret: CardSecret = {
      ...cardSecretData,
      id: `card_${Date.now()}`,
      created_at: new Date(),
      updated_at: new Date()
    }
    
    return await this.saveCardSecret(newCardSecret)
  }

  private saveCardSecrets(cardSecrets: CardSecret[]) {
    fs.writeFileSync(this.cardSecretsFile, JSON.stringify(cardSecrets, null, 2))
  }

  // 订单管理
  async getOrders(): Promise<Order[]> {
    try {
      const data = fs.readFileSync(this.ordersFile, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Failed to read orders:', error)
      return []
    }
  }

  async saveOrder(order: Order): Promise<Order> {
    const orders = await this.getOrders()
    const existingIndex = orders.findIndex(o => o.id === order.id)
    
    if (existingIndex >= 0) {
      orders[existingIndex] = { ...order, updated_at: new Date() }
    } else {
      orders.push({ ...order, created_at: new Date(), updated_at: new Date() })
    }
    
    this.saveOrders(orders)
    return order
  }

  async addOrder(orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order> {
    const newOrder: Order = {
      ...orderData,
      id: `order_${Date.now()}`,
      created_at: new Date(),
      updated_at: new Date()
    }
    
    return await this.saveOrder(newOrder)
  }

  private saveOrders(orders: Order[]) {
    fs.writeFileSync(this.ordersFile, JSON.stringify(orders, null, 2))
  }

  // 邮箱统计管理
  async getEmailStats(): Promise<{
    totalEmails: number
    uniqueEmails: number
    emailList: Array<{
      email: string
      orderCount: number
      totalAmount: number
      firstOrderDate: Date
      lastOrderDate: Date
      orders: Order[]
    }>
  }> {
    try {
      const orders = await this.getOrders()
      
      // 按邮箱分组统计
      const emailMap = new Map<string, {
        email: string
        orderCount: number
        totalAmount: number
        firstOrderDate: Date
        lastOrderDate: Date
        orders: Order[]
      }>()

      orders.forEach(order => {
        const email = order.contact_info
        if (!email) return

        if (emailMap.has(email)) {
          const existing = emailMap.get(email)!
          existing.orderCount++
          existing.totalAmount += order.total_amount
          existing.lastOrderDate = new Date(Math.max(
            existing.lastOrderDate.getTime(),
            new Date(order.created_at).getTime()
          ))
          existing.orders.push(order)
        } else {
          emailMap.set(email, {
            email,
            orderCount: 1,
            totalAmount: order.total_amount,
            firstOrderDate: new Date(order.created_at),
            lastOrderDate: new Date(order.created_at),
            orders: [order]
          })
        }
      })

      const emailList = Array.from(emailMap.values()).sort((a, b) => 
        b.totalAmount - a.totalAmount // 按总金额降序排列
      )

      return {
        totalEmails: emailList.length,
        uniqueEmails: emailList.length,
        emailList
      }
    } catch (error) {
      console.error('Failed to get email stats:', error)
      return {
        totalEmails: 0,
        uniqueEmails: 0,
        emailList: []
      }
    }
  }

  async getOrdersByEmail(email: string): Promise<Order[]> {
    try {
      const orders = await this.getOrders()
      return orders.filter(order => order.contact_info === email)
    } catch (error) {
      console.error('Failed to get orders by email:', error)
      return []
    }
  }
}
