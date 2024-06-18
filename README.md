# Notebook Hub

---

Notebook Hub 是一个用于管理 Jupyter Notebook 容器的 API 服务。该服务基于 Express.js 构建，并使用 SQLite 数据库来管理容器信息。通过该服务，用户可以启动、停止、列出、删除 Jupyter Notebook 容器。



## 项目环境

- Docker
- Node.js



## 构建和运行

#### 1. 安装依赖项

```bash
npm install
```

#### 2. 启动运行

```bash
npm run start
```



## 目录结构

```
arduino
Copy code
notebook-hub/
├── Dockerfile
├── README.md
├── database.js
├── index.js
├── package.json
├── tools.js
├── confs.yaml ### 项目配置文件 ###
└── template/
    └── base-notebook/
```



## 配置文件

### confs.yaml

配置文件 `confs.yaml` 包含以下配置项：

```yaml
# notebook-hub 服务端口
PORT: 7000

# notebook 访问地址（不设置，为空时！为业务服务控制的访问服务地址）
NOTEBOOK_HOST:
# notebook 的web访问API地址
NOTEBOOK_PATH: /lab?token={JUPYTER_TOKEN}

# notebook 所使用的 jupyter-lab 镜像
image_from: quay.io/jupyter/pytorch-notebook
# 最大可以启动的 notebook 实例数量
max_instances: 10

# notebook 的web服务端口映射范围
port_range:
  start: 8000
  end: 9000

# notebook 持久化workspace的管理根目录
volume_base_path: "./workspace"

```



## 功能

- 启动 Jupyter Notebook 容器
- 停止 Jupyter Notebook 容器
- 列出所有 Jupyter Notebook 容器
- 删除 Jupyter Notebook 容器及其挂载的卷
- 强制删除运行中的容器及其挂载的卷



## API

### 启动 Jupyter Notebook 容器

**URL:** `/start`  
**方法:** `POST`  
**参数:**

- `instance` (可选): 实例 ID，字符串类型
- `template` (可选): 模板名称，字符串类型
- `options` (可选): 其他配置项，JSON 对象

**请求示例:**

```bash
curl -X POST http://localhost:7000/start \
  -F "instance=example_instance" \
  -F "template=base-notebook" \
  -F "options={\"key\":\"value\"}"

```

**响应示例:**

```json
{
  "url": "http://localhost:8888/lab",
  "token": ""
}
```

### 停止 Jupyter Notebook 容器

**URL:** `/stop/:id`
**方法:** `GET`
**参数:**

- `id`: 容器 ID，字符串类型

**请求示例:**

```bash
curl -X GET http://localhost:7000/stop/shortCid
```

**响应示例:**

```json
{
  "message": "Container stopped successfully"
}
```

### 列出所有 Notebook 容器

**URL:** `/:status?`
**方法:** `GET`
**参数:**

- `status` (可选): 容器状态，可选值为 `running`, `stopped`, `deleted`

**请求示例:**

```bash
curl -X GET http://localhost:7000/
```

**响应示例:**

```json
[
  {
    "id": "123456789abc",
    "name": "jupyter_container_123456789abc",
    "port": 8888,
    "volume": "/path/to/volume/123456789abc",
    "cid": "abcdef123456",
    "ctime": "2024-06-18T13:25:28.710Z",
    "status": "running"
  }
]
```

### 删除 Notebook 容器

**URL:** `/:id`
**方法:** `DELETE`
**参数:**

- `id`: 容器 ID，字符串类型

**请求示例:**

```bash
curl -X DELETE http://localhost:7000/shortCid
```

**响应示例:**

```json
{
  "message": "Container deleted successfully"
}
```

### 强制 - 删除运行中的容器

**URL:** `/:id/force`
**方法:** `GET`
**参数:**

- `id`: 容器 ID，字符串类型

**请求示例:**

```bash
curl -X GET http://localhost:7000/shortCid/force
```

**响应示例:**

```json
{
  "message": "Container force deleted successfully"
}
```



### 构建和运行

1. 克隆项目：

```bash
git clone https://github.com/zonebond/notebook-hub.git
cd notebook-hub
```



## 贡献

欢迎提交问题和请求，也欢迎提交拉取请求。



## 许可证

该项目使用 MIT 许可证。

```markdown
通过这个 README.md 文件，用户可以了解 `notebook-hub` 项目的功能、API 以及如何构建和运行该项目。
```





