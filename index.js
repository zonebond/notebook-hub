
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const yaml = require('js-yaml');

const multer = require('multer');
const bodyParser = require('body-parser');

// const axios = require('axios');
const { GENERATE_ID, ALLOCATION_PORT, GET_VOLUME, GENERATE_TOKEN, COPY_TO_WORKSPACE } = require('./tools');
const db = require('./database');

// 读取配置文件
const CONFIGs = yaml.load(fs.readFileSync('./confs.yaml', 'utf8'));

const app = express();
const port = CONFIGs.PORT || 3000;

// const upload = multer();

// 使用 body-parser 中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 创建Jupyter容器
app.post('/notebook', (req, res) => {
    db.get_containers(null, (err, containers) => {
        const { instance, template, options } = req.body;

        // if (!instance || !template || !options) {
        //     return res.status(400).send('Missing required parameters');
        // }

        const runningContainers = containers.filter(container => container.status === 'running');

        if (runningContainers.length >= CONFIGs.max_instances) {
            return res.status(400).send('Maximum number of instances reached');
        }

        const unique_id = instance || `${GENERATE_ID()}`
        const container_name = `notebook_${unique_id}`
        const container_port = ALLOCATION_PORT();
        const work_volume = GET_VOLUME(unique_id);

        const optionsMap = options ? JSON.parse(options) : {};

        COPY_TO_WORKSPACE(template || 'base-notebook', work_volume, (err) => {
            if(err) {
                return res.status(500).send('Failed to copy template to workspace');
            }

            const JUPYTER_TOKEN = GENERATE_TOKEN();
        
            // -e JUPYTER_TOKEN=${JUPYTER_TOKEN}
            const command = `docker run -d --name ${container_name} -p ${container_port}:8888 -v ${work_volume}:/home/jovyan ${CONFIGs.image_from} start.sh jupyter lab --NotebookApp.token='${JUPYTER_TOKEN}'`;
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    return res.status(500).send('Failed to start Jupyter container');
                }

                const cid = stdout.trim();
                
                db.insert_container(container_name, container_port, work_volume, JUPYTER_TOKEN, cid, (err, container) => {
                    if (err) {
                        return res.status(500).send('Failed to insert container info');
                    }

                    let web_url = `${CONFIGs.NOTEBOOK_HOST || ''}:${container.port}${CONFIGs.NOTEBOOK_PATH}`;

                    web_url = web_url.replace('{JUPYTER_TOKEN}', JUPYTER_TOKEN);

                    res.json({ container, NOTEBOOK_TOKEN: JUPYTER_TOKEN, web_url });
                });
            });

        });

    })
});

// 停止Jupyter容器
app.post('/stop/:id', (req, res) => {
    const cid = req.params.id;
    console.log('stop container id:', cid);

    db.get_target_container(cid, (err, container) => {
        if (err) {
            return res.status(500).send('Failed to retrieve container info');
        }

        if (container) {
            const { id: id, name: container_name, status } = container;
            console.log('stop container name:', container_name);

            if(status === 'stopped') {
                return res.status(400).send('Container already stopped');
            }

            exec(`docker stop ${container_name}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                }

                db.update_container_status(id, 'stopped', (err, result) => {
                    if (err) {
                        return res.status(500).send('Failed to update container status');
                    }
                    res.json(result);
                });
            });
        } else {
            res.status(404).send('Container not found');
        }
    });
});

// 重启Jupyter容器
app.post('/restart/:id', (req, res) => {
    const cid = req.params.id;
    console.log('restart container id:', cid);

    db.get_target_container(cid, (err, container) => {
        if (err) {
            return res.status(500).send('Failed to retrieve container info');
        }

        if (container) {
            const { id: id, name: container_name, status } = container;
            console.log('restart container name:', container_name);

            if(status === 'running') {
                return res.status(400).send('Container already running');
            }

            exec(`docker start ${container_name}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                }

                db.update_container_status(id, 'running', (err, result) => {
                    if (err) {
                        return res.status(500).send('Failed to update container status');
                    }
                    res.json(result);
                });
            });
        } else {
            res.status(404).send('Container not found');
        }
    });
});

// 强制删除Jupyter容器
app.delete('/:id/force', (req, res) => {
    const cid = req.params.id;
    console.log('force delete container id:', cid);

    db.get_target_container(cid, (err, container) => {
        if (err) {
            return res.status(500).send('Failed to retrieve container info');
        }

        if (container) {
            const { id: id, name: container_name, volume } = container;
            console.log('force delete container name:', container_name);

            exec(`docker rm -f ${container_name}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                }

                db.delete_container(id, (err, result) => {
                    if (err) {
                        return res.status(500).send('Failed to delete container');
                    }

                    // 删除挂载的卷
                    fs.rm(volume, { recursive: true }, (err) => {
                        if (err) {
                            console.error(`Failed to delete volume: ${err}`);
                            return res.status(500).send('Failed to delete volume');
                        }
                    });

                    res.json(result);
                });
            });
        } else {
            res.status(404).send('Container not found');
        }
    });
});


// 删除Jupyter容器
app.delete('/:id', (req, res) => {
    const cid = req.params.id;

    db.get_target_container(cid, (err, container) => {
        if (err) {
            return res.status(500).send('Failed to retrieve container info');
        }

        if (container) {
            const { id: id, name: container_name, status, volume } = container;

            if(status === 'running') {
                return res.status(400).send('Container is running');
            }

            exec(`docker rm ${container_name}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                }

                db.delete_container(id, (err, result) => {
                    if (err) {
                        return res.status(500).send('Failed to delete container');
                    }

                    // 删除挂载的卷
                    fs.rm(volume, { recursive: true }, (err) => {
                        if (err) {
                            console.error(`Failed to delete volume: ${err}`);
                            return res.status(500).send('Failed to delete volume');
                        }
                    });

                    res.json(result);
                });
            });
        } else {
            res.status(404).send('Container not found');
        }
    });
});

// 列出所有Jupyter容器
const VALIDSTATUSES = ['running', 'stopped', 'deleted'];

app.get('/:status?', (req, res) => {
    const status = req.params.status || null;
    

    if(status) {
        if(status.indexOf('hb.') === 0) {
            console.log('get target container:', status)
            db.get_target_container(status, (err, row) => {
                if (err) {
                    return res.status(500).send('Failed to retrieve container info');
                }
                if(!row) {
                    return res.status(404).send('Container not found');
                }
                res.json(row);
            });
            return;
        }

        if(!VALIDSTATUSES.includes(status)) {
            return res.status(400).send('Invalid id or status');
        }

        db.get_containers(status, (err, rows) => {
            if (err) {
                return res.status(500).send('Failed to retrieve container list');
            }
            res.json(rows);
        });
        return;
    }

    db.get_containers(status, (err, rows) => {
        if (err) {
            return res.status(500).send('Failed to retrieve container list');
        }
        res.json(rows);
    });
});

app.listen(port, () => {
    console.log(`Jupyter Manager listening at http://localhost:${port}`);
});
