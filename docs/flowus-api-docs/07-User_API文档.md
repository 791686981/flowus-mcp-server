# FlowUs 帮助中心


📄 **[子页面: FlowUs 动态]**

# 副本FlowUs 开发者文档 -  Beta

# User API 文档


## 概述

机器人用户 API 提供了获取机器人创建者信息的功能。这些API允许机器人了解创建它的用户信息。


## 认证

所有 API 请求都需要在 HTTP 头中包含机器人的 Bearer Token：


```plain text
Authorization: Bearer your_bot_token_here
```


## API 接口


### 获取机器人创建者信息

获取当前机器人的创建者用户信息。


#### 请求


```http
GET /v1/users/me
```


#### 权限要求

- 机器人需要具备 `readContent` 能力

#### 响应

**成功响应 (200 OK):**


```json
{
  "object": "user",
  "id": "875bb809-eab6-467f-80d9-a7de6899d885",
  "type": "person",
  "person": {
    "email": "user@example.com"
  },
  "name": "张三",
  "avatar_url": "https://cdn2.flowus.cn/avatar123.jpg"
}
```


#### 响应字段说明


---










#### 错误响应

**401 Unauthorized - 认证失败:**


```json
{
  "error": {
    "code": "unauthorized",
    "message": "缺少Authorization header"
  }
}
```

**403 Forbidden - 权限不足:**


```json
{
  "error": {
    "code": "forbidden", 
    "message": "机器人没有readContent权限"
  }
}
```

**404 Not Found - 创建者不存在:**


```json
{
  "error": {
    "code": "not_found",
    "message": "机器人创建者不存在"
  }
}
```


## 使用示例


### JavaScript 示例


```javascript
class FlowUsBot {
  constructor(token) {
    this.token = token;
    this.baseUrl = 'https://api.flowus.cn';
  }

  async getMe() {
    const response = await fetch(`${this.baseUrl}/v1/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return await response.json();
  }
}

// 使用示例
async function example() {
  const bot = new FlowUsBot('your_bot_token_here');
  
  try {
    const creator = await bot.getMe();
    console.log('机器人创建者信息:', {
      id: creator.id,
      name: creator.name,
      email: creator.person?.email,
      hasAvatar: !!creator.avatar_url
    });
  } catch (error) {
    console.error('获取创建者信息失败:', error.message);
  }
}
```


### cURL 示例


```plain text
curl -X GET "https://api.flowus.cn/v1/users/me" \
  -H "Authorization: Bearer your_bot_token_here" \
  -H "Content-Type: application/json"
```


### Python 示例


```python
import requests

class FlowUsBot:
    def __init__(self, token):
        self.token = token
        self.base_url = 'https://api.flowus.cn'
    
    def get_me(self):
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get(f'{self.base_url}/v1/users/me', headers=headers)
        response.raise_for_status()
        return response.json()

# 使用示例
if __name__ == '__main__':
    bot = FlowUsBot('your_bot_token_here')
    
    try:
        creator = bot.get_me()
        print(f"创建者: {creator['name']} ({creator['id']})")
        if creator.get('person', {}).get('email'):
            print(f"邮箱: {creator['person']['email']}")
    except requests.RequestException as e:
        print(f"请求失败: {e}")
```


## 使用场景


### 1. 个性化欢迎消息

根据机器人创建者的信息，生成个性化的欢迎消息：


```javascript
async function generateWelcomeMessage(bot) {
  const creator = await bot.getMe();
  const name = creator.name || '用户';
  return `Hello ${name}! 我是您创建的FlowUs机器人，很高兴为您服务！`;
}
```
