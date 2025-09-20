"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class DatabaseService {
    constructor() {
        this.dataDir = path_1.default.join(process.cwd(), 'data');
        this.productsFile = path_1.default.join(this.dataDir, 'products.json');
        this.cardSecretsFile = path_1.default.join(this.dataDir, 'card-secrets.json');
        this.ordersFile = path_1.default.join(this.dataDir, 'orders.json');
        this.ensureDataDirectory();
        this.initializeData();
    }
    ensureDataDirectory() {
        if (!fs_1.default.existsSync(this.dataDir)) {
            fs_1.default.mkdirSync(this.dataDir, { recursive: true });
        }
    }
    initializeData() {
        if (!fs_1.default.existsSync(this.productsFile)) {
            const defaultProducts = [
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
            ];
            this.saveProducts(defaultProducts);
        }
        if (!fs_1.default.existsSync(this.cardSecretsFile)) {
            const defaultCardSecrets = [
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
            ];
            this.saveCardSecrets(defaultCardSecrets);
        }
        if (!fs_1.default.existsSync(this.ordersFile)) {
            this.saveOrders([]);
        }
    }
    async getProducts() {
        try {
            const data = fs_1.default.readFileSync(this.productsFile, 'utf8');
            return JSON.parse(data);
        }
        catch (error) {
            console.error('Failed to read products:', error);
            return [];
        }
    }
    async getProductById(id) {
        const products = await this.getProducts();
        return products.find(p => p.id === id) || null;
    }
    async saveProduct(product) {
        const products = await this.getProducts();
        const existingIndex = products.findIndex(p => p.id === product.id);
        if (existingIndex >= 0) {
            products[existingIndex] = { ...product, updated_at: new Date() };
        }
        else {
            products.push({ ...product, created_at: new Date(), updated_at: new Date() });
        }
        this.saveProducts(products);
        return product;
    }
    async addProduct(productData) {
        const newProduct = {
            ...productData,
            id: `product_${Date.now()}`,
            created_at: new Date(),
            updated_at: new Date()
        };
        return await this.saveProduct(newProduct);
    }
    async deleteProduct(productId) {
        try {
            const products = await this.getProducts();
            const filteredProducts = products.filter(p => p.id !== productId);
            if (filteredProducts.length === products.length) {
                return false;
            }
            this.saveProducts(filteredProducts);
            return true;
        }
        catch (error) {
            console.error('Failed to delete product:', error);
            return false;
        }
    }
    saveProducts(products) {
        fs_1.default.writeFileSync(this.productsFile, JSON.stringify(products, null, 2));
    }
    async getCardSecrets() {
        try {
            const data = fs_1.default.readFileSync(this.cardSecretsFile, 'utf8');
            return JSON.parse(data);
        }
        catch (error) {
            console.error('Failed to read card secrets:', error);
            return [];
        }
    }
    async getCardSecretsByProduct(productId, status) {
        const cardSecrets = await this.getCardSecrets();
        return cardSecrets.filter(cs => {
            if (cs.product_id !== productId)
                return false;
            if (status && cs.status !== status)
                return false;
            return true;
        });
    }
    async saveCardSecret(cardSecret) {
        const cardSecrets = await this.getCardSecrets();
        const existingIndex = cardSecrets.findIndex(cs => cs.id === cardSecret.id);
        if (existingIndex >= 0) {
            cardSecrets[existingIndex] = { ...cardSecret, updated_at: new Date() };
        }
        else {
            cardSecrets.push({ ...cardSecret, created_at: new Date(), updated_at: new Date() });
        }
        this.saveCardSecrets(cardSecrets);
        return cardSecret;
    }
    async addCardSecret(cardSecretData) {
        const newCardSecret = {
            ...cardSecretData,
            id: `card_${Date.now()}`,
            created_at: new Date(),
            updated_at: new Date()
        };
        return await this.saveCardSecret(newCardSecret);
    }
    saveCardSecrets(cardSecrets) {
        fs_1.default.writeFileSync(this.cardSecretsFile, JSON.stringify(cardSecrets, null, 2));
    }
    async getOrders() {
        try {
            const data = fs_1.default.readFileSync(this.ordersFile, 'utf8');
            return JSON.parse(data);
        }
        catch (error) {
            console.error('Failed to read orders:', error);
            return [];
        }
    }
    async saveOrder(order) {
        const orders = await this.getOrders();
        const existingIndex = orders.findIndex(o => o.id === order.id);
        if (existingIndex >= 0) {
            orders[existingIndex] = { ...order, updated_at: new Date() };
        }
        else {
            orders.push({ ...order, created_at: new Date(), updated_at: new Date() });
        }
        this.saveOrders(orders);
        return order;
    }
    async addOrder(orderData) {
        const newOrder = {
            ...orderData,
            id: `order_${Date.now()}`,
            created_at: new Date(),
            updated_at: new Date()
        };
        return await this.saveOrder(newOrder);
    }
    saveOrders(orders) {
        fs_1.default.writeFileSync(this.ordersFile, JSON.stringify(orders, null, 2));
    }
}
exports.DatabaseService = DatabaseService;
