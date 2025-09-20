// @ts-ignore
declare var console: any;
// @ts-ignore  
declare var process: any;

import express, { Request, Response } from "express"
import cors from "cors"
import helmet from "helmet"
import { DEFAULT_CATEGORIES } from './models/Product'
import { CardSecretService } from './services/CardSecretService'
import { OrderService } from './services/OrderService'
import { PaymentService } from './services/PaymentService'
import { DatabaseService } from './services/DatabaseService'

const PORT = process.env.PORT || 9000

// 模拟产品数据
const MOCK_PRODUCTS = [
  {
    id: 'google-email',
    title: 'Google邮箱账号',
    description: '全新谷歌邮箱账号，支持Gmail、Drive、YouTube等全套服务',
    category: '邮箱账号',
    subcategory: 'Google',
    price: 1500, // 15.00元
    currency: 'CNY',
    stock: 100,
    sold_count: 25,
    quality_guarantee: '质保首登，非人为问题7天包换',
    attributes: ['Gmail', 'Google Drive', 'YouTube', '质保首登'],
    status: 'active'
  },
  {
    id: 'microsoft-365',
    title: 'Microsoft 365 个人版',
    description: 'Microsoft 365个人版账号，包含Office套件、OneDrive 1TB等',
    category: '办公软件',
    subcategory: 'Microsoft',
    price: 2800, // 28.00元
    currency: 'CNY',
    stock: 50,
    sold_count: 12,
    quality_guarantee: '质保30天，包含完整Office套件',
    attributes: ['Office', 'OneDrive', 'Outlook', '1TB存储'],
    status: 'active'
  },
  {
    id: 'chatgpt-plus',
    title: 'ChatGPT Plus 账号',
    description: 'ChatGPT Plus 高级账号，无限制使用GPT-4',
    category: 'AI工具',
    subcategory: 'OpenAI',
    price: 5800, // 58.00元
    currency: 'CNY',
    stock: 20,
    sold_count: 8,
    quality_guarantee: '质保首登，支持GPT-4无限制使用',
    attributes: ['GPT-4', '无限制', '高优先级'],
    status: 'active'
  }
]

async function start() {
  const app = express()
  const cardSecretService = new CardSecretService()
  const orderService = new OrderService()
  const paymentService = new PaymentService()
  const databaseService = new DatabaseService()

  // Middleware
  app.use(helmet())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  
  // CORS 配置
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8000',
    'http://localhost:7001'
  ]
  
  if (process.env.MEDUSA_STORE_CORS) {
    allowedOrigins.push(process.env.MEDUSA_STORE_CORS)
  }
  if (process.env.MEDUSA_ADMIN_CORS) {
    allowedOrigins.push(process.env.MEDUSA_ADMIN_CORS)
  }
  
  app.use(cors({
    origin: allowedOrigins,
    credentials: true
  }))

  // 健康检查
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    })
  })

  // 分类 API
  app.get('/api/categories', (req: Request, res: Response) => {
    res.json({
      success: true,
      categories: DEFAULT_CATEGORIES
    })
  })

  // 商品列表 API
  app.get('/api/products', async (req: Request, res: Response) => {
    const { category, subcategory, sort = 'sales' } = req.query

    try {
      // 从数据库获取产品数据
      let filteredProducts = await databaseService.getProducts()

      // 为每个产品添加实时库存信息
      filteredProducts = await Promise.all(filteredProducts.map(async product => ({
        ...product,
        stock: await cardSecretService.getProductStock(product.id),
        sold_count: await cardSecretService.getProductSoldCount(product.id)
      })))

      // 筛选
      if (category) {
        filteredProducts = filteredProducts.filter(p => p.category === category)
      }
      if (subcategory) {
        filteredProducts = filteredProducts.filter(p => p.subcategory === subcategory)
      }

      // 排序
      if (sort === 'price_asc') {
        filteredProducts.sort((a, b) => a.price - b.price)
      } else if (sort === 'price_desc') {
        filteredProducts.sort((a, b) => b.price - a.price)
      } else {
        // 默认按销量排序
        filteredProducts.sort((a, b) => b.sold_count - a.sold_count)
      }

      res.json({
        success: true,
        products: filteredProducts
      })
    } catch (error) {
      console.error('Failed to get products:', error)
      res.status(500).json({
        success: false,
        error: '获取商品列表失败'
      })
    }
  })

  // 创建订单并发起支付 API
  app.post('/api/orders', async (req: Request, res: Response) => {
    const { contactInfo, productId, productTitle, quantity = 1, unitPrice, currency = 'CNY', paymentType = 'alipay' } = req.body

    if (!contactInfo || !productId || !productTitle || !unitPrice || !paymentType) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      })
    }

    // 验证支付类型
    if (!['wechat', 'alipay'].includes(paymentType)) {
      return res.status(400).json({
        success: false,
        error: '不支持的支付方式'
      })
    }

    // 创建本地订单
    const orderResult = await orderService.createOrder({
      contactInfo,
      productId,
      productTitle,
      quantity,
      unitPrice,
      currency
    })

    if (!orderResult.success || !orderResult.order) {
      return res.status(400).json(orderResult)
    }

    // 创建支付订单
    const paymentResult = await paymentService.createPaymentOrder({
      orderId: orderResult.order.id,
      productId,
      paymentType: paymentType as 'wechat' | 'alipay',
      amount: orderResult.order.total_amount,
      contactInfo
    })

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        error: paymentResult.error
      })
    }

    res.json({
      success: true,
      order: orderResult.order,
      payUrl: paymentResult.payUrl,
      cloudOrderId: paymentResult.cloudOrderId
    })
  })

  // 支付异步回调 API (第三方平台调用)
  app.all('/api/payment/notify', async (req: Request, res: Response) => {
    try {
      const params = { ...req.query, ...req.body }
      console.log('Payment notify received:', params)

      // 模拟支付成功处理
      res.send('success')
    } catch (error) {
      console.error('Payment notify error:', error)
      res.status(500).send('error')
    }
  })

  // 支付同步回调 API (用户支付完成后跳转)
  app.all('/api/payment/return', async (req: Request, res: Response) => {
    try {
      const params = { ...req.query, ...req.body }
      const { payId, param } = params

      if (!payId || !param) {
        return res.redirect(`/payment/error?message=${encodeURIComponent('支付参数错误')}`)
      }

      let orderData
      try {
        orderData = JSON.parse(param)
      } catch (e) {
        return res.redirect(`/payment/error?message=${encodeURIComponent('参数解析错误')}`)
      }

      // 处理支付成功，分配卡密
      const paymentResult = await orderService.handlePaymentSuccess(payId, {
        transactionId: `TXN_${Date.now()}`,
        paymentMethod: 'alipay'
      })

      if (paymentResult.success && paymentResult.cardSecret) {
        // 跳转到支付成功页面，显示卡密
        const successUrl = `/success?orderId=${payId}&cardSecret=${encodeURIComponent(JSON.stringify(paymentResult.cardSecret))}`
        return res.redirect(successUrl)
      } else {
        return res.redirect(`/payment/error?message=${encodeURIComponent(paymentResult.error || '支付处理失败')}`)
      }
    } catch (error) {
      console.error('Payment return error:', error)
      return res.redirect(`/payment/error?message=${encodeURIComponent('系统错误')}`)
    }
  })

  // 订单查询 API
  app.post('/api/orders/query', async (req: Request, res: Response) => {
    const { contactInfo } = req.body

    if (!contactInfo) {
      return res.status(400).json({
        success: false,
        error: '请输入邮箱地址'
      })
    }

    // 简单邮箱验证
    if (!contactInfo.includes('@')) {
      return res.status(400).json({
        success: false,
        error: '请输入有效的邮箱地址'
      })
    }

    const result = await orderService.queryOrder({
      contact_info: contactInfo,
      order_number: '' // 不再需要订单号
    })

    res.json(result)
  })

  // 获取订单卡密 API
  app.get('/api/orders/:orderId/card-secret', async (req: Request, res: Response) => {
    const { orderId } = req.params
    const { email } = req.query

    if (!email) {
      return res.status(400).json({
        success: false,
        error: '缺少邮箱验证'
      })
    }

    try {
      // 查找订单
      const order = orderService.findOrderById(orderId)
      
      if (!order) {
        return res.status(404).json({
          success: false,
          error: '订单不存在'
        })
      }

      // 验证邮箱匹配
      if (order.contact_info !== email) {
        return res.status(403).json({
          success: false,
          error: '邮箱验证失败'
        })
      }

      // 检查订单是否已支付和发货
      if (order.payment_status !== 'paid' || !order.card_secret_delivered_at) {
        return res.status(400).json({
          success: false,
          error: '订单尚未完成支付或卡密未发放'
        })
      }

      // 获取卡密信息（用于显示）
      const cardSecretResult = await cardSecretService.getOrderCardSecret(orderId, order.product_id)
      
      if (!cardSecretResult.success) {
        return res.status(500).json({
          success: false,
          error: '获取卡密信息失败'
        })
      }

      res.json({
        success: true,
        cardSecret: cardSecretResult.cardSecret
      })
    } catch (error) {
      console.error('Failed to get order card secret:', error)
      res.status(500).json({
        success: false,
        error: '系统错误'
      })
    }
  })

  // 管理后台 API
  app.get('/api/admin/stats', async (req: Request, res: Response) => {
    const stats = await orderService.getOrderStats()
    res.json({
      success: true,
      stats
    })
  })

  // 产品管理 API
  app.post('/api/admin/products', async (req: Request, res: Response) => {
    const { title, description, category, subcategory, price, quality_guarantee, attributes } = req.body

    if (!title || !price || !category) {
      return res.status(400).json({
        success: false,
        error: '缺少必要信息'
      })
    }

    try {
      // 创建新产品
      const newProduct = await databaseService.addProduct({
        title,
        description: description || '',
        category,
        subcategory: subcategory || '',
        price: parseInt(price),
        currency: 'CNY',
        stock: 0,
        sold_count: 0,
        quality_guarantee: quality_guarantee || '质保首登',
        attributes: attributes || [],
        status: 'active'
      })

      res.json({
        success: true,
        message: '产品添加成功',
        product: newProduct
      })
    } catch (error) {
      console.error('Failed to add product:', error)
      res.status(500).json({
        success: false,
        error: '添加产品失败'
      })
    }
  })

  // 管理员获取产品列表 API (包含实时库存)
  app.get('/api/admin/products', async (req: Request, res: Response) => {
    try {
      const products = await databaseService.getProducts()
      
      // 为每个产品添加实时库存信息
      const productsWithStock = await Promise.all(
        products.map(async (product) => ({
          ...product,
          stock: await cardSecretService.getProductStock(product.id),
          sold_count: await cardSecretService.getProductSoldCount(product.id)
        }))
      )
      
      res.json({
        success: true,
        products: productsWithStock
      })
    } catch (error) {
      console.error('Failed to get admin products:', error)
      res.status(500).json({
        success: false,
        error: '获取产品列表失败'
      })
    }
  })

  // 删除产品 API
  app.delete('/api/admin/products/:id', async (req: Request, res: Response) => {
    const { id } = req.params
    
    try {
      // 检查产品是否存在
      const products = await databaseService.getProducts()
      const productExists = products.find(p => p.id === id)
      
      if (!productExists) {
        return res.status(404).json({
          success: false,
          error: '产品不存在'
        })
      }
      
      // 检查是否有关联的卡密
      const cardSecrets = await databaseService.getCardSecretsByProduct(id)
      if (cardSecrets.length > 0) {
        return res.status(400).json({
          success: false,
          error: '该产品下还有卡密，请先删除所有卡密后再删除产品'
        })
      }
      
      // 删除产品
      await databaseService.deleteProduct(id)
      
      res.json({
        success: true,
        message: '产品删除成功'
      })
    } catch (error) {
      console.error('Failed to delete product:', error)
      res.status(500).json({
        success: false,
        error: '删除产品失败'
      })
    }
  })

  // 卡密管理 API
  app.get('/api/admin/products/:productId/card-secrets', async (req: Request, res: Response) => {
    const { productId } = req.params
    const { status } = req.query

    try {
      const cardSecrets = await databaseService.getCardSecretsByProduct(productId, status as string)
      res.json({
        success: true,
        cardSecrets
      })
    } catch (error) {
      console.error('Failed to fetch card secrets:', error)
      res.status(500).json({
        success: false,
        error: '获取卡密列表失败'
      })
    }
  })

  app.post('/api/admin/products/:productId/card-secrets/upload', async (req: Request, res: Response) => {
    const { productId } = req.params
    const { cardSecrets } = req.body

    if (!cardSecrets || !Array.isArray(cardSecrets)) {
      return res.status(400).json({
        success: false,
        error: '卡密数据格式错误'
      })
    }

    try {
      const uploadedSecrets = []
      
      for (const cardData of cardSecrets) {
        const newCardSecret = await databaseService.addCardSecret({
          product_id: productId,
          account: cardData.account,
          password: cardSecretService.encryptCardSecret(cardData.password),
          additional_info: cardData.additionalInfo || '请妥善保管账号信息',
          quality_guarantee: '质保首登，非人为问题7天包换',
          status: 'available'
        })
        uploadedSecrets.push(newCardSecret)
      }

      res.json({
        success: true,
        message: `成功上传 ${uploadedSecrets.length} 个卡密`,
        result: {
          count: uploadedSecrets.length,
          secrets: uploadedSecrets
        }
      })
    } catch (error) {
      console.error('Failed to upload card secrets:', error)
      res.status(500).json({
        success: false,
        error: '上传卡密失败'
      })
    }
  })

  app.get('/api/admin/products/:productId/card-secrets/template', async (req: Request, res: Response) => {
    const { productId } = req.params

    try {
      const template = await cardSecretService.getTemplate(productId)
      res.json({
        success: true,
        template
      })
    } catch (error) {
      console.error('Failed to get template:', error)
      res.status(500).json({
        success: false,
        error: '获取模板失败'
      })
    }
  })

  // 邮箱统计 API
  app.get('/api/admin/email-stats', async (req: Request, res: Response) => {
    try {
      const emailStats = await databaseService.getEmailStats()
      res.json({
        success: true,
        emailStats
      })
    } catch (error) {
      console.error('Failed to get email stats:', error)
      res.status(500).json({
        success: false,
        error: '获取邮箱统计失败'
      })
    }
  })

  // 根据邮箱获取订单 API
  app.get('/api/admin/orders-by-email/:email', async (req: Request, res: Response) => {
    try {
      const { email } = req.params
      const orders = await databaseService.getOrdersByEmail(email)
      res.json({
        success: true,
        orders
      })
    } catch (error) {
      console.error('Failed to get orders by email:', error)
      res.status(500).json({
        success: false,
        error: '获取订单失败'
      })
    }
  })

  // 兼容旧的端点
  app.get('/store/products', (req: Request, res: Response) => {
    res.redirect('/api/products')
  })

  app.get('/admin', (req: Request, res: Response) => {
    res.json({ message: "Admin API endpoint - visit /api/admin/stats for dashboard" })
  })

  app.get('/store', (req: Request, res: Response) => {
    res.json({ message: "Store API endpoint - visit /api/products for products" })
  })

  const server = app.listen(PORT, () => {
    console.log(`🚀 Medusa Card Secret Store running on port ${PORT}`)
    console.log(`📊 Admin: http://localhost:${PORT}/api/admin/stats`)
    console.log(`🛒 Store: http://localhost:${PORT}/api/products`)
    console.log(`🏥 Health: http://localhost:${PORT}/health`)
    console.log(`🔑 Card Secret System: Ready (Memory Mode)`)
  })

  // 优雅关闭处理
  process.on('SIGTERM', async () => {
    console.log('📴 Received SIGTERM, shutting down gracefully...')
    server.close(() => {
      process.exit(0)
    })
  })

  process.on('SIGINT', async () => {
    console.log('📴 Received SIGINT, shutting down gracefully...')
    server.close(() => {
      process.exit(0)
    })
  })
}

start().catch((error) => {
  console.error("Failed to start server:", error)
  process.exit(1)
})