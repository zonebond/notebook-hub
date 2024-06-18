init-workspace:
	rm -rf ./workspace && mkdir ./workspace

build:
	docker build --platform linux/amd64 --tag notebook-hub --file Dockerfile .

docker:
	docker run -d --name notebook-hub -p 7000:7000 -v /var/run/docker.sock:/var/run/docker.sock --privileged notebook-hub:latest