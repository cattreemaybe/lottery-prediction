-- 创建数据库和用户
CREATE DATABASE lottery_db;
CREATE USER lottery_user WITH PASSWORD 'lottery_pass';
GRANT ALL PRIVILEGES ON DATABASE lottery_db TO lottery_user;

-- 连接到新数据库并授予schema权限
\c lottery_db
GRANT ALL ON SCHEMA public TO lottery_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO lottery_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO lottery_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO lottery_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO lottery_user;
