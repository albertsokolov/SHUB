#!/bin/bash

# Останавливаем выполнение скрипта при любой ошибке
set -e

# НАСТРОЙКИ: Имена на GitHub чувствительны к регистру!
GITHUB_USER="albertsokolov"
REPO_NAME="shub"          # Имя репозитория на GitHub

echo "===================================================="
echo " Начало синхронизации проекта [$REPO_NAME] из GitHub"
echo "===================================================="

# Переходим в папку, где лежит сам скрипт, чтобы пути были надежными
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. Автоматический запуск SSH-агента и добавление ключа
if [ -z "$SSH_AUTH_SOCK" ]; then
    echo "🔑 Запуск SSH-агента..."
    eval "$(ssh-agent -s)" > /dev/null
fi

if ! ssh-add -l &> /dev/null; then
    echo "🔑 Добавление SSH-ключа..."
    if [ -f "$HOME/.ssh/id_ed25519" ]; then
        ssh-add "$HOME/.ssh/id_ed25519"
    else
        echo "❌ Ошибка: Файл ключа $HOME/.ssh/id_ed25519 не найден!"
        exit 1
    fi
fi

# 2. Проверяем доступ к GitHub по SSH
echo " Проверка SSH-подключения..."
set +e
SSH_TEST=$(ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new -T git@github.com 2>&1)
set -e

if [[ "$SSH_TEST" != *"successfully authenticated"* ]]; then
    echo "❌ Ошибка аутентификации SSH. Проверьте ключ на GitHub."
    echo "Ответ сервера: $SSH_TEST"
    exit 1
fi
echo "✅ SSH-подключение успешно."

# 3. Синхронизация кода
# Так как скрипт лежит внутри репозитория, мы просто проверяем наличие .git
if [ -d ".git" ]; then
    echo "🔄 Выполнение обновления (git pull)..."
    git remote set-url origin "git@github.com:$GITHUB_USER/$REPO_NAME.git"
    git pull origin main
else
    echo "❌ Ошибка: Папка .git не найдена в директории скрипта ($SCRIPT_DIR)."
    echo "Убедитесь, что скрипт запускается из корня Git-репозитория."
    exit 1
fi

# 4. Проверка и удаление старой Windows-базы данных
if [ -f "SHUB.db" ]; then
    echo " Удаление старого файла базы данных для пересоздания под Linux..."
    rm -f SHUB.db
elif [ -f "shub.db" ]; then
    echo " Удаление старого файла базы данных (shub.db)..."
    rm -f shub.db
fi

echo "===================================================="
echo "✅ Синхронизация успешно завершена!"
echo "===================================================="
