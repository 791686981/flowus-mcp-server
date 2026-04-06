# FlowUs 帮助中心


📄 **[子页面: FlowUs 动态]**

# 副本FlowUs 开发者文档 -  Beta

# 多维表 API 文档

Database API 提供了对FlowUs多维表（数据库）的完整管理功能，包括创建、查询、检索和更新操作。


## 概述

Database API 支持以下功能：

- 创建新的数据库
- 获取数据库信息
- 查询数据库记录（支持过滤、排序、分页）
- 更新数据库配置

## 认证

所有API请求都需要在Header中包含Bot Token：


```plain text
Authorization: Bearer <your_bot_token>
```


## 基础 URL


### 正式环境


```plain text
https://api.flowus.cn/v1
```


### 测试环境


```plain text
https://api-test.allflow.cn/v1
```


## 数据格式说明


### 数据格式说明

Database API 使用标准化的数据格式，确保跨平台兼容性：


## 数据库对象

数据库对象包含以下属性：


```json
{
  "object": "database",
  "id": "uuid",
  "created_time": "2024-01-01T00:00:00.000Z",
  "created_by": {
    "object": "user",
    "id": "uuid"
  },
  "last_edited_time": "2024-01-01T00:00:00.000Z",
  "last_edited_by": {
    "object": "user",
    "id": "uuid"
  },
  "title": [
    {
      "type": "text",
      "text": {
        "content": "数据库标题"
      }
    }
  ],
  "icon": {
    "type": "emoji",
    "emoji": "📋"
  },
  "cover": {
    "type": "external",
    "external": {
      "url": "https://example.com/cover.jpg"
    }
  },
  "properties": {
    "property_id": {
      "id": "property_id",
      "name": "属性名称",
      "type": "property_type"
    }
  },
  "parent": {
    "type": "page_id",
    "page_id": "uuid"
  },
        "url": "https://api.flowus.cn/docs/xxx", // 正式环境
  "archived": false,
  "is_inline": false
}
```


## 属性类型

支持的属性类型及其配置：


### 基础属性类型


#### title（标题）


```json
{
  "id": "title",
  "name": "标题",
  "type": "title",
  "title": {}
}
```


#### rich_text（富文本）


```json
{
  "id": "description",
  "name": "描述",
  "type": "rich_text",
  "rich_text": {}
}
```


#### number（数字）


```json
{
  "id": "amount",
  "name": "金额",
  "type": "number",
  "number": {
    "format": "number"
  }
}
```


#### checkbox（复选框）


```json
{
  "id": "completed",
  "name": "是否完成",
  "type": "checkbox",
  "checkbox": {}
}
```

**数据格式：**

- API接受：`{"checkbox": true}` 或 `{"checkbox": false}`

#### date（日期）


```json
{
  "id": "due_date",
  "name": "截止日期",
  "type": "date",
  "date": {}
}
```

**数据格式：**

- API格式：`{"start": "2024-01-01T10:30:00", "end": null}`

#### url（链接）


```json
{
  "id": "website",
  "name": "网站",
  "type": "url",
  "url": {}
}
```


#### email（邮箱）


```json
{
  "id": "email",
  "name": "邮箱",
  "type": "email",
  "email": {}
}
```


#### phone_number（电话）


```json
{
  "id": "phone",
  "name": "电话",
  "type": "phone_number",
  "phone_number": {}
}
```


### 选择属性类型


#### select（单选）


```json
{
  "id": "status",
  "name": "状态",
  "type": "select",
  "select": {
    "options": [
      {
        "id": "option_id",
        "name": "选项名称",
        "color": "blue"
      }
    ]
  }
}
```


#### multi_select（多选）


```json
{
  "id": "tags",
  "name": "标签",
  "type": "multi_select",
  "multi_select": {
    "options": [
      {
        "id": "option_id",
        "name": "标签名称",
        "color": "green"
      }
    ]
  }
}
```


### 关联属性类型


#### people（人员）


```json
{
  "id": "assignee",
  "name": "负责人",
  "type": "people",
  "people": {}
}
```

**数据格式：**

- API格式：`[{"object": "user", "id": "user-uuid"}]`

#### files（文件）


```json
{
  "id": "attachments",
  "name": "附件",
  "type": "files",
  "files": {}
}
```

**数据格式：**

- API格式：`[{"name": "file.pdf", "type": "external", "external": {"url": "..."}}]`

#### relation（关联）


```json
{
  "id": "project",
  "name": "关联项目",
  "type": "relation",
  "relation": {
    "database_id": "related_database_id",
    "synced_property_id": "synced_property_id"
  }
}
```


#### rollup（汇总）


```json
{
  "id": "task_count",
  "name": "任务数量",
  "type": "rollup",
  "rollup": {
    "relation_property_id": "relation_property_id",
    "rollup_property_id": "property_to_rollup",
    "function": "count"
  }
}
```


#### formula（公式）


```json
{
  "id": "calculated_field",
  "name": "计算字段",
  "type": "formula",
  "formula": {
    "expression": "prop(\"other_property_id\")",
    "version": 2,
    "refProps": {
      "other_property_id": "引用的属性名"
    }
  }
}
```

**注意：** Formula属性主要支持读取，创建和更新功能有一定限制。


### 系统属性类型


#### created_time（创建时间）


```json
{
  "id": "created_time",
  "name": "创建时间",
  "type": "created_time",
  "created_time": {}
}
```


#### created_by（创建者）


```json
{
  "id": "created_by",
  "name": "创建者",
  "type": "created_by",
  "created_by": {}
}
```


#### last_edited_time（最后编辑时间）


```json
{
  "id": "last_edited_time",
  "name": "最后编辑时间",
  "type": "last_edited_time",
  "last_edited_time": {}
}
```


#### last_edited_by（最后编辑者）


```json
{
  "id": "last_edited_by",
  "name": "最后编辑者",
  "type": "last_edited_by",
  "last_edited_by": {}
}
```


## API 接口


### 1. 创建数据库

创建一个新的数据库。


```plain text
POST /v1/databases
```


#### 请求体


```json
{
  "parent": {
    "type": "page_id",
    "page_id": "string"
  },
  "title": [
    {
      "type": "text",
      "text": {
        "content": "string"
      }
    }
  ],
  "icon": {
    "type": "emoji",
    "emoji": "string"
  },
  "cover": {
    "type": "external",
    "external": {
      "url": "string"
    }
  },
  "properties": {
    "property_id": {
      "id": "string",
      "name": "string",
      "type": "property_type"
    }
  },
  "is_inline": false
}
```


#### 参数说明


---









#### 响应

返回创建的数据库对象。


#### 示例


```json
{
  "parent": {
    "type": "page_id",
    "page_id": "123e4567-e89b-12d3-a456-426614174000"
  },
  "title": [
    {
      "type": "text",
      "text": {
        "content": "任务管理"
      }
    }
  ],
  "icon": {
    "type": "emoji",
    "emoji": "📋"
  },
  "properties": {
    "title": {
      "id": "title",
      "name": "任务名称",
      "type": "title"
    },
    "status": {
      "id": "status",
      "name": "状态",
      "type": "select",
      "select": {
        "options": [
          {
            "name": "待办",
            "color": "red"
          },
          {
            "name": "进行中",
            "color": "yellow"
          },
          {
            "name": "完成",
            "color": "green"
          }
        ]
      }
    },
    "due_date": {
      "id": "due_date",
      "name": "截止日期",
      "type": "date"
    }
  }
}
```


### 2. 获取数据库

获取指定数据库的信息。


```plain text
GET /v1/databases/{database_id}
```


#### 路径参数


---




#### 响应

返回数据库对象。


### 3. 查询数据库

查询数据库中的记录，支持过滤、排序和分页。


```plain text
POST /v1/databases/{database_id}/query
```


#### 路径参数


---




#### 请求体


```json
{
  "start_cursor": "string",
  "page_size": 50
}
```


#### 参数说明


---







#### 响应


```json
{
  "object": "list",
  "results": [
    {
      "object": "page",
      "id": "uuid",
      "created_time": "2024-01-01T00:00:00.000Z",
      "created_by": {
        "object": "user",
        "id": "uuid"
      },
      "last_edited_time": "2024-01-01T00:00:00.000Z",
      "last_edited_by": {
        "object": "user",
        "id": "uuid"
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
                "content": "任务标题"
              }
            }
          ]
        }
      },
      "parent": {
        "type": "database_id",
        "database_id": "uuid"
      },
      "url": "https://api.flowus.cn/docs/xxx" // 正式环境
    }
  ],
  "next_cursor": "string",
  "has_more": false,
  "type": "page",
  "page": {}
}
```


### 4. 更新数据库

更新数据库的配置，包括标题、图标、封面、属性等。


```plain text
PATCH /v1/databases/{database_id}
```


#### 路径参数


---




#### 请求体


```json
{
  "title": [
    {
      "type": "text",
      "text": {
        "content": "string"
      }
    }
  ],
  "icon": {
    "type": "emoji",
    "emoji": "string"
  },
  "cover": {
    "type": "external",
    "external": {
      "url": "string"
    }
  },
  "properties": {
    "property_id": {
      "id": "string",
      "name": "string",
      "type": "property_type"
    }
  },
  "archived": false
}
```


#### 参数说明


---








#### 响应

返回更新后的数据库对象。


#### 示例


#### 更新标题和图标


```json
{
  "title": [
    {
      "type": "text",
      "text": {
        "content": "更新后的数据库标题"
      }
    }
  ],
  "icon": {
    "type": "external",
    "external": {
      "url": "https://example.com/new-icon.png"
    }
  }
}
```


#### 添加新属性


```json
{
  "properties": {
    "assignee": {
      "id": "assignee",
      "name": "负责人",
      "type": "people"
    },
    "estimated_hours": {
      "id": "estimated_hours",
      "name": "预估工时",
      "type": "number"
    }
  }
}
```


#### 删除属性


```json
{
  "properties": {
    "old_property": null
  }
}
```


#### 归档数据库


```json
{
  "archived": true
}
```


## 数据类型支持

Database API 支持丰富的数据类型，包括：

- **基础类型**：文本、数字、复选框、日期、链接、邮箱、电话
- **选择类型**：单选、多选
- **关联类型**：人员、文件、关联、汇总、公式
- **系统类型**：创建时间、创建者、最后编辑时间、最后编辑者
各种数据类型的详细格式和使用方法请参考上述属性类型说明。


## 错误处理

API使用标准HTTP状态码返回错误信息：

- `400 Bad Request`：请求参数错误
- `401 Unauthorized`：认证失败
- `403 Forbidden`：权限不足
- `404 Not Found`：资源不存在
- `500 Internal Server Error`：服务器错误
错误响应格式：


```json
{
  "object": "error",
  "status": 400,
  "code": "validation_error",
  "message": "详细错误信息"
}
```


## 使用限制

- 每个数据库最多支持100个属性
- 查询时每页最多返回100条记录
- 单选和多选属性的选项数量限制为100个
- 数据库标题最长为100个字符
- Formula属性主要支持读取，创建功能可能受限

## 最佳实践

- **分页查询**：对于大型数据库，建议使用适当的页面大小进行分页查询
- **过滤优化**：合理使用过滤器减少返回的数据量
- **属性设计**：根据实际需求设计数据库属性，避免冗余
- **权限管理**：确保机器人具有相应的读写权限
- **错误处理**：实现适当的错误处理和重试机制
- **数据处理**：正确使用各种数据类型的格式要求

## 测试建议

- **验证类型转换**：测试各种属性类型的创建和查询
- **检查日期格式**：确认日期时间的正确格式
- **测试文件上传**：验证文件的正确处理
- **复选框功能**：测试true/false值的处理
- **Formula属性**：验证复杂公式的读取和显示
- **人员属性**：测试用户UUID的正确映射

## 示例用例


### 任务管理系统

创建一个任务管理数据库：


```json
{
  "parent": {
    "type": "page_id",
    "page_id": "workspace-page-id"
  },
  "title": [
    {
      "type": "text",
      "text": {
        "content": "任务管理"
      }
    }
  ],
  "icon": {
    "type": "emoji",
    "emoji": "✅"
  },
  "properties": {
    "name": {
      "id": "name",
      "name": "任务名称",
      "type": "title"
    },
    "status": {
      "id": "status",
      "name": "状态",
      "type": "select",
      "select": {
        "options": [
          {"name": "待办", "color": "red"},
          {"name": "进行中", "color": "yellow"},
          {"name": "完成", "color": "green"}
        ]
      }
    },
    "assignee": {
      "id": "assignee",
      "name": "负责人",
      "type": "people"
    },
    "due_date": {
      "id": "due_date",
      "name": "截止日期",
      "type": "date"
    },
    "priority": {
      "id": "priority",
      "name": "优先级",
      "type": "select",
      "select": {
        "options": [
          {"name": "低", "color": "green"},
          {"name": "中", "color": "yellow"},
          {"name": "高", "color": "red"}
        ]
      }
    }
  }
}
```


### 客户关系管理

创建一个CRM数据库：


```json
{
  "parent": {
    "type": "page_id",
    "page_id": "crm-page-id"
  },
  "title": [
    {
      "type": "text",
      "text": {
        "content": "客户管理"
      }
    }
  ],
  "properties": {
    "company": {
      "id": "company",
      "name": "公司名称",
      "type": "title"
    },
    "contact_person": {
      "id": "contact_person",
      "name": "联系人",
      "type": "rich_text"
    },
    "email": {
      "id": "email",
      "name": "邮箱",
      "type": "email"
    },
    "phone": {
      "id": "phone",
      "name": "电话",
      "type": "phone_number"
    },
    "website": {
      "id": "website",
      "name": "网站",
      "type": "url"
    },
    "industry": {
      "id": "industry",
      "name": "行业",
      "type": "select",
      "select": {
        "options": [
          {"name": "科技", "color": "blue"},
          {"name": "金融", "color": "green"},
          {"name": "教育", "color": "yellow"},
          {"name": "医疗", "color": "red"}
        ]
      }
    },
    "deal_stage": {
      "id": "deal_stage",
      "name": "成交阶段",
      "type": "select",
      "select": {
        "options": [
          {"name": "潜在客户", "color": "gray"},
          {"name": "初步接触", "color": "yellow"},
          {"name": "需求确认", "color": "orange"},
          {"name": "方案制定", "color": "blue"},
          {"name": "合同谈判", "color": "purple"},
          {"name": "成交", "color": "green"}
        ]
      }
    }
  }
}
```
