// Cloudflare Worker for Medusa Backend
import { Router } from 'itty-router'

const router = Router()

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Health check
router.get('/health', () => {
  return new Response(JSON.stringify({ status: 'ok' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})

// Products API
router.get('/api/products', async (request) => {
  try {
    // 这里需要连接到外部数据库
    const products = await getProductsFromDB()
    return new Response(JSON.stringify({ success: true, products }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Orders API
router.post('/api/orders', async (request) => {
  try {
    const orderData = await request.json()
    const order = await createOrderInDB(orderData)
    return new Response(JSON.stringify({ success: true, order }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Payment API
router.post('/api/payment/mock', async (request) => {
  try {
    const paymentData = await request.json()
    const result = await processMockPayment(paymentData)
    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Admin API
router.get('/api/admin/email-stats', async (request) => {
  try {
    const emailStats = await getEmailStatsFromDB()
    return new Response(JSON.stringify({ success: true, emailStats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Handle CORS preflight
router.options('*', () => {
  return new Response(null, { headers: corsHeaders })
})

// 404 handler
router.all('*', () => {
  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})

// Database functions (需要连接到外部数据库)
async function getProductsFromDB() {
  // 连接到PlanetScale/Supabase等外部数据库
  return []
}

async function createOrderInDB(orderData) {
  // 创建订单逻辑
  return { id: Date.now(), ...orderData }
}

async function processMockPayment(paymentData) {
  // 模拟支付处理
  return { transactionId: `mock_${Date.now()}`, status: 'success' }
}

async function getEmailStatsFromDB() {
  // 获取邮箱统计
  return { totalEmails: 0, uniqueEmails: 0, emailList: [] }
}

export default {
  async fetch(request, env, ctx) {
    return router.handle(request, env, ctx)
  }
}
