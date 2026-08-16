#!/bin/bash

# Останавливаем выполнение скрипта при любой ошибке
set -e

APP_NAME="SHUB"
GITHUB_USER="albertsokolov" # Укажите ваш точный юзернейм на GitHub

echo "===================================================="
echo " Начало загрузки проекта [$APP_NAME] из GitHub"
echo "===================================================="

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
SSH_CHECK=$(ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new -T git@github.com 2>&1 || true)
if [[ "$SSH_CHECK" != *"successfully authenticated"* ]]; then
    echo "❌ Ошибка аутентификации SSH."
    exit 1
fi

# 3. Синхронизация кода (умное определение папки)
# Проверяем, находимся ли мы уже внутри Git-репозитория SHUB
if [ -d ".git" ] && [[ "$(git config --get remote.origin.url)" == *"github.com"* ]]; then
    echo "🔄 Вы уже находитесь в рабочей директории репозитория."
    echo " Выполняем обновление (git pull)..."
    # На всякий случай обновляем URL на правильный SSH-адрес
    git remote set-url origin "git@github.com:$GITHUB_USER/$APP_NAME.git"
    git pull origin main
else
    # Если мы снаружи, проверяем наличие папки рядом
    TARGET_DIR="shub"
    if [ -d "$TARGET_DIR" ]; then
        echo "⚠️ Папка $TARGET_DIR существует рядом. Заходим и обновляем..."
        cd "$TARGET_DIR"
        git remote set-url origin "git@github.com:$GITHUB_USER/$APP_NAME.git"
        git pull origin main
    else
        echo " Стягиваем приватный репозиторий по SSH..."
        git clone "git@github.com:$GITHUB_USER/$APP_NAME.git" "$TARGET_DIR"
        cd "$TARGET_DIR"
    fi
fi

# 4. Проверка и удаление старой Windows-базы данных
if [ -f "SHUB.db" ]; then
    echo " Удаление старого файла базы данных для пересоздания под Linux..."
    rm -f SHUB.db
fi

# 5. Сборка и запуск проекта на Arch Linux
echo "===================================================="
echo " Проект успешно загружен. Запуск сборки Cargo..."
echo "===================================================="
cargo run
