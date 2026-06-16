FROM mcr.microsoft.com/devcontainers/python:3.12-bullseye

ARG NODE_VERSION=20
RUN su vscode -c "source /usr/local/share/nvm/nvm.sh && nvm install ${NODE_VERSION} && nvm alias default ${NODE_VERSION}" 2>&1
