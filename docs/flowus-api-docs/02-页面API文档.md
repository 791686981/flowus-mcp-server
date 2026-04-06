# FlowUs 帮助中心


📄 **[子页面: FlowUs 动态]**

# 副本FlowUs 开发者文档 -  Beta

# 页面 API 文档


## 概述

Pages API 提供了完整页面管理能力，包括：

- **创建页面**：在页面或数据库中创建新页面
- **获取页面**：根据ID获取页面详细信息
- **更新页面**：修改页面属性、图标、封面等
- **获取页面子块**：获取页面的子块列表（支持分页和递归）
支持在普通页面下创建子页面，也支持在数据库中创建记录页面。


## 基础 URL


### 正式环境


```plain text
https://api.flowus.cn/v1
```


### 测试环境


```plain text
https://api-test.allflow.cn/v1
```


## 认证

所有 API 请求都需要在 Authorization 头中包含有效的机器人令牌：


```plain text
Authorization: Bearer <bot_token>
```


## API 接口


### 1. 创建页面

创建新的页面。

**请求**


```plain text
POST /v1/pages
```

**请求体**


```json
{
  "parent": {
    "page_id": "父页面ID",
    "database_id": "数据库ID"
  },
  "icon": {
    "emoji": "📄",
    "external": {
      "url": "图标URL"
    }
  },
  "cover": {
    "external": {
      "url": "封面URL"
    }
  },
  "properties": {
    "title": {
      "type": "title",
      "title": [
        {
          "text": {
            "content": "页面标题"
          }
        }
      ]
    }
  }
}
```

**参数说明：**


---











> 💡 **默认父级：** 当不指定 `parent` 时，页面将创建在默认位置，您可以在工作区中找到并管理这些页面。


> 💡 **容错机制：** 当指定的 `parent.page_id` 或 `parent.database_id` 不存在时，API会使用默认位置创建页面，确保创建操作能够成功完成。

**响应**


```json
{
  "object": "page",
  "id": "页面ID",
  "created_time": "2023-12-01T10:00:00.000Z",
  "created_by": {
    "object": "user",
    "id": "用户ID"
  },
  "last_edited_time": "2023-12-01T10:00:00.000Z",
  "last_edited_by": {
    "object": "user",
    "id": "用户ID"
  },
  "archived": false,
  "properties": {
    "title": {
      "id": "title",
      "type": "title",
      "title": [
        {
          "type": "text",
          "text": {
            "content": "页面标题"
          }
        }
      ]
    }
  },
  "parent": {
    "type": "page_id",
    "page_id": "父页面ID"
  },
  "url": "https://api.flowus.cn/docs/页面ID" // 正式环境
}
```


### 2. 获取页面

根据页面ID获取页面详细信息。

**请求**


```plain text
GET /v1/pages/{page_id}
```

**路径参数**

- `page_id`: 页面ID
**响应**


```json
{
  "object": "page",
  "id": "页面ID",
  "created_time": "2023-12-01T10:00:00.000Z",
  "created_by": {
    "object": "user",
    "id": "创建者ID"
  },
  "last_edited_time": "2023-12-01T10:00:00.000Z",
  "last_edited_by": {
    "object": "user",
    "id": "编辑者ID"
  },
  "archived": false,
  "properties": {
    "title": {
      "id": "title",
      "type": "title",
      "title": [
        {
          "type": "text",
          "text": {
            "content": "页面标题"
          }
        }
      ]
    },
    "描述": {
      "id": "property-uuid",
      "type": "rich_text",
      "rich_text": [
        {
          "type": "text",
          "text": {
            "content": "页面描述内容"
          }
        }
      ]
    }
  },
  "parent": {
    "type": "page_id",
    "page_id": "父页面ID"
  },
  "url": "https://api.flowus.cn/docs/页面ID",
  "icon": {
    "type": "emoji",
    "emoji": "📝"
  },
  "cover": {
    "type": "external",
    "external": {
      "url": "https://example.com/cover.jpg"
    }
  }
}
```


### 3. 更新页面

更新页面的属性、图标、封面或归档状态。

**请求**


```plain text
PATCH /v1/pages/{page_id}
```

**路径参数**

- `page_id`: 页面ID
**请求体**


```json
{
  "properties": {
    "title": {
      "type": "title",
      "title": [
        {
          "text": {
            "content": "更新后的标题"
          }
        }
      ]
    },
    "描述": {
      "type": "rich_text",
      "rich_text": [
        {
          "text": {
            "content": "更新后的描述"
          }
        }
      ]
    },
    "状态": {
      "type": "select",
      "select": {
        "name": "已完成"
      }
    }
  },
  "icon": {
    "emoji": "✅"
  },
  "cover": {
    "external": {
      "url": "https://example.com/new-cover.jpg"
    }
  },
  "archived": false
}
```

**响应**


```json
{
  "object": "page",
  "id": "页面ID",
  "created_time": "2023-12-01T10:00:00.000Z",
  "created_by": {
    "object": "user",
    "id": "创建者ID"
  },
  "last_edited_time": "2023-12-01T10:30:00.000Z",
  "last_edited_by": {
    "object": "user",
    "id": "编辑者ID"
  },
  "archived": false,
  "properties": {
    // 更新后的属性
  },
  "parent": {
    "type": "page_id",
    "page_id": "父页面ID"
  },
  "url": "https://api.flowus.cn/docs/页面ID",
  "icon": {
    "type": "emoji",
    "emoji": "✅"
  },
  "cover": {
    "type": "external",
    "external": {
      "url": "https://example.com/new-cover.jpg"
    }
  }
}
```


### 4. 获取页面子块

获取指定页面的子块列表。

**请求**


```plain text
GET /v1/blocks/{pageId}/children
```


> 💡 **重要说明：** 页面在 FlowUs 中是特殊的块对象，因此使用 Blocks API 的子块获取接口。

**查询参数**

- `page_size` (可选): 每页返回的块数量，最大100，默认50
- `start_cursor` (可选): 分页游标，使用子块的ID作为游标值
- `recursive` (可选): 是否递归获取所有子块，`true`或`false`，默认`false`
**响应**


```json
{
  "object": "list",
  "results": [
    {
      "object": "block",
      "id": "块ID",
      "created_time": "2023-12-01T10:00:00.000Z",
      "created_by": {
        "object": "user",
        "id": "用户ID"
      },
      "last_edited_time": "2023-12-01T10:00:00.000Z",
      "last_edited_by": {
        "object": "user",
        "id": "用户ID"
      },
      "archived": false,
      "has_children": true,
      "type": "paragraph",
      "paragraph": {
        "rich_text": [
          {
            "type": "text",
            "text": {
              "content": "文本内容",
              "link": null
            },
            "annotations": {
              "bold": false,
              "italic": false,
              "strikethrough": false,
              "underline": false,
              "code": false,
              "color": "default"
            },
            "plain_text": "文本内容",
            "href": null
          }
        ],
        "color": "default"
      }
    }
  ],
  "next_cursor": "abc-123-def-456",
  "has_more": true,
  "type": "block",
  "block": {},
  "page": {
    "id": "页面ID",
    "title": "页面标题"
  },
  "total_count": null,
  "pagination_info": {
    "current_page": 1,
    "total_pages": 5,
    "total_items": 125
  }
}
```


## 页面属性格式

页面属性定义了页面和数据库记录的所有属性类型和格式。详细的属性结构、数据类型、使用方法等信息，请参考：

📖 Page Properties 文档

该文档包含了完整的属性规范：

- **基础属性** - title、rich_text、number、checkbox等
- **选择属性** - select、multi_select等下拉框类型
- **关联属性** - people、files、date等复杂类型
- **系统属性** - created_time、created_by等只读属性
- **格式要求** - 各种属性类型的数据格式和验证规则
- **使用示例** - 创建和更新属性的完整示例

## 富文本对象格式

API 返回的富文本对象遵循统一的格式规范。详细的富文本对象结构、支持的块类型、颜色定义等信息，请参考：

📖 Block 对象实体文档

该文档包含了完整的规范说明：

- **富文本 (RichText)** - 文本、提及、公式等类型的详细格式
- **注解 (Annotations)** - 粗体、斜体、颜色等格式化选项
- **支持的块类型** - 所有可用的块类型及其属性
- **颜色定义** - 完整的颜色值列表
- **图标格式** - Emoji、文件、外部链接图标
- **日期格式** - 各种日期时间格式的支持

## 使用示例


### 获取页面的直接子块（游标分页 - 推荐）

**注意：** 页面在 FlowUs 中也是一种块对象，因此获取页面的子块需要使用 Blocks API。


```http
# 第一页
GET /v1/blocks/abc123/children?page_size=10
Authorization: Bearer your_bot_token

# 使用返回的 next_cursor 获取下一页
GET /v1/blocks/abc123/children?page_size=10&start_cursor=abc-123-def-456
Authorization: Bearer your_bot_token
```


> 💡 **API 参考：** 详细的子块获取说明请参考 Blocks API 文档。


### 创建新页面


```http
POST /v1/pages
Authorization: Bearer your_bot_token
Content-Type: application/json

{
  "parent": {
    "page_id": "parent-page-id"
  },
  "properties": {
    "title": {
      "type": "title",
      "title": [
        {
          "text": {
            "content": "新页面标题"
          }
        }
      ]
    }
  }
}
```


### 创建页面（无需指定父级）

创建页面时可以不指定父级，页面将创建在默认位置：


```http
POST /v1/pages
Authorization: Bearer your_bot_token
Content-Type: application/json

{
  "properties": {
    "title": {
      "type": "title",
      "title": [
        {
          "text": {
            "content": "生成的会议纪要"
          }
        }
      ]
    },
    "内容": {
      "type": "rich_text",
      "rich_text": [
        {
          "text": {
            "content": "生成的内容"
          }
        }
      ]
    }
  },
  "icon": {
    "emoji": "🤖"
  }
}
```


### 获取页面详情


```http
GET /v1/pages/abc123
Authorization: Bearer your_bot_token
```


### 更新页面


```http
PATCH /v1/pages/abc123
Authorization: Bearer your_bot_token
Content-Type: application/json

{
  "properties": {
    "title": {
      "type": "title",
      "title": [
        {
          "text": {
            "content": "更新后的页面标题"
          }
        }
      ]
    },
    "描述": {
      "type": "rich_text",
      "rich_text": [
        {
          "text": {
            "content": "这是更新后的页面描述"
          }
        }
      ]
    }
  },
  "icon": {
    "emoji": "✅"
  },
  "archived": false
}
```


### 创建数据库页面

在数据库中创建新页面（记录）：


```http
POST /v1/pages
Authorization: Bearer your_bot_token
Content-Type: application/json

{
  "parent": {
    "database_id": "database-uuid"
  },
  "properties": {
    "标题": {
      "type": "title",
      "title": [
        {
          "text": {
            "content": "新任务"
          }
        }
      ]
    },
    "状态": {
      "type": "select",
      "select": {
        "name": "进行中"
      }
    },
    "优先级": {
      "type": "select",
      "select": {
        "name": "高"
      }
    },
    "完成": {
      "type": "checkbox",
      "checkbox": false
    },
    "截止日期": {
      "type": "date",
      "date": {
        "start": "2024-01-15"
      }
    }
  }
}
```


### 批量更新页面属性


```http
PATCH /v1/pages/abc123
Authorization: Bearer your_bot_token
Content-Type: application/json

{
  "properties": {
    "状态": {
      "type": "select",
      "select": {
        "name": "已完成"
      }
    },
    "完成": {
      "type": "checkbox",
      "checkbox": true
    },
    "完成时间": {
      "type": "date",
      "date": {
        "start": "2024-01-10T14:30:00"
      }
    }
  },
  "archived": false
}
```


## 基于 subNodes 的分页机制

FlowUs 使用基于父块 `subNodes` 字段的分页机制，保持用户设置的块顺序：


### 游标格式


```plain text
start_cursor = "block_id"
例如: "abc-123-def-456"
```


### 工作原理

- **保持用户排序**: 严格按照父块 `subNodes` 字段中的顺序返回子块
- **简单游标**: 使用子块ID作为游标，简单易用
- **高效查询**: 基于数组索引进行分页，性能优异
- **顺序一致**: 确保返回的子块顺序与用户在界面中看到的一致

### 分页逻辑

- 从父块的 `subNodes` 数组中获取子块ID列表
- 根据 `start_cursor` 在数组中找到起始位置
- 使用数组切片获取当前页的子块ID
- 批量查询子块详细信息并过滤权限
- 返回结果和下一页游标

## 分页特性


### 直接子块查询（非递归）

- **基于 subNodes**: 使用父块的 `subNodes` 字段进行分页
- **优势**:
  - 保持用户设置的块顺序
  - 高效的数组索引操作
  - 简单直观的块ID游标
  - 即使有新数据插入也保持顺序一致性

### 递归子块查询

- **偏移分页**: 使用偏移量进行分页
- **包含总数**: 返回准确的分页信息
- **递归深度限制**: 最大50层，防止无限递归

### 使用建议

- **优先使用非递归模式**：适合大部分场景，保持用户排序
- **合理设置页面大小**：建议20-50条，最大不超过100条
- **使用简单游标**：基于块ID的游标更直观易用

## 错误处理

API 会返回标准的HTTP状态码和错误信息：


### 常见错误码

- `400 Bad Request`: 请求参数错误
  - 缺少必需的 `parent` 参数
  - `properties` 格式不正确
  - 图标或封面URL格式无效
  - 父级类型与属性不匹配（如在普通页面中使用数据库属性）
- `401 Unauthorized`: 认证失败
  - 缺少 `Authorization` 头
  - Token格式错误或已过期
  - 机器人Token无效
- `403 Forbidden`: 权限不足
  - 机器人缺少所需能力（如 `insertContent`、`updateContent`）
  - 机器人没有访问目标页面的权限
  - 尝试操作未授权的页面或数据库
- `404 Not Found`: 资源不存在
  - 页面ID不存在
  - **父级页面或数据库不存在**（容错：API会使用默认位置创建页面）
  - 引用的属性或关系对象不存在
  - `500 Internal Server Error`: 服务器错误
  - 页面创建或更新失败
    - 操作执行失败
    - 权限验证失败

### 错误响应格式


```json
{
  "object": "error",
  "status": 400,
  "code": "validation_error",
  "message": "请求参数验证失败：缺少必需的parent参数"
}
```


### 特定场景错误示例


#### 创建页面错误


```json
// 缺少parent参数
{
  "object": "error",
  "status": 400,
  "code": "validation_error",
  "message": "必须指定parent.database_id或parent.page_id"
}

// 机器人能力不足
{
  "object": "error",
  "status": 403,
  "code": "forbidden",
  "message": "机器人缺少insertContent能力"
}
```


#### 获取页面错误


```json
// 页面不存在
{
  "object": "error",
  "status": 404,
  "code": "not_found",
  "message": "页面不存在"
}

// 权限不足
{
  "object": "error",
  "status": 403,
  "code": "forbidden",
  "message": "机器人没有访问此页面的权限"
}
```


#### 更新页面错误


```json
// 属性类型不匹配
{
  "object": "error",
  "status": 400,
  "code": "validation_error",
  "message": "属性类型不匹配：期待title类型，收到text类型"
}

// 机器人能力不足
{
  "object": "error",
  "status": 403,
  "code": "forbidden",
  "message": "机器人缺少updateContent能力"
}
```
