# FlowUs 帮助中心


📄 **[子页面: FlowUs 动态]**

# 副本FlowUs 开发者文档 -  Beta

# 搜索 API 文档


## 概述

搜索 API 允许机器人在其授权的页面范围内进行智能搜索。该接口支持全文搜索和语义搜索，返回相关的页面结果。


## 接口详情


### 搜索页面

在机器人授权的页面范围内搜索相关内容。

**请求方式：** `POST /v1/search`

**请求头：**


```plain text
Authorization: Bearer your_bot_token_here
Content-Type: application/json
```

**请求参数：**


---





**请求示例：**


```json
{
  "query": "项目计划",
  "start_cursor": "eyJvZmZzZXQiOjEwfQ==",
  "page_size": 20
}
```

**响应格式：**


```json
{
  "object": "list",
  "results": [
    {
      "object": "page",
      "id": "a1b2c3d4-5678-9012-3456-789012345678",
      "created_time": "2024-01-01T10:00:00.000Z",
      "last_edited_time": "2024-01-15T14:30:00.000Z",
      "parent": {
        "type": "database_id",
        "database_id": "d9824bdc-8445-4327-be8b-5b47500af6ce"
      },
      "archived": false,
      "properties": {
        "title": {
          "type": "title",
          "title": [
            {
              "type": "text",
              "text": {
                "content": "项目计划文档"
              }
            }
          ]
        }
      }
    }
  ],
  "next_cursor": "eyJvZmZzZXQiOjIwfQ==",
  "has_more": true
}
```


## 响应对象说明


### 搜索结果对象


---







### 页面结果对象


---










### 父级对象类型

页面的父级对象可以是以下几种类型之一：


#### 1. 空间父级


```json
{
  "type": "space_id",
  "space_id": "workspace-uuid"
}
```


#### 2. 数据库父级


```json
{
  "type": "database_id",
  "database_id": "database-uuid"
}
```


#### 3. 页面父级


```json
{
  "type": "page_id",
  "page_id": "page-uuid"
}
```


#### 4. 块父级


```json
{
  "type": "block_id",
  "block_id": "block-uuid"
}
```


## 搜索行为


### 搜索范围

- 搜索仅限于机器人已授权访问的页面
- 包括页面标题和页面内容
- 支持模糊匹配和语义搜索

### 搜索结果排序

- 默认按相关性排序
- 相关性相同时按最后编辑时间降序排列

### 分页机制

- 使用 Base64 编码的 JSON 游标进行分页
- 游标包含偏移量信息：`{"offset": 20}`
- 最大页面大小为 100 项

## 使用示例


### 基础搜索


```plain text
curl -X POST https://api.flowus.cn/v1/search \
  -H "Authorization: Bearer your_bot_token" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "会议记录",
    "page_size": 10
  }'
```


### 分页搜索


```plain text
# 获取第一页
curl -X POST https://api.flowus.cn/v1/search \
  -H "Authorization: Bearer your_bot_token" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "项目",
    "page_size": 20
  }'

# 获取下一页（使用返回的 next_cursor）
curl -X POST https://api.flowus.cn/v1/search \
  -H "Authorization: Bearer your_bot_token" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "项目",
    "start_cursor": "eyJvZmZzZXQiOjIwfQ==",
    "page_size": 20
  }'
```


### 空查询搜索


```plain text
# 返回所有授权页面
curl -X POST https://api.flowus.cn/v1/search \
  -H "Authorization: Bearer your_bot_token" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "",
    "page_size": 50
  }'
```


## 错误处理


### 常见错误代码


---








### 错误响应示例


```json
{
  "object": "error",
  "status": 400,
  "code": "validation_error",
  "message": "page_size 必须在 1 到 100 之间"
}
```


## 权限要求

- 机器人必须具有 `readContent` 权限
- 只能搜索机器人已授权访问的页面
- 搜索结果会自动过滤掉无权限访问的页面