"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const Product_1 = require("./models/Product");
const CardSecretService_1 = require("./services/CardSecretService");
const OrderService_1 = require("./services/OrderService");
const PaymentService_1 = require("./services/PaymentService");
const DatabaseService_1 = require("./services/DatabaseService");
const PORT = process.env.PORT || 9000;
const MOCK_PRODUCTS = [
    {
        id: 'google-email',
        title: 'Google邮箱账号',
        description: '全新谷歌邮箱账号，支持Gmail、Drive、YouTube等全套服务',
        category: '邮箱账号',
        subcategory: 'Google',
        price: 1500,
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
        price: 2800,
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
        price: 5800,
        currency: 'CNY',
        stock: 20,
        sold_count: 8,
        quality_guarantee: '质保首登，支持GPT-4无限制使用',
        attributes: ['GPT-4', '无限制', '高优先级'],
        status: 'active'
    }
];
async function start() {
    const app = (0, express_1.default)();
    const cardSecretService = new CardSecretService_1.CardSecretService();
    const orderService = new OrderService_1.OrderService();
    const paymentService = new PaymentService_1.PaymentService();
    const databaseService = new DatabaseService_1.DatabaseService();
    app.use((0, helmet_1.default)());
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:8000',
        'http://localhost:7001'
    ];
    if (process.env.MEDUSA_STORE_CORS) {
        allowedOrigins.push(process.env.MEDUSA_STORE_CORS);
    }
    if (process.env.MEDUSA_ADMIN_CORS) {
        allowedOrigins.push(process.env.MEDUSA_ADMIN_CORS);
    }
    app.use((0, cors_1.default)({
        origin: allowedOrigins,
        credentials: true
    }));
    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString()
        });
    });
    app.get('/api/categories', (req, res) => {
        res.json({
            success: true,
            categories: Product_1.DEFAULT_CATEGORIES
        });
    });
    app.get('/api/products', async (req, res) => {
        const { category, subcategory, sort = 'sales' } = req.query;
        try {
            let filteredProducts = await databaseService.getProducts();
            filteredProducts = await Promise.all(filteredProducts.map(async (product) => ({
                ...product,
                stock: await cardSecretService.getProductStock(product.id),
                sold_count: await cardSecretService.getProductSoldCount(product.id)
            })));
            if (category) {
                filteredProducts = filteredProducts.filter(p => p.category === category);
            }
            if (subcategory) {
                filteredProducts = filteredProducts.filter(p => p.subcategory === subcategory);
            }
            if (sort === 'price_asc') {
                filteredProducts.sort((a, b) => a.price - b.price);
            }
            else if (sort === 'price_desc') {
                filteredProducts.sort((a, b) => b.price - a.price);
            }
            else {
                filteredProducts.sort((a, b) => b.sold_count - a.sold_count);
            }
            res.json({
                success: true,
                products: filteredProducts
            });
        }
        catch (error) {
            console.error('Failed to get products:', error);
            res.status(500).json({
                success: false,
                error: '获取商品列表失败'
            });
        }
    });
    app.post('/api/orders', async (req, res) => {
        const { contactInfo, productId, productTitle, quantity = 1, unitPrice, currency = 'CNY', paymentType = 'alipay' } = req.body;
        if (!contactInfo || !productId || !productTitle || !unitPrice || !paymentType) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数'
            });
        }
        if (!['wechat', 'alipay'].includes(paymentType)) {
            return res.status(400).json({
                success: false,
                error: '不支持的支付方式'
            });
        }
        const orderResult = await orderService.createOrder({
            contactInfo,
            productId,
            productTitle,
            quantity,
            unitPrice,
            currency
        });
        if (!orderResult.success || !orderResult.order) {
            return res.status(400).json(orderResult);
        }
        const paymentResult = await paymentService.createPaymentOrder({
            orderId: orderResult.order.id,
            productId,
            paymentType: paymentType,
            amount: orderResult.order.total_amount,
            contactInfo
        });
        if (!paymentResult.success) {
            return res.status(400).json({
                success: false,
                error: paymentResult.error
            });
        }
        res.json({
            success: true,
            order: orderResult.order,
            payUrl: paymentResult.payUrl,
            cloudOrderId: paymentResult.cloudOrderId
        });
    });
    app.all('/api/payment/notify', async (req, res) => {
        try {
            const params = { ...req.query, ...req.body };
            console.log('Payment notify received:', params);
            res.send('success');
        }
        catch (error) {
            console.error('Payment notify error:', error);
            res.status(500).send('error');
        }
    });
    app.all('/api/payment/return', async (req, res) => {
        try {
            const params = { ...req.query, ...req.body };
            const { payId, param } = params;
            if (!payId || !param) {
                return res.redirect(`/payment/error?message=${encodeURIComponent('支付参数错误')}`);
            }
            let orderData;
            try {
                orderData = JSON.parse(param);
            }
            catch (e) {
                return res.redirect(`/payment/error?message=${encodeURIComponent('参数解析错误')}`);
            }
            const paymentResult = await orderService.handlePaymentSuccess(payId, {
                transactionId: `TXN_${Date.now()}`,
                paymentMethod: 'alipay'
            });
            if (paymentResult.success && paymentResult.cardSecret) {
                const successUrl = `/success?orderId=${payId}&cardSecret=${encodeURIComponent(JSON.stringify(paymentResult.cardSecret))}`;
                return res.redirect(successUrl);
            }
            else {
                return res.redirect(`/payment/error?message=${encodeURIComponent(paymentResult.error || '支付处理失败')}`);
            }
        }
        catch (error) {
            console.error('Payment return error:', error);
            return res.redirect(`/payment/error?message=${encodeURIComponent('系统错误')}`);
        }
    });
    app.post('/api/orders/query', async (req, res) => {
        const { contactInfo } = req.body;
        if (!contactInfo) {
            return res.status(400).json({
                success: false,
                error: '请输入邮箱地址'
            });
        }
        if (!contactInfo.includes('@')) {
            return res.status(400).json({
                success: false,
                error: '请输入有效的邮箱地址'
            });
        }
        const result = await orderService.queryOrder({
            contact_info: contactInfo,
            order_number: ''
        });
        res.json(result);
    });
    app.get('/api/orders/:orderId/card-secret', async (req, res) => {
        const { orderId } = req.params;
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({
                success: false,
                error: '缺少邮箱验证'
            });
        }
        try {
            const order = orderService.findOrderById(orderId);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    error: '订单不存在'
                });
            }
            if (order.contact_info !== email) {
                return res.status(403).json({
                    success: false,
                    error: '邮箱验证失败'
                });
            }
            if (order.payment_status !== 'paid' || !order.card_secret_delivered_at) {
                return res.status(400).json({
                    success: false,
                    error: '订单尚未完成支付或卡密未发放'
                });
            }
            const cardSecretResult = await cardSecretService.getOrderCardSecret(orderId, order.product_id);
            if (!cardSecretResult.success) {
                return res.status(500).json({
                    success: false,
                    error: '获取卡密信息失败'
                });
            }
            res.json({
                success: true,
                cardSecret: cardSecretResult.cardSecret
            });
        }
        catch (error) {
            console.error('Failed to get order card secret:', error);
            res.status(500).json({
                success: false,
                error: '系统错误'
            });
        }
    });
    app.get('/api/admin/stats', async (req, res) => {
        const stats = await orderService.getOrderStats();
        res.json({
            success: true,
            stats
        });
    });
    app.post('/api/admin/products', async (req, res) => {
        const { title, description, category, subcategory, price, quality_guarantee, attributes } = req.body;
        if (!title || !price || !category) {
            return res.status(400).json({
                success: false,
                error: '缺少必要信息'
            });
        }
        try {
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
            });
            res.json({
                success: true,
                message: '产品添加成功',
                product: newProduct
            });
        }
        catch (error) {
            console.error('Failed to add product:', error);
            res.status(500).json({
                success: false,
                error: '添加产品失败'
            });
        }
    });
    app.get('/api/admin/products', async (req, res) => {
        try {
            const products = await databaseService.getProducts();
            const productsWithStock = await Promise.all(products.map(async (product) => ({
                ...product,
                stock: await cardSecretService.getProductStock(product.id),
                sold_count: await cardSecretService.getProductSoldCount(product.id)
            })));
            res.json({
                success: true,
                products: productsWithStock
            });
        }
        catch (error) {
            console.error('Failed to get admin products:', error);
            res.status(500).json({
                success: false,
                error: '获取产品列表失败'
            });
        }
    });
    app.delete('/api/admin/products/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const products = await databaseService.getProducts();
            const productExists = products.find(p => p.id === id);
            if (!productExists) {
                return res.status(404).json({
                    success: false,
                    error: '产品不存在'
                });
            }
            const cardSecrets = await databaseService.getCardSecretsByProduct(id);
            if (cardSecrets.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: '该产品下还有卡密，请先删除所有卡密后再删除产品'
                });
            }
            await databaseService.deleteProduct(id);
            res.json({
                success: true,
                message: '产品删除成功'
            });
        }
        catch (error) {
            console.error('Failed to delete product:', error);
            res.status(500).json({
                success: false,
                error: '删除产品失败'
            });
        }
    });
    app.get('/api/admin/products/:productId/card-secrets', async (req, res) => {
        const { productId } = req.params;
        const { status } = req.query;
        try {
            const cardSecrets = await databaseService.getCardSecretsByProduct(productId, status);
            res.json({
                success: true,
                cardSecrets
            });
        }
        catch (error) {
            console.error('Failed to fetch card secrets:', error);
            res.status(500).json({
                success: false,
                error: '获取卡密列表失败'
            });
        }
    });
    app.post('/api/admin/products/:productId/card-secrets/upload', async (req, res) => {
        const { productId } = req.params;
        const { cardSecrets } = req.body;
        if (!cardSecrets || !Array.isArray(cardSecrets)) {
            return res.status(400).json({
                success: false,
                error: '卡密数据格式错误'
            });
        }
        try {
            const uploadedSecrets = [];
            for (const cardData of cardSecrets) {
                const newCardSecret = await databaseService.addCardSecret({
                    product_id: productId,
                    account: cardData.account,
                    password: cardSecretService.encryptCardSecret(cardData.password),
                    additional_info: cardData.additionalInfo || '请妥善保管账号信息',
                    quality_guarantee: '质保首登，非人为问题7天包换',
                    status: 'available'
                });
                uploadedSecrets.push(newCardSecret);
            }
            res.json({
                success: true,
                message: `成功上传 ${uploadedSecrets.length} 个卡密`,
                result: {
                    count: uploadedSecrets.length,
                    secrets: uploadedSecrets
                }
            });
        }
        catch (error) {
            console.error('Failed to upload card secrets:', error);
            res.status(500).json({
                success: false,
                error: '上传卡密失败'
            });
        }
    });
    app.get('/api/admin/products/:productId/card-secrets/template', async (req, res) => {
        const { productId } = req.params;
        try {
            const template = await cardSecretService.getTemplate(productId);
            res.json({
                success: true,
                template
            });
        }
        catch (error) {
            console.error('Failed to get template:', error);
            res.status(500).json({
                success: false,
                error: '获取模板失败'
            });
        }
    });
    app.get('/api/admin/email-statistics', async (req, res) => {
        try {
            const orders = await databaseService.getOrders();
            const emailStats = new Map();
            orders.forEach(order => {
                const email = order.contact_info;
                if (!emailStats.has(email)) {
                    emailStats.set(email, {
                        email,
                        orderCount: 0,
                        totalAmount: 0,
                        lastOrderDate: new Date(order.created_at),
                        products: new Set()
                    });
                }
                const stat = emailStats.get(email);
                stat.orderCount++;
                stat.totalAmount += order.price;
                stat.products.add(order.product_title);
                const orderDate = new Date(order.created_at);
                if (orderDate > stat.lastOrderDate) {
                    stat.lastOrderDate = orderDate;
                }
            });
            const statistics = Array.from(emailStats.values()).map(stat => ({
                email: stat.email,
                orderCount: stat.orderCount,
                totalAmount: stat.totalAmount,
                lastOrderDate: stat.lastOrderDate.toISOString(),
                products: Array.from(stat.products)
            }));
            res.json({
                success: true,
                statistics
            });
        }
        catch (error) {
            console.error('Failed to get email statistics:', error);
            res.status(500).json({
                success: false,
                error: '获取邮箱统计失败'
            });
        }
    });
    app.get('/store/products', (req, res) => {
        res.redirect('/api/products');
    });
    app.get('/admin', (req, res) => {
        res.json({ message: "Admin API endpoint - visit /api/admin/stats for dashboard" });
    });
    app.get('/store', (req, res) => {
        res.json({ message: "Store API endpoint - visit /api/products for products" });
    });
    const server = app.listen(PORT, () => {
        console.log(`🚀 Medusa Card Secret Store running on port ${PORT}`);
        console.log(`📊 Admin: http://localhost:${PORT}/api/admin/stats`);
        console.log(`🛒 Store: http://localhost:${PORT}/api/products`);
        console.log(`🏥 Health: http://localhost:${PORT}/health`);
        console.log(`🔑 Card Secret System: Ready (Memory Mode)`);
    });
    process.on('SIGTERM', async () => {
        console.log('📴 Received SIGTERM, shutting down gracefully...');
        server.close(() => {
            process.exit(0);
        });
    });
    process.on('SIGINT', async () => {
        console.log('📴 Received SIGINT, shutting down gracefully...');
        server.close(() => {
            process.exit(0);
        });
    });
}
start().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});
