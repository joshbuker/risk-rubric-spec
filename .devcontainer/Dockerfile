FROM mcr.microsoft.com/devcontainers/python:3.12-bullseye

RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

ARG NODE_VERSION=20
RUN su vscode -c "source /usr/local/share/nvm/nvm.sh && nvm install ${NODE_VERSION} && nvm alias default ${NODE_VERSION}" 2>&1
