const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const yaml = require('js-yaml');
const ncp = require('ncp').ncp;

// 读取配置文件
const CONFIGS = yaml.load(fs.readFileSync('./confs.yaml', 'utf8'));

// 生成12位UUID
const GENERATE_ID = () => {
    return uuidv4().replace(/-/g, '').slice(0, 12);
};

// 生成8位UUID
const GENERATE_TOKEN = () => {
    return uuidv4().replace(/-/g, '').slice(0, 8);
};

// 分配可用端口（在配置文件定义的范围内）
const ALLOCATION_PORT = () => {
    const start = CONFIGS.port_range.start;
    const end = CONFIGS.port_range.end;
    return Math.floor(Math.random() * (end - start + 1)) + start;
};

// 创建工作目录卷
const GET_VOLUME = instance_id => {
    const volumePath = path.join(__dirname, CONFIGS.volume_base_path || './workspcae', instance_id);
    if (!fs.existsSync(volumePath)) {
        fs.mkdirSync(volumePath, { recursive: true });
    }
    return volumePath;
};

// 拷贝模板目录到工作目录
const COPY_TO_WORKSPACE = (template_name, volume_path, callback) => {
    const templatePath = path.join(__dirname, 'template', template_name);
    if (!fs.existsSync(templatePath)) {
        return callback(new Error(`Template ${template_name} does not exist`));
    }

    ncp(templatePath, volume_path, (err) => {
        if (err) {
            return callback(err);
        }
        callback(null);
    });
};

module.exports = {
    CONFIGS,
    GENERATE_ID,
    GENERATE_TOKEN,
    ALLOCATION_PORT,
    GET_VOLUME,
    COPY_TO_WORKSPACE,
};
