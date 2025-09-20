#!/bin/bash

# 数据库启动脚本 - 确保在 Docker 环境中正常运行

echo "🚀 Starting Medusa Card Secret Store..."

# 等待数据库连接
echo "⏳ Waiting for database connection..."
DB_HOST=$(echo $DATABASE_URL | sed 's/.*@\([^:]*\).*/\1/')
DB_PORT=$(echo $DATABASE_URL | sed 's/.*:\([0-9]*\)\/.*/\1/')

until pg_isready -h "$DB_HOST" -p "$DB_PORT" 2>/dev/null; do
  echo "   Database ($DB_HOST:$DB_PORT) is not ready - waiting..."
  sleep 2
done

echo "✅ Database is ready!"

# 运行数据库迁移
echo "🔄 Running database migrations..."
npm run db:migrate

# 检查迁移是否成功
if [ $? -eq 0 ]; then
  echo "✅ Database migrations completed successfully"
else
  echo "❌ Database migrations failed"
  exit 1
fi

# 运行种子数据（仅在首次启动时）
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database with initial data..."
  npm run db:seed
  
  if [ $? -eq 0 ]; then
    echo "✅ Database seeding completed successfully"
  else
    echo "⚠️  Database seeding failed (this might be normal if data already exists)"
  fi
fi

# 启动应用
echo "🎯 Starting the application..."
exec npm start
