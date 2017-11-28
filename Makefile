DOCKERORG = feedhenry
IMAGENAME = fh-sync-server
TAG = latest
DOCKERHOST = docker.io

build_and_push: build push

.PHONY: build
build:
	docker build -t $(DOCKERORG)/$(IMAGENAME):$(TAG) .

.PHONY: push
push: 
	docker push $(DOCKERHOST)/$(DOCKERORG)/$(IMAGENAME):$(TAG)