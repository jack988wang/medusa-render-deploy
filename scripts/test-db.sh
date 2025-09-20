#!/bin/bash

# 数据库功能测试脚本

echo "🧪 Testing database functionality..."

# 基础连接测试
echo "1️⃣  Testing API health..."
curl -s http://localhost:9000/health | grep -q "OK" && echo "   ✅ Health check passed" || echo "   ❌ Health check failed"

# 产品数据测试
echo "2️⃣  Testing product data..."
PRODUCTS=$(curl -s http://localhost:9000/api/products | jq '.products | length' 2>/dev/null)
if [ "$PRODUCTS" -gt 0 ]; then
  echo "   ✅ Products loaded: $PRODUCTS items"
else
  echo "   ❌ No products found"
fi

# 管理统计测试
echo "3️⃣  Testing admin stats..."
curl -s http://localhost:9000/api/admin/stats | grep -q "success" && echo "   ✅ Admin stats working" || echo "   ❌ Admin stats failed"

# 分类数据测试
echo "4️⃣  Testing categories..."
CATEGORIES=$(curl -s http://localhost:9000/api/categories | jq '.categories | length' 2>/dev/null)
if [ "$CATEGORIES" -gt 0 ]; then
  echo "   ✅ Categories loaded: $CATEGORIES items"
else
  echo "   ❌ No categories found"
fi

echo "🎉 Database functionality test completed!"
