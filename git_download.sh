#!/bin/bash

# Останавливаем выполнение скрипта при любой ошибке
set -e

APP_NAME="SHUB"
TARGET_DIR="shub"

echo "===================================================="
echo " Начало загрузки проекта [$APP_NAME] из GitHub"
echo "===================================================="

# 1. Проверяем, установлен ли GitHub CLI в Arch Linux
if ! command -v gh &> /dev/null; then
    echo "❌ Ошибка: gh (GitHub CLI) не найден."
    echo "Установите его командой: sudo pacman -S github-cli"
    exit 1
fi

# 2. Проверяем авторизацию в gh
if ! gh auth status &> /dev/null; then
    echo "❌ Ошибка: Вы не авторизованы в GitHub CLI."
    echo "Выполните в терминале команду: gh auth login"
    exit 1
fi

# 3. Клонирование приватного репозитория
if [ -d "$TARGET_DIR" ]; then
    echo "⚠️ Папка $TARGET_DIR уже существует."
    echo " Выполняем обновление (git pull) вместо полного клонирования..."
    cd "$TARGET_DIR"
    git pull origin main
else
    echo " Стягиваем приватный репозиторий через gh CLI..."
    gh repo clone "$APP_NAME" "$TARGET_DIR"
    cd "$TARGET_DIR"
fi

# 4. Проверка и удаление старой Windows-базы данных, если она случайно осталась
if [ -f "SHUB.db" ]; then
    echo " Удаление старого файла базы данных для пересоздания под Linux..."
    rm -f SHUB.db
fi

# 5. Сборка и запуск проекта на Arch Linux
echo "===================================================="
echo " Проект успешно загружен. Запуск сборки Cargo..."
echo "===================================================="

cargo run
