# FlowUs 帮助中心


📄 **[子页面: FlowUs 动态]**

# 副本FlowUs 开发者文档 -  Beta

# 块 API 文档


## 概述

Blocks API 提供了类似 Notion 的块管理能力，包括获取、创建、更新和删除各种类型的内容块。支持段落、标题、列表、多媒体、布局等多种块类型，以及完整的颜色和格式化功能。


## 基础信息


### API 版本


```plain text
v1
```


### 基础 URL


#### 正式环境


```plain text
https://api.flowus.cn/v1
```


#### 测试环境


```plain text
https://api-test.allflow.cn/v1
```


### 认证

所有 API 请求都需要在 Authorization 头中包含有效的机器人令牌：


```http
Authorization: Bearer <bot_token>
```


> 💡 **获取机器人令牌：** 请参考 插件开发指南 了解如何创建集成应用和获取机器人访问令牌。


## API 接口


### 1. 获取单个块

获取指定块的详细信息。

**请求**


```http
GET /v1/blocks/{block_id}
```

**路径参数**

- `block_id` (string, 必填): 要获取的块ID
**响应示例**


```json
{
  "object": "block",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "parent": {
    "type": "block_id",
    "block_id": "550e8400-e29b-41d4-a716-446655440001"
  },
  "created_time": "2023-12-01T10:00:00.000Z",
  "created_by": {
    "object": "user",
    "id": "user-550e8400-e29b-41d4-a716-446655440000"
  },
  "last_edited_time": "2023-12-01T10:30:00.000Z",
  "last_edited_by": {
    "object": "user",
    "id": "user-550e8400-e29b-41d4-a716-446655440001"
  },
  "archived": false,
  "has_children": true,
  "type": "paragraph",
  "data": {
    "rich_text": [
      {
        "type": "text",
        "text": {
          "content": "这是一个段落块",
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
        "plain_text": "这是一个段落块",
        "href": null
      }
    ],
    "text_color": "default",
    "background_color": "default"
  }
}
```


### 2. 获取块的子块

获取指定块的直接子块列表，支持分页。

**请求**


```http
GET /v1/blocks/{block_id}/children
```

**路径参数**

- `block_id` (string, 必填): 父块ID
**查询参数**

- `page_size` (integer, 可选): 每页返回的块数量，取值范围 1-100，默认 50
- `start_cursor` (string, 可选): 分页游标，使用子块的ID作为游标值
**响应示例**


```json
{
  "object": "list",
  "results": [
    {
      "object": "block",
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "type": "paragraph",
      "data": {
        "rich_text": [
          {
            "type": "text",
            "text": {
              "content": "子块内容",
              "link": null
            }
          }
        ],
        "text_color": "default",
        "background_color": "default"
      }
    }
  ],
  "next_cursor": "550e8400-e29b-41d4-a716-446655440002",
  "has_more": true,
  "type": "block",
  "block": {}
}
```


### 3. 追加子块

向指定块追加一个或多个子块。

**请求**


```http
PATCH /v1/blocks/{block_id}/children
```

**路径参数**

- `block_id` (string, 必填): 父块ID
**请求体**


```json
{
  "children": [
    {
      "type": "paragraph",
      "data": {
        "rich_text": [
          {
            "type": "text",
            "text": {
              "content": "新段落内容",
              "link": null
            },
            "annotations": {
              "bold": false,
              "italic": false,
              "strikethrough": false,
              "underline": false,
              "code": false,
              "color": "default"
            }
          }
        ],
        "text_color": "blue",
        "background_color": "yellow"
      }
    }
  ]
}
```

**限制**

- 单次最多创建 100 个子块
- 每个子块必须指定有效的类型
**响应示例**


```json
{
  "object": "list",
  "results": [
    {
      "object": "block",
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "type": "paragraph",
      "data": {
        "rich_text": [
          {
            "type": "text",
            "text": {
              "content": "新段落内容",
              "link": null
            }
          }
        ],
        "text_color": "blue",
        "background_color": "yellow"
      }
    }
  ],
  "next_cursor": null,
  "has_more": false,
  "type": "block",
  "block": {}
}
```


### 4. 更新块

更新现有块的内容、类型或属性。

**请求**


```http
PATCH /v1/blocks/{block_id}
```

**路径参数**

- `block_id` (string, 必填): 要更新的块ID

#### 4.1 更新块内容

**请求体示例**


```json
{
  "data": {
    "rich_text": [
      {
        "type": "text",
        "text": {
          "content": "更新后的段落内容",
          "link": null
        },
        "annotations": {
          "bold": true,
          "italic": false,
          "strikethrough": false,
          "underline": false,
          "code": false,
          "color": "red"
        }
      }
    ],
    "text_color": "red",
    "background_color": "yellow"
  }
}
```


#### 4.2 更改块类型

**请求体示例**


```json
{
  "type": "heading_1",
  "data": {
    "rich_text": [
      {
        "type": "text",
        "text": {
          "content": "现在是一级标题",
          "link": null
        },
        "annotations": {
          "bold": true,
          "italic": false,
          "strikethrough": false,
          "underline": false,
          "code": false,
          "color": "default"
        }
      }
    ],
    "text_color": "blue",
    "background_color": "default"
  }
}
```


#### 4.3 归档块

**请求体示例**


```json
{
  "archived": true
}
```

**响应示例**


```json
{
  "object": "block",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "heading_1",
  "data": {
    "rich_text": [
      {
        "type": "text",
        "text": {
          "content": "现在是一级标题",
          "link": null
        }
      }
    ],
    "text_color": "blue",
    "background_color": "default"
  }
}
```


### 5. 删除块

删除指定块及其所有子块。此操作不可逆。

**请求**


```http
DELETE /v1/blocks/{block_id}
```

**路径参数**

- `block_id` (string, 必填): 要删除的块ID
**响应示例**


```json
{
  "object": "block",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "deleted": true
}
```


## 支持的块类型

FlowUs Blocks API 支持丰富的块类型，涵盖文本、媒体、布局等各种内容形式：


### 块类型概览


---








### 颜色支持

所有文本类块类型都支持双层颜色系统：

- **块级别颜色**：`text_color` 和 `background_color`
- **富文本级别颜色**：`annotations.color`
支持的颜色值：`default`, `gray`, `brown`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, `red`


> 💡 **详细说明：** 每种块类型的具体对象结构、属性定义和使用示例，请参考 Block 对象实体文档。


## 富文本对象

富文本对象用于表示格式化的文本内容，支持以下类型：


### 支持的富文本类型


---






### 格式化支持

所有富文本类型都支持 `annotations` 格式化：

- **样式**：`bold`, `italic`, `strikethrough`, `underline`, `code`
- **颜色**：`color` (支持所有标准颜色值)
- **链接**：`href` 和 `text.link`

> 💡 **详细说明：** 富文本对象的完整结构定义和使用示例，请参考 Block 对象实体文档。


## 使用示例


### 创建复杂内容结构


```http
PATCH /v1/blocks/parent-block-id/children
Authorization: Bearer your_bot_token
Content-Type: application/json

{
  "children": [
    {
      "type": "heading_1",
      "data": {
        "rich_text": [
          {
            "type": "text",
            "text": {
              "content": "项目文档",
              "link": null
            },
            "annotations": {
              "bold": true,
              "color": "blue"
            }
          }
        ],
        "text_color": "blue",
        "background_color": "default"
      }
    },
    {
      "type": "callout",
      "data": {
        "rich_text": [
          {
            "type": "text",
            "text": {
              "content": "这是一个重要提示，请仔细阅读！",
              "link": null
            }
          }
        ],
        "icon": {
          "emoji": "⚠️"
        },
        "text_color": "default",
        "background_color": "yellow"
      }
    },
    {
      "type": "paragraph",
      "data": {
        "rich_text": [
          {
            "type": "text",
            "text": {
              "content": "项目负责人：",
              "link": null
            }
          },
          {
            "type": "mention",
            "mention": {
              "type": "user",
              "user": {
                "id": "user-123"
              }
            }
          },
          {
            "type": "text",
            "text": {
              "content": "，完成时间：",
              "link": null
            }
          },
          {
            "type": "mention",
            "mention": {
              "type": "date",
              "date": {
                "start": "2023-12-31",
                "end": null,
                "time_zone": null
              }
            }
          }
        ],
        "text_color": "default",
        "background_color": "default"
      }
    },
    {
      "type": "to_do",
      "data": {
        "rich_text": [
          {
            "type": "text",
            "text": {
              "content": "完成需求分析",
              "link": null
            }
          }
        ],
        "checked": true,
        "text_color": "green",
        "background_color": "default"
      }
    },
    {
      "type": "to_do",
      "data": {
        "rich_text": [
          {
            "type": "text",
            "text": {
              "content": "完成代码开发",
              "link": null
            }
          }
        ],
        "checked": false,
        "text_color": "default",
        "background_color": "default"
      }
    },
    {
      "type": "code",
      "data": {
        "rich_text": [
          {
            "type": "text",
            "text": {
              "content": "function calculateProgress() {\n  const completed = tasks.filter(t => t.done).length;\n  const total = tasks.length;\n  return (completed / total) * 100;\n}",
              "link": null
            }
          }
        ],
        "language": "javascript"
      }
    },
    {
      "type": "divider",
      "data": {}
    },
    {
      "type": "table",
      "data": {
        "table_width": 3,
        "has_column_header": true,
        "has_row_header": false
      }
    }
  ]
}
```


### 更新块内容和颜色


```http
PATCH /v1/blocks/block-id
Authorization: Bearer your_bot_token
Content-Type: application/json

{
  "data": {
    "rich_text": [
      {
        "type": "text",
        "text": {
          "content": "这是更新后的内容，",
          "link": null
        },
        "annotations": {
          "bold": true,
          "color": "red"
        }
      },
      {
        "type": "text",
        "text": {
          "content": "部分文字有特殊格式。",
          "link": null
        },
        "annotations": {
          "italic": true,
          "underline": true,
          "color": "blue"
        }
      }
    ],
    "text_color": "default",
    "background_color": "yellow"
  }
}
```


## 错误处理


### HTTP 状态码


---











### 错误响应格式


```json
{
  "object": "error",
  "status": 400,
  "code": "validation_error",
  "message": "请求参数验证失败",
  "details": {
    "field": "children",
    "reason": "必须提供至少一个子块"
  }
}
```


### 常见错误类型


#### 1. 参数验证错误 (validation_error)


```json
{
  "object": "error",
  "status": 400,
  "code": "validation_error",
  "message": "必须提供至少一个子块"
}
```


#### 2. 权限不足 (forbidden)


```json
{
  "object": "error",
  "status": 403,
  "code": "forbidden",
  "message": "机器人没有访问此块的权限"
}
```


#### 3. 块不存在 (not_found)


```json
{
  "object": "error",
  "status": 404,
  "code": "not_found",
  "message": "指定的块不存在"
}
```


#### 4. 块类型不支持 (unsupported_block_type)


```json
{
  "object": "error",
  "status": 422,
  "code": "unsupported_block_type",
  "message": "不支持的块类型: invalid_type"
}
```


## API 限制


### 请求限制

- **单次创建块数量**：最多100个子块
- **富文本长度**：单个富文本段落最大2000字符
- **嵌套深度**：块嵌套深度不超过50层
- **分页大小**：分页查询最大页面大小为100

### 频率限制

- **读取操作**：每分钟1000次请求
- **写入操作**：每分钟100次请求
- **批量操作**：每分钟10次请求

### 存储限制

- **文件大小**：单个文件最大100MB
- **图片尺寸**：最大20MB，推荐尺寸不超过4K
- **总存储**：根据空间套餐限制

## 最佳实践


### 1. 操作优化

- **批量操作**：一次性创建多个块而不是逐个创建
- **分页处理**：对于大量子块，使用分页获取
- **合理使用**：避免不必要的API调用

### 2. 错误处理

- **重试机制**：对于临时错误实现合理重试
- **优雅降级**：当某些块类型不支持时提供备选方案
- **用户反馈**：向用户提供清晰的错误信息

### 3. 内容结构

- **层次清晰**：合理使用标题层级组织内容
- **格式一致**：保持相同类型内容的格式一致性
- **颜色适度**：避免过度使用颜色造成视觉干扰

### 4. 权限管理

- **最小权限**：机器人只申请必要的权限
- **权限检查**：在操作前检查机器人权限
- **错误处理**：处理权限不足的情况

## 相关文档

- Block 对象实体文档 - 所有块类型的详细对象结构和属性定义
- 插件开发指南 - 了解如何创建集成应用和获取机器人Token
- 机器人API详细文档 - 机器人API的完整参考
- Pages API文档 - 页面管理API
- Database API文档 - 数据库管理API

## 快速参考


### 常用块类型创建模板


#### 段落


```json
{
  "type": "paragraph",
  "data": {
    "rich_text": [{"type": "text", "text": {"content": "内容"}}],
    "text_color": "default",
    "background_color": "default"
  }
}
```


#### 标题


```json
{
  "type": "heading_1",
  "data": {
    "rich_text": [{"type": "text", "text": {"content": "标题"}}],
    "text_color": "default",
    "background_color": "default"
  }
}
```


#### 代办事项


```json
{
  "type": "to_do",
  "data": {
    "rich_text": [{"type": "text", "text": {"content": "任务"}}],
    "checked": false,
    "text_color": "default",
    "background_color": "default"
  }
}
```


#### 代码块


```json
{
  "type": "code",
  "data": {
    "rich_text": [{"type": "text", "text": {"content": "代码"}}],
    "language": "javascript"
  }
}
```


#### 标注块


```json
{
  "type": "callout",
  "data": {
    "rich_text": [{"type": "text", "text": {"content": "提示"}}],
    "icon": {"emoji": "💡"},
    "text_color": "default",
    "background_color": "yellow"
  }
}
```
